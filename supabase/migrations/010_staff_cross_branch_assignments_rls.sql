-- Migration: 010_staff_cross_branch_assignments_rls.sql
-- Purpose: Enable Row Level Security on the temporary staff assignment table.

ALTER TABLE public.staff_cross_branch_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins may manage all cross branch assignments" ON public.staff_cross_branch_assignments;
CREATE POLICY "Super admins may manage all cross branch assignments"
  ON public.staff_cross_branch_assignments
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid()
        AND u.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid()
        AND u.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Branch admins may manage assignments for their host branch" ON public.staff_cross_branch_assignments;
CREATE POLICY "Branch admins may manage assignments for their host branch"
  ON public.staff_cross_branch_assignments
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid()
        AND u.role = 'branch_admin'
        AND u.branch_id = host_branch_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid()
        AND u.role = 'branch_admin'
        AND u.branch_id = host_branch_id
    )
  );

DROP POLICY IF EXISTS "Staff can read their own cross branch assignments" ON public.staff_cross_branch_assignments;
CREATE POLICY "Staff can read their own cross branch assignments"
  ON public.staff_cross_branch_assignments
  FOR SELECT
  TO public
  USING (
    staff_id = auth.uid()
  );
