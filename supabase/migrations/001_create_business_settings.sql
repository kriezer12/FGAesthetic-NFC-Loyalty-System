-- Business Settings Table Setup
-- =============================
-- 
-- This migration creates the business_settings table for storing global
-- calendar configuration (work hours, lunch breaks) that syncs across all staff.
--
-- Run this in your Supabase SQL Editor

-- 1. Drop existing table if it has wrong schema
DROP TABLE IF EXISTS public.business_settings CASCADE;

-- 2. Create business_settings table with correct schema
CREATE TABLE public.business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_settings JSONB NOT NULL DEFAULT '{
    "workHoursStart": "09:00",
    "workHoursEnd": "18:00",
    "lunchBreakStart": "12:00",
    "lunchBreakEnd": "13:00",
    "selectedStaff": [],
    "staffSchedules": {}
  }'::JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Enable Row Level Security
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to read business settings" ON public.business_settings;
DROP POLICY IF EXISTS "Allow authenticated users to update business settings" ON public.business_settings;
DROP POLICY IF EXISTS "Allow authenticated users to insert business settings" ON public.business_settings;

-- 5. Create RLS policies - allow all authenticated users to read
CREATE POLICY "Allow authenticated users to read business settings"
  ON public.business_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- 6. Create RLS policy - allow all authenticated users to update
CREATE POLICY "Allow authenticated users to update business settings"
  ON public.business_settings FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 7. Create RLS policy - allow all authenticated users to insert
CREATE POLICY "Allow authenticated users to insert business settings"
  ON public.business_settings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 8. Enable Realtime on business_settings table
ALTER PUBLICATION supabase_realtime ADD TABLE public.business_settings;

-- 9. Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_business_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger for updated_at
DROP TRIGGER IF EXISTS business_settings_updated_at_trigger ON public.business_settings;
CREATE TRIGGER business_settings_updated_at_trigger
  BEFORE UPDATE ON public.business_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_business_settings_timestamp();

-- 11. Ensure there's always exactly one settings record (insert if empty)
INSERT INTO public.business_settings (id, calendar_settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '{
    "workHoursStart": "09:00",
    "workHoursEnd": "18:00",
    "lunchBreakStart": "12:00",
    "lunchBreakEnd": "13:00",
    "selectedStaff": [],
    "staffSchedules": {}
  }'::JSONB
)
ON CONFLICT (id) DO NOTHING;

-- Verify setup
SELECT 'Setup complete! Testing settings table...' as status;
SELECT COUNT(*) as settings_count FROM public.business_settings;
