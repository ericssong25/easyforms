-- Easy Forms Database Schema
-- Migration: 003_consent_fields

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS tax_filing_status text,
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS tax_dependents_count integer;
