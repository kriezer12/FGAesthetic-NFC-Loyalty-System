-- Migration to make nfc_uid nullable in customers table
-- This allows registering customers without an NFC card.

ALTER TABLE public.customers ALTER COLUMN nfc_uid DROP NOT NULL;

-- The UNIQUE constraint on nfc_uid remains, but in PostgreSQL, 
-- multiple NULL values are allowed in a column with a UNIQUE constraint.
