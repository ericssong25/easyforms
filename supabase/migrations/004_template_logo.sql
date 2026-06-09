-- Easy Forms Database Schema
-- Migration: 004_template_logo

ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS logo jsonb;

COMMENT ON COLUMN public.templates.logo IS
  'Document-level "behind the text" logo. Shape: { dataUrl: string|null, position: "left"|"right", size: number /* width in px */ }.';
