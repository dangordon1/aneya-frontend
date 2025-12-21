# aneya Frontend

React + TypeScript frontend for clinical decision support with real-time voice transcription.

## Overview

This is the user-facing interface for aneya, providing:
- **React + TypeScript UI** - Modern, responsive clinical interface
- **Real-time Voice Transcription** - NVIDIA Parakeet TDT model for consultation dictation
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
- **Backend:** https://aneya-backend-217191264902.europe-west2.run.app

## Features

### Voice Transcription
- Real-time speech-to-text using **NVIDIA Parakeet TDT 1.1B** model
- Accumulative transcription pattern for high accuracy (5% WER)
- Progressive updates every 2 seconds during recording
- Medical terminology optimized

**Note on Cold Start Latency:** The first transcription request takes ~5 seconds due to model loading. Subsequent requests are 2-3 seconds. See [Performance](#performance) section for details.

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
npm install
```

### Environment Variables

Create `.env.local` for local development:

```bash
VITE_API_URL=http://localhost:8000
VITE_DEEPGRAM_API_KEY=<your-key>
```

For production (configured in Vercel):

```bash
VITE_API_URL=https://aneya-backend-217191264902.europe-west2.run.app
VITE_DEEPGRAM_API_KEY=<production-key>
```

Note: Transcription uses the backend's Parakeet TDT model - no separate API keys required for voice input.

### Running Locally

```bash
npm run dev
```

Frontend runs on: http://localhost:5173

### Build

```bash
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
vercel --prod
```

The `vercel.json` configuration automatically:
- Builds from the root directory
- Outputs to `dist/`
- Handles routing for SPA

## Component Structure

React components in `src/components/`:

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

### Voice Input Architecture

Voice transcription uses an **accumulative pattern** in `InputScreen.tsx`:
- Records audio in 2-second chunks via MediaRecorder
- Sends progressively longer audio blobs to `/api/transcribe`
- Backend transcribes using Parakeet TDT and returns full text
- UI updates with complete transcription (not incremental)

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

Transcription endpoint: `POST /api/transcribe` (multipart form with audio file)

## Performance

### Cold Start Behavior

The first transcription request is slower than subsequent ones:

| Request | Latency | Reason |
|---------|---------|--------|
| First | ~5-6 seconds | Model loading into memory |
| Subsequent | ~2-3 seconds | Model already loaded |

**Why this happens:**
- Parakeet TDT is a 600MB model that must be loaded into CPU/GPU memory
- Cloud Run may scale to zero, requiring cold start on first request
- NeMo framework has initialization overhead

**Mitigation options:**
1. Set Cloud Run `min-instances: 1` to keep backend warm
2. Implement a warm-up request on page load
3. Show user feedback during first transcription

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
