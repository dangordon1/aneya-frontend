/**
 * Form Data Transformer
 *
 * Transforms consultation form JSONB data between backend format and DoctorReportCard component format.
 */

export interface PatientData {
  patientName: string;
  patientId: string;
  address: string;
  medicalHistory: string;
  height: string;
  weight: string;
  age: string;
  bloodPressureSystolic: string;
  bloodPressureDiastolic: string;
  diabetes: boolean;
  hypertension: boolean;
  allergies: boolean;
  smokingStatus: boolean;
}

export interface PregnancyRecord {
  no: number;
  modeOfConception: string;
  modeOfDelivery: string;
  sexAge: string;
  aliveDead: string;
  abortion: string;
  birthWt: string;
  year: string;
  breastFeeding: string;
  anomalies: string;
}

interface BackendFormData {
  vital_signs?: {
    systolic_bp?: number;
    diastolic_bp?: number;
    height?: number;
    weight?: number;
  };
  previous_pregnancies?: Array<{
    mode_of_conception?: string;
    mode_of_delivery?: string;
    sex?: string;
    age?: number;
    birth_weight_kg?: number;
    year?: number;
    alive?: boolean;
    abortion?: boolean;
    breastfeeding_months?: number;
    anomalies?: string;
  }>;
  medical_history?: {
    diabetes?: boolean;
    hypertension?: boolean;
    allergies?: boolean;
    smoking?: boolean;
    pcos?: boolean;
  };
  treatment_history?: string;
  history_text?: string;
}

interface PatientInfo {
  name?: string;
  patient_id?: string;
  address?: string;
  date_of_birth?: string;
}

/**
 * Transform backend JSONB data to DoctorReportCard component format
 */
export function transformBackendToReportCard(
  backendData: BackendFormData | null,
  patientInfo: PatientInfo
): { patientData: PatientData; pregnancyHistory: PregnancyRecord[] } {
  // Extract vital signs
  const vitalSigns = backendData?.vital_signs || {};
  const medicalHistoryData = backendData?.medical_history || {};

  // Build patient data
  const patientData: PatientData = {
    // Patient information
    patientName: patientInfo.name || '',
    patientId: patientInfo.patient_id || '',
    address: patientInfo.address || '',

    // Vitals (convert numbers to strings)
    age: calculateAge(patientInfo.date_of_birth),
    height: vitalSigns.height?.toString() || '',
    weight: vitalSigns.weight?.toString() || '',
    bloodPressureSystolic: vitalSigns.systolic_bp?.toString() || '',
    bloodPressureDiastolic: vitalSigns.diastolic_bp?.toString() || '',

    // Medical conditions
    diabetes: medicalHistoryData.diabetes || false,
    hypertension: medicalHistoryData.hypertension || false,
    allergies: medicalHistoryData.allergies || false,
    smokingStatus: medicalHistoryData.smoking || false,

    // Medical history text
    medicalHistory: buildMedicalHistoryText(backendData)
  };

  // Extract pregnancy history
  const pregnancyHistory = transformPregnancyHistory(
    backendData?.previous_pregnancies || []
  );

  return {
    patientData,
    pregnancyHistory
  };
}

/**
 * Transform DoctorReportCard component format to backend JSONB data
 */
export function transformReportCardToBackend(
  patientData: PatientData,
  pregnancyHistory: PregnancyRecord[]
): BackendFormData {
  // Build vital signs
  const vitalSigns: any = {};

  if (patientData.height) {
    vitalSigns.height = parseFloat(patientData.height) || 0;
  }
  if (patientData.weight) {
    vitalSigns.weight = parseFloat(patientData.weight) || 0;
  }
  if (patientData.bloodPressureSystolic) {
    vitalSigns.systolic_bp = parseFloat(patientData.bloodPressureSystolic) || 0;
  }
  if (patientData.bloodPressureDiastolic) {
    vitalSigns.diastolic_bp = parseFloat(patientData.bloodPressureDiastolic) || 0;
  }

  // Build medical history
  const medicalHistory: any = {
    diabetes: patientData.diabetes,
    hypertension: patientData.hypertension,
    allergies: patientData.allergies,
    smoking: patientData.smokingStatus
  };

  // Transform pregnancy history back
  const previousPregnancies = pregnancyHistory.map(record => {
    const { sex, age: childAge } = parseSexAge(record.sexAge);
    const breastfeedingMonths = parseBreastfeeding(record.breastFeeding);

    return {
      mode_of_conception: record.modeOfConception || '',
      mode_of_delivery: record.modeOfDelivery || '',
      sex: sex || '',
      age: childAge || 0,
      birth_weight_kg: parseFloat(record.birthWt) || 0,
      year: parseInt(record.year) || 0,
      alive: record.aliveDead === 'Alive',
      abortion: record.abortion === 'Yes',
      breastfeeding_months: breastfeedingMonths,
      anomalies: record.anomalies || 'None'
    };
  });

  return {
    vital_signs: vitalSigns,
    previous_pregnancies: previousPregnancies,
    medical_history: medicalHistory,
    history_text: patientData.medicalHistory
  };
}

