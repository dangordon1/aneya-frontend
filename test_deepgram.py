#!/usr/bin/env python
"""
Test Deepgram WebSocket streaming transcription using SDK v5 listen.v2 API.
Uses the Flux model for real-time conversational transcription.
Streams a local audio file to Deepgram and prints real-time transcription.
"""

from deepgram import DeepgramClient
from deepgram.core.events import EventType
from pathlib import Path
import subprocess
import threading
import time

DEEPGRAM_API_KEY = "1d69da5508e5911193150d3e6634184178f71f74"
AUDIO_FILE = Path(__file__).parent / "test_audio.mp3"

# Use test audio from backend if local doesn't exist
if not AUDIO_FILE.exists():
    AUDIO_FILE = Path("/Users/dgordon/python/hackathons/aneya-backend/transcription/test_audio.mp3")

print(f"Audio file: {AUDIO_FILE}")
print(f"File exists: {AUDIO_FILE.exists()}")

if not AUDIO_FILE.exists():
    print("ERROR: No test audio file found!")
    exit(1)

print(f"File size: {AUDIO_FILE.stat().st_size / 1024:.2f} KB")

# Initialize the Deepgram client
client = DeepgramClient(api_key=DEEPGRAM_API_KEY)

final_transcripts = []

print("\nConnecting to Deepgram...")
print("=" * 60)

# Use v5 listen.v2 API with Flux model for real-time conversational transcription
with client.listen.v2.connect(
    model="flux-general-en",
    encoding="linear16",
    sample_rate="16000",
) as connection:
    ready = threading.Event()

    def on_message(result):
        """Handle transcription results from Flux model"""
        event = getattr(result, "event", None)
        turn_index = getattr(result, "turn_index", None)
        eot_confidence = getattr(result, "end_of_turn_confidence", None)

        if event == "StartOfTurn":
            print(f"--- StartOfTurn (Turn {turn_index}) ---")

        transcript = getattr(result, "transcript", None)
        if transcript:
            print(f"[TRANSCRIPT] {transcript}")
            final_transcripts.append(transcript)

        if event == "EndOfTurn":
            print(f"--- EndOfTurn (Turn {turn_index}, Confidence: {eot_confidence}) ---")

    # Register event handlers
    connection.on(EventType.OPEN, lambda _: ready.set())
    connection.on(EventType.MESSAGE, on_message)

    # Use ffmpeg to convert mp3 to linear16 PCM and stream it
    print("Converting and streaming audio file with ffmpeg...")
    ffmpeg = subprocess.Popen([
        "ffmpeg", "-loglevel", "quiet",
        "-i", str(AUDIO_FILE),
        "-f", "s16le", "-ar", "16000", "-ac", "1", "-"
    ], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)

    def stream():
        ready.wait()
        print("Streaming audio...")
        while data := ffmpeg.stdout.read(2560):
            connection.send_media(data)
        print("[INFO] Finished sending audio data")

    threading.Thread(target=stream, daemon=True).start()

    print("Transcribing audio file...")
    connection.start_listening()

print()
print("=" * 60)
print("FINAL TRANSCRIPT")
print("=" * 60)
print(" ".join(final_transcripts))
print()
print("=" * 60)
print("TEST PASSED!" if final_transcripts else "TEST FAILED - No transcript received")
print("=" * 60)