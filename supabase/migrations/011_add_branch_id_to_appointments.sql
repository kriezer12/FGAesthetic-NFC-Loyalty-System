-- Migration: 011_add_branch_id_to_appointments.sql
-- Purpose: Persist appointment ownership to the branch where appointment is created.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

-- Backfill from staff profile branch for existing rows where possible.
UPDATE public.appointments a
SET branch_id = u.branch_id
FROM public.user_profiles u
WHERE a.branch_id IS NULL
  AND u.id::text = a.staff_id::text
  AND u.branch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_branch_id_start_time
  ON public.appointments (branch_id, start_time);
