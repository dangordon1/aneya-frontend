# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**aneya** is a clinical decision support system consisting of:
- **React + TypeScript frontend** (port 5173) - User interface with Figma-based design
- **FastAPI backend** (port 8000) - API wrapper for clinical decision support
- **Multi-MCP server architecture** - Specialized healthcare data servers
- **Claude AI integration** - AI-powered guideline analysis and prescribing recommendations

The system provides evidence-based clinical recommendations by searching UK health guidelines (NICE, BNF) and medical literature (PubMed), then using Claude to synthesize prescribing guidance.

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────────┐
│  React Frontend │ ───────▶│  FastAPI Backend │ ───────▶│  MCP Servers        │
│  (Port 5173)    │         │  (Port 8000)     │         │  + Claude AI        │
└─────────────────┘         └──────────────────┘         └─────────────────────┘
```

### MCP Server Architecture

The backend connects to **5 independent FastMCP servers**:

1. **Geolocation** (`servers/geolocation_server.py`) - IP-based country detection
2. **Patient Info** (`servers/patient_info_server.py`) - Patient data management
3. **NICE Guidelines** (`servers/nice_guidelines_server.py`) - UK clinical guidelines
4. **BNF** (`servers/bnf_server.py`) - British National Formulary drug information
5. **PubMed** (`servers/pubmed_server.py`) - 35M+ medical research articles

**Key Feature:** All servers connect in **parallel** using `asyncio.gather()` for performance.

### Clinical Decision Support Workflow

Located in `servers/clinical_decision_support_client.py`:

1. **Detect Location** - Auto-detect user country from IP (defaults to GB)
2. **Search Guidelines** - Search NICE guidelines (UK) or PubMed (international)
3. **Identify Medications** - Extract relevant drugs from consultation
4. **Search BNF** - Parallel search for all medications
5. **AI Analysis** - Two separate Claude API calls:
   - **Call 1:** Analyze guidelines → extract diagnoses and treatments
   - **Call 2:** Analyze BNF data → extract specific prescribing guidance
6. **Generate Report** - Compile comprehensive clinical report

**Fallback Strategy:** If NICE returns <2 guidelines OR non-UK location → automatically searches PubMed for evidence.

## Development Setup

### Prerequisites

- Python 3.12+ with `uv` package manager
- Node.js 18+ with `npm`
- Anthropic API key (required for AI features)

### Installation

```bash
# Install Python dependencies
uv sync

# Install frontend dependencies
cd frontend
npm install
```

### Environment Variables

Create `.env` file in project root:

```bash
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
```

## Running the Application

### Full Stack (Development)

**Terminal 1 - Backend:**
```bash
python api.py
# or
uv run python api.py
```
Backend runs on: http://localhost:8000

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend runs on: http://localhost:5173

### Alternative Interfaces

**Streamlit UI (Legacy):**
```bash
streamlit run app.py
# or
uv run streamlit run app.py
```

**Individual MCP Servers (Testing):**
```bash
python servers/nice_guidelines_server.py
python servers/bnf_server.py
python servers/geolocation_server.py
```

**MCP Inspector (Testing):**
```bash
fastmcp dev servers/nice_guidelines_server.py
```

## Build Commands

### Frontend

```bash
cd frontend

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# TypeScript compilation
npm run build  # Includes: tsc && vite build
```

### Backend

```bash
# Run with Uvicorn (production)
uvicorn api:app --host 0.0.0.0 --port 8000

# Run directly (development)
python api.py
```

## Deployment

### Current Setup

- **Frontend**: Deployed on **Vercel** (static React build)
- **Backend**: Deployed on **Google Cloud Run** (containerized FastAPI + MCP servers)
  - **Region:** europe-west2 (London)
  - **Container Registry:** Google Artifact Registry

### Quick Deploy

**Backend to Cloud Run:**
```bash
# Set required environment variables
export GCP_PROJECT_ID=your-project-id
export ANTHROPIC_API_KEY=sk-ant-xxxxx

