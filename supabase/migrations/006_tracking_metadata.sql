-- Easy Forms Database Schema
-- Migration: 006_tracking_metadata
--
-- Reconciles columns that were added directly to the live database (outside
-- of any migration) but are written to by the app via tracking metadata
-- (see src/lib/tracking.ts: ip_address, user_agent, device_type). The drift
-- was first observed because insert sites spread `...meta` into
-- tracking_events, which would fail on any DB built only from the repo's
-- migrations. This migration brings the repo back in sync with reality.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS makes applying this to the current
-- database a no-op (the columns already exist), while a fresh database
-- built from migrations 001-006 in order will end up with the same shape.

ALTER TABLE public.tracking_events
  ADD COLUMN IF NOT EXISTS ip_address inet,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS device_type text;

COMMENT ON COLUMN public.tracking_events.ip_address IS
  'Client IP at the time of the event. Resolved server-side from x-forwarded-for / x-real-ip, or via api.ipify.org as a fallback. Nullable because the client-side helper returns "loading" until the IP is available.';

COMMENT ON COLUMN public.tracking_events.user_agent IS
  'Raw User-Agent header value at the time of the event. Stored verbatim for audit and for the device-type classifier.';

COMMENT ON COLUMN public.tracking_events.device_type IS
  'Coarse device classification derived from the User-Agent (mobile | tablet | desktop | bot | unknown). Produced by src/lib/tracking.ts:parseDeviceType().';
