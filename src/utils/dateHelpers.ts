/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: string): number {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Calculate age as a formatted string
 */
export function calculateAgeString(dateOfBirth: string): string {
  const age = calculateAge(dateOfBirth);
  return `${age} years`;
}

/**
 * Get age string from either DOB or stored age_years
 * DOB takes precedence if both exist
 */
export function getPatientAge(patient: {
  date_of_birth: string | null;
  age_years: number | null;
}): string {
  if (patient.date_of_birth) {
    return calculateAgeString(patient.date_of_birth);
  } else if (patient.age_years) {
    return `${patient.age_years} years`;
  }
  return 'Unknown';
}

/**
 * Get age as integer from either DOB or stored age_years
 */
export function getPatientAgeNumber(patient: {
  date_of_birth: string | null;
  age_years: number | null;
}): number | null {
  if (patient.date_of_birth) {
    return calculateAge(patient.date_of_birth);
  }
  return patient.age_years || null;
}

/**
 * Format date to UK format (DD/MM/YYYY)
 */
export function formatDateUK(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format time to 24-hour format (HH:MM)
 */
export function formatTime24(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format duration in seconds to readable string
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}
