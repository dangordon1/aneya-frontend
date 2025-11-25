#!/usr/bin/env python
"""
Test NVIDIA Parakeet CTC API for speech-to-text
https://build.nvidia.com/nvidia/parakeet-ctc-0_6b-asr
"""
import httpx
import base64
import time
import os
from pathlib import Path

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")
NVIDIA_API_URL = "https://ai.api.nvidia.com/v1/audio/transcriptions"
NVIDIA_INVOKE_URL = "https://ai.api.nvidia.com/v1/audio/nvidia/parakeet-ctc-0_6b-asr"

def test_nvidia_transcription(audio_file_path: str):
    """Test NVIDIA Parakeet CTC API with an audio file"""

    if not NVIDIA_API_KEY:
        print("❌ NVIDIA_API_KEY not found in environment")
        print("Get your API key from: https://build.nvidia.com/")
        return None

    print(f"🎤 Testing NVIDIA Parakeet CTC API...")
    print(f"📁 Audio file: {audio_file_path}")

    if not Path(audio_file_path).exists():
        print(f"❌ File not found: {audio_file_path}")
        return None

    # Read and encode audio file
    with open(audio_file_path, "rb") as f:
        audio_data = f.read()

    audio_b64 = base64.b64encode(audio_data).decode('utf-8')
    print(f"📊 Audio size: {len(audio_data)} bytes (base64: {len(audio_b64)})")

    # Make API request
    try:
        start = time.time()

        # NVIDIA NIM API expects JSON with base64-encoded audio
        headers = {
            "Authorization": f"Bearer {NVIDIA_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        payload = {
            "audio": audio_b64,
            "encoding": "wav"
        }

        print("🚀 Sending request to NVIDIA NIM API...")

        with httpx.Client(timeout=60.0) as client:
            response = client.post(
                NVIDIA_INVOKE_URL,
                headers=headers,
                json=payload
            )

        latency = time.time() - start

        if response.status_code == 200:
            result = response.json()
            text = result.get("text", "")

            print(f"✅ Transcription complete in {latency:.2f}s")
            print(f"📝 Result: {text}")
            print(f"\n🔍 Full response:")
            print(result)

            return {
                "success": True,
                "text": text,
                "latency": latency,
                "response": result
            }
        else:
            print(f"❌ API Error {response.status_code}: {response.text}")
            return {
                "success": False,
                "error": response.text,
                "status_code": response.status_code
            }

    except Exception as e:
        print(f"❌ Exception: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    # Try to find a test audio file
    test_files = [
        "recorded_audio.wav",
        "/tmp/test_audio.wav"
    ]

    audio_file = None
    for f in test_files:
        if Path(f).exists():
            audio_file = f
            break

    if audio_file:
        result = test_nvidia_transcription(audio_file)
    else:
        print("❌ No audio file found to test")
        print(f"Tried: {test_files}")
        print("\nPlease provide a .wav audio file")
