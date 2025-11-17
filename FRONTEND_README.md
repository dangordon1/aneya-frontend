# Clara - Full Stack Application

A modern clinical decision support system with React frontend and FastAPI backend, integrating your Figma design with the existing clinical decision support infrastructure.

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────────┐
│  React Frontend │ ───────▶│  FastAPI Backend │ ───────▶│  MCP Servers        │
│  (Port 5173)    │         │  (Port 8000)     │         │  (NICE, BNF, etc.)  │
└─────────────────┘         └──────────────────┘         └─────────────────────┘
```

## Prerequisites

- **Python 3.12+** with `uv` installed
- **Node.js 18+** with `npm` installed
- **Anthropic API Key** (set in `.env` file)

## Setup

### 1. Backend Setup (FastAPI + MCP Servers)

The backend is already configured! Just ensure your `.env` file has:

```bash
ANTHROPIC_API_KEY=your_api_key_here
```

Dependencies are already installed via `uv sync`.

### 2. Frontend Setup (React + Vite)

Navigate to the frontend directory and install dependencies:

```bash
cd frontend
npm install
```

## Running the Application

You need to run **two separate processes** in different terminals:

### Terminal 1: Start the Backend (FastAPI)

```bash
# From the project root directory
python api.py
```

or with uv:

```bash
uv run python api.py
```

**The backend will start on http://localhost:8000**

You should see:
```
✅ Connected to all MCP servers
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Terminal 2: Start the Frontend (React)

```bash
# From the frontend directory
cd frontend
npm run dev
```

**The frontend will start on http://localhost:5173**

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 3. Open in Browser

Open your browser and navigate to:

**http://localhost:5173**

You should see the Clara Clinical Decision Support interface!

## Usage Flow

1. **Input Screen** - Enter or use the pre-loaded consultation summary
2. **Progress Screen** - Watch real-time analysis progress
3. **Analysis Complete** - Review completion status
4. **Report Screen** - View comprehensive clinical decision support report with:
   - Patient information
   - Clinical diagnoses with confidence levels
   - Evidence-based prescribing guidance (first-line and alternatives)
   - Special considerations (elderly, renal, hepatic, pregnancy)
   - Drug interactions with current medications
   - Links to NICE guidelines, CKS topics, and BNF summaries

## API Endpoints

The FastAPI backend exposes:

- **GET  `/`** - Root endpoint
- **GET  `/health`** - Health check
- **POST `/api/analyze`** - Analyze consultation (called by frontend)
- **GET  `/api/examples`** - Get example consultations

## Development

### Backend Development

The FastAPI backend (`api.py`) wraps your existing `ClinicalDecisionSupportClient`:

- Connects to all MCP servers on startup
- Handles CORS for local development
- Processes consultation analysis requests
- Returns structured JSON responses

### Frontend Development

The React frontend uses:

- **Vite** - Fast build tool
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library

Key components:
- `App.tsx` - Main app with state management
- `InputScreen.tsx` - Consultation input
- `ProgressScreen.tsx` - Animated progress indicators
- `ReportScreen.tsx` - Comprehensive results display

### Styling

The design system matches your Figma specifications:

- **Colors**: Primary Purple (#351431), Soft Pink (#F0D1DA)
- **Typography**: Georgia (serif) for headings, Inter (sans-serif) for body
- **Components**: Cards, buttons, expandable sections, medication boxes
- **Shadows**: Subtle shadows matching Clara Health brand

## Troubleshooting

### Backend Issues

**Problem**: `Client not initialized` error

**Solution**: Make sure the backend has fully started and connected to all MCP servers before making requests.

**Problem**: `Connection to MCP servers failed`

**Solution**: Ensure all server files exist in the `servers/` directory and are executable.

### Frontend Issues

**Problem**: `Failed to fetch` or CORS errors

**Solution**: Ensure the backend is running on port 8000 and CORS is properly configured.

**Problem**: `Module not found` errors

**Solution**: Run `npm install` in the `frontend` directory.

### Port Conflicts

**Problem**: Port 5173 or 8000 already in use

**Solution**:
- Change frontend port in `vite.config.ts`
- Change backend port in `api.py` and update `App.tsx` API URL

## Project Structure

```
heidi/
├── api.py                              # FastAPI backend
├── app.py                              # Original Streamlit app (legacy)
├── servers/                            # MCP servers
│   ├── clinical_decision_support_client.py
│   ├── nice_guidelines_server.py
│   ├── bnf_server.py
│   ├── patient_info_server.py
│   ├── geolocation_server.py
│   └── pubmed_server.py
├── frontend/                           # React frontend
│   ├── src/
│   │   ├── App.tsx                    # Main app component
│   │   ├── main.tsx                   # Entry point
│   │   ├── index.css                  # Global styles
│   │   └── components/                # React components
│   │       ├── InputScreen.tsx
│   │       ├── ProgressScreen.tsx
│   │       ├── AnalysisComplete.tsx
│   │       ├── ReportScreen.tsx
│   │       ├── PrimaryButton.tsx
│   │       ├── DiagnosisCard.tsx
│   │       ├── ExpandableSection.tsx
│   │       ├── MedicationBox.tsx
│   │       ├── ProgressStep.tsx
│   │       └── WarningBox.tsx
│   ├── package.json                   # Dependencies
│   ├── vite.config.ts                 # Vite config
│   ├── tsconfig.json                  # TypeScript config
│   ├── tailwind.config.js             # Tailwind config
│   └── index.html                     # HTML template
├── .env                               # Environment variables
└── pyproject.toml                     # Python dependencies
```

## Next Steps

### Deployment

**Backend:**
- Deploy to cloud platform (AWS, GCP, Azure)
- Use environment variables for API keys
- Set up proper CORS for production domain

**Frontend:**
- Build for production: `npm run build`
- Deploy static files to CDN or hosting service
- Update API URL to production backend

### Enhancements

- Add authentication/authorization
- Implement patient data persistence
- Add export to PDF functionality
- Create user preferences and history
- Add real-time collaboration features

## License

This project is for educational/hackathon purposes.
