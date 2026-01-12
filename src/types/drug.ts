/**
 * Drug detail type definitions for Aneya system
 */

/**
 * DrugBank-specific drug information (international)
 */
export interface DrugBankData {
  drug_name: string;
  drugbank_id: string;
  url: string;
  type?: string; // Drug type (e.g., "Small Molecule", "Biotech")
  description?: string;
  indications?: string;
  dosage?: string;
  side_effects?: string;
  interactions?: string;
  pharmacodynamics?: string;
  mechanism_of_action?: string;
  absorption?: string;
  protein_binding?: string;
  metabolism?: string;
  half_life?: string;
  toxicity?: string;
  targets?: string[];
  success: boolean;
  error?: string | null;
}

/**
 * BNF-specific drug information (UK)
 */
export interface BNFData {
  drug_name: string;
  url: string;
  indications?: string;
  dosage?: string;
  contraindications?: string;
  cautions?: string;
  side_effects?: string;
  interactions?: string;
  pregnancy?: string;
  breast_feeding?: string;
  renal_impairment?: string;
  hepatic_impairment?: string;
  prescribing_info?: string;
  success: boolean;
  error?: string | null;
}

/**
 * Unified drug details structure sent from backend to frontend
 */
export interface DrugDetails {
  drug_name: string;
  url: string;
  drugbank_data?: DrugBankData;
  bnf_data?: BNFData;
}

/**
 * Drug interaction with severity level
 */
export interface DrugInteraction {
  drug_name: string;
  description: string;
  severity?: 'high' | 'moderate' | 'low';
}
