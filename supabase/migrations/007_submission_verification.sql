-- Easy Forms Database Schema
-- Migration: 007_submission_verification
--
-- Reconciles the verification_data column on form_submissions. It was added
-- directly to the live database (outside of any migration) and is read/written
-- by the sign-and-send flow:
--   - src/app/dashboard/clients/[id]/preview/[templateId]/send-actions.tsx
--     writes { verification_data: { ...answers... } } on submission create.
--   - src/app/forms/[id]/preview-sign-client.tsx reads it back at signing
--     time to render the verification step.
-- Without this column, a fresh database built only from the repo's migrations
-- would 400 on the sign-and-send path.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS makes applying this to the current
-- database a no-op (the column already exists), while a fresh database
-- built from migrations 001-007 in order will end up with the same shape.

ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS verification_data jsonb;

COMMENT ON COLUMN public.form_submissions.verification_data IS
  'Identity-verification answers captured at send time. Free-form jsonb; the public signer reads it to render the verification step. Nullable because not all submissions go through verification.';
