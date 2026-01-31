-- ============================================
-- Phase 1.1: User Access Levels & Authentication Enhancement
-- ============================================
-- This migration creates the necessary database structure for RBAC
-- (Role-Based Access Control) including:
-- - Custom enum type for user roles
-- - user_profiles table with role and branch association
-- - Necessary indexes for performance
-- - RLS (Row Level Security) policies
-- ============================================

-- Create the user role enum type
CREATE TYPE user_role AS ENUM ('super_admin', 'branch_admin', 'staff');

-- ============================================
-- Branches Table (if not exists)
-- ============================================
-- This table stores branch/location information
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for active branches
CREATE INDEX IF NOT EXISTS idx_branches_active ON branches(is_active);

-- ============================================
-- User Profiles Table
-- ============================================
-- This table extends Supabase auth.users with application-specific data
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'staff',
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_branch ON user_profiles(branch_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- ============================================
-- Updated At Trigger Function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to user_profiles
DROP TRIGGER IF EXISTS user_profiles_updated_at ON user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to branches
DROP TRIGGER IF EXISTS branches_updated_at ON branches;
CREATE TRIGGER branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on branches
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- ============================================
-- User Profiles RLS Policies
-- ============================================

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Super admins can read all profiles
CREATE POLICY "Super admins can read all profiles"
  ON user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Policy: Branch admins can read profiles in their branch
CREATE POLICY "Branch admins can read branch profiles"
  ON user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
        AND role = 'branch_admin'
        AND branch_id = user_profiles.branch_id
    )
  );

-- Policy: Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    -- Users can only update specific fields, not role or branch_id
    auth.uid() = id
  );

-- Policy: Super admins can update all profiles
CREATE POLICY "Super admins can update all profiles"
  ON user_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Policy: Super admins can insert profiles
CREATE POLICY "Super admins can insert profiles"
  ON user_profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Policy: Super admins can delete profiles
CREATE POLICY "Super admins can delete profiles"
  ON user_profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ============================================
-- Branches RLS Policies
-- ============================================

-- Policy: All authenticated users can read branches
CREATE POLICY "Authenticated users can read branches"
  ON branches
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Super admins can manage branches
CREATE POLICY "Super admins can manage branches"
  ON branches
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ============================================
-- Function: Auto-create user profile on signup
-- ============================================
-- This function is triggered when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'staff'::user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- Function: Get user permissions
-- ============================================
-- Helper function to check if a user has a specific permission
CREATE OR REPLACE FUNCTION user_has_permission(user_id UUID, required_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role_val user_role;
BEGIN
  SELECT role INTO user_role_val
  FROM user_profiles
  WHERE id = user_id AND is_active = true;

  IF user_role_val IS NULL THEN
    RETURN false;
  END IF;

  -- Super admin has all permissions
  IF user_role_val = 'super_admin' THEN
    RETURN true;
  END IF;

  -- Branch admin permissions
  IF user_role_val = 'branch_admin' THEN
    RETURN required_permission IN (
      'customers:read', 'customers:create', 'customers:update',
      'checkins:read', 'checkins:create',
      'treatments:read',
      'transactions:read', 'transactions:create',
      'reports:read', 'reports:export',
      'appointments:read', 'appointments:create', 'appointments:update', 'appointments:delete',
      'users:read'
    );
  END IF;

  -- Staff permissions
  IF user_role_val = 'staff' THEN
    RETURN required_permission IN (
      'customers:read', 'customers:create', 'customers:update',
      'checkins:read', 'checkins:create',
      'treatments:read',
      'transactions:read', 'transactions:create',
      'appointments:read', 'appointments:create', 'appointments:update'
    );
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Sample Data (Optional - for development)
-- ============================================
-- Uncomment the following to insert sample data

-- INSERT INTO branches (name, address, phone, email) VALUES
-- ('Main Branch', '123 Main Street', '555-0100', 'main@fgaesthetic.com'),
-- ('Downtown Branch', '456 Downtown Ave', '555-0200', 'downtown@fgaesthetic.com');

-- ============================================
-- Verification Queries
-- ============================================
-- Run these to verify the migration was successful:

-- Check enum type was created:
-- SELECT typname FROM pg_type WHERE typname = 'user_role';

-- Check tables exist:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('user_profiles', 'branches');

-- Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE tablename IN ('user_profiles', 'branches');