/**
 * Transform JSONB pregnancy data to DoctorReportCard PregnancyRecord format
 */
function transformPregnancyHistory(pregnancies: any[]): PregnancyRecord[] {
  return pregnancies.map((preg, idx) => ({
    no: idx + 1,
    modeOfConception: preg.mode_of_conception || 'Natural',
    modeOfDelivery: preg.mode_of_delivery || '',
    sexAge: formatSexAge(preg.sex, preg.age),
    aliveDead: preg.alive ? 'Alive' : 'Dead',
    abortion: preg.abortion ? 'Yes' : 'No',
    birthWt: preg.birth_weight_kg?.toString() || '',
    year: preg.year?.toString() || '',
    breastFeeding: formatBreastfeeding(preg.breastfeeding_months),
    anomalies: preg.anomalies || 'None'
  }));
}

/**
 * Format sex and age as 'Male/5yrs' or 'Female/2yrs'
 */
function formatSexAge(sex?: string, age?: number): string {
  if (!sex) return '';

  const sexFormatted = sex.charAt(0).toUpperCase() + sex.slice(1).toLowerCase();
  const ageStr = age ? `${age}yrs` : '';

  return ageStr ? `${sexFormatted}/${ageStr}` : sexFormatted;
}

/**
 * Parse 'Male/5yrs' or 'Female/2yrs' back to sex and age
 */
function parseSexAge(sexAge: string): { sex: string; age: number } {
  if (!sexAge) return { sex: '', age: 0 };

  const parts = sexAge.split('/');
  const sex = parts[0]?.toLowerCase() || '';
  const ageMatch = parts[1]?.match(/(\d+)/);
  const age = ageMatch ? parseInt(ageMatch[1]) : 0;

  return { sex, age };
}

/**
 * Format breastfeeding duration as 'Yes - 6mo'
 */
function formatBreastfeeding(months?: number): string {
  if (!months) return 'No';
  return `Yes - ${months}mo`;
}

/**
 * Parse 'Yes - 6mo' back to months
 */
function parseBreastfeeding(breastFeeding: string): number {
  if (!breastFeeding || breastFeeding === 'No') return 0;

  const match = breastFeeding.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

/**
 * Build comprehensive medical history text from form data
 */
function buildMedicalHistoryText(formData: BackendFormData | null): string {
  if (!formData) return 'No significant medical history recorded.';

  const sections: string[] = [];

  // Add treatment history
  if (formData.treatment_history) {
    sections.push(formData.treatment_history);
  }

  // Add significant findings
  const medicalHistory = formData.medical_history || {};
  const conditions: string[] = [];

  if (medicalHistory.diabetes) {
    conditions.push('Diabetes');
  }
  if (medicalHistory.hypertension) {
    conditions.push('Hypertension');
  }
  if (medicalHistory.pcos) {
    conditions.push('PCOS');
  }

  if (conditions.length > 0) {
    sections.push(`Known conditions: ${conditions.join(', ')}`);
  }

  // Add any free-text history
  if (formData.history_text) {
    sections.push(formData.history_text);
  }

  return sections.length > 0
    ? sections.join('. ')
    : 'No significant medical history recorded.';
}

/**
 * Calculate age from date of birth
 */
function calculateAge(dateOfBirth?: string): string {
  if (!dateOfBirth) return '0';

  try {
    const dob = new Date(dateOfBirth);
    const today = new Date();

    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    return age.toString();
  } catch (error) {
    console.error('Error calculating age:', error);
    return '0';
  }
}
