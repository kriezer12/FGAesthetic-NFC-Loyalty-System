-- Migration: 012_appointments_branch_visibility_rls.sql
-- Purpose: Ensure branch-owned appointments remain visible to branch admins
-- even when assigned to temporarily borrowed staff from another branch.

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments_select_super_admin" ON public.appointments;
DROP POLICY IF EXISTS "appointments_select_branch_admin_branch_owned" ON public.appointments;
DROP POLICY IF EXISTS "appointments_select_staff_own" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_super_admin" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_branch_admin_branch_owned" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_staff_own_home_branch" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_staff_own_assigned_branch" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_super_admin" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_branch_admin_branch_owned" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_staff_own_home_branch" ON public.appointments;
DROP POLICY IF EXISTS "appointments_delete_super_admin" ON public.appointments;
DROP POLICY IF EXISTS "appointments_delete_branch_admin_branch_owned" ON public.appointments;
DROP POLICY IF EXISTS "appointments_delete_staff_own_home_branch" ON public.appointments;

-- SELECT visibility
CREATE POLICY "appointments_select_super_admin"
  ON public.appointments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid()
        AND u.role = 'super_admin'
    )
  );

CREATE POLICY "appointments_select_branch_admin_branch_owned"
  ON public.appointments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid()
        AND u.role = 'branch_admin'
        AND u.branch_id = appointments.branch_id
    )
  );

CREATE POLICY "appointments_select_staff_own"
  ON public.appointments
  FOR SELECT
  TO authenticated
  USING (
    appointments.staff_id = auth.uid()::text
  );

-- INSERT permissions
CREATE POLICY "appointments_insert_super_admin"
  ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid()
        AND u.role = 'super_admin'
    )
  );

CREATE POLICY "appointments_insert_branch_admin_branch_owned"
  ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid()
        AND u.role = 'branch_admin'
        AND u.branch_id = appointments.branch_id
    )
  );

CREATE POLICY "appointments_insert_staff_own_home_branch"
  ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    appointments.staff_id = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles u
      WHERE u.id = auth.uid()
        AND u.role = 'staff'
        AND appointments.branch_id = u.branch_id
    )
  );

-- UPDATE permissions
CREATE POLICY "appointments_update_super_admin"
  ON public.appointments
  FOR UPDATE
  TO authenticated
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

CREATE POLICY "appointments_update_branch_admin_branch_owned"
  ON public.appointments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid()
        AND u.role = 'branch_admin'
        AND u.branch_id = appointments.branch_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid()
        AND u.role = 'branch_admin'
        AND u.branch_id = appointments.branch_id
    )
  );

CREATE POLICY "appointments_update_staff_own_home_branch"
  ON public.appointments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid()
        AND u.role = 'staff'
        AND appointments.staff_id = auth.uid()::text
        AND appointments.branch_id = u.branch_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid()
        AND u.role = 'staff'
        AND appointments.staff_id = auth.uid()::text
        AND appointments.branch_id = u.branch_id
    )
  );

-- DELETE permissions
CREATE POLICY "appointments_delete_super_admin"
  ON public.appointments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid()
        AND u.role = 'super_admin'
    )
  );

CREATE POLICY "appointments_delete_branch_admin_branch_owned"
  ON public.appointments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid()
        AND u.role = 'branch_admin'
        AND u.branch_id = appointments.branch_id
    )
  );

CREATE POLICY "appointments_delete_staff_own_home_branch"
  ON public.appointments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles u
      WHERE u.id = auth.uid()
        AND u.role = 'staff'
        AND appointments.staff_id = auth.uid()::text
        AND appointments.branch_id = u.branch_id
    )
  );
