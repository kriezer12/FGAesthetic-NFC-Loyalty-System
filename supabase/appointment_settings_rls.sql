-- Enable RLS on appointment_settings table
ALTER TABLE appointment_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own business settings
CREATE POLICY "Users can read appointment settings for their business"
  ON appointment_settings
  FOR SELECT
  TO authenticated
  USING (
    business_id = (auth.jwt() ->> 'business_id')
    OR business_id = 'default-business-id'
  );

-- Allow authenticated users to insert appointment settings
CREATE POLICY "Users can insert appointment settings"
  ON appointment_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id = (auth.jwt() ->> 'business_id')
    OR business_id = 'default-business-id'
  );

-- Allow authenticated users to update their own appointment settings
CREATE POLICY "Users can update their appointment settings"
  ON appointment_settings
  FOR UPDATE
  TO authenticated
  USING (
    business_id = (auth.jwt() ->> 'business_id')
    OR business_id = 'default-business-id'
  )
  WITH CHECK (
    business_id = (auth.jwt() ->> 'business_id')
    OR business_id = 'default-business-id'
  );

-- Allow authenticated users to delete their own appointment settings
CREATE POLICY "Users can delete their appointment settings"
  ON appointment_settings
  FOR DELETE
  TO authenticated
  USING (
    business_id = (auth.jwt() ->> 'business_id')
    OR business_id = 'default-business-id'
  );

-- Optional: Allow admin access (uncomment and adjust based on your setup)
-- CREATE POLICY "Admin can access all appointment settings"
--   ON appointment_settings
--   FOR ALL
--   TO authenticated
--   USING (auth.jwt() ->> 'role' = 'admin');
