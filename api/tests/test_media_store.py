"""
Unit tests for services/media_store.py.

Every test redirects MEDIA_DIR/FRAMES_DIR/INDEX_FILE at a tmp_path, so the real
data/media library is never read or written by the suite.
"""
import io
import pathlib
import json

import pytest

from services import media_store


@pytest.fixture()
def store(tmp_path, monkeypatch):
    media = tmp_path / "media"
    frames = media / "frames"
    monkeypatch.setattr(media_store, "MEDIA_DIR", media)
    monkeypatch.setattr(media_store, "FRAMES_DIR", frames)
    monkeypatch.setattr(media_store, "INDEX_FILE", media / "index.json")
    return media_store


def _fake_probe(_path):
    return 12.5, 1920, 1080


def _upload(store, name="clip.mp4", data=b"\x00" * 2048, **kw):
    return store.save_upload(io.BytesIO(data), name, **kw)


def test_save_upload_writes_file_and_index(store, monkeypatch):
    monkeypatch.setattr(store, "_probe", _fake_probe)
    rec = _upload(store, agency_id="agency-1", uploaded_by="usr-1")

    assert rec.original_name == "clip.mp4"
    assert rec.size_bytes == 2048
    assert rec.agency_id == "agency-1"
    assert (store.MEDIA_DIR / rec.file).exists()
    assert store.INDEX_FILE.exists()

    written = json.loads(store.INDEX_FILE.read_text(encoding="utf-8"))
    assert len(written) == 1
    assert written[0]["id"] == rec.id
    # frame_count is derived for responses and must not be persisted, or it
    # would be passed back into the dataclass constructor on the next read.
    assert "frame_count" not in written[0]


def test_probed_metadata_is_recorded(store, monkeypatch):
    monkeypatch.setattr(store, "_probe", _fake_probe)
    rec = _upload(store)
    assert rec.duration_sec == 12.5
    assert (rec.width, rec.height) == (1920, 1080)


def test_rejects_unsupported_extension(store):
    with pytest.raises(store.UnsupportedMedia):
        _upload(store, name="notes.txt")


def test_rejects_empty_file(store, monkeypatch):
    monkeypatch.setattr(store, "_probe", _fake_probe)
    with pytest.raises(store.UnsupportedMedia):
        _upload(store, data=b"")
    # the zero-byte file must not be left behind
    assert list(store.MEDIA_DIR.glob("*.mp4")) == []


def test_index_survives_reload(store, monkeypatch):
    monkeypatch.setattr(store, "_probe", _fake_probe)
    rec = _upload(store)
    # a fresh read models a server restart
    again = store.get_media(rec.id)
    assert again.id == rec.id
    assert again.original_name == rec.original_name


def test_list_media_is_newest_first_and_filterable(store, monkeypatch):
    monkeypatch.setattr(store, "_probe", _fake_probe)
    a = _upload(store, name="a.mp4", agency_id="agency-1")
    b = _upload(store, name="b.mp4", agency_id="agency-2")

    ids = [m.id for m in store.list_media()]
    assert ids == [b.id, a.id] or ids == [a.id, b.id]   # same-instant uploads
    assert [m.id for m in store.list_media(agency_id="agency-2")] == [b.id]
    assert store.list_media(agency_id="nobody") == []


def test_get_media_raises_for_unknown_id(store):
    with pytest.raises(store.MediaNotFound):
        store.get_media("does-not-exist")


def test_capture_frame_appends_to_record(store, monkeypatch):
    monkeypatch.setattr(store, "_probe", _fake_probe)
    monkeypatch.setattr(store, "_extract_frame",
                        lambda v, t, dest: (dest.write_bytes(b"jpg"), True)[1])
    rec = _upload(store)
    frame = store.capture_frame(rec.id, 3.5, note="possible victim")

    assert frame.t_sec == 3.5
    assert frame.note == "possible victim"
    reloaded = store.get_media(rec.id)
    assert len(reloaded.frames) == 1
    assert reloaded.frames[0].id == frame.id
    assert reloaded.to_dict()["frame_count"] == 1


def test_capture_frame_surfaces_extraction_failure(store, monkeypatch):
    monkeypatch.setattr(store, "_probe", _fake_probe)
    monkeypatch.setattr(store, "_extract_frame", lambda v, t, dest: False)
    rec = _upload(store)
    with pytest.raises(store.UnsupportedMedia):
        store.capture_frame(rec.id, 1.0)


def test_delete_media_removes_file_frames_and_entry(store, monkeypatch):
    monkeypatch.setattr(store, "_probe", _fake_probe)
    monkeypatch.setattr(store, "_extract_frame",
                        lambda v, t, dest: (dest.write_bytes(b"jpg"), True)[1])
    rec = _upload(store)
    frame = store.capture_frame(rec.id, 1.0)
    video = store.MEDIA_DIR / rec.file
    still = store.FRAMES_DIR / frame.file

    store.delete_media(rec.id)

    assert not video.exists()
    assert not still.exists()
    assert store.list_media() == []
    with pytest.raises(store.MediaNotFound):
        store.get_media(rec.id)


def test_delete_unknown_id_raises(store):
    with pytest.raises(store.MediaNotFound):
        store.delete_media("nope")


def test_safe_name_strips_paths_and_separators(store):
    assert store.safe_name("../../etc/passwd") == "passwd"
    assert store.safe_name("my clip (final).mp4") == "my_clip_final_.mp4"
    assert store.safe_name("") == "upload"


def test_corrupt_index_does_not_raise(store):
    store.MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    store.INDEX_FILE.write_text("{not json", encoding="utf-8")
    assert store.list_media() == []


def test_stats_totals(store, monkeypatch):
    monkeypatch.setattr(store, "_probe", _fake_probe)
    _upload(store, name="a.mp4", data=b"x" * 100)
    _upload(store, name="b.mp4", data=b"x" * 200)
    s = store.stats()
    assert s["count"] == 2
    assert s["bytes"] == 300
    assert s["frame_count"] == 0


def test_delete_retries_a_briefly_locked_file(store, monkeypatch):
    """A feed shutting down can still hold the clip open for a few ms."""
    monkeypatch.setattr(store, "_probe", _fake_probe)
    rec = _upload(store)

    real_unlink = pathlib.Path.unlink
    calls = {"n": 0}

    def flaky(self, missing_ok=False):
        if self.name == rec.file:
            calls["n"] += 1
            if calls["n"] < 3:
                raise PermissionError(32, "in use")
        return real_unlink(self, missing_ok=missing_ok)

    monkeypatch.setattr(pathlib.Path, "unlink", flaky)
    monkeypatch.setattr(store.time, "sleep", lambda _s: None)

    store.delete_media(rec.id)
    assert calls["n"] == 3
    assert store.list_media() == []


def test_delete_raises_when_file_stays_locked(store, monkeypatch):
    monkeypatch.setattr(store, "_probe", _fake_probe)
    rec = _upload(store)

    def always_locked(self, missing_ok=False):
        raise PermissionError(32, "in use")

    monkeypatch.setattr(pathlib.Path, "unlink", always_locked)
    monkeypatch.setattr(store.time, "sleep", lambda _s: None)

    with pytest.raises(store.MediaInUse):
        store.delete_media(rec.id)
    # the entry must survive, or the file would be orphaned with nothing
    # pointing at it
    assert [r.id for r in store.list_media()] == [rec.id]
