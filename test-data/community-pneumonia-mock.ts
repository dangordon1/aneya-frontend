/**
 * Mock data for community pneumonia consultation
 * Generated from backend API on 2024-12-15
 *
 * Use this to test ReportScreen designs without calling the backend
 */

export const communityPneumoniaResult = {
  "diagnoses": [
    {
      "diagnosis": "Community-acquired pneumonia (CAP) with features of COPD exacerbation",
      "confidence": "high",
      "source": "NICE NG114 (Chronic obstructive pulmonary disease acute exacerbation: antimicrobial prescribing) and NICE ES37 (Antimicrobial prescribing: delafloxacin for community-acquired pneumonia)",
      "url": "https://www.nice.org.uk/guidance/ng114",
      "primary_care": {
        "medications": [
          {
            "drug_name": "Amoxicillin",
            "variations": ["Amoxicillin", "Amoxicillin trihydrate", "Amoxicillin sodium"]
          },
          {
            "drug_name": "Doxycycline",
            "variations": ["Doxycycline", "Doxycycline hyclate", "Doxycycline monohydrate"]
          },
          {
            "drug_name": "Clarithromycin",
            "variations": ["Clarithromycin"]
          },
          {
            "drug_name": "Paracetamol",
            "variations": ["Paracetamol", "Acetaminophen"]
          },
          {
            "drug_name": "Ibuprofen",
            "variations": ["Ibuprofen"]
          },
          {
            "drug_name": "Salbutamol",
            "variations": ["Salbutamol", "Albuterol", "Salbutamol sulfate"]
          }
        ],
        "supportive_care": [
          "Oxygen therapy to maintain SpO2 >90%",
          "Adequate hydration and fluid intake",
          "Bed rest during acute phase",
          "Chest physiotherapy to assist sputum clearance",
          "Breathing exercises (pursed-lip breathing)",
          "Monitor and record vital signs including SpO2, RR, temperature"
        ],
        "clinical_guidance": "CURB-65 score of 2 indicates low-intermediate risk but patient requires hospital assessment given SpO2 92%, RR 26, fever 38.8°C, and pleuritic chest pain. For antibiotic selection: Consider amoxicillin 500mg three times daily for 5-7 days (standard CAP), or doxycycline 100mg twice daily, or clarithromycin if allergy to beta-lactams. Continue existing COPD medications (Tiotropium). Ensure diabetes management continues (Metformin monitoring). Monitor fever, sputum characteristics, respiratory status hourly initially.",
        "when_to_escalate": [
          "SpO2 persistently <90% despite oxygen therapy",
          "Respiratory rate >30 breaths per minute",
          "Systolic BP <90 mmHg or signs of hypotension",
          "Confusion or altered mental status",
          "Severe chest pain or signs of pleural effusion",
          "No clinical improvement after 48 hours of antibiotics",
          "Worsening breathlessness",
          "Coughing up blood (haemoptysis)",
          "Signs of sepsis (tachycardia >120, fever, tachypnoea)",
          "Acute kidney injury or urine output concerns"
        ]
      },
      "diagnostics": {
        "required": [
          "Chest X-ray (PA and lateral) - to confirm pneumonia, assess extent, and exclude complications",
          "Full blood count (FBC) - assess white cell count, infection severity",
          "Urea and electrolytes - assess renal function (completes CURB-65 assessment)",
          "C-reactive protein (CRP) or procalcitonin - assess inflammatory response",
          "Blood cultures (if hospitalized) - identify causative organism",
          "Sputum culture and microscopy - guide antibiotic selection",
          "Arterial or venous blood gas - assess oxygenation and CO2 retention (important in COPD)",
          "ECG - assess for cardiac complications given age and comorbidities"
        ],
        "monitoring": [
          "SpO2 continuous monitoring - target >90%",
          "Daily temperature recordings",
          "Respiratory rate monitoring - expect to trend downward with treatment",
          "Sputum colour and volume - expect clearing within 48-72 hours",
          "Repeat chest X-ray at 4-6 weeks if consolidation present (to exclude malignancy in smokers)"
        ],
        "referral_criteria": [
          "Referral to hospital medicine/respiratory specialist if deterioration despite antibiotics",
          "Intensive care referral if respiratory failure develops (SpO2 <90% despite oxygen, RR >30, CO2 retention)",
          "Infectious disease consultation if atypical organisms suspected or immunocompromised",
          "Consider pulmonology review for COPD optimization given recurrent infections"
        ]
      },
      "follow_up": {
        "timeframe": "Review at 48-72 hours to assess treatment response. If hospitalized, daily assessment. Community follow-up at 1 week post-discharge.",
        "monitoring": [
          "Clinical improvement in cough, sputum production, fever, breathlessness",
          "Vital sign normalization (fever resolution, respiratory rate reduction to <20)",
          "SpO2 improvement to baseline or >94%",
          "Chest auscultation findings - crackles should resolve within 48-72 hours",
          "Symptom severity using CAP severity scales",
          "Tolerance of oral intake and hydration status",
          "Blood glucose management in view of infection stress (diabetes comorbidity)"
        ],
        "referral_criteria": [
          "No improvement or worsening within 48-72 hours despite appropriate antibiotics - consider changing antibiotic class or investigating for complications (pleural effusion, empyema, sepsis)",
          "Development of complications - refer to hospital immediately",
          "Severe immunosuppression or atypical presentation - specialist review needed",
          "After recovery: Consider COPD action plan review and pulmonary rehabilitation referral"
        ]
      }
    }
  ],
  "summary": "\nCLINICAL ANALYSIS REPORT\n\nDIAGNOSES (1):\n\n- Community-acquired pneumonia (CAP) with features of COPD exacerbation (high confidence)",
  "bnf_prescribing_guidance": [],
  "guidelines_found": [
    {
      "reference": "NG114",
      "title": "Chronic obstructive pulmonary disease acute exacerbation: antimicrobial prescribing",
      "url": "https://www.nice.org.uk/guidance/ng114"
    },
    {
      "reference": "ES37",
      "title": "Antimicrobial prescribing: delafloxacin for community-acquired pneumonia",
      "url": "https://www.nice.org.uk/guidance/es37"
    }
  ],
  "cks_topics": [],
  "bnf_summaries": []
};

