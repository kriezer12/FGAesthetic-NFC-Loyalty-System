-- Create treatment_consents table
CREATE TABLE public.treatment_consents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  appointment_id text NOT NULL, -- Keep as text to match appointments.id
  customer_id uuid NOT NULL,
  consent_text text NOT NULL,
  signature_path text NOT NULL, -- Path to the image in Supabase Storage
  signed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT treatment_consents_pkey PRIMARY KEY (id),
  CONSTRAINT treatment_consents_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);

-- Note: appointment_id is text because public.appointments.id is text in the provided schema.
-- If it's eventually migrated to uuid, we can update this.

-- Enable RLS
ALTER TABLE public.treatment_consents ENABLE ROW LEVEL SECURITY;

-- Allow all access to authenticated users (simplified for this app context)
CREATE POLICY "Allow all access to authenticated users" 
ON public.treatment_consents 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);
