-- Aneya Appointment Management System - Database Schema
-- Run this in Supabase SQL Editor for project: ngkmhrckbybqghzfyorp

-- ============================================================================
-- 1. PATIENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Demographics
  name TEXT NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('Male', 'Female', 'Other')),
  date_of_birth DATE NOT NULL,

  -- Physical
  height_cm NUMERIC(5,2),
  weight_kg NUMERIC(5,2),

  -- Medical
  current_medications TEXT DEFAULT '',
  current_conditions TEXT DEFAULT '',
  allergies TEXT DEFAULT '',

  -- Contact (optional)
  email TEXT,
  phone TEXT,

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  archived BOOLEAN DEFAULT false
);

-- RLS Policies for patients
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all patients"
  ON public.patients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create patients"
  ON public.patients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update patients"
  ON public.patients FOR UPDATE
  TO authenticated
  USING (true);

-- Indexes for patients
CREATE INDEX idx_patients_created_at ON public.patients(created_at DESC);
CREATE INDEX idx_patients_name ON public.patients(name);
CREATE INDEX idx_patients_archived ON public.patients(archived) WHERE archived = false;

-- ============================================================================
-- 2. APPOINTMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Core
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 15 CHECK (duration_minutes > 0),

  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')
  ),

  -- Details
  appointment_type TEXT DEFAULT 'general',
  reason TEXT,
  notes TEXT,

  -- Link to consultation (set when saved)
  consultation_id UUID,

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT
);

-- RLS Policies for appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create appointments"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (true);

-- Indexes for appointments
CREATE INDEX idx_appointments_scheduled_time ON public.appointments(scheduled_time DESC);
CREATE INDEX idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX idx_appointments_status ON public.appointments(status);

-- ============================================================================
-- 3. CONSULTATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Links
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,

  -- Input
  consultation_text TEXT NOT NULL, -- Translated/final consultation text (English)
  original_transcript TEXT, -- Original language transcript before translation
  transcription_language TEXT,

  -- Patient snapshot at time of consultation
  patient_snapshot JSONB NOT NULL,

  -- Analysis from backend
  analysis_result JSONB,
  diagnoses JSONB,
  guidelines_found JSONB,

  -- Metadata
  consultation_duration_seconds INTEGER,
  performed_by UUID REFERENCES auth.users(id),
  location_detected TEXT,
  backend_api_version TEXT
);

-- RLS Policies for consultations
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all consultations"
  ON public.consultations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create consultations"
  ON public.consultations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = performed_by);

-- Indexes for consultations
CREATE INDEX idx_consultations_patient_id ON public.consultations(patient_id);
CREATE INDEX idx_consultations_appointment_id ON public.consultations(appointment_id);
CREATE INDEX idx_consultations_created_at ON public.consultations(created_at DESC);

-- ============================================================================
-- 4. AUTO-LINK CONSULTATION TO APPOINTMENT (Trigger)
-- ============================================================================
CREATE OR REPLACE FUNCTION link_consultation_to_appointment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.appointment_id IS NOT NULL THEN
    UPDATE public.appointments
    SET
      consultation_id = NEW.id,
      status = 'completed',
      updated_at = now()
    WHERE id = NEW.appointment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_consultation_insert
  AFTER INSERT ON public.consultations
  FOR EACH ROW
  EXECUTE FUNCTION link_consultation_to_appointment();

-- ============================================================================
-- 5. SYMPTOM TRACKER TABLE (Future - for patients to log symptoms)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.symptom_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  symptom_date DATE NOT NULL,
  symptom_description TEXT NOT NULL,
  severity INTEGER CHECK (severity BETWEEN 1 AND 10),
  medications_taken TEXT,
  notes TEXT,
  reported_by TEXT DEFAULT 'patient'
);

-- RLS Policies for symptom_tracker
ALTER TABLE public.symptom_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all symptom tracker entries"
  ON public.symptom_tracker FOR SELECT
  TO authenticated
  USING (true);

-- Indexes for symptom_tracker
CREATE INDEX idx_symptom_tracker_patient_id ON public.symptom_tracker(patient_id);
CREATE INDEX idx_symptom_tracker_symptom_date ON public.symptom_tracker(symptom_date DESC);

-- ============================================================================
-- 6. AUTO-UPDATE TIMESTAMP FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consultations_updated_at
  BEFORE UPDATE ON public.consultations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Verify tables created successfully
-- 3. Test RLS policies with sample queries
-- ============================================================================

-- ============================================================================
-- SAMPLE TEST DATA (Optional - for development)
-- ============================================================================
-- Uncomment to insert sample data:

-- INSERT INTO public.patients (name, sex, date_of_birth, height_cm, weight_kg, current_medications, current_conditions, allergies, created_by)
-- VALUES
--   ('John Smith', 'Male', '1980-05-15', 175.0, 78.5, 'Metformin 500mg BD, Ramipril 5mg OD', 'Type 2 Diabetes Mellitus, Hypertension', 'Penicillin', auth.uid()),
--   ('Jane Doe', 'Female', '1992-08-22', 162.0, 65.0, '', '', 'None known', auth.uid()),
--   ('Robert Johnson', 'Male', '1975-11-30', 180.0, 90.0, 'Atorvastatin 20mg ON', 'Hyperlipidemia', '', auth.uid());

-- INSERT INTO public.appointments (patient_id, scheduled_time, duration_minutes, status, appointment_type, reason, created_by)
-- VALUES
--   ((SELECT id FROM public.patients WHERE name = 'John Smith'), now() + interval '1 hour', 30, 'scheduled', 'general', 'Follow-up for diabetes management', auth.uid()),
--   ((SELECT id FROM public.patients WHERE name = 'Jane Doe'), now() + interval '2 hours', 15, 'scheduled', 'general', 'Annual check-up', auth.uid()),
--   ((SELECT id FROM public.patients WHERE name = 'Robert Johnson'), now() - interval '1 day', 30, 'completed', 'general', 'Cholesterol review', auth.uid());
