# Clara - Clinical Decision Support Streamlit App

## Overview

Clara is an AI-powered clinical decision support system with a user-friendly web interface built with Streamlit.

## Features

- 📝 **Consultation Input**: Enter patient consultation transcripts or clinical presentations
- 🔍 **Intelligent Analysis**: Automatically searches NICE guidelines, CKS topics, and BNF treatment summaries
- 💊 **Prescribing Guidance**: Provides evidence-based prescribing recommendations with specific dosing
- 📊 **Progress Tracking**: Real-time progress indicators showing each analysis step
- 📋 **Example Cases**: Quick-load example consultations for testing

## Running the App

### Prerequisites

1. Ensure all dependencies are installed:
   ```bash
   uv sync
   ```

2. Configure your environment variables in `.env`:
   ```bash
   ANTHROPIC_API_KEY=your_api_key_here
   ```

### Launch the App

```bash
streamlit run app.py
```

Or with uv:

```bash
uv run streamlit run app.py
```

The app will open in your default browser at `http://localhost:8501`

## Using the App

### Quick Start with Examples

1. Open the sidebar (click the arrow in the top left)
2. Select an example case from the dropdown:
   - Pediatric Croup
   - Post-Operative Sepsis
   - Acute Asthma Exacerbation
   - Community-Acquired Pneumonia
3. Click "Load Example"
4. Click "Analyze Consultation"

### Custom Analysis

1. Enter consultation details in the text area
2. (Optional) Enter a patient ID
3. Click "Analyze Consultation"
4. Watch the progress indicators as the system:
   - Detects your location
   - Searches for clinical guidelines
   - Analyzes guidelines with AI
   - Looks up drug information in BNF
   - Generates prescribing recommendations

### Understanding the Results

The report includes:

- **Patient Information**: Demographics, allergies, current medications
- **Clinical Diagnoses**: AI-identified diagnoses with confidence levels (high/medium/low)
- **Treatment Options**: Recommended treatments with medications
- **BNF Prescribing Guidance**:
  - First-line treatments with exact dosing, route, duration
  - Alternative treatments (e.g., for allergies)
  - Special considerations (elderly, renal impairment, pregnancy, interactions)
- **Resources Consulted**: Count of NICE guidelines, CKS topics, and BNF summaries used

## Analysis Steps

The system performs the following steps:

1. **Initialize**: Connects to MCP servers (NICE, BNF, Patient Info, etc.)
2. **Detect Location**: Auto-detects location from IP (currently defaults to GB/UK)
3. **Search Guidelines**: Searches NICE guidelines, CKS topics, and BNF treatment summaries
4. **Analyze Guidelines**: Uses Claude AI to extract diagnoses and treatment options
5. **Analyze BNF**: Separate Claude AI call to extract specific prescribing guidance
6. **Generate Report**: Compiles all information into a comprehensive clinical report

## Important Notes

⚠️ **Clinical Disclaimer**: This system provides decision support only. All recommendations should be reviewed by a qualified healthcare professional before prescribing. Always verify:
- Patient allergies
- Drug-drug interactions
- Contraindications
- Renal/hepatic function
- Pregnancy/breastfeeding status

## Troubleshooting

**App won't start:**
- Ensure all dependencies are installed: `uv sync`
- Check that Streamlit is installed: `streamlit --version`

**No analysis results:**
- Verify ANTHROPIC_API_KEY is set in `.env`
- Check the console/terminal for error messages

**Slow performance:**
- First run may be slower as MCP servers initialize
- Subsequent analyses should be faster

## Architecture

The app uses:
- **Streamlit**: Web interface
- **FastMCP/MCP**: Multi-server protocol for NICE, BNF, Patient Info
- **Claude (Anthropic)**: AI analysis of guidelines and prescribing recommendations
- **Asyncio**: Asynchronous execution for better performance

## File Structure

```
clara/
├── app.py                           # Main Streamlit application (Clara)
├── servers/
│   ├── clinical_decision_support_client.py  # Core analysis logic
│   ├── nice_guidelines_server.py   # NICE guidelines MCP server
│   ├── bnf_server.py                # BNF MCP server
│   ├── patient_info_server.py       # Patient data MCP server
│   └── ...
├── .env                             # Environment variables
└── pyproject.toml                   # Dependencies
```
