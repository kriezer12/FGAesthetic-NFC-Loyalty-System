-- Migration: 009_create_staff_cross_branch_assignments.sql
-- Purpose: Enable temporary cross-branch assignment of staff for appointments.

CREATE TABLE IF NOT EXISTS public.staff_cross_branch_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  home_branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  host_branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'upcoming', 'expired', 'cancelled')),
  created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  cancelled_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staff_cross_branch_assignments_valid_window CHECK (ends_at > starts_at),
  CONSTRAINT staff_cross_branch_assignments_distinct_branches CHECK (home_branch_id IS NULL OR home_branch_id <> host_branch_id)
);

CREATE INDEX IF NOT EXISTS idx_scba_host_status_window
  ON public.staff_cross_branch_assignments (host_branch_id, status, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_scba_staff_window
  ON public.staff_cross_branch_assignments (staff_id, starts_at, ends_at);
