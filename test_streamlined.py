#!/usr/bin/env python
"""
Test script for streamlined clinical decision support workflow.

New workflow:
1. LLM Call 1 WITH TOOLS: Analyze consultation, search guidelines, output diagnoses + drug names
2. Direct BNF parsing: search_bnf_drug() → get_bnf_drug_info() → structured data
3. No second LLM call needed (BNF pages have consistent structure)
"""

import asyncio
import json
import sys
import os
from pathlib import Path

# Add servers to path
sys.path.insert(0, str(Path(__file__).parent / "servers"))

from clinical_decision_support_client import ClinicalDecisionSupportClient


async def streamlined_analyze(
    client,
    clinical_scenario: str,
    patient_id: str = None,
    verbose: bool = True
):
    """Streamlined clinical decision support workflow."""

    if verbose:
        print("\n" + "="*70)
        print("STREAMLINED CLINICAL DECISION SUPPORT")
        print("="*70)
        print(f"Consultation: {clinical_scenario}")
        print("="*70)

    # Step 1: Claude analyzes consultation WITH TOOLS
    if verbose:
        print("\n🤖 Step 1: Analyzing consultation with Claude (with tools)...")

    # Get tools from MCP servers
    tools = await client.get_all_tools_for_claude()

    if verbose:
        print(f"   Available tools: {len(tools)} tools from MCP servers")
        # Show subset of relevant tools
        relevant_tools = [t['name'] for t in tools if 'search' in t['name'].lower() or 'nice' in t['name'].lower() or 'bnf' in t['name'].lower()]
        print(f"   Relevant search tools: {', '.join(relevant_tools[:5])}")

    prompt = f"""Analyze this clinical consultation and provide structured diagnosis and treatment information.

CONSULTATION: {clinical_scenario}

TASK:
1. Use the available tools to search for relevant clinical guidelines and treatment information
2. Based on the consultation and evidence found, identify:
   - The diagnosis (with confidence level: high/medium/low)
   - Appropriate treatments
   - Specific drug names mentioned or recommended (use generic names, e.g., "Amoxicillin" not "Amoxil")

Return your final answer as JSON ONLY (no other text):

{{
  "diagnoses": [
    {{
      "diagnosis": "medical condition name",
      "confidence": "high|medium|low",
      "treatments": [
        {{
          "name": "treatment description",
          "drug_names": ["generic drug name 1", "generic drug name 2"],
          "notes": "any relevant clinical notes from guidelines"
        }}
      ]
    }}
  ]
}}"""

    # Call Claude with tools
    messages = [{"role": "user", "content": prompt}]
    diagnoses = []

    try:
        # Initial call to Claude
        response = client.anthropic.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=4096,
            tools=tools,
            messages=messages
        )

        if verbose:
            print(f"   Stop reason: {response.stop_reason}")

        # Tool use loop
        while response.stop_reason == "tool_use":
            # Execute tools
            tool_results = []
            for content_block in response.content:
                if content_block.type == "tool_use":
                    tool_name = content_block.name
                    tool_input = content_block.input

                    if verbose:
                        print(f"   🔧 Calling tool: {tool_name}({tool_input})")

                    # Call the MCP tool
                    result = await client.call_tool(tool_name, tool_input)
                    result_text = result.content[0].text

                    if verbose:
                        # Parse and show summary
                        try:
                            data = json.loads(result_text)
                            if 'results' in data:
                                print(f"      → Found {len(data['results'])} results")
                        except:
                            pass

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": content_block.id,
                        "content": result_text
                    })

            # Add assistant response and tool results to conversation
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})

            # Continue conversation
            response = client.anthropic.messages.create(
                model="claude-sonnet-4-5",
                max_tokens=4096,
                tools=tools,
                messages=messages
            )

            if verbose:
                print(f"   Stop reason: {response.stop_reason}")

        # Extract final JSON response
        for block in response.content:
            if hasattr(block, 'text'):
                try:
                    # Try direct JSON parse
                    result = json.loads(block.text)
                    diagnoses = result.get('diagnoses', [])
                    break
                except:
                    # Try to find JSON in text
                    text = block.text
                    if '{' in text:
                        json_start = text.index('{')
                        json_end = text.rindex('}') + 1
                        try:
                            result = json.loads(text[json_start:json_end])
                            diagnoses = result.get('diagnoses', [])
                            break
                        except:
                            pass

        if verbose:
            print(f"\n   ✓ Extracted {len(diagnoses)} diagnoses")
            for d in diagnoses:
                print(f"      • {d.get('diagnosis')} ({d.get('confidence')} confidence)")
                for tx in d.get('treatments', []):
                    drugs = ', '.join(tx.get('drug_names', []))
                    print(f"        - {tx.get('name')}: {drugs}")

    except Exception as e:
        if verbose:
            print(f"   ⚠️  Error: {e}")
            import traceback
            traceback.print_exc()
        diagnoses = []

    # Step 2: Get BNF drug information (direct parsing, no LLM)
    if verbose:
        print(f"\n💊 Step 2: Fetching BNF drug information...")

    # Extract all drug names
    all_drugs = []
    for diag in diagnoses:
        for tx in diag.get('treatments', []):
            all_drugs.extend(tx.get('drug_names', []))

    # Remove duplicates
    all_drugs = list(set(all_drugs))

    # Search BNF and get detailed info for each drug
    async def get_drug_details(drug_name):
        try:
            # Step 2a: Search for drug
            if verbose:
                print(f"   🔍 Searching BNF for: {drug_name}")

            search_result = await client.call_tool("search_bnf_drug", {
                "drug_name": drug_name
            })
            search_data = json.loads(search_result.content[0].text)
            results = search_data.get('results', [])

            if not results:
                if verbose:
                    print(f"      ⚠️  No BNF page found for {drug_name}")
                return None

            drug_url = results[0].get('url')
            if verbose:
                print(f"      ✓ Found: {drug_url}")

            # Step 2b: Get detailed drug info
            if verbose:
                print(f"   📄 Fetching detailed info for: {drug_name}")

            info_result = await client.call_tool("get_bnf_drug_info", {
                "drug_url": drug_url
            })
            info_data = json.loads(info_result.content[0].text)

            if info_data.get('success'):
                if verbose:
                    print(f"      ✓ Retrieved structured data")
                return {
                    'drug_name': drug_name,
                    'url': drug_url,
                    'bnf_data': info_data
                }
            else:
                if verbose:
                    print(f"      ⚠️  Failed to parse: {info_data.get('error')}")
                return None

        except Exception as e:
            if verbose:
                print(f"   ⚠️  Error with {drug_name}: {e}")
            return None

    drug_details = []
    if all_drugs:
        if verbose:
            print(f"   Found {len(all_drugs)} drugs to look up: {', '.join(all_drugs)}\n")

        # Get details for all drugs in parallel
        results = await asyncio.gather(
            *[get_drug_details(drug) for drug in all_drugs],
            return_exceptions=True
        )

        for result in results:
            if result and not isinstance(result, Exception):
                drug_details.append(result)

    # Step 3: Add BNF data to diagnoses
    if verbose:
        print(f"\n📋 Step 3: Adding BNF data to diagnoses...")

    # Create lookup dict
    drug_lookup = {d['drug_name']: d for d in drug_details}

    for diag in diagnoses:
        for tx in diag.get('treatments', []):
            tx['bnf_info'] = {}

            for drug_name in tx.get('drug_names', []):
                if drug_name in drug_lookup:
                    details = drug_lookup[drug_name]
                    bnf_data = details['bnf_data']

                    tx['bnf_info'][drug_name] = {
                        'url': details['url'],
                        'indications': bnf_data.get('indications', 'Not available'),
                        'dosage': bnf_data.get('dosage', 'Not available'),
                        'contraindications': bnf_data.get('contraindications', 'Not available'),
                        'cautions': bnf_data.get('cautions', 'Not available'),
                        'side_effects': bnf_data.get('side_effects', 'Not available'),
                        'interactions': bnf_data.get('interactions', 'Not available'),
                    }

                    if verbose:
                        print(f"   ✓ Added BNF data for: {drug_name}")

    # Step 4: Generate summary
    if verbose:
        print(f"\n📄 Step 4: Generating summary...")

    summary = f"""
CLINICAL DECISION SUPPORT REPORT

DIAGNOSES ({len(diagnoses)}):
"""
    for diag in diagnoses:
        summary += f"\n• {diag.get('diagnosis')} ({diag.get('confidence')} confidence)"
        for tx in diag.get('treatments', []):
            summary += f"\n  Treatment: {tx.get('name')}"

            if tx.get('notes'):
                summary += f"\n  Notes: {tx.get('notes')}"

            # Add BNF info for each drug
            for drug_name in tx.get('drug_names', []):
                bnf_info = tx.get('bnf_info', {}).get(drug_name)
                if bnf_info:
                    summary += f"\n\n  Drug: {drug_name}"
                    summary += f"\n  BNF: {bnf_info['url']}"
                    summary += f"\n  Dosage: {bnf_info['dosage'][:200]}..." if len(bnf_info['dosage']) > 200 else f"\n  Dosage: {bnf_info['dosage']}"
                    summary += f"\n  Contraindications: {bnf_info['contraindications'][:200]}..." if len(bnf_info['contraindications']) > 200 else f"\n  Contraindications: {bnf_info['contraindications']}"

                    if bnf_info['interactions'] and bnf_info['interactions'] != 'Not available':
                        summary += f"\n  Interactions: {bnf_info['interactions'][:200]}..." if len(bnf_info['interactions']) > 200 else f"\n  Interactions: {bnf_info['interactions']}"

    if not diagnoses:
        summary += "\nNo diagnoses identified."

    result = {
        'diagnoses': diagnoses,
        'summary': summary
    }

    if verbose:
        print("\n" + "="*70)
        print("SUMMARY")
        print("="*70)
        print(summary)
        print("="*70)

    return result


async def main():
    """Test the streamlined workflow."""

    # Get API key from environment
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("⚠️  ANTHROPIC_API_KEY not set in environment")
        print("   Please set it with: export ANTHROPIC_API_KEY=sk-ant-...")
        return

    # Initialize client
    print("Initializing client...")
    client = ClinicalDecisionSupportClient(anthropic_api_key=api_key)
    await client.connect_to_servers(verbose=False)

    # Test consultation
    consultation = "prescribe amoxicillin 500mg for bacterial throat infection"

    # Run streamlined analysis
    result = await streamlined_analyze(
        client,
        consultation,
        patient_id="TEST_001",
        verbose=True
    )

    # Save result
    output_file = "/tmp/streamlined_test_result.json"
    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2)

    print(f"\n✅ Result saved to: {output_file}")

    # Cleanup
    await client.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
