-- Migration: 006_add_deleted_at_to_user_profiles.sql
-- Description: Adds deleted_at to user_profiles for soft deletion and creates a pg_cron job for 7-day auto hard delete.

-- 1. Add deleted_at column
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- 2. Create the cron job if pg_cron is available
-- Ensure pg_cron is created
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule job to run daily at midnight
-- It deletes from auth.users where the corresponding user_profiles.deleted_at is older than 7 days
SELECT cron.schedule(
  'hard-delete-soft-deleted-accounts',
  '0 0 * * *',
  $$
    DELETE FROM auth.users 
    WHERE id IN (
      SELECT id FROM public.user_profiles 
      WHERE deleted_at < now() - interval '7 days'
    );
  $$
);
