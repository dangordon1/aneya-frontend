# Parakeet TDT Deployment Guide

## What Changed

Successfully deployed **NVIDIA Parakeet TDT 1.1B** model to replace Faster-Whisper for voice transcription.

### Backend Changes (`backend/api.py`)

1. **Replaced Faster-Whisper with Parakeet TDT**
   - Changed from `faster_whisper.WhisperModel` to `nemo.collections.asr.models.ASRModel`
   - Model: `nvidia/parakeet-tdt-1.1b` from HuggingFace

2. **Updated Startup (lines 28-112)**
   - Loads Parakeet TDT on startup (cached after first download ~600MB)
   - Model loads in ~10 seconds (first time) or instantly (cached)

3. **Updated `/api/transcribe` endpoint (lines 343-404)**
   - Now uses Parakeet TDT for transcription
   - Returns additional metadata: `latency_seconds` and `model` name

### Frontend Changes (`frontend/src/components/InputScreen.tsx`)

1. **Re-enabled voice input functionality**
   - Uncommented all voice recording code
   - Button now labeled "Voice Input (Parakeet TDT)"

2. **UI Updates**
   - Microphone button visible on input screen
   - Shows recording state (Recording / Transcribing / Ready)
   - 3 states: Blue (ready), Red pulsing (recording), Gray (transcribing)

## Performance Improvements

| Metric | Faster-Whisper Small | Parakeet TDT 1.1B | Improvement |
|--------|---------------------|-------------------|-------------|
| **Latency** | 12.6s | 2.7s | **5x faster** |
| **WER** | 14.29% | 5.00% | **3x more accurate** |
| **CER** | 7.98% | 2.31% | **3.5x more accurate** |

## How to Test

### 1. Backend is Already Running

Backend is running on http://localhost:8000 with Parakeet loaded.

### 2. Start the Frontend

```bash
cd frontend
npm run dev
```

Frontend will be at http://localhost:5173

### 3. Test Voice Input

1. Open http://localhost:5173
2. Click the **"Voice Input (Parakeet TDT)"** button (top right of textarea)
3. Allow microphone permissions when prompted
4. Speak your clinical consultation
5. Click **"Stop Recording"** (button turns red while recording)
6. Wait ~2-3 seconds for transcription
7. Text appears in the consultation textarea

### 4. Expected Behavior

**Recording:**
- Button turns RED and pulses
- Says "Stop Recording"

**Transcribing:**
- Button turns GRAY
- Shows spinner and "Transcribing..."

**Completed:**
- Transcribed text appears in textarea
- Button returns to BLUE "Voice Input (Parakeet TDT)"

## Number Formatting Note

Parakeet outputs numbers as words:
- **Parakeet:** "thirty eight point five degrees"
- **Expected:** "38.5 degrees"

This is by design. The transcription is otherwise extremely accurate (5% WER vs 14% for Whisper).

For clinical use, you may want to add post-processing to convert spelled-out numbers to digits.

## API Response Format

```json
{
  "success": true,
  "text": "patient presents with a three day history...",
  "latency_seconds": 2.67,
  "model": "nvidia/parakeet-tdt-1.1b"
}
```

## Dependencies Added

### Python (backend)
- `nemo_toolkit[asr]` - NVIDIA NeMo for Parakeet
- NumPy constrained to `< 2.2` (Numba compatibility)

### Already Installed
- PyTorch (from existing requirements)
- soundfile, scipy (from existing requirements)

## Troubleshooting

### Model Not Loading
```
❌ Failed to load Parakeet TDT model
```
**Solution:** Ensure NeMo toolkit is installed: `uv pip install 'nemo_toolkit[asr]'`

### Slow First Startup
- First load downloads ~600MB model from HuggingFace
- Takes 1-2 minutes
- Subsequent loads are instant (cached)

### Microphone Permissions
- Browser will prompt for microphone access
- Click "Allow" to enable voice input
- Check browser settings if blocked

### Transcription Errors
Check backend logs:
```bash
# Look for transcription progress in terminal running backend
```

## Benchmark Results

Complete benchmark results saved in:
- `benchmark_results_complete.json` - All 7 models tested
- Shows Parakeet TDT as winner in both speed and accuracy

## Next Steps (Optional)

1. **Add number normalization** - Convert spelled-out numbers to digits
2. **Deploy to Cloud Run** - Update Dockerfile with NeMo dependencies
3. **Add Parakeet to production** - Update deployment scripts