export const communityPneumoniaPatientDetails = {
  name: "John Smith",
  sex: "Male",
  age: "72",
  height: "175 cm",
  weight: "82 kg",
  currentMedications: "Metformin 500mg BD, Lisinopril 10mg OD, Tiotropium inhaler",
  currentConditions: "COPD, Type 2 diabetes, Hypertension"
};

export const communityPneumoniaDrugDetails: Record<string, any> = {
  "Amoxicillin": {
    drug_name: "Amoxicillin",
    url: "https://bnf.nice.org.uk/drugs/amoxicillin/",
    bnf_data: {
      dosage: "500 mg 3 times a day; increased if necessary to 1 g 3 times a day, increased dose used in severe infection",
      side_effects: "Common: Diarrhoea, nausea, skin reactions. Uncommon: Vomiting. Rare: Antibiotic-associated colitis, crystalluria.",
      interactions: "May affect efficacy of oral contraceptives. Concurrent use with allopurinol may increase risk of skin reactions."
    }
  },
  "Doxycycline": {
    drug_name: "Doxycycline",
    url: "https://bnf.nice.org.uk/drugs/doxycycline/",
    bnf_data: {
      dosage: "200 mg on first day, then 100 mg daily; severe infections: 200 mg daily",
      side_effects: "Common: Diarrhoea, headache, nausea, vomiting. Uncommon: Rash. Rare: Oesophageal irritation.",
      interactions: "Antacids and iron reduce absorption - separate doses by 2-3 hours. May enhance anticoagulant effects of warfarin."
    }
  },
  "Clarithromycin": {
    drug_name: "Clarithromycin",
    url: "https://bnf.nice.org.uk/drugs/clarithromycin/",
    bnf_data: {
      dosage: "250-500 mg twice daily for 7-14 days",
      side_effects: "Common: Abdominal pain, diarrhoea, dyspepsia, nausea, taste altered, vomiting. Uncommon: Headache, insomnia.",
      interactions: "Increases statin levels - avoid with simvastatin. Multiple CYP3A4 interactions."
    }
  },
  "Paracetamol": {
    drug_name: "Paracetamol",
    url: "https://bnf.nice.org.uk/drugs/paracetamol/",
    bnf_data: {
      dosage: "0.5-1 g every 4-6 hours; maximum 4 g per day",
      side_effects: "Rare: Skin reactions, thrombocytopenia, blood disorders. Overdose causes severe hepatotoxicity.",
      interactions: "Chronic alcohol consumption increases hepatotoxicity risk. May enhance anticoagulant effect of coumarins."
    }
  },
  "Salbutamol": {
    drug_name: "Salbutamol",
    url: "https://bnf.nice.org.uk/drugs/salbutamol/",
    bnf_data: {
      dosage: "By inhalation: 100-200 micrograms (1-2 puffs) up to 4 times daily for symptom relief",
      side_effects: "Common: Fine tremor, headache, muscle cramps, palpitations, tachycardia.",
      interactions: "Increased risk of hypokalaemia with corticosteroids, diuretics, theophylline."
    }
  }
};
