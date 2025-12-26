/**
 * Specialty Detector Utility
 * Functions to detect and handle specialty-specific features and forms
 */

/**
 * Checks if a doctor has OB/GYN specialty
 * @param doctorSpecialty - The specialty string from the Doctor object
 * @returns true if the doctor specializes in OB/GYN
 */
export function isOBGynAppointment(doctorSpecialty: string | null | undefined): boolean {
  if (!doctorSpecialty) return false;

  const normalized = doctorSpecialty.toLowerCase().trim();

  // Check for various OB/GYN specialty names
  return (
    normalized === 'obgyn' ||
    normalized === 'ob/gyn' ||
    normalized === 'obstetrics and gynaecology' ||
    normalized === 'obstetrics and gynecology' ||
    normalized === 'obstetric and gynaecological' ||
    normalized === 'obstetric and gynecological' ||
    normalized === 'gynecology' ||
    normalized === 'gynaecology' ||
    normalized === 'reproductive health' ||
    normalized === 'women\'s health' ||
    normalized === 'maternal health'
  );
}

/**
 * Checks if an appointment requires specialty-specific forms
 * @param doctorSpecialty - The specialty string from the Doctor object
 * @returns true if the appointment requires specialty forms
 */
export function requiresSpecialtyForms(doctorSpecialty: string | null | undefined): boolean {
  // Currently only OB/GYN has specialty forms
  return isOBGynAppointment(doctorSpecialty);
}

/**
 * Gets the specialty category for an appointment
 * @param doctorSpecialty - The specialty string from the Doctor object
 * @returns The category of specialty, or 'general' if no specialty detected
 */
export function getSpecialtyCategory(doctorSpecialty: string | null | undefined): 'obgyn' | 'general' {
  if (isOBGynAppointment(doctorSpecialty)) {
    return 'obgyn';
  }
  return 'general';
}
