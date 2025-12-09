-- Migration: Add original_transcript field to consultations table
-- Run this in Supabase SQL Editor to update existing database

-- Add the original_transcript column
ALTER TABLE public.consultations
ADD COLUMN IF NOT EXISTS original_transcript TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.consultations.original_transcript IS 'Original language transcript before translation to English';
COMMENT ON COLUMN public.consultations.consultation_text IS 'Translated/final consultation text (English)';
