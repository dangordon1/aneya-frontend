#!/usr/bin/env python
"""
Test script to run consultations through the backend and save JSON responses.
Use this to capture real backend responses for frontend design testing.
"""

import json
import requests
import sys
from datetime import datetime

BASE_URL = "http://localhost:8000"

# Test scenarios
SCENARIOS = {
    "community-pneumonia": {
        "consultation": """72-year-old male presents with 5-day history of productive cough with yellow-green sputum, fever up to 38.8C, increasing shortness of breath, and right-sided pleuritic chest pain. Past medical history includes COPD, type 2 diabetes, and hypertension. Current medications: Metformin 500mg BD, Lisinopril 10mg OD, Tiotropium inhaler. Examination: Temperature 38.5C, RR 26, SpO2 92% on room air, BP 110/70, HR 102. Chest examination reveals decreased breath sounds and crackles in right lower zone. CURB-65 score: 2 (confusion absent, urea not yet checked, RR 26, BP systolic 110, age 72).""",
        "patient_id": "CAP-001",
        "patient_age": "72",
        "allergies": "Penicillin (rash)",
        "location_override": "GB"
    },
    "pediatric-croup": {
        "consultation": """3-year-old boy brought to A&E by parents with barking cough, stridor at rest (moderate), and low-grade fever for 2 days. No drooling, able to drink fluids. No previous episodes. Vaccinations up to date. Examination: T 37.8C, RR 32, SpO2 95% on air, moderate intercostal recession, audible inspiratory stridor at rest but settles when calm. Westley croup score: 5 (moderate).""",
        "patient_id": "CROUP-001",
        "patient_age": "3",
        "allergies": "None known",
        "location_override": "GB"
    },
    "post-op-sepsis": {
        "consultation": """Day 3 post laparoscopic cholecystectomy. 58-year-old female developed fever 38.5C, tachycardia 110bpm, wound erythema and purulent discharge from port site. WBC 18.2, CRP 245. Past history: obesity, gallstones. Currently on standard post-op care. Wound swab sent. Signs of early sepsis - meeting 2 SIRS criteria.""",
        "patient_id": "SEPSIS-001",
        "patient_age": "58",
        "allergies": "None known",
        "location_override": "GB"
    },
    "acute-asthma": {
        "consultation": """45-year-old female with known asthma presents with severe exacerbation. Unable to complete sentences, using accessory muscles, widespread expiratory wheeze. Peak flow 40% of best (180 L/min, best 450). SpO2 91% on air. Triggered by viral URTI. Currently on Clenil 200mcg BD, Salbutamol PRN. Previous ICU admission for asthma 3 years ago.""",
        "patient_id": "ASTHMA-001",
        "patient_age": "45",
        "allergies": "Aspirin (bronchospasm)",
        "location_override": "GB"
    }
}


def run_consultation(scenario_name: str, save_output: bool = True) -> dict:
    """Run a test consultation and optionally save the JSON response."""

    if scenario_name not in SCENARIOS:
        print(f"Unknown scenario: {scenario_name}")
        print(f"Available scenarios: {', '.join(SCENARIOS.keys())}")
        sys.exit(1)

    scenario = SCENARIOS[scenario_name]

    print(f"\n{'='*60}")
    print(f"Running scenario: {scenario_name}")
    print(f"{'='*60}")
    print(f"Consultation: {scenario['consultation'][:100]}...")
    print(f"Patient Age: {scenario['patient_age']}")
    print(f"Allergies: {scenario['allergies']}")
    print(f"Location: {scenario['location_override']}")
    print(f"{'='*60}\n")

    try:
        print("Sending request to backend (this may take 30-60 seconds)...")
        response = requests.post(
            f"{BASE_URL}/api/analyze",
            json=scenario,
            timeout=300  # 5 minute timeout
        )

        if response.status_code == 200:
            result = response.json()

            print(f"\n{'='*60}")
            print("SUCCESS!")
            print(f"{'='*60}")
            print(f"Diagnoses found: {len(result.get('diagnoses', []))}")

            for i, diag in enumerate(result.get('diagnoses', []), 1):
                name = diag.get('diagnosis') or diag.get('name', 'Unknown')
                confidence = diag.get('confidence', 'N/A')
                print(f"  {i}. {name} (confidence: {confidence})")

            if save_output:
                # Save with timestamp
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"{scenario_name}_{timestamp}.json"
                filepath = f"/Users/dgordon/aneya/aneya-frontend/test-data/{filename}"

                with open(filepath, 'w') as f:
                    json.dump(result, f, indent=2)

                print(f"\nSaved to: {filepath}")

                # Also save as latest
                latest_path = f"/Users/dgordon/aneya/aneya-frontend/test-data/{scenario_name}_latest.json"
                with open(latest_path, 'w') as f:
                    json.dump(result, f, indent=2)
                print(f"Saved as latest: {latest_path}")

            return result

        else:
            print(f"Error: {response.status_code}")
            print(response.text)
            return {}

    except requests.exceptions.Timeout:
        print("Request timed out after 5 minutes")
        return {}
    except requests.exceptions.ConnectionError:
        print("Could not connect to backend. Is it running on localhost:8000?")
        return {}
    except Exception as e:
        print(f"Error: {e}")
        return {}


def main():
    if len(sys.argv) < 2:
        print("Usage: python run_test_consultation.py <scenario_name>")
        print(f"\nAvailable scenarios:")
        for name, data in SCENARIOS.items():
            print(f"  - {name}: {data['consultation'][:60]}...")
        print(f"\nExample: python run_test_consultation.py community-pneumonia")
        sys.exit(1)

    scenario_name = sys.argv[1]
    run_consultation(scenario_name)


if __name__ == "__main__":
    main()
