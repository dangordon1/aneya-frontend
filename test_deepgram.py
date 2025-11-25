#!/usr/bin/env python
"""
Test Deepgram API for speech-to-text
https://developers.deepgram.com/docs/getting-started-with-live-streaming-audio
"""
import asyncio
import os
import json
from pathlib import Path
import websockets

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "")

async def test_deepgram_websocket(audio_file_path: str):
    """
    Test Deepgram WebSocket API with an audio file

    Args:
        audio_file_path: Path to audio file (supports WAV, MP3, FLAC, etc.)
    """

    if not DEEPGRAM_API_KEY:
        print("❌ DEEPGRAM_API_KEY not found in environment")
        print("Get your API key from: https://console.deepgram.com/signup")
        return None

    print(f"🎤 Testing Deepgram WebSocket API...")
    print(f"📁 Audio file: {audio_file_path}")

    if not Path(audio_file_path).exists():
        print(f"❌ File not found: {audio_file_path}")
        return None

    # Read audio file
    with open(audio_file_path, "rb") as f:
        audio_data = f.read()

    print(f"📊 Audio size: {len(audio_data)} bytes")

    # Deepgram WebSocket URL with features
    # Features: punctuate, diarize (speaker detection), model optimized for medical/general use
    url = (
        "wss://api.deepgram.com/v1/listen?"
        "encoding=linear16&"
        "sample_rate=16000&"
        "channels=1&"
        "punctuate=true&"
        "interim_results=true&"
        "model=nova-2-medical"  # Medical model for clinical terminology
    )

    print(f"🔌 Connecting to Deepgram...")

    try:
        async with websockets.connect(
            url,
            additional_headers={
                "Authorization": f"Token {DEEPGRAM_API_KEY}"
            }
        ) as ws:
            print(f"✅ Connected!")

            # Track transcription results
            transcripts = []
            final_transcript = ""

            async def receive_results():
                """Receive transcription results from Deepgram"""
                nonlocal final_transcript
                try:
                    async for message in ws:
                        data = json.loads(message)

                        # Check if this is a transcription result
                        if data.get("type") == "Results":
                            channel = data.get("channel", {})
                            alternatives = channel.get("alternatives", [])

                            if alternatives:
                                transcript = alternatives[0].get("transcript", "")
                                is_final = data.get("is_final", False)

                                if transcript:
                                    if is_final:
                                        print(f"✅ Final: {transcript}")
                                        transcripts.append(transcript)
                                        final_transcript = " ".join(transcripts)
                                    else:
                                        print(f"🔄 Interim: {transcript}")

                        elif data.get("type") == "Metadata":
                            print(f"📋 Metadata received: request_id={data.get('request_id', 'N/A')}")

                        elif data.get("type") == "SpeechStarted":
                            print(f"🎙️  Speech detected")

                        elif data.get("type") == "UtteranceEnd":
                            print(f"🏁 Utterance ended")

                except websockets.exceptions.ConnectionClosed:
                    print("🔌 Connection closed by server")

            # Start receiving results
            receive_task = asyncio.create_task(receive_results())

            # Send audio in chunks to simulate streaming
            chunk_size = 8000  # ~0.5s at 16kHz mono
            audio_chunks = [audio_data[i:i+chunk_size] for i in range(0, len(audio_data), chunk_size)]

            print(f"📤 Sending {len(audio_chunks)} audio chunks...")
            for i, chunk in enumerate(audio_chunks):
                await ws.send(chunk)

                if (i + 1) % 10 == 0:
                    print(f"  Sent {i+1}/{len(audio_chunks)} chunks...")

                # Small delay to simulate real-time streaming
                await asyncio.sleep(0.05)

            print(f"✅ Sent all audio chunks")

            # Send close message to signal end of audio
            close_message = json.dumps({"type": "CloseStream"})
            await ws.send(close_message)
            print(f"🏁 Sent close signal")

            # Wait for final results
            await asyncio.sleep(2)

            # Cancel receive task
            receive_task.cancel()
            try:
                await receive_task
            except asyncio.CancelledError:
                pass

            print(f"\n{'='*60}")
            print(f"📝 Final Transcription:")
            print(f"{'='*60}")
            print(final_transcript)
            print(f"{'='*60}\n")

            return {
                "success": True,
                "transcript": final_transcript,
                "segments": transcripts
            }

    except websockets.exceptions.InvalidStatusCode as e:
        print(f"❌ WebSocket error: {e.status_code}")
        print(f"   This might indicate an invalid API key or account issue")
        return None

    except Exception as e:
        print(f"❌ Exception: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


async def main():
    """Test Deepgram with available audio files"""

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

    if not audio_file:
        print("❌ No audio file found to test")
        print(f"Tried: {test_files}")
        print("\nPlease provide a .wav audio file")
        return

    result = await test_deepgram_websocket(audio_file)

    if result and result.get("success"):
        print(f"\n✅ SUCCESS!")
        print(f"Transcribed {len(result['segments'])} segments")
    else:
        print(f"\n❌ Test failed")
        print(f"\nTo get started with Deepgram:")
        print(f"1. Sign up at: https://console.deepgram.com/signup")
        print(f"2. Get your API key from the dashboard")
        print(f"3. Set environment variable: export DEEPGRAM_API_KEY='your-key-here'")


if __name__ == "__main__":
    asyncio.run(main())
