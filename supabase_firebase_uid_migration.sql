-- Migration: Change UUID columns to TEXT for Firebase UID compatibility
-- Firebase UIDs are alphanumeric strings (e.g., "WpRqNhIqG1OgFNVb9ySfVpTPWJF2")
-- Supabase UUID type expects format like "550e8400-e29b-41d4-a716-446655440000"
-- This migration changes user reference columns from UUID to TEXT

-- ============================================================================
-- 1. DROP FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Drop foreign key on patients.created_by
ALTER TABLE public.patients
DROP CONSTRAINT IF EXISTS patients_created_by_fkey;

-- Drop foreign key on appointments.created_by
ALTER TABLE public.appointments
DROP CONSTRAINT IF EXISTS appointments_created_by_fkey;

-- Drop foreign key on consultations.performed_by
ALTER TABLE public.consultations
DROP CONSTRAINT IF EXISTS consultations_performed_by_fkey;

-- ============================================================================
-- 2. CHANGE COLUMN TYPES FROM UUID TO TEXT
-- ============================================================================

-- Change patients.created_by from UUID to TEXT
ALTER TABLE public.patients
ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;

-- Change appointments.created_by from UUID to TEXT
ALTER TABLE public.appointments
ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;

-- Change consultations.performed_by from UUID to TEXT
ALTER TABLE public.consultations
ALTER COLUMN performed_by TYPE TEXT USING performed_by::TEXT;

-- ============================================================================
-- 3. UPDATE RLS POLICIES (need to use text comparison now)
-- ============================================================================

-- Drop existing INSERT policies that use auth.uid()
DROP POLICY IF EXISTS "Users can create patients" ON public.patients;
DROP POLICY IF EXISTS "Users can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can create consultations" ON public.consultations;

-- Recreate policies - these will work with TEXT columns
-- Note: Since we're using Firebase Auth (not Supabase Auth), RLS policies
-- using auth.uid() won't work. We'll use permissive policies for now
-- and rely on application-level security.

CREATE POLICY "Users can create patients"
  ON public.patients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can create appointments"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can create consultations"
  ON public.consultations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- 4. ADD INDEXES FOR TEXT COLUMNS (for query performance)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_patients_created_by ON public.patients(created_by);
CREATE INDEX IF NOT EXISTS idx_appointments_created_by ON public.appointments(created_by);
CREATE INDEX IF NOT EXISTS idx_consultations_performed_by ON public.consultations(performed_by);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- After running this migration:
-- 1. Firebase UIDs will be stored as TEXT in the database
-- 2. Queries using .eq('created_by', user.id) will work correctly
-- 3. No more "invalid input syntax for type uuid" errors
-- ============================================================================
