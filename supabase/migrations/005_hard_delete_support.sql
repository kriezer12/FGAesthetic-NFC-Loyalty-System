-- Migration: 005_hard_delete_support.sql
-- Description: Updates foreign key constraints to support hard deleting accounts while preserving logs.

-- 1. Update user_logs to allow NULL user_id and set ON DELETE SET NULL
ALTER TABLE public.user_logs 
  ALTER COLUMN user_id DROP NOT NULL;

-- Cleanup orphaned references first
UPDATE public.user_logs SET user_id = NULL WHERE user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_logs.user_id);

ALTER TABLE public.user_logs
  DROP CONSTRAINT IF EXISTS user_logs_user_id_fkey,
  ADD CONSTRAINT user_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) 
    ON DELETE SET NULL;

-- 2. Ensure user_profiles cascades deletion from auth.users
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_id_fkey,
  ADD CONSTRAINT user_profiles_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) 
    ON DELETE CASCADE;

-- 3. Update announcements to preserve but decouple on delete
-- Cleanup orphaned references first
UPDATE public.announcements SET created_by = NULL WHERE created_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = announcements.created_by);

ALTER TABLE public.announcements
  DROP CONSTRAINT IF EXISTS announcements_created_by_fkey,
  ADD CONSTRAINT announcements_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) 
    ON DELETE SET NULL;

-- 4. Update checkin_logs to decouple from user_profiles on delete
UPDATE public.checkin_logs SET processed_by = NULL WHERE processed_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = checkin_logs.processed_by);

ALTER TABLE public.checkin_logs
  DROP CONSTRAINT IF EXISTS checkin_logs_processed_by_fkey,
  ADD CONSTRAINT checkin_logs_processed_by_fkey 
    FOREIGN KEY (processed_by) REFERENCES public.user_profiles(id) 
    ON DELETE SET NULL;

-- 5. Update inventory_transfers to decouple from user_profiles on delete
ALTER TABLE public.inventory_transfers 
  ALTER COLUMN initiated_by DROP NOT NULL;

UPDATE public.inventory_transfers SET initiated_by = NULL WHERE initiated_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = inventory_transfers.initiated_by);
UPDATE public.inventory_transfers SET received_by = NULL WHERE received_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = inventory_transfers.received_by);

ALTER TABLE public.inventory_transfers
  DROP CONSTRAINT IF EXISTS inventory_transfers_initiated_by_fkey,
  ADD CONSTRAINT inventory_transfers_initiated_by_fkey 
    FOREIGN KEY (initiated_by) REFERENCES public.user_profiles(id) 
    ON DELETE SET NULL;

ALTER TABLE public.inventory_transfers
  DROP CONSTRAINT IF EXISTS inventory_transfers_received_by_fkey,
  ADD CONSTRAINT inventory_transfers_received_by_fkey 
    FOREIGN KEY (received_by) REFERENCES public.user_profiles(id) 
    ON DELETE SET NULL;

-- 5b. Update inventory_transactions to decouple from user_profiles on delete
UPDATE public.inventory_transactions SET performed_by = NULL WHERE performed_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = inventory_transactions.performed_by);

ALTER TABLE public.inventory_transactions
  DROP CONSTRAINT IF EXISTS inventory_transactions_performed_by_fkey,
  ADD CONSTRAINT inventory_transactions_performed_by_fkey 
    FOREIGN KEY (performed_by) REFERENCES public.user_profiles(id) 
    ON DELETE SET NULL;


-- 6. Update transactions to preserve but decouple on delete
-- Note: transactions.staff_id is NOT NULL in schema. We must make it NULL or keep a dummy user.
-- Making it NULL is safer for hard delete.
ALTER TABLE public.transactions 
  ALTER COLUMN staff_id DROP NOT NULL,
  ALTER COLUMN created_by DROP NOT NULL;

UPDATE public.transactions SET staff_id = NULL WHERE staff_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = transactions.staff_id);
UPDATE public.transactions SET created_by = NULL WHERE created_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = transactions.created_by);
UPDATE public.transactions SET voided_by = NULL WHERE voided_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = transactions.voided_by);

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_staff_id_fkey,
  ADD CONSTRAINT transactions_staff_id_fkey 
    FOREIGN KEY (staff_id) REFERENCES public.user_profiles(id) 
    ON DELETE SET NULL;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_created_by_fkey,
  ADD CONSTRAINT transactions_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) 
    ON DELETE SET NULL;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_voided_by_fkey,
  ADD CONSTRAINT transactions_voided_by_fkey 
    FOREIGN KEY (voided_by) REFERENCES public.user_profiles(id) 
    ON DELETE SET NULL;

-- 7. Update z_readings to preserve but decouple on delete
UPDATE public.z_readings SET created_by = NULL WHERE created_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = z_readings.created_by);

ALTER TABLE public.z_readings
  DROP CONSTRAINT IF EXISTS z_readings_created_by_fkey,
  ADD CONSTRAINT z_readings_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) 
    ON DELETE SET NULL;

-- 8. Customers reference
UPDATE public.customers SET user_id = NULL WHERE user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = customers.user_id);

ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_user_id_fkey,
  ADD CONSTRAINT customers_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) 
    ON DELETE SET NULL;

