#!/usr/bin/env python
"""
Heidi - Clinical Decision Support MCP Server

Orchestrates an agentic flow for clinical decision support:
1. Determines user location
2. Selects appropriate clinical guidelines based on location
3. Searches guidelines for the clinical scenario
4. Provides evidence-based recommendations including medications

Designed for UK healthcare using NICE guidelines and BNF.
"""

import requests
from typing import Dict, Any, List, Optional
from fastmcp import FastMCP
import httpx
from bs4 import BeautifulSoup
import asyncio
import re

# Initialize FastMCP server
mcp = FastMCP(
    "Heidi",
    instructions="Clinical decision support system that provides evidence-based recommendations using location-aware guidelines and drug formularies"
)


# ============================================================================
# Geolocation Functions
# ============================================================================

def get_public_ip() -> str:
    """Get the public IP address using external API."""
    response = requests.get('https://api.ipify.org?format=json', timeout=5)
    response.raise_for_status()
    return response.json()['ip']


def get_country_from_ip(ip_address: Optional[str] = None) -> dict:
    """Get country information from an IP address."""
    if not ip_address:
        ip_address = get_public_ip()

    response = requests.get(f'https://ipapi.co/{ip_address}/json/', timeout=5)
    response.raise_for_status()
    data = response.json()

    if 'error' in data:
        raise ValueError(f"Geolocation API error: {data.get('reason', 'Unknown error')}")

    return {
        'ip': ip_address,
        'country': data['country_name'],
        'country_code': data['country_code']
    }


# ============================================================================
# NICE Guidelines Functions
# ============================================================================

async def fetch_page(url: str) -> Optional[str]:
    """Fetch a webpage and return its HTML content."""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
    async with httpx.AsyncClient(follow_redirects=True) as client:
        response = await client.get(url, headers=headers, timeout=30.0)
        response.raise_for_status()
        return response.text


async def search_nice_guidelines(keyword: str, max_results: int = 10) -> List[Dict[str, Any]]:
    """Search NICE guidelines by keyword."""
    BASE_URL = "https://www.nice.org.uk"
    GUIDANCE_URL = f"{BASE_URL}/guidance"

    page_size = min(max_results, 50)
    search_url = f"{GUIDANCE_URL}/published?q={keyword}&ps={page_size}"

    html = await fetch_page(search_url)
    if not html:
        return []

    soup = BeautifulSoup(html, 'html.parser')
    results = []

    # Find JSON-LD script tag containing structured data
    script_tags = soup.find_all('script', type='application/ld+json')

    for script in script_tags:
        try:
            import json
            data = json.loads(script.string)

            if isinstance(data, dict) and 'documents' in data:
                documents = data['documents']

                for doc in documents[:max_results]:
                    ref = doc.get('guidanceRef', '')
                    title = doc.get('titleNoHtml') or doc.get('title', '')
                    title = re.sub(r'<[^>]+>', '', title)

                    url = doc.get('url', '')
                    if url and not url.startswith('http'):
                        url = f"{BASE_URL}{url}"

                    pub_date = doc.get('publicationDate', 'Not available')
                    if pub_date and pub_date != 'Not available':
                        try:
                            from datetime import datetime
                            dt = datetime.fromisoformat(pub_date.replace('Z', '+00:00'))
                            pub_date = dt.strftime('%B %Y')
                        except Exception:
                            pass

                    results.append({
                        'reference': ref,
                        'title': title,
                        'url': url,
                        'published_date': pub_date
                    })

                break
        except (json.JSONDecodeError, KeyError):
            continue

    return results


async def get_guideline_details(identifier: str) -> Dict[str, Any]:
    """Get detailed information about a specific NICE guideline."""
    BASE_URL = "https://www.nice.org.uk"
    GUIDANCE_URL = f"{BASE_URL}/guidance"

    if identifier.startswith('http'):
        url = identifier
        match = re.search(r'/guidance/([a-z]{2,3}\d+)', identifier, re.IGNORECASE)
        reference = match.group(1).upper() if match else 'Unknown'
    else:
        reference = identifier.strip().upper()
        url = f"{GUIDANCE_URL}/{reference.lower()}"

    html = await fetch_page(url)
    if not html:
        return {}

    soup = BeautifulSoup(html, 'html.parser')

    # Extract title
    title = ''
    title_elem = soup.find('h1')
    if title_elem:
        title = title_elem.get_text(strip=True)

    # Extract overview
    overview = ''
    overview_elem = soup.find(['div', 'section'], class_=re.compile(r'overview|summary|introduction'))
    if overview_elem:
        paragraphs = overview_elem.find_all('p', limit=3)
        overview = ' '.join([p.get_text(strip=True) for p in paragraphs])

    if not overview:
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc:
            overview = meta_desc.get('content', '')

    return {
        'reference': reference,
        'title': title,
        'url': url,
        'overview': overview[:1000] if overview else 'No overview available'
    }


