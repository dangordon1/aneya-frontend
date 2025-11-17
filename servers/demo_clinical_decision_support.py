#!/usr/bin/env python
"""
Demo: Clinical Decision Support System

Interactive demo showcasing the multi-server clinical decision support workflow.
Demonstrates parallel execution and evidence-based recommendations.
"""

import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv
from clinical_decision_support_client import ClinicalDecisionSupportClient

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)


# Example clinical cases for testing
EXAMPLE_CASES = {
    "1": {
        "name": "Pediatric Croup",
        "scenario": "3-year-old with croup, moderate stridor at rest, barking cough",
        "patient_id": "P001",
        "location": "GB"
    },
    "2": {
        "name": "Post-Operative Sepsis (with medications & allergy)",
        "scenario": "Post-operative sepsis, fever 38.5C, tachycardia, suspected wound infection",
        "patient_id": "P002",
        "location": "GB"
    },
    "3": {
        "name": "Acute Asthma Exacerbation (NSAID allergy)",
        "scenario": "45-year-old with severe asthma exacerbation, peak flow 40% predicted, breathless",
        "patient_id": "P003",
        "location": "GB"
    },
    "4": {
        "name": "Community-Acquired Pneumonia",
        "scenario": "72-year-old with CAP, CURB-65 score 2, productive cough, fever",
        "patient_id": "P004",
        "location": "GB"
    },
    "5": {
        "name": "Non-UK Location (Direct PubMed)",
        "scenario": "Post-viral fatigue syndrome in adolescent, persistent fatigue for 6 months",
        "patient_id": "P005",
        "location": "US"
    },
    "6": {
        "name": "Rare Condition (PubMed Fallback)",
        "scenario": "Ehlers-Danlos syndrome hypermobile type, joint pain management",
        "patient_id": "P006",
        "location": "GB"
    }
}


def print_header(text: str):
    """Print a formatted header."""
    print("\n" + "="*80)
    print(text.center(80))
    print("="*80)


def print_section(title: str):
    """Print a section header."""
    print(f"\n{'─'*80}")
    print(f"  {title}")
    print(f"{'─'*80}")


async def run_demo():
    """Run the interactive demo."""

    print_header("🏥 CLINICAL DECISION SUPPORT SYSTEM DEMO")

    print("""
This demo showcases a multi-server MCP architecture for clinical decision support.

Features:
  • Parallel server connections (5 servers: Geolocation, Patient Info, NICE, BNF, PubMed)
  • Patient demographics and medication history integration
  • Intelligent workflow: Guidelines → PubMed fallback
  • Medication extraction from guidelines with detailed BNF lookup
  • Drug-drug interaction checking with current medications
  • Allergy contraindication warnings
  • Seasonal health context
  • Weight-based dosing guidance

The system orchestrates five independent FastMCP servers:
  1. Geolocation Server - Auto-detects clinician location
  2. Patient Info Server - Retrieves patient demographics, medications, allergies, conditions
  3. NICE Guidelines Server - Searches UK clinical guidelines & CKS topics
  4. BNF Server - British National Formulary drug information & interactions
  5. PubMed Server - Searches 35M+ peer-reviewed medical articles
""")

    # Create and connect client
    print_section("🔌 Initializing Client")
    client = ClinicalDecisionSupportClient()

    try:
        await client.connect_to_servers(verbose=True)

        # Show example cases
        print_section("📋 Available Example Cases")
        for case_id, case in EXAMPLE_CASES.items():
            patient_text = f" [Patient: {case['patient_id']}]"
            print(f"  {case_id}. {case['name']}{patient_text}")
            print(f"     → {case['scenario'][:70]}...")

        # Interactive loop
        while True:
            print("\n" + "─"*80)
            choice = input("\nEnter case number (1-6), 'custom' for custom case, or 'quit' to exit: ").strip().lower()

            if choice == 'quit' or choice == 'q':
                break

            elif choice in EXAMPLE_CASES:
                case = EXAMPLE_CASES[choice]
                print_header(f"CASE {choice}: {case['name']}")

                await client.clinical_decision_support(
                    clinical_scenario=case['scenario'],
                    patient_id=case['patient_id'],
                    location_override=case['location'],
                    verbose=True
                )

            elif choice == 'custom' or choice == 'c':
                print_header("CUSTOM CLINICAL CASE")

                scenario = input("\nEnter clinical scenario: ").strip()
                if not scenario:
                    print("❌ Scenario required")
                    continue

                age = input("Enter patient age (optional, press Enter to skip): ").strip() or None
                allergies = input("Enter known allergies (optional, press Enter to skip): ").strip() or None
                location = input("Enter location override (e.g., GB, US - press Enter for auto-detect): ").strip() or None

                await client.clinical_decision_support(
                    clinical_scenario=scenario,
                    patient_age=age,
                    allergies=allergies,
                    location_override=location,
                    verbose=True
                )

            else:
                print("❌ Invalid choice. Please enter 1-6, 'custom', or 'quit'")

    finally:
        # Clean up
        print_section("🧹 Cleanup")
        await client.cleanup()
        print("✅ All servers disconnected")


async def run_automated_demo():
    """Run all example cases automatically (for testing)."""

    print_header("🏥 AUTOMATED DEMO - ALL EXAMPLE CASES")

    client = ClinicalDecisionSupportClient()

    try:
        await client.connect_to_servers(verbose=True)

        for case_id, case in EXAMPLE_CASES.items():
            print_header(f"CASE {case_id}: {case['name']}")

            await client.clinical_decision_support(
                clinical_scenario=case['scenario'],
                patient_id=case['patient_id'],
                location_override=case['location'],
                verbose=True
            )



    finally:
        print_section("🧹 Cleanup")
        await client.cleanup()
        print("✅ All servers disconnected")


def main():
    """Main entry point."""
    if len(sys.argv) > 1 and sys.argv[1] == "--auto":
        # Run automated demo
        asyncio.run(run_automated_demo())
    else:
        # Run interactive demo
        asyncio.run(run_demo())


if __name__ == "__main__":
    main()
