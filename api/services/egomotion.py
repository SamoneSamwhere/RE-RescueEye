"""
Frame-to-frame camera motion estimation.

A casualty is a person who does not move. Measuring that from a drone is not
as simple as watching a box's pixel coordinates: when the aircraft translates,
every static point on the ground slides across the frame, so a motionless body
looks like it is moving at exactly the speed of the drone. Without this
compensation the stillness test in `services/casualty.py` reports nothing as
still while the drone is flying, and everything as still while it hovers.

The estimate is a partial affine (translation, rotation, uniform scale) fitted
to ORB features. Full homography was not used deliberately: it needs more
correspondences to stay stable, and over the short baseline between two
consecutive detection frames the extra perspective terms mostly fit noise.

People are masked out before features are detected — otherwise a body filling
much of the frame contributes its own corners to the estimate, and the motion
being measured ends up partly cancelled by the motion being sought.
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass

import numpy as np

logger = logging.getLogger("rescueeye.egomotion")

try:
    import cv2  # type: ignore
except Exception:  # pragma: no cover - cv2 is a hard dep in practice
    cv2 = None  # type: ignore

# Features are detected on a downscaled copy: ORB on a 1280x720 frame costs
# ~25ms, at 480px wide it is ~4ms, and the resulting transform is scaled back
# up. Camera motion is a global, low-frequency signal — it does not need the
# full resolution to be measured.
EGOMOTION_WIDTH   = int(os.getenv("EGOMOTION_WIDTH", "480"))
EGOMOTION_FEATURES = int(os.getenv("EGOMOTION_FEATURES", "400"))
# Below this many matched features the fit is not trustworthy; the caller is
# told the estimate failed rather than handed a confident-looking wrong answer.
EGOMOTION_MIN_MATCHES = int(os.getenv("EGOMOTION_MIN_MATCHES", "12"))


@dataclass
class CameraMotion:
    """Where a point from the previous frame lands in the current one."""
    dx: float = 0.0
    dy: float = 0.0
    scale: float = 1.0
    rotation_deg: float = 0.0
    ok: bool = False

    def apply(self, x: float, y: float, cx: float, cy: float) -> tuple[float, float]:
        """
        Maps a previous-frame point into current-frame coordinates.

        Rotation and scale are taken about the frame centre (cx, cy), which is
        where a drone's yaw and altitude changes actually pivot the image.
        """
        if not self.ok:
            return x, y
        theta = np.radians(self.rotation_deg)
        cos_t, sin_t = np.cos(theta) * self.scale, np.sin(theta) * self.scale
        ox, oy = x - cx, y - cy
        return (cx + ox * cos_t - oy * sin_t + self.dx,
                cy + ox * sin_t + oy * cos_t + self.dy)


class EgoMotionEstimator:
    """Holds the previous frame so consecutive calls can be differenced."""

    def __init__(self) -> None:
        self._prev_gray: np.ndarray | None = None
        self._orb = None

    def reset(self) -> None:
        """Drops the reference frame — call when the feed changes or restarts."""
        self._prev_gray = None

    def _downscale(self, frame: np.ndarray) -> tuple[np.ndarray, float]:
        h, w = frame.shape[:2]
        if w <= EGOMOTION_WIDTH:
            return frame, 1.0
        scale = EGOMOTION_WIDTH / float(w)
        small = cv2.resize(frame, (EGOMOTION_WIDTH, max(1, int(h * scale))),
                           interpolation=cv2.INTER_AREA)
        return small, scale

    def estimate(self, frame: np.ndarray, exclude: list[dict] | None = None) -> CameraMotion:
        """
        Estimates motion from the previous frame to `frame`.

        `exclude` is the current detections — their boxes are masked out so the
        subjects being tracked do not contribute to the camera estimate. The
        first call has no reference frame and always reports `ok=False`.
        """
        if cv2 is None:
            return CameraMotion()

        small, scale = self._downscale(frame)
        gray = cv2.cvtColor(small, cv2.COLOR_RGB2GRAY) if small.ndim == 3 else small

        mask = None
        if exclude:
            mask = np.full(gray.shape, 255, dtype=np.uint8)
            for det in exclude:
                b = det.get("bbox") or {}
                x, y = int(b.get("x", 0) * scale), int(b.get("y", 0) * scale)
                w, h = int(b.get("w", 0) * scale), int(b.get("h", 0) * scale)
                # Padded a little: a box rarely ends exactly at the silhouette,
                # and the ground immediately around a body is often disturbed.
                pad = max(2, int(0.08 * max(w, h)))
                cv2.rectangle(mask, (x - pad, y - pad), (x + w + pad, y + h + pad), 0, -1)

        prev = self._prev_gray
        self._prev_gray = gray
        if prev is None or prev.shape != gray.shape:
            return CameraMotion()

        if self._orb is None:
            self._orb = cv2.ORB_create(nfeatures=EGOMOTION_FEATURES)

        try:
            kp1, des1 = self._orb.detectAndCompute(prev, mask)
            kp2, des2 = self._orb.detectAndCompute(gray, mask)
            if des1 is None or des2 is None or len(kp1) < EGOMOTION_MIN_MATCHES:
                return CameraMotion()

            matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
            matches = matcher.match(des1, des2)
            if len(matches) < EGOMOTION_MIN_MATCHES:
                return CameraMotion()
            matches = sorted(matches, key=lambda m: m.distance)[:EGOMOTION_FEATURES]

            src = np.float32([kp1[m.queryIdx].pt for m in matches]).reshape(-1, 1, 2)
            dst = np.float32([kp2[m.trainIdx].pt for m in matches]).reshape(-1, 1, 2)
            matrix, inliers = cv2.estimateAffinePartial2D(
                src, dst, method=cv2.RANSAC, ransacReprojThreshold=3.0,
            )
            if matrix is None or inliers is None or int(inliers.sum()) < EGOMOTION_MIN_MATCHES:
                return CameraMotion()

            a, b_, tx = matrix[0]
            c, d, ty = matrix[1]
            est_scale = float(np.sqrt(max(a * a + c * c, 1e-9)))
            rotation = float(np.degrees(np.arctan2(c, a)))
            # Transform was fitted on the downscaled copy; translation is in its
            # pixels, so it scales back up. Rotation and scale are dimensionless.
            return CameraMotion(dx=float(tx) / scale, dy=float(ty) / scale,
                                scale=est_scale, rotation_deg=rotation, ok=True)
        except Exception as exc:
            logger.debug(f"[egomotion] estimate failed (non-fatal): {exc}")
            return CameraMotion()