# ============================================================================
# BNF Functions
# ============================================================================

def search_bnf_drug(drug_name: str) -> List[Dict[str, Any]]:
    """Search for a drug in the BNF."""
    from urllib.parse import urljoin, quote
    import time

    BASE_URL = "https://bnf.nice.org.uk"
    HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }

    search_url = f"{BASE_URL}/drugs/?q={quote(drug_name)}"

    time.sleep(0.5)
    response = requests.get(search_url, headers=HEADERS, timeout=10)
    response.raise_for_status()

    soup = BeautifulSoup(response.content, 'html.parser')
    results = []

    drug_links = soup.find_all('a', href=True)

    for link in drug_links:
        href = link.get('href', '')
        if '/drugs/' in href or '/drug/' in href or '/medicines/' in href:
            drug_name_text = link.get_text(strip=True)
            if drug_name_text and len(drug_name_text) > 1:
                full_url = urljoin(BASE_URL, href)

                if not any(r['url'] == full_url for r in results):
                    results.append({
                        'name': drug_name_text,
                        'url': full_url
                    })

    return results[:5]


def get_bnf_drug_info(drug_url: str) -> Dict[str, Any]:
    """Get detailed drug information from BNF."""
    import time

    HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }

    time.sleep(0.5)
    response = requests.get(drug_url, headers=HEADERS, timeout=10)
    response.raise_for_status()

    soup = BeautifulSoup(response.content, 'html.parser')

    # Extract drug name
    drug_name = 'Unknown'
    title_tag = soup.find('h1')
    if title_tag:
        drug_name = title_tag.get_text(strip=True)

    # Helper function to extract section content
    def extract_section(section_name: str) -> str:
        content = []
        headings = soup.find_all(['h2', 'h3', 'h4'])
        for heading in headings:
            heading_text = heading.get_text(strip=True).lower()
            if section_name.lower() in heading_text:
                for sibling in heading.find_next_siblings():
                    if sibling.name in ['h2', 'h3', 'h4']:
                        break
                    text = sibling.get_text(strip=True)
                    if text:
                        content.append(text)
        return '\n'.join(content) if content else 'Not specified'

    return {
        'drug_name': drug_name,
        'url': drug_url,
        'indications': extract_section('indications'),
        'dosage': extract_section('dose'),
        'contraindications': extract_section('contraindications'),
        'side_effects': extract_section('side effects')
    }


# ============================================================================
# Main Clinical Decision Support Tool
# ============================================================================

