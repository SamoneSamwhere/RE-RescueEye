-- Expo push token for Field Responders (Alert and Notification Management).
--
-- The PUSH alert channel sends through Expo's push service, which addresses a
-- device by its Expo push token. A responder's app registers its token with
-- POST /alerts/push-token, which stores it here. NULL means the responder has
-- no registered device, so their PUSH alerts are recorded as FAILED while the
-- SMS and DASHBOARD alerts still go out.
--
-- Run this in the Supabase SQL editor. Safe to run twice.

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "pushToken" VARCHAR(255);
