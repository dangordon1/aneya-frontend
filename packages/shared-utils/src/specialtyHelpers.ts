/**
 * Specialty Helper Functions
 *
 * Replaces the old specialty detector with simple, type-safe helpers
 * that work with the standardized MedicalSpecialtyType enum.
 */

import { MedicalSpecialtyType } from '../types/database';

/**
 * Checks if a specialty requires OB/GYN-specific forms
 *
 * @param specialty - The doctor's medical specialty
 * @returns true if the specialty is OB/GYN, false otherwise
 */
export function requiresOBGynForms(specialty: MedicalSpecialtyType | null | undefined): boolean {
  return specialty === 'obgyn';
}

/**
 * Checks if a specialty requires specialty-specific forms
 *
 * Currently only OB/GYN has specialty-specific forms, but this function
 * is designed to be extensible for future specialties (cardiology, etc.)
 *
 * @param specialty - The doctor's medical specialty
 * @returns true if the specialty requires special forms, false otherwise
 */
export function requiresSpecialtyForms(specialty: MedicalSpecialtyType | null | undefined): boolean {
  return requiresOBGynForms(specialty);
  // Future: || requiresCardiologyForms(specialty) || requiresDermatologyForms(specialty)
}

/**
 * Gets the human-readable display label for a specialty
 *
 * @param specialty - The doctor's medical specialty
 * @returns The formatted display label
 */
export function getSpecialtyLabel(specialty: MedicalSpecialtyType | null | undefined): string {
  const labels: Record<MedicalSpecialtyType, string> = {
    general: 'General Practice',
    obgyn: 'Obstetrics & Gynaecology',
    cardiology: 'Cardiology',
    neurology: 'Neurology',
    dermatology: 'Dermatology',
    other: 'Other',
  };

  return specialty ? labels[specialty] : 'General Practice';
}