@mcp.tool(
    name="clinical_decision_support",
    description="Provides evidence-based clinical recommendations for a patient case using location-aware guidelines and drug formularies"
)
def clinical_decision_support(
    clinical_scenario: str,
    patient_age: Optional[str] = None,
    allergies: Optional[str] = None,
    location_override: Optional[str] = None
) -> dict:
    """
    Provides comprehensive clinical decision support for a patient case.

    This tool orchestrates an intelligent workflow:
    1. Determines the clinician's location (UK-focused)
    2. Searches NICE guidelines for the clinical scenario
    3. Retrieves relevant medication information from BNF if needed
    4. Provides evidence-based recommendations

    Args:
        clinical_scenario: Description of the patient case, symptoms, diagnosis, or clinical question
                          Examples: "Pediatric croup with stridor", "Post-op sepsis with penicillin allergy"
        patient_age: Patient's age (e.g., "3 years", "65 years old") - helps contextualize recommendations
        allergies: Known drug allergies (e.g., "penicillin", "NSAIDs") - important for medication safety
        location_override: Override auto-detected location with country code (e.g., "GB", "US")

    Returns:
        Dictionary containing:
            - location: Detected or specified location
            - guidelines_found: List of relevant NICE guidelines
            - medications: Relevant medication information from BNF
            - summary: Clinical recommendation summary

    Examples:
        >>> clinical_decision_support(
        ...     clinical_scenario="3-year-old with croup, moderate stridor at rest",
        ...     patient_age="3 years"
        ... )

        >>> clinical_decision_support(
        ...     clinical_scenario="Post-operative sepsis, fever 38.5C",
        ...     patient_age="65 years",
        ...     allergies="penicillin"
        ... )
    """

    # Step 1: Determine location
    if location_override:
        location_info = {
            'country_code': location_override.upper(),
            'country': 'Specified by user'
        }
    else:
        location_info = get_country_from_ip()

    # Step 2: Search NICE guidelines (UK-specific)
    guidelines = []
    if location_info['country_code'] in ['GB', 'UK']:
        # Extract key terms from clinical scenario for search
        search_results = asyncio.run(search_nice_guidelines(clinical_scenario, max_results=5))
        guidelines = search_results

    # Step 3: Extract potential medications from scenario and search BNF
    medications = []

    # Common medications that might be in the scenario
    medication_keywords = [
        'dexamethasone', 'prednisolone', 'salbutamol', 'ipratropium',
        'amoxicillin', 'clarithromycin', 'azithromycin', 'ceftriaxone',
        'paracetamol', 'ibuprofen', 'morphine', 'codeine'
    ]

    scenario_lower = clinical_scenario.lower()
    for med_keyword in medication_keywords:
        if med_keyword in scenario_lower:
            drug_results = search_bnf_drug(med_keyword)
            if drug_results:
                medications.extend(drug_results[:2])

    # Also search based on condition-specific medications
    condition_medications = {
        'croup': ['dexamethasone', 'prednisolone'],
        'sepsis': ['ceftriaxone', 'gentamicin'],
        'pain': ['paracetamol', 'ibuprofen'],
        'asthma': ['salbutamol', 'prednisolone']
    }

    for condition, meds in condition_medications.items():
        if condition in scenario_lower:
            for med in meds:
                if med not in scenario_lower:  # Don't duplicate
                    drug_results = search_bnf_drug(med)
                    if drug_results:
                        medications.extend(drug_results[:1])

    # Remove duplicates
    seen_urls = set()
    unique_medications = []
    for med in medications:
        if med['url'] not in seen_urls:
            seen_urls.add(med['url'])
            unique_medications.append(med)

    # Step 4: Generate summary
    summary_parts = []

    summary_parts.append(f"Location: {location_info.get('country', 'Unknown')} ({location_info.get('country_code', 'XX')})")

    if patient_age:
        summary_parts.append(f"Patient age: {patient_age}")

    if allergies:
        summary_parts.append(f"⚠️ Known allergies: {allergies}")

    if guidelines:
        summary_parts.append(f"\nFound {len(guidelines)} relevant NICE guideline(s):")
        for g in guidelines[:3]:
            summary_parts.append(f"  • {g['reference']}: {g['title']}")
    else:
        summary_parts.append("\nNo NICE guidelines found. Consider manual guideline search.")

    if unique_medications:
        summary_parts.append(f"\nRelevant medications from BNF ({len(unique_medications)}):")
        for m in unique_medications[:5]:
            summary_parts.append(f"  • {m['name']}")

    summary_parts.append("\n⚕️ Recommendation: Review guidelines and medication details for evidence-based management.")

    if allergies:
        summary_parts.append("⚠️ Verify no contraindications related to stated allergies before prescribing.")

    return {
        'location': location_info,
        'clinical_scenario': clinical_scenario,
        'patient_age': patient_age,
        'allergies': allergies,
        'guidelines_found': guidelines,
        'medications': unique_medications,
        'summary': '\n'.join(summary_parts)
    }


@mcp.tool(
    name="get_guideline_recommendation",
    description="Get detailed recommendations from a specific NICE guideline by reference number (e.g., NG23, TA456)"
)
def get_guideline_recommendation(guideline_reference: str) -> dict:
    """
    Retrieve detailed information from a specific NICE guideline.

    Args:
        guideline_reference: NICE guideline reference number (e.g., "NG23", "TA456", "CG102")

    Returns:
        Dictionary with guideline details including title, overview, and URL

    Example:
        >>> get_guideline_recommendation("NG23")
    """

    details = asyncio.run(get_guideline_details(guideline_reference))
    return details


@mcp.tool(
    name="get_medication_details",
    description="Get detailed medication information from the British National Formulary (BNF)"
)
def get_medication_details(drug_name: str) -> dict:
    """
    Retrieve detailed medication information including indications, dosing, and contraindications.

    Args:
        drug_name: Name of the medication (e.g., "dexamethasone", "amoxicillin")

    Returns:
        Dictionary with drug information including indications, dosage, contraindications, and side effects

    Example:
        >>> get_medication_details("dexamethasone")
    """

    # Search for the drug
    search_results = search_bnf_drug(drug_name)

    if not search_results:
        return {
            'error': f'No medication found for "{drug_name}"',
            'suggestion': 'Try a different spelling or generic name'
        }

    # Get details for the first match
    first_result = search_results[0]
    drug_info = get_bnf_drug_info(first_result['url'])

    return drug_info


if __name__ == "__main__":
    # Run the MCP server
    mcp.run()
