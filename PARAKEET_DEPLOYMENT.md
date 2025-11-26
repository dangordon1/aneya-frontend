# Parakeet TDT Deployment Guide

## Overview

Voice transcription uses **NVIDIA Parakeet TDT 1.1B** model deployed on the backend (aneya-backend repo).

**Note:** The backend is in a separate repository: [aneya-backend](https://github.com/dangordon1/aneya-backend)

## Architecture

```
Frontend (this repo)          Backend (aneya-backend)
┌─────────────────┐           ┌─────────────────────────┐
│ InputScreen.tsx │ ─────────▶│ /api/transcribe         │
│ - MediaRecorder │   POST    │ - Parakeet TDT 1.1B     │
│ - 2s chunks     │   audio   │ - NeMo ASR framework    │
└─────────────────┘           └─────────────────────────┘
```

## Cold Start Behavior

### The Problem

The first transcription request takes significantly longer than subsequent ones:

| Request | Latency | Reason |
|---------|---------|--------|
| **First** | ~5-6 seconds | Model loading into memory |
| **Subsequent** | ~2-3 seconds | Model already cached |

### Why This Happens

1. **Model Size**: Parakeet TDT is ~600MB and must be loaded into CPU/GPU memory
2. **NeMo Framework**: Has significant initialization overhead on first use
3. **Cloud Run Scaling**: With `min-instances: 0`, containers cold start from scratch

### Solutions

**Option 1: Keep Backend Warm (Recommended for Production)**
```bash
# Set min-instances in Cloud Run deployment
gcloud run deploy aneya-backend \
  --min-instances=1 \
  --memory=2Gi \
  --cpu=2
```
Cost: ~$15-30/month for always-on instance

**Option 2: Pre-warm on Page Load**
Add to `InputScreen.tsx`:
```typescript
useEffect(() => {
  // Send a tiny audio blob to pre-load the model
  const silentBlob = new Blob([new ArrayBuffer(1000)], { type: 'audio/webm' });
  const formData = new FormData();
  formData.append('audio', silentBlob, 'warmup.webm');
  fetch(`${API_URL}/api/transcribe`, { method: 'POST', body: formData })
    .catch(() => {}); // Ignore errors
}, []);
```

**Option 3: Show User Feedback**
Current implementation shows "Recording... transcription will begin shortly" during cold start.

## Frontend Implementation

Located in `InputScreen.tsx`:

1. **Accumulative Pattern**: Sends progressively longer audio (not individual chunks)
2. **2-second intervals**: Records in 2s chunks, transcribes ALL audio so far
3. **Full replacement**: Each transcription result replaces the previous one

## Performance Improvements

| Metric | Faster-Whisper Small | Parakeet TDT 1.1B | Improvement |
|--------|---------------------|-------------------|-------------|
| **Latency** | 12.6s | 2.7s | **5x faster** |
| **WER** | 14.29% | 5.00% | **3x more accurate** |
| **CER** | 7.98% | 2.31% | **3.5x more accurate** |

## Testing Voice Input

1. Start frontend: `cd frontend && npm run dev`
2. Open http://localhost:5173
3. Click **"Record Consultation"** button
4. Allow microphone permissions when prompted
5. Speak your clinical consultation
6. Watch text appear progressively every ~2 seconds
7. Click **"Stop Recording"** when done
8. Text transfers to the main textarea

**Recording States:**
- Button RED + pulsing = Recording active
- Text updating in real-time = Transcription working
- First update takes ~5s (cold start), subsequent updates ~2-3s

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

## Troubleshooting

### Slow First Transcription
This is expected cold start behavior - see [Cold Start Behavior](#cold-start-behavior) section above.

### Microphone Permissions
- Browser will prompt for microphone access
- Click "Allow" to enable voice input
- Check browser settings if blocked

### No Transcription Appearing
- Check browser console for errors
- Verify backend is running and accessible
- Check CORS settings if using different domains

## Related Documentation

- `ACCUMULATIVE_TRANSCRIPTION.md` - Detailed explanation of the transcription pattern
- `STT_BENCHMARK_README.md` - Benchmark methodology and results
