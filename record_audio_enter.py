#!/usr/bin/env python3
"""
Simple Enter-key controlled audio recording for STT benchmarking.
Press Enter to start, press Enter again to stop.
"""

import sounddevice as sd
import numpy as np
from scipy.io import wavfile
import threading
import sys
import queue

class SimpleAudioRecorder:
    def __init__(self, sample_rate=16000, output_file="recorded_audio.wav"):
        self.sample_rate = sample_rate
        self.output_file = output_file
        self.recording_data = []
        self.q = queue.Queue()

    def audio_callback(self, indata, frames, time_info, status):
        """Callback for audio stream"""
        if status:
            print(f"Status: {status}", file=sys.stderr)
        self.q.put(indata.copy())

    def record(self):
        """Record audio until Enter is pressed"""
        print("\n🔴 Recording... (Press Enter to stop)")

        try:
            with sd.InputStream(
                samplerate=self.sample_rate,
                channels=1,
                dtype=np.float32,
                callback=self.audio_callback
            ):
                # Record until Enter is pressed
                input()
        except KeyboardInterrupt:
            print("\n\n🛑 Recording interrupted")

        # Collect all recorded data
        while not self.q.empty():
            self.recording_data.append(self.q.get())

        print("⏸️  Recording stopped!")

    def save(self):
        """Save recorded audio to file"""
        if len(self.recording_data) > 0:
            # Concatenate all recorded chunks
            recording = np.concatenate(self.recording_data, axis=0)

            # Convert to int16
            recording_int16 = (recording * 32767).astype(np.int16)

            # Save to file
            wavfile.write(self.output_file, self.sample_rate, recording_int16)

            duration = len(recording) / self.sample_rate
            print(f"\n✅ Audio saved to: {self.output_file}")
            print(f"   Duration: {duration:.2f}s")
            print(f"   Sample rate: {self.sample_rate}Hz\n")

            return True
        else:
            print("⚠️  No audio data recorded")
            return False

    def run(self):
        """Run the recorder"""
        print("="*60)
        print("  AUDIO RECORDER")
        print("="*60)
        print("\n🎤 Ready to record!")
        print("\nControls:")
        print("  - Press Enter to START recording")
        print("  - Press Enter again to STOP recording")
        print("\n" + "="*60 + "\n")

        input("Press Enter to start recording...")

        self.record()
        return self.save()

if __name__ == "__main__":
    output_file = sys.argv[1] if len(sys.argv) > 1 else "recorded_audio.wav"

    recorder = SimpleAudioRecorder(output_file=output_file)
    success = recorder.run()

    if success:
        print("\n" + "="*60)
        print("NEXT STEPS")
        print("="*60)
        print("\nTo benchmark this recording, run:")
        print(f"  uv run python benchmark_stt.py {output_file}")
        print("\nOr with reference text for accuracy metrics:")
        print(f'  uv run python benchmark_stt.py {output_file} "your reference text"')
        print("\n" + "="*60 + "\n")
