-- Inventory Stock Transfers
-- =========================
-- Track stock transfers between branches with approval workflow

-- 1. Create inventory_transfers table
CREATE TABLE IF NOT EXISTS public.inventory_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.inventory_products(id) ON DELETE CASCADE,
  from_branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  to_branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'received', 'cancelled')),
  initiated_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  received_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  reason TEXT,
  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  received_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT different_branches CHECK (from_branch_id != to_branch_id)
);

-- 2. Create indexes for query optimization
CREATE INDEX IF NOT EXISTS idx_transfers_from_branch ON public.inventory_transfers(from_branch_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_branch ON public.inventory_transfers(to_branch_id);
CREATE INDEX IF NOT EXISTS idx_transfers_product ON public.inventory_transfers(product_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON public.inventory_transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_created ON public.inventory_transfers(created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE public.inventory_transfers ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if they exist
DROP POLICY IF EXISTS "transfers_select_policy" ON public.inventory_transfers;
DROP POLICY IF EXISTS "transfers_insert_policy" ON public.inventory_transfers;
DROP POLICY IF EXISTS "transfers_update_policy" ON public.inventory_transfers;

-- 5. RLS Policies
-- Super admins can see all transfers
-- Branch admins/staff can see transfers for their branch (as sender or receiver)
CREATE POLICY "transfers_select_policy"
  ON public.inventory_transfers FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      -- Super admin sees all
      EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'super_admin'
      )
      OR
      -- Branch admin/staff sees their branch transfers
      EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.id = auth.uid() AND (
          user_profiles.branch_id = inventory_transfers.from_branch_id OR
          user_profiles.branch_id = inventory_transfers.to_branch_id
        )
      )
    )
  );

-- Only super_admin or from_branch admin can create transfers
CREATE POLICY "transfers_insert_policy"
  ON public.inventory_transfers FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'super_admin'
      )
      OR
      EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.id = auth.uid() AND 
              user_profiles.branch_id = from_branch_id AND
              user_profiles.role IN ('super_admin', 'branch_admin')
      )
    )
  );

-- Super admin or receiving branch admin can update (approve/receive)
CREATE POLICY "transfers_update_policy"
  ON public.inventory_transfers FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND (
      EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'super_admin'
      )
      OR
      EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.id = auth.uid() AND 
              user_profiles.branch_id = to_branch_id AND
              user_profiles.role IN ('super_admin', 'branch_admin')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND 
            user_profiles.branch_id = to_branch_id AND
            user_profiles.role IN ('super_admin', 'branch_admin')
    )
  );

-- 6. Create a transaction log entry when transfer is received
CREATE OR REPLACE FUNCTION public.handle_transfer_received()
RETURNS TRIGGER AS $$
DECLARE
  from_stock RECORD;
  to_stock RECORD;
BEGIN
  -- Only process when status changes to 'received'
  IF NEW.status = 'received' AND OLD.status != 'received' THEN
    -- Deduct from source branch
    UPDATE public.inventory_stocks
    SET quantity = inventory_stocks.quantity - NEW.quantity,
        updated_at = now()
    WHERE product_id = NEW.product_id AND branch_id = NEW.from_branch_id;
    
    -- Add to destination branch
    INSERT INTO public.inventory_stocks (product_id, branch_id, quantity, updated_at)
    VALUES (NEW.product_id, NEW.to_branch_id, NEW.quantity, now())
    ON CONFLICT (product_id, branch_id) 
    DO UPDATE SET quantity = inventory_stocks.quantity + NEW.quantity, updated_at = now();
    -- Create audit logs
    INSERT INTO public.inventory_transactions (product_id, branch_id, type, quantity, previous_quantity, new_quantity, reason, performed_by, created_at)
    SELECT 
      NEW.product_id,
      NEW.from_branch_id,
      'transfer'::text,
      -NEW.quantity,
        (SELECT quantity FROM public.inventory_stocks WHERE product_id = NEW.product_id AND branch_id = NEW.from_branch_id) + NEW.quantity,
        (SELECT quantity FROM public.inventory_stocks WHERE product_id = NEW.product_id AND branch_id = NEW.from_branch_id),
      'Transfer to: ' || (SELECT name FROM public.branches WHERE id = NEW.to_branch_id),
      NEW.initiated_by,
      now();
    
    INSERT INTO public.inventory_transactions (product_id, branch_id, type, quantity, previous_quantity, new_quantity, reason, performed_by, created_at)
    SELECT 
      NEW.product_id,
      NEW.to_branch_id,
      'transfer'::text,
      NEW.quantity,
      COALESCE((SELECT quantity FROM public.inventory_stocks WHERE product_id = NEW.product_id AND branch_id = NEW.to_branch_id) - NEW.quantity, 0),
      COALESCE((SELECT quantity FROM public.inventory_stocks WHERE product_id = NEW.product_id AND branch_id = NEW.to_branch_id), 0),
      'Transfer from: ' || (SELECT name FROM public.branches WHERE id = NEW.from_branch_id),
      NEW.received_by,
      now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS transfer_received_trigger ON public.inventory_transfers;

-- Create trigger
CREATE TRIGGER transfer_received_trigger
  AFTER UPDATE ON public.inventory_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_transfer_received();
