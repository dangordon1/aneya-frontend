-- Migration: Add user_id column to patients table
-- This column links a patient record to their Firebase Auth user account
-- for patient portal login.
--
-- Context:
-- - Doctors can create patient records (created_by = doctor's Firebase UID)
-- - When a patient signs up for the portal, their Firebase UID is stored in user_id
-- - user_id is used to load the patient's profile when they log in
-- - created_by tracks who created the record (could be a doctor)

-- ============================================================================
-- 1. ADD user_id COLUMN TO patients TABLE
-- ============================================================================

-- Add user_id column (nullable because doctors can create patients before they sign up)
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN public.patients.user_id IS 'Firebase UID of the patient user account (null if patient has not yet signed up for portal access)';

-- ============================================================================
-- 2. ADD INDEX FOR PERFORMANCE
-- ============================================================================

-- Create index on user_id for fast lookups when loading patient profiles
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);

-- ============================================================================
-- 3. ADD UNIQUE CONSTRAINT (optional but recommended)
-- ============================================================================

-- Ensure one patient record per user_id (patient can't have multiple records)
-- Only enforce uniqueness for non-null values
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_user_id_unique
ON public.patients(user_id)
WHERE user_id IS NOT NULL;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- After running this migration:
-- 1. Patients table will have user_id column
-- 2. Existing patients created by doctors will have user_id = NULL
-- 3. When those patients sign up, their user_id will be set
-- 4. New self-signup patients will have user_id set immediately
-- 5. Patient portal login will work by querying .eq('user_id', firebaseUid)
-- ============================================================================
