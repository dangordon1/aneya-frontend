# Heidi - Clinical Decision Support MCP Server

An intelligent MCP server that provides evidence-based clinical recommendations through an orchestrated agentic workflow.

## Overview

Heidi is a clinical decision support system that combines geolocation, NICE guidelines, and the British National Formulary (BNF) to provide context-aware medical recommendations for UK healthcare professionals.

## Agentic Flow

```
Patient Case Input
       ↓
1. Auto-detect Location (or override)
       ↓
2. Search NICE Guidelines for condition
       ↓
3. Identify relevant medications
       ↓
4. Search BNF for drug information
       ↓
5. Generate evidence-based recommendations
```

## Tools

### 1. clinical_decision_support

The main orchestration tool that provides comprehensive clinical recommendations.

**Parameters:**
- `clinical_scenario` (required): Description of the patient case, symptoms, or diagnosis
- `patient_age` (optional): Patient's age (helps contextualize recommendations)
- `allergies` (optional): Known drug allergies (important for medication safety)
- `location_override` (optional): Override auto-detected location with country code

**Returns:**
- `location`: Detected or specified location
- `guidelines_found`: List of relevant NICE guidelines
- `medications`: Relevant medication information from BNF
- `summary`: Clinical recommendation summary

**Example Use Cases:**

#### Simple Case: Pediatric Croup
```json
{
  "clinical_scenario": "3-year-old with croup, moderate stridor at rest, barking cough",
  "patient_age": "3 years"
}
```

Expected workflow:
1. Auto-detects UK location
2. Searches NICE for "croup" guidelines
3. Identifies dexamethasone and prednisolone as treatment options
4. Retrieves BNF information for both medications
5. Returns recommendations with appropriate dosing references

#### Complex Case: Post-Operative Sepsis
```json
{
  "clinical_scenario": "Post-operative sepsis, fever 38.5C, tachycardia, suspected wound infection",
  "patient_age": "65 years",
  "allergies": "penicillin"
}
```

Expected workflow:
1. Auto-detects UK location
2. Searches NICE for sepsis guidelines
3. Identifies antibiotic options (avoiding penicillins)
4. Retrieves BNF information for alternatives (e.g., ceftriaxone, gentamicin)
5. Returns recommendations with allergy warnings

### 2. get_guideline_recommendation

Retrieve detailed information from a specific NICE guideline.

**Parameters:**
- `guideline_reference` (required): NICE reference number (e.g., "NG23", "TA456")

**Returns:**
- Guideline title, overview, URL

**Example:**
```json
{
  "guideline_reference": "NG23"
}
```

### 3. get_medication_details

Get detailed medication information from the BNF.

**Parameters:**
- `drug_name` (required): Name of the medication

**Returns:**
- Drug name, indications, dosage, contraindications, side effects, URL

**Example:**
```json
{
  "drug_name": "dexamethasone"
}
```

## Installation

The server requires Python 3.12+ and dependencies from pyproject.toml:

```bash
uv sync
```

## Usage

### Running the Server

```bash
python heidi_server.py
```

### Development/Testing

```bash
fastmcp dev heidi_server.py
```

### Configuration

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "heidi": {
      "command": "python",
      "args": [
        "/Users/dgordon/python/hackathons/heidi/servers/heidi_server.py"
      ],
      "cwd": "/Users/dgordon/python/hackathons/heidi/servers"
    }
  }
}
```

## Architecture

### Orchestration Pattern

Heidi uses an **orchestration pattern** where a single server coordinates multiple healthcare data sources:

1. **Geolocation** - Auto-detects clinician location to provide region-appropriate guidelines
2. **NICE Guidelines** - Searches and retrieves UK clinical guidelines
3. **BNF** - Accesses British National Formulary for medication information

### Intelligent Medication Detection

The system intelligently identifies relevant medications through:
- **Explicit mentions**: Detects medication names in the clinical scenario
- **Condition-based inference**: Maps conditions to common treatment options
  - Croup → Dexamethasone, Prednisolone
  - Sepsis → Ceftriaxone, Gentamicin
  - Pain → Paracetamol, Ibuprofen
  - Asthma → Salbutamol, Prednisolone

### Allergy Safety

When allergies are specified:
- ⚠️ Prominent warnings in the summary
- Recommendations to verify contraindications
- Allergy information passed to medication searches

## Technical Implementation

### Dependencies

The server consolidates functionality from three separate servers:

1. **Geolocation Functions** (`get_country_from_ip`)
   - Uses ipapi.co and ipify.org APIs
   - Synchronous requests library

2. **NICE Guidelines Functions** (`search_nice_guidelines`, `get_guideline_details`)
   - Async web scraping with httpx
   - BeautifulSoup4 for HTML parsing
   - JSON-LD structured data extraction

3. **BNF Functions** (`search_bnf_drug`, `get_bnf_drug_info`)
   - Synchronous requests with rate limiting
   - BeautifulSoup4 for HTML parsing
   - Session management for cookies

### Async Considerations

The main orchestration tool uses `asyncio.run()` to execute async guideline searches within a synchronous FastMCP tool function. This allows for efficient concurrent guideline searches while maintaining a simple synchronous API.

## Example Clinical Scenarios

### Scenario 1: Mild Croup
```
Input: "2-year-old with mild croup, no stridor at rest"
Output: NICE croup guidelines + dexamethasone dosing information
```

### Scenario 2: Severe Asthma Exacerbation
```
Input: "45-year-old with severe asthma exacerbation, peak flow 40% predicted"
Allergies: "NSAIDs"
Output: NICE asthma guidelines + salbutamol, prednisolone info
```

### Scenario 3: Community-Acquired Pneumonia
```
Input: "72-year-old with CAP, CURB-65 score 2"
Output: NICE pneumonia guidelines + amoxicillin dosing (or alternative if allergic)
```

## Limitations

- **UK-Focused**: Currently optimized for UK healthcare using NICE and BNF
- **Web Scraping**: Subject to website structure changes
- **No Real-Time**: Does not access real-time hospital formularies or local protocols
- **Clinical Judgment**: Recommendations are guidelines-based; clinical judgment required
- **Rate Limits**: BNF scraping includes 0.5s delays to be respectful

## Safety and Disclaimers

⚠️ **Important**: This tool provides reference information from clinical guidelines and drug formularies. It is designed to assist healthcare professionals, not replace clinical judgment. Always:

- Verify dosing before prescribing
- Consider patient-specific factors
- Follow local protocols and formularies
- Use professional clinical judgment
- Ensure appropriate patient consent

## Future Enhancements

Potential improvements:
- Support for additional guideline sources (international)
- Integration with local hospital formularies
- Drug interaction checking
- More sophisticated NLP for scenario parsing
- Caching for frequently accessed guidelines
- Real-time alert systems for guideline updates

## Credits

Developed for the Heidi healthcare assistant project.
Built using FastMCP, NICE guidelines, and BNF resources.
