-- =====================================================
-- Storage bucket setup
-- =====================================================

-- Create the signed_forms bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'signed_forms',
  'signed_forms',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Storage RLS Policies
-- =====================================================

-- Only the owner agent can upload files
CREATE POLICY "Agent can upload signed forms"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'signed_forms'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Only the owner agent can download files
CREATE POLICY "Agent can download signed forms"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'signed_forms'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Only the owner agent can update/delete files
CREATE POLICY "Agent can update signed forms"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'signed_forms'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Agent can delete signed forms"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'signed_forms'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