# Deploy using the provided script
./deploy-cloudrun.sh
```

**Frontend to Vercel:**
```bash
cd frontend
vercel --prod
```

### Deployment Configuration

**Frontend (vercel.json):**
```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist"
}
```

**Backend (Dockerfile):**
- Multi-stage build with Python 3.12
- Platform: `linux/amd64`
- Port: 8080 (Cloud Run standard)
- Health check endpoint: `/health`
- Non-root user for security

**Cloud Run Configuration:**
- Memory: 2Gi
- CPU: 2 vCPUs
- Timeout: 300s (5 minutes)
- Min instances: 0 (scales to zero)
- Max instances: 10
- Environment variables: `ANTHROPIC_API_KEY`

### Detailed Documentation

For complete deployment instructions, see:
- **Backend:** `CLOUDRUN_DEPLOYMENT.md` - Google Cloud Run deployment guide
- **Frontend:** `VERCEL_DEPLOYMENT.md` - Vercel deployment guide (if exists)

## Important Implementation Details

### Two MCP Frameworks in Use

**⚠️ IMPORTANT:** This codebase contains servers using TWO different MCP frameworks:

1. **FastMCP** (Recommended - Use for new servers)
   - Used by: BNF, Geolocation, Patient Info, PubMed
   - Pattern: `@mcp.tool()` decorators
   - Run: `mcp.run()`

2. **Standard MCP** (Legacy)
   - Used by: NICE Guidelines
   - Pattern: `@server.list_tools()`, `@server.call_tool()` handlers
   - Run: Async stdio server

**Global instruction:** Always use FastMCP for new servers.

### Web Scraping Strategy

All healthcare data is accessed via **web scraping** (not APIs):

- **NICE**: Scrapes `www.nice.org.uk`
  - Parses JSON-LD structured data
  - 30-second timeout with proper User-Agent
  - Async with `httpx`

- **BNF**: Scrapes `bnf.nice.org.uk`
  - Session management for cookies
  - 0.5-second rate limiting between requests
  - Sync with `requests`

- **PubMed**: Uses E-utilities API (public)
  - Search and fetch via `eutils.ncbi.nlm.nih.gov`

### Parallel Execution Patterns

The client uses `asyncio.gather()` extensively:

```python
# Connect all servers in parallel
connection_tasks = [
    self._connect_single_server(name, path, verbose)
    for name, path in servers.items()
]
await asyncio.gather(*connection_tasks)

# Search all medications in parallel
search_tasks = [
    self.call_tool("search_bnf_drug", {"drug_name": med})
    for med in medications
]
results = await asyncio.gather(*search_tasks, return_exceptions=True)
```

### Claude AI Integration

Two separate API calls in the workflow:

**Call 1 - Guideline Analysis:**
- Input: NICE guidelines, CKS topics, BNF treatment summaries
- Output: Diagnoses with confidence levels, treatment options

**Call 2 - BNF Prescribing Guidance:**
- Input: BNF drug detail pages
- Output: First-line treatments with exact dosing, alternatives, special considerations

Both calls use structured prompts in `clinical_decision_support_client.py`.

### API Endpoints

**FastAPI Backend:**
- `GET /` - Root endpoint
- `GET /health` - Health check (verifies MCP connections)
- `POST /api/analyze` - Main consultation analysis endpoint
- `GET /api/examples` - Example clinical scenarios

**Frontend makes a single POST to `/api/analyze` with:**
```typescript
{
  consultation: string,
  patient_id?: string,
  patient_age?: string,
  allergies?: string,
  user_ip?: string,
  location_override?: string
}
```

### Frontend Component Structure

React components in `frontend/src/components/`:

- `InputScreen.tsx` - Consultation input with example cases
- `ProgressScreen.tsx` - Animated progress indicators (6 steps)
- `AnalysisComplete.tsx` - Completion status
- `ReportScreen.tsx` - Main results display
- `DiagnosisCard.tsx` - Individual diagnosis with confidence badge
- `MedicationBox.tsx` - Prescribing guidance cards
- `ExpandableSection.tsx` - Collapsible content sections
- `WarningBox.tsx` - Clinical warnings and disclaimers

### Design System

**Colors:**
- Primary: `#351431` (deep purple)
- Accent: `#F0D1DA` (soft pink)
- Text: `#2D2D2D` (dark gray)

