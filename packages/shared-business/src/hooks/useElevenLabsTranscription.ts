import { useState, useRef, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const ELEVENLABS_WS_URL = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime';

interface UseElevenLabsTranscriptionReturn {
  isRecording: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  interimText: string;
  finalTranscript: string;
  detectedLanguage: string | null;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearTranscript: () => void;
}

export function useElevenLabsTranscription(): UseElevenLabsTranscriptionReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const websocketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const clearTranscript = useCallback(() => {
    setFinalTranscript('');
    setInterimText('');
    setDetectedLanguage(null);
    setError(null);
  }, []);

  const stopRecording = useCallback(() => {
    console.log('Stopping recording...');

    // Stop audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop all audio tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close WebSocket with commit message
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      // Send final commit to get last transcript
      websocketRef.current.send(JSON.stringify({
        message_type: 'input_audio_chunk',
        audio_base_64: '',
        commit: true,
        sample_rate: 16000
      }));

      setTimeout(() => {
        if (websocketRef.current) {
          websocketRef.current.close();
          websocketRef.current = null;
        }
      }, 500);
    }

    setIsRecording(false);
    setIsConnected(false);
    setInterimText('');
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setIsConnecting(true);

    try {
      console.log('🎤 Requesting microphone access...');

      // Request microphone access with 16kHz sample rate (recommended for ElevenLabs)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      streamRef.current = stream;

      console.log('✅ Microphone access granted');

      // Step 1: Get temporary token from our backend
      console.log('🔑 Fetching temporary token from backend...');
      const tokenResponse = await fetch(`${API_URL}/api/get-transcription-token`);
      if (!tokenResponse.ok) {
        throw new Error('Failed to get transcription token');
      }
      const { token: _token } = await tokenResponse.json();
      console.log('✅ Token received (note: browser WebSocket does not support auth headers)');

      // Step 2: Connect to ElevenLabs WebSocket
      const wsUrl = `${ELEVENLABS_WS_URL}?model_id=scribe_v2_realtime&audio_format=pcm_16000`;
      console.log('🔌 Connecting to ElevenLabs WebSocket...');

      const ws = new WebSocket(wsUrl);

      websocketRef.current = ws;

      // Handle WebSocket events
      ws.onopen = () => {
        console.log('✅ ElevenLabs WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
        setIsRecording(true);

        // Start audio processing
        startAudioProcessing(stream, ws);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📩 ElevenLabs message:', data.message_type, data);

          switch (data.message_type) {
            case 'session_started':
              console.log('✅ Session started:', data);
              if (data.language_code) {
                setDetectedLanguage(data.language_code);
              }
              break;

            case 'partial_transcript':
              // Interim results during processing
              if (data.text) {
                setInterimText(data.text);
              }
              break;

            case 'committed_transcript':
            case 'committed_transcript_with_timestamps':
              // Final segment transcription
              if (data.text) {
                setFinalTranscript(prev => {
                  const separator = prev ? ' ' : '';
                  return prev + separator + data.text;
                });
                setInterimText('');

                // Update detected language if provided
                if (data.language_code) {
                  setDetectedLanguage(data.language_code);
                }
              }
              break;

            case 'input_error':
              console.error('❌ ElevenLabs input error:', data);
              setError(data.message || 'Audio processing error');
              break;

            default:
              console.log('Unknown message type:', data.message_type);
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.onerror = (event) => {
        console.error('❌ WebSocket error:', event);
        setError('WebSocket connection error');
        setIsConnecting(false);
        stopRecording();
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        if (isRecording) {
          setIsRecording(false);
        }
      };

    } catch (err) {
      console.error('❌ Error starting recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to access microphone');
      setIsConnecting(false);
      stopRecording();
    }
  }, [stopRecording, isRecording]);

  const startAudioProcessing = (stream: MediaStream, ws: WebSocket) => {
    console.log('🎵 Starting audio processing...');

    // Create AudioContext with 16kHz sample rate
    const audioContext = new AudioContext({ sampleRate: 16000 });
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);

    // Create ScriptProcessorNode for audio processing
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (ws.readyState !== WebSocket.OPEN) return;

      const inputData = e.inputBuffer.getChannelData(0);

      // Convert Float32Array to Int16Array (PCM 16-bit)
      const int16Array = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // Convert to base64
      const audioBase64 = btoa(
        String.fromCharCode(...new Uint8Array(int16Array.buffer))
      );

      // Send to ElevenLabs
      ws.send(JSON.stringify({
        message_type: 'input_audio_chunk',
        audio_base_64: audioBase64,
        commit: false,
        sample_rate: 16000
      }));
    };

    source.connect(processor);
    processor.connect(audioContext.destination);

    console.log('✅ Audio processing started');
  };

  return {
    isRecording,
    isConnecting,
    isConnected,
    interimText,
    finalTranscript,
    detectedLanguage,
    error,
    startRecording,
    stopRecording,
    clearTranscript,
  };
}
