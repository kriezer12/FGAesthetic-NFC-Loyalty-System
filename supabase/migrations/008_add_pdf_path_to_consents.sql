-- Add pdf_path to treatment_consents
ALTER TABLE public.treatment_consents 
ADD COLUMN pdf_path text;

-- Note: We are not making it NOT NULL yet to avoid breaking existing records, 
-- though there shouldn't be many yet.