**Typography:**
- Headings: Georgia (serif)
- Body: Inter (sans-serif)

**Styling:** Tailwind CSS with custom configuration in `tailwind.config.js`

## File Structure

```
heidi/
├── api.py                              # FastAPI backend
├── app.py                              # Streamlit UI (legacy)
├── servers/
│   ├── clinical_decision_support_client.py  # Core orchestration
│   ├── nice_guidelines_server.py       # NICE MCP server
│   ├── bnf_server.py                   # BNF MCP server
│   ├── patient_info_server.py          # Patient data MCP server
│   ├── geolocation_server.py           # Geolocation MCP server
│   └── pubmed_server.py                # PubMed MCP server
├── frontend/                           # React + TypeScript
│   ├── src/
│   │   ├── App.tsx                    # Main application
│   │   ├── components/                # React components
│   │   └── index.css                  # Global styles + Tailwind
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── tailwind.config.js
├── .env                               # Environment variables (local only)
├── pyproject.toml                     # Python dependencies
├── requirements.txt                   # Docker/Cloud Run deployment
├── Dockerfile                         # Cloud Run container definition
├── .dockerignore                      # Docker build exclusions
├── deploy-cloudrun.sh                 # Cloud Run deployment script
└── vercel.json                        # Vercel frontend configuration
```

## Common Development Tasks

### Adding a New MCP Server

1. Create `servers/new_server.py` using FastMCP framework
2. Add to `MCP_SERVERS` dict in `clinical_decision_support_client.py`
3. Implement tools using `@mcp.tool()` decorators
4. Return structured dictionaries with `success`/`error` fields
5. Include comprehensive docstrings

### Modifying the Clinical Workflow

Edit `clinical_decision_support` method in `servers/clinical_decision_support_client.py`:
- Workflow steps are clearly commented
- Uses `call_tool()` to route to appropriate servers
- Implements Claude API calls with structured prompts

### Adding Frontend Components

1. Create component in `frontend/src/components/`
2. Use TypeScript with proper type definitions
3. Follow Tailwind CSS patterns from existing components
4. Import in `App.tsx` and integrate into UI flow

### Testing API Changes

```bash
# Start backend
python api.py

# Test with curl
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"consultation": "3-year-old with croup"}'

# Or use the frontend
cd frontend && npm run dev
```

## Safety and Clinical Disclaimers

⚠️ **Critical:** This is a clinical decision support tool for healthcare professionals.

- All recommendations require professional review before prescribing
- Verify allergies, interactions, contraindications
- Consider renal/hepatic function, pregnancy status
- Follow local protocols and formularies
- System provides reference information, not clinical judgment

## Known Issues and Limitations

1. **UK-focused:** Primarily uses UK guidelines (NICE, BNF)
2. **Web scraping dependency:** Changes to source websites may break scrapers
3. **Rate limiting:** BNF server includes 0.5s delays to avoid blocks
4. **NHMRC timeouts:** Australian server may experience geographic restrictions
5. **Anthropic API required:** Core features won't work without valid API key

## Documentation Files

- `README.md` - Project overview and MCP server details
- `STREAMLIT_README.md` - Streamlit UI documentation
- `FRONTEND_README.md` - Full stack architecture details
- `servers/README.md` - Multi-server architecture
- `servers/NICE_GUIDELINES_README.md` - NICE server details
- `servers/HEIDI_README.md` - Legacy orchestrator docs
- `CLOUDRUN_DEPLOYMENT.md` - Google Cloud Run deployment guide (backend)
- `VERCEL_DEPLOYMENT.md` - Vercel deployment guide (frontend)
