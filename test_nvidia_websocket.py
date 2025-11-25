#!/usr/bin/env python
"""
Test NVIDIA Parakeet ASR WebSocket API
Based on NVIDIA Riva realtime ASR client implementation
"""
import asyncio
import base64
import json
import os
import websockets
from pathlib import Path

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")

async def transcribe_audio_websocket(audio_file_path: str, api_url: str):
    """
    Transcribe audio using NVIDIA WebSocket API

    Args:
        audio_file_path: Path to audio file (WAV format, 16kHz mono recommended)
        api_url: WebSocket endpoint URL
    """

    if not NVIDIA_API_KEY:
        print("❌ NVIDIA_API_KEY not found in environment")
        return None

    print(f"🎤 Testing NVIDIA Parakeet WebSocket API...")
    print(f"📁 Audio file: {audio_file_path}")
    print(f"🔗 Endpoint: {api_url}")

    if not Path(audio_file_path).exists():
        print(f"❌ File not found: {audio_file_path}")
        return None

    # Read audio file
    with open(audio_file_path, "rb") as f:
        audio_data = f.read()

    print(f"📊 Audio size: {len(audio_data)} bytes")

    # Split audio into chunks (e.g., 1600 bytes = 0.1s at 16kHz mono)
    chunk_size = 3200  # ~0.2s chunks at 16kHz mono
    audio_chunks = [audio_data[i:i+chunk_size] for i in range(0, len(audio_data), chunk_size)]
    print(f"📦 Split into {len(audio_chunks)} chunks")

    try:
        # Connect to WebSocket with authorization header
        print(f"🔌 Connecting to WebSocket...")
        async with websockets.connect(
            api_url,
            additional_headers={
                "Authorization": f"Bearer {NVIDIA_API_KEY}"
            },
            ping_interval=30,
            ping_timeout=10
        ) as websocket:
            print(f"✅ Connected!")

            # Session configuration (optional)
            config_message = {
                "type": "transcription_session.update",
                "session": {
                    "modalities": ["text"],
                    "audio": {
                        "encoding": "pcm16",
                        "sample_rate": 16000,
                        "channels": 1
                    },
                    "recognition": {
                        "language": "en-US"
                    }
                }
            }
            await websocket.send(json.dumps(config_message))
            print("📝 Sent session configuration")

            # Create task to receive responses
            responses = []

            async def receive_responses():
                try:
                    while True:
                        message = await websocket.recv()
                        data = json.loads(message)
                        responses.append(data)

                        msg_type = data.get("type", "")
                        print(f"📨 Received: {msg_type}")

                        if msg_type == "conversation.item.input_audio_transcription.completed":
                            transcript = data.get("transcript", "")
                            print(f"✅ Transcription: {transcript}")
                        elif msg_type == "conversation.item.input_audio_transcription.delta":
                            delta = data.get("delta", "")
                            print(f"🔄 Delta: {delta}")
                        elif msg_type == "error":
                            print(f"❌ Error: {data}")
                except websockets.exceptions.ConnectionClosed:
                    print("🔌 Connection closed")

            receive_task = asyncio.create_task(receive_responses())

            # Send audio chunks
            print(f"📤 Sending audio chunks...")
            for i, chunk in enumerate(audio_chunks):
                chunk_base64 = base64.b64encode(chunk).decode('utf-8')

                # Send audio chunk
                append_message = {
                    "type": "input_audio_buffer.append",
                    "audio": chunk_base64
                }
                await websocket.send(json.dumps(append_message))

                # Commit the chunk
                commit_message = {
                    "type": "input_audio_buffer.commit"
                }
                await websocket.send(json.dumps(commit_message))

                if (i + 1) % 10 == 0:
                    print(f"  Sent {i+1}/{len(audio_chunks)} chunks...")

                # Small delay to simulate realtime streaming
                await asyncio.sleep(0.01)

            print(f"✅ Sent all {len(audio_chunks)} chunks")

            # Send done signal
            done_message = {
                "type": "input_audio_buffer.done"
            }
            await websocket.send(json.dumps(done_message))
            print("🏁 Sent done signal")

            # Wait a bit for final responses
            await asyncio.sleep(2)

            # Cancel receive task
            receive_task.cancel()
            try:
                await receive_task
            except asyncio.CancelledError:
                pass

            return responses

    except websockets.exceptions.WebSocketException as e:
        print(f"❌ WebSocket error: {type(e).__name__}: {str(e)}")
        return None
    except Exception as e:
        print(f"❌ Exception: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


async def main():
    """Test different potential endpoint URLs"""

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
        return

    # Test different potential endpoint URLs
    endpoints = [
        "wss://grpc.nvcf.nvidia.com:443/v1/realtime?intent=transcription",
        "wss://api.nvidia.com/v1/realtime?intent=transcription",
        "ws://0.0.0.0:9000/v1/realtime?intent=transcription",  # Self-hosted format
    ]

    print(f"Testing {len(endpoints)} potential endpoints...\n")

    for endpoint in endpoints:
        print(f"\n{'='*60}")
        print(f"Testing endpoint: {endpoint}")
        print(f"{'='*60}\n")

        result = await transcribe_audio_websocket(audio_file, endpoint)

        if result:
            print(f"\n✅ SUCCESS with endpoint: {endpoint}")
            print(f"📝 Received {len(result)} messages")
            break
        else:
            print(f"\n❌ Failed with endpoint: {endpoint}")
            print(f"Trying next endpoint...\n")
    else:
        print(f"\n❌ All endpoints failed")
        print(f"\nℹ️  Note: The NVIDIA API key from build.nvidia.com might be for")
        print(f"   a different API than the WebSocket realtime API, or the endpoint")
        print(f"   URL format might be different than expected.")


if __name__ == "__main__":
    asyncio.run(main())
