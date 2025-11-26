# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**aneya** is a clinical decision support system with a **split repository architecture**:

- **This repo (aneya)**: React + TypeScript frontend
- **Backend repo (aneya-backend)**: FastAPI + MCP servers (separate repository)

**Live URLs:**
- Frontend: https://aneya.vercel.app
- Backend: https://aneya-backend-fhnsxp4nua-nw.a.run.app

## Architecture

```
┌─────────────────┐         ┌──────────────────────────────────────────────┐
│  React Frontend │ ───────▶│  FastAPI Backend (separate repo)              │
│  (Vercel)       │         │  - MCP Servers (NICE, BNF, PubMed)           │
│                 │         │  - Parakeet TDT transcription                │
│                 │         │  - Claude AI analysis                        │
└─────────────────┘         └──────────────────────────────────────────────┘
```

## This Repository Contains

- `frontend/` - React + TypeScript application
- Voice transcription UI (uses backend's Parakeet TDT model)
- Clinical consultation input and results display
- Vercel deployment configuration

## Backend Repository (aneya-backend)

The backend is in a **separate repository**: [aneya-backend](https://github.com/dangordon1/aneya-backend)

It contains:
- FastAPI server with MCP server integration
- NVIDIA Parakeet TDT 1.1B for voice transcription
- NICE Guidelines, BNF, PubMed scrapers
- Claude AI integration for clinical analysis

## Development Setup

### Prerequisites

- Node.js 18+ with `npm`

### Installation

```bash
cd frontend
npm install
```

### Environment Variables

Create `frontend/.env`:

```bash
VITE_API_URL=http://localhost:8000
```

For production, this points to the Cloud Run backend.

## Running the Application

### Frontend Only (connects to production backend)

```bash
cd frontend
npm run dev
```

Frontend runs on: http://localhost:5173

### Full Stack (requires backend repo)

1. Clone and run the backend repo: [aneya-backend](https://github.com/dangordon1/aneya-backend)
2. Run frontend with `VITE_API_URL=http://localhost:8000`

## Build Commands

```bash
cd frontend

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Deployment

### Frontend to Vercel

```bash
cd frontend
vercel --prod
```

### Backend

See the [aneya-backend](https://github.com/dangordon1/aneya-backend) repository for Cloud Run deployment.

## API Endpoints (Backend)

**FastAPI Backend:**
- `GET /health` - Health check
- `POST /api/analyze` - Main consultation analysis endpoint
- `POST /api/transcribe` - Voice transcription (Parakeet TDT)
- `GET /api/examples` - Example clinical scenarios

**Frontend makes requests to:**
```typescript
// Consultation analysis
POST /api/analyze
{
  consultation: string,
  patient_id?: string,
  patient_age?: string,
  allergies?: string,
  user_ip?: string,
  location_override?: string
}

// Voice transcription
POST /api/transcribe
FormData with audio file
```

## Frontend Component Structure

React components in `frontend/src/components/`:

- `InputScreen.tsx` - Consultation input with voice recording
- `ProgressScreen.tsx` - Animated progress indicators (6 steps)
- `AnalysisComplete.tsx` - Completion status
- `ReportScreen.tsx` - Main results display
- `DiagnosisCard.tsx` - Individual diagnosis with confidence badge
- `MedicationBox.tsx` - Prescribing guidance cards
- `ExpandableSection.tsx` - Collapsible content sections
- `WarningBox.tsx` - Clinical warnings and disclaimers

### Voice Transcription Implementation

Located in `InputScreen.tsx`:
- Uses **accumulative transcription pattern** (not streaming)
- Records audio in 2-second chunks via MediaRecorder
- Sends progressively longer audio blobs to `/api/transcribe`
- Backend uses Parakeet TDT 1.1B model for transcription

**Cold Start Behavior:**
- First transcription: ~5-6 seconds (model loading)
- Subsequent: ~2-3 seconds (model cached)

### Design System

**Colors:**
- Primary: `#0c3555` (aneya-navy)
- Accent: `#1d9e99` (aneya-teal)
- Background: `#f6f5ee` (aneya-cream)

**Typography:**
- Headings: Georgia (serif)
- Body: Inter (sans-serif)

**Styling:** Tailwind CSS with custom configuration in `tailwind.config.js`

## File Structure

```
aneya/
├── frontend/                           # React + TypeScript
│   ├── src/
│   │   ├── App.tsx                    # Main application
│   │   ├── components/                # React components
│   │   └── index.css                  # Global styles + Tailwind
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── tailwind.config.js
├── vercel.json                        # Vercel configuration
├── README.md                          # Project overview
├── CLAUDE.md                          # This file
├── ACCUMULATIVE_TRANSCRIPTION.md      # Transcription implementation details
└── PARAKEET_DEPLOYMENT.md            # Voice transcription setup
```

## Adding Frontend Components

1. Create component in `frontend/src/components/`
2. Use TypeScript with proper type definitions
3. Follow Tailwind CSS patterns from existing components
4. Import in `App.tsx` and integrate into UI flow

## Safety and Clinical Disclaimers

⚠️ **Critical:** This is a clinical decision support tool for healthcare professionals.

- All recommendations require professional review before prescribing
- Verify allergies, interactions, contraindications
- Consider renal/hepatic function, pregnancy status
- Follow local protocols and formularies
- System provides reference information, not clinical judgment
