# aneya Frontend

React + TypeScript frontend for clinical decision support with real-time voice transcription.

## Overview

This is the user-facing interface for aneya, providing:
- **React + TypeScript UI** - Modern, responsive clinical interface
- **Real-time Voice Transcription** - Deepgram integration for consultation dictation
- **aneya Branding** - Custom color scheme and design system
- **Clinical Workflow** - Intuitive interface for consultation analysis

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│  React Frontend │ ───────▶│  FastAPI Backend │
│  (Vercel)       │         │  (Cloud Run)     │
└─────────────────┘         └──────────────────┘
```

- **Frontend:** https://aneya.vercel.app
- **Backend:** https://aneya-backend-fhnsxp4nua-nw.a.run.app

## Features

### Voice Transcription
- Real-time speech-to-text using Deepgram's nova-2-medical model
- WebSocket streaming for low-latency transcription
- Automatic patient ID extraction from dictation
- Interim and final transcript display

### User Interface
- Clean, professional design with aneya branding
- Responsive layout for desktop and mobile
- Progress indicators for analysis steps
- Expandable sections for detailed information
- Clinical warnings and disclaimers

### Design System

**Colors:**
- **Primary:** `#0c3555` (aneya-navy)
- **Accent:** `#1d9e99` (aneya-teal)
- **Background:** `#f6f5ee` (aneya-cream)
- **Hover:** Transitions between navy and cream

**Typography:**
- **Headings:** Georgia (serif)
- **Body:** Inter (sans-serif)

**Styling:** Tailwind CSS with custom configuration

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
cd frontend
npm install
```

### Environment Variables

Create `frontend/.env` for local development:

```bash
VITE_API_URL=http://localhost:8000
VITE_DEEPGRAM_API_KEY=your-deepgram-key
```

For production (configured in Vercel):

```bash
VITE_API_URL=https://aneya-backend-fhnsxp4nua-nw.a.run.app
VITE_DEEPGRAM_API_KEY=your-deepgram-key
```

### Running Locally

```bash
cd frontend
npm run dev
```

Frontend runs on: http://localhost:5173

### Build

```bash
cd frontend

# Development build
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Deployment

Deployed on **Vercel** (static React build)
- **URL:** https://aneya.vercel.app
- **Framework:** Vite + React + TypeScript

### Deploy to Vercel

```bash
cd frontend
vercel --prod
```

The `vercel.json` configuration automatically:
- Builds from the `frontend/` directory
- Outputs to `frontend/dist`
- Handles routing for SPA

## Component Structure

React components in `frontend/src/components/`:

- **InputScreen.tsx** - Consultation input with voice recording
- **ProgressScreen.tsx** - Animated progress indicators (6 steps)
- **AnalysisComplete.tsx** - Completion status
- **ReportScreen.tsx** - Main results display
- **DiagnosisCard.tsx** - Individual diagnosis with confidence badge
- **MedicationBox.tsx** - Prescribing guidance cards
- **ExpandableSection.tsx** - Collapsible content sections
- **WarningBox.tsx** - Clinical warnings and disclaimers
- **PrimaryButton.tsx** - Branded button component
- **ProgressStep.tsx** - Individual progress step indicator

### Hooks

- **useDeepgramTranscription.ts** - WebSocket-based voice transcription
  - Manages MediaRecorder for audio capture
  - Handles WebSocket connection to backend
  - Provides interim and final transcripts
  - Auto-reconnection logic

## API Integration

Frontend makes a single POST to `/api/analyze` with:

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

WebSocket endpoint for transcription: `/ws/transcribe`

## Related Repositories

- **Backend:** [aneya-backend](https://github.com/dangordon1/aneya-backend) - FastAPI + MCP servers deployed on Cloud Run

## Safety and Clinical Disclaimers

⚠️ **Critical:** This is a clinical decision support tool for healthcare professionals.

- All recommendations require professional review before prescribing
- Verify allergies, interactions, contraindications
- Consider renal/hepatic function, pregnancy status
- Follow local protocols and formularies
- System provides reference information, not clinical judgment

## License

Proprietary
