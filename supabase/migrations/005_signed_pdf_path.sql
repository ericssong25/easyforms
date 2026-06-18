-- Easy Forms Database Schema
-- Migration: 005_signed_pdf_path

ALTER TABLE public.form_submissions
  ADD COLUMN IF NOT EXISTS signed_pdf_path text;

COMMENT ON COLUMN public.form_submissions.signed_pdf_path IS
  'Storage object path in the signed_forms bucket (e.g. ${agent_id}/${submission_id}/signed.pdf). Do NOT persist signed URLs here — generate a fresh createSignedUrl at render time.';
