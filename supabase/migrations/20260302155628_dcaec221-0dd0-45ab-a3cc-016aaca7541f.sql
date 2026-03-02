
-- Create storage bucket for tenant logos
INSERT INTO storage.buckets (id, name, public) VALUES ('tenant-logos', 'tenant-logos', true);

-- Allow anyone to view tenant logos
CREATE POLICY "Anyone can view tenant logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'tenant-logos');

-- Allow authenticated admins to upload logos
CREATE POLICY "Admins can upload tenant logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tenant-logos' AND auth.uid() IS NOT NULL);

-- Allow authenticated admins to update logos
CREATE POLICY "Admins can update tenant logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'tenant-logos' AND auth.uid() IS NOT NULL);

-- Allow authenticated admins to delete logos
CREATE POLICY "Admins can delete tenant logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'tenant-logos' AND auth.uid() IS NOT NULL);
