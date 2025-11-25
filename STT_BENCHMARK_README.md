# Speech-to-Text Model Benchmark

Comprehensive benchmarking system comparing multiple speech-to-text models:

## Models Tested

1. **NVIDIA Parakeet TDT** (int8 quantized)
   - Lightweight, optimized for edge deployment
   - ONNX Runtime inference

2. **OpenAI Whisper** (small, medium, large)
   - Standard Whisper models from OpenAI
   - FP32 precision

3. **Faster-Whisper** (small, medium, large)
   - Optimized Whisper implementation using CTranslate2
   - int8 quantization for speed

## Metrics

For each model, the benchmark measures:

- **Latency**: Time to transcribe audio (seconds)
- **WER**: Word Error Rate (%) - if reference text provided
- **CER**: Character Error Rate (%) - if reference text provided

## Quick Start

### Option 1: Keyboard-Controlled Recording (RECOMMENDED)

**Space Bar Control:**
```bash
# Press SPACE to start/stop recording, then benchmark all models
./run_benchmark_keyboard.sh

# With reference text for accuracy measurement
./run_benchmark_keyboard.sh "The quick brown fox jumps over the lazy dog"
```

**Enter Key Control:**
```bash
# Press Enter to start, Enter to stop, then benchmark
./run_benchmark_enter.sh

# With reference text
./run_benchmark_enter.sh "Your reference text here"
```

**Just record audio (no benchmark):**
```bash
# Space bar control - press SPACE to start/stop, ESC to exit
uv run python record_audio_keyboard.py

# Enter key control - press Enter to start, Enter to stop
uv run python record_audio_enter.py
```

### Option 2: Fixed Duration Recording

```bash
# Record 10 seconds and test all models
./run_benchmark.sh 10

# Record 15 seconds with reference text for accuracy measurement
./run_benchmark.sh 15 "The quick brown fox jumps over the lazy dog"
```

### Option 3: Test Existing Audio File

```bash
# Test without reference (latency only)
uv run python benchmark_stt.py your_audio.wav

# Test with reference (latency + accuracy)
uv run python benchmark_stt.py your_audio.wav "Your reference transcription here"
```

## Usage Examples

### Example 1: Quick Test with Keyboard Control
```bash
# Press SPACE to start recording, speak, press SPACE to stop
./run_benchmark_keyboard.sh
```

### Example 2: Medical Dictation Test
```bash
# Record medical consultation with keyboard control
./run_benchmark_enter.sh "Patient presents with acute upper respiratory infection. Temperature is 38.5 degrees Celsius. Prescribed amoxicillin 500mg three times daily for seven days."
```

### Example 3: Using Pre-recorded Audio
```bash
# Use the sample audio files from Parakeet model
uv run python benchmark_stt.py sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8/test_wavs/en.wav
```

### Example 4: Fixed Duration Recording
```bash
# Record for exactly 10 seconds
./run_benchmark.sh 10
```

## Output

The benchmark generates:

1. **Console output**: Formatted table showing:
   - Model name
   - Latency (seconds)
   - WER and CER (if reference provided)
   - Full transcriptions for comparison

2. **JSON file**: `benchmark_results.json` with detailed results for further analysis

## Example Output

```
==============================================================
BENCHMARK RESULTS
==============================================================

Model                          Latency (s)     WER (%)    CER (%)
-----------------------------------------------------------------
Faster-Whisper small (int8)    2.145          8.33       3.21
Parakeet TDT (int8)           3.892          10.25      4.56
Whisper small                  5.234          8.33       3.45
Faster-Whisper medium (int8)   6.721          5.00       2.10
Whisper medium                 12.456         4.17       1.98
Faster-Whisper large (int8)    15.893         3.33       1.23
Whisper large                  28.734         2.50       0.87

==============================================================
TRANSCRIPTIONS
==============================================================

Reference:
The quick brown fox jumps over the lazy dog

Faster-Whisper small (int8):
The quick brown fox jumps over the lazy dog

Parakeet TDT (int8):
the quick brown fox jumps over the lazy dog

...
```

## Dependencies

All dependencies are managed by `uv` and defined in `pyproject.toml`:

- `sherpa-onnx` - NVIDIA Parakeet TDT models
- `openai-whisper` - OpenAI Whisper models
- `faster-whisper` - Optimized Whisper implementation
- `sounddevice` - Audio recording
- `soundfile` - Audio file I/O
- `scipy` - Audio resampling
- `numpy` - Numerical operations
- `pynput` - Keyboard input control (for space bar recording)

## Recording Methods

Three recording options are available:

1. **Space Bar Control** (`record_audio_keyboard.py`) - RECOMMENDED
   - Press SPACE to start recording
   - Press SPACE again to stop
   - Press ESC to exit
   - Can record multiple clips in one session
   - Real-time feedback

2. **Enter Key Control** (`record_audio_enter.py`) - SIMPLE
   - Press Enter to start
   - Press Enter to stop
   - One recording per session
   - No special permissions needed

3. **Fixed Duration** (`record_audio.py`) - LEGACY
   - Specify duration in seconds
   - Automatic countdown
   - Records for exact time period

**Choose Space Bar for flexibility, Enter Key for simplicity, or Fixed Duration for precise timing.**

## Notes

- Audio is recorded at 16kHz mono (standard for STT)
- Models automatically download on first use
- Whisper models: ~1-3GB each (small/medium/large)
- Faster-Whisper downloads optimized versions automatically
- Parakeet TDT model already downloaded (464MB)

## Tips for Accurate Testing

1. **Use a good microphone**: Built-in laptop mics may reduce accuracy
2. **Minimize background noise**: Find a quiet environment
3. **Speak clearly**: Enunciate at normal conversation pace
4. **Provide reference text**: Enables WER/CER calculation
5. **Test multiple samples**: Results can vary by content

## Medical/Clinical Use Cases

For testing with medical terminology (relevant to aneya project):

```bash
# Keyboard control - speak naturally about patient case
./run_benchmark_keyboard.sh "Patient has hypertension and type 2 diabetes mellitus. Current medications include metformin 1000mg twice daily and lisinopril 10mg once daily. Blood pressure is 135 over 85."

# Or use Enter key for simpler control
./run_benchmark_enter.sh
```

The benchmark will show which model best handles medical terminology, helping you choose the optimal model for clinical dictation in the aneya system.

## Quick Reference

```bash
# Keyboard-controlled recording + benchmark
./run_benchmark_keyboard.sh              # Space bar control
./run_benchmark_enter.sh                 # Enter key control

# Fixed duration recording + benchmark
./run_benchmark.sh 15                    # 15 seconds

# Just record audio (no benchmark)
uv run python record_audio_keyboard.py   # Space bar
uv run python record_audio_enter.py      # Enter key
uv run python record_audio.py 10         # 10 seconds

# Test existing audio file
uv run python benchmark_stt.py file.wav  # No accuracy metrics
uv run python benchmark_stt.py file.wav "reference text"  # With WER/CER
```
