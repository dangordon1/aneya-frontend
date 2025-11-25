# Speech-to-Text Benchmark Workflow Guide

## Recommended Workflow: Record Then Benchmark

The best workflow separates recording from benchmarking, giving you full control:

### Step 1: Record Your Audio

Choose your preferred recording method:

#### Option A: Enter Key (Simplest)
```bash
uv run python record_audio_enter.py
```
- Press Enter to start
- Speak your content
- Press Enter to stop
- Audio saved to `recorded_audio.wav`

#### Option B: Space Bar (Most Flexible)
```bash
uv run python record_audio_keyboard.py
```
- Press SPACE to start
- Speak your content
- Press SPACE to stop
- Press ESC to exit (or SPACE to record another clip)

#### Option C: Fixed Duration
```bash
uv run python record_audio.py 15
```
- 3-2-1 countdown
- Records for exactly 15 seconds
- Auto-saves to `recorded_audio.wav`

### Step 2: Review Your Recording (Optional)

Listen to your recording before benchmarking:
```bash
# macOS
afplay recorded_audio.wav

# Linux
aplay recorded_audio.wav

# Or use any audio player
open recorded_audio.wav
```

### Step 3: Run the Benchmark

Once you're satisfied with your recording, benchmark all models:

```bash
# Without reference text (latency only)
uv run python benchmark_stt.py recorded_audio.wav

# With reference text (latency + accuracy)
uv run python benchmark_stt.py recorded_audio.wav "Your exact spoken words here"
```

The benchmark will:
1. Test all 7 models (Parakeet + Whisper variants + Faster-Whisper variants)
2. Measure latency for each
3. Calculate WER and CER if reference text provided
4. Display results table sorted by speed
5. Save results to `benchmark_results.json`

## Example: Medical Dictation Workflow

```bash
# 1. Record a patient consultation
uv run python record_audio_enter.py

# You speak:
# "Patient presents with acute upper respiratory infection.
#  Temperature is 38.5 degrees Celsius.
#  Prescribed amoxicillin 500mg three times daily for seven days."

# 2. Review the recording
afplay recorded_audio.wav

# 3. Run benchmark with reference text
uv run python benchmark_stt.py recorded_audio.wav \
  "Patient presents with acute upper respiratory infection. Temperature is 38.5 degrees Celsius. Prescribed amoxicillin 500mg three times daily for seven days."

# 4. Review results and choose best model for your use case
```

## All-in-One Workflows (Legacy)

If you prefer automated recording + benchmarking:

```bash
# Enter key control + auto-benchmark
./run_benchmark_enter.sh

# Space bar control + auto-benchmark
./run_benchmark_keyboard.sh

# Fixed duration + auto-benchmark
./run_benchmark.sh 15
```

These scripts automatically run the benchmark after recording finishes.

## Quick Testing with Sample Audio

Test the benchmark without recording your own audio:

```bash
# Use included English sample
uv run python benchmark_stt.py sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8/test_wavs/en.wav

# Other language samples
uv run python benchmark_stt.py sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8/test_wavs/de.wav  # German
uv run python benchmark_stt.py sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8/test_wavs/es.wav  # Spanish
uv run python benchmark_stt.py sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8/test_wavs/fr.wav  # French
```

## Understanding the Results

### Latency (Speed)
- **Faster-Whisper models**: Usually fastest due to int8 quantization
- **Parakeet TDT**: Good balance of speed and accuracy
- **Standard Whisper**: Highest accuracy but slower

### Accuracy (WER/CER)
- **Lower is better** (0% = perfect transcription)
- **WER**: Word Error Rate - measures word-level accuracy
- **CER**: Character Error Rate - measures character-level accuracy
- **Large models**: Generally more accurate but slower
- **Small models**: Faster but may miss medical/technical terms

### Choosing a Model

For **aneya clinical system**:
- **Real-time dictation**: Use Faster-Whisper small (fastest)
- **High accuracy needed**: Use Whisper large (most accurate)
- **Balanced approach**: Use Parakeet TDT or Faster-Whisper medium
- **Medical terminology**: Test with actual medical content to see which handles it best

## Tips

1. **Record in quiet environment** - Background noise reduces all models' accuracy
2. **Use good microphone** - Built-in laptop mics can reduce accuracy by 10-20%
3. **Speak clearly** - Normal pace, clear enunciation
4. **Provide reference text** - Essential for measuring accuracy
5. **Test with real content** - Medical terminology behaves differently than general speech
6. **Compare multiple recordings** - Results can vary by content type

## Troubleshooting

### No audio recorded
- Check microphone permissions
- Test with `uv run python -c "import sounddevice; print(sounddevice.query_devices())"`
- Ensure microphone is not muted

### Models download on first run
- Whisper models: 1-3GB each (one-time download)
- Faster-Whisper: Downloads optimized versions automatically
- Be patient on first run

### Keyboard input not working
- **Space bar script**: Requires accessibility permissions on macOS
- **Enter key script**: Works everywhere without special permissions
- **Fallback**: Use fixed duration recording

### Audio quality issues
- Check sample rate (should be 16kHz)
- Verify mono channel (stereo not supported)
- Test recording with system audio app first
