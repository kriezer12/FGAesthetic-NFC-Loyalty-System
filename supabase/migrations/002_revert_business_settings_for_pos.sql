-- Revert Business Settings Table to Original POS Structure
-- ===========================================================
-- 
-- This restores the original business_settings table used by POS/Checkout
-- and adds the calendar_settings column without breaking existing data

-- 1. If the calendar-only version exists, drop it first
DROP TABLE IF EXISTS public.business_settings CASCADE;

-- 2. Recreate business_settings with both POS and Calendar columns
CREATE TABLE public.business_settings (
  id TEXT PRIMARY KEY,  -- POS uses 'default' as the ID
  business_name TEXT,
  vat_reg_tin TEXT,
  tin TEXT,
  address TEXT,
  ptu_no TEXT,
  date_issued TEXT,
  pos_serial_no TEXT,
  -- Calendar settings added as JSONB
  calendar_settings JSONB DEFAULT '{
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

-- 4. Create RLS policies - allow all authenticated users to read
CREATE POLICY "Allow authenticated users to read business settings"
  ON public.business_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- 5. Create RLS policy - allow all authenticated users to update
CREATE POLICY "Allow authenticated users to update business settings"
  ON public.business_settings FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 6. Create RLS policy - allow all authenticated users to insert
CREATE POLICY "Allow authenticated users to insert business settings"
  ON public.business_settings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 7. Enable Realtime on business_settings table
ALTER PUBLICATION supabase_realtime ADD TABLE public.business_settings;

-- 8. Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_business_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS business_settings_updated_at_trigger ON public.business_settings;
CREATE TRIGGER business_settings_updated_at_trigger
  BEFORE UPDATE ON public.business_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_business_settings_timestamp();

-- 9. Insert the default POS settings record (if it doesn't exist)
INSERT INTO public.business_settings (
  id,
  business_name,
  vat_reg_tin,
  tin,
  address,
  ptu_no,
  date_issued,
  pos_serial_no,
  calendar_settings
)
VALUES (
  'default',
  'FG Aesthetic Clinic',
  '',
  '',
  '',
  '',
  '',
  '',
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

-- Verify
SELECT 'Revert complete! POS + Calendar settings ready' as status;
SELECT id, business_name, calendar_settings FROM public.business_settings;
