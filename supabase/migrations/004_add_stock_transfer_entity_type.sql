-- Add 'stock_transfer' to entity_type enum
-- This allows user_logs to properly log stock transfer related actions

ALTER TYPE entity_type ADD VALUE 'stock_transfer';
