import { useState, useRef, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Convert HTTP URL to WebSocket URL
const getWebSocketUrl = (httpUrl: string): string => {
  const url = new URL(httpUrl);
  const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${url.host}/ws/transcribe`;
};

interface UseDeepgramTranscriptionReturn {
  isRecording: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  interimText: string;
  finalTranscript: string;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearTranscript: () => void;
}

export function useDeepgramTranscription(): UseDeepgramTranscriptionReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const websocketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const clearTranscript = useCallback(() => {
    setFinalTranscript('');
    setInterimText('');
    setError(null);
  }, []);

  const stopRecording = useCallback(() => {
    console.log('Stopping recording...');

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    // Stop all audio tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close WebSocket
    if (websocketRef.current) {
      if (websocketRef.current.readyState === WebSocket.OPEN) {
        // Send stop message before closing
        websocketRef.current.send(JSON.stringify({ type: 'stop' }));
      }
      websocketRef.current.close();
      websocketRef.current = null;
    }

    setIsRecording(false);
    setIsConnected(false);
    setInterimText('');
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setIsConnecting(true);

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 48000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      streamRef.current = stream;

      // Create WebSocket connection
      const wsUrl = getWebSocketUrl(API_URL);
      console.log('Connecting to WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;

      // Handle WebSocket events
      ws.onopen = () => {
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WS message:', data);

          switch (data.type) {
            case 'connected':
              console.log('Deepgram connected:', data.message);
              setIsConnected(true);
              setIsConnecting(false);
              setIsRecording(true);

              // Start MediaRecorder after connection is confirmed
              startMediaRecorder(stream, ws);
              break;

            case 'transcript':
              if (data.is_final) {
                // Append final transcript
                setFinalTranscript(prev => {
                  const separator = prev ? ' ' : '';
                  return prev + separator + data.text;
                });
                setInterimText('');
              } else {
                // Update interim text
                setInterimText(data.text);
              }
              break;

            case 'speech_started':
              console.log('Speech detected');
              break;

            case 'utterance_end':
              console.log('Utterance ended');
              break;

            case 'error':
              console.error('Transcription error:', data.message);
              setError(data.message);
              stopRecording();
              break;
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
        setIsConnecting(false);
        stopRecording();
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        if (isRecording) {
          stopRecording();
        }
      };

    } catch (err) {
      console.error('Error starting recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to access microphone');
      setIsConnecting(false);
      stopRecording();
    }
  }, [stopRecording]);

  const startMediaRecorder = (stream: MediaStream, ws: WebSocket) => {
    // Create MediaRecorder with WebM/Opus format (optimal for Deepgram)
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

    console.log('Using MIME type:', mimeType);

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      audioBitsPerSecond: 128000,
    });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
        // Send audio chunk to server
        ws.send(event.data);
      }
    };

    mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event);
      setError('Recording error');
      stopRecording();
    };

    mediaRecorder.onstop = () => {
      console.log('MediaRecorder stopped');
    };

    // Start recording with small time slices for real-time streaming
    mediaRecorder.start(250); // Send data every 250ms
    console.log('MediaRecorder started');
  };

  return {
    isRecording,
    isConnecting,
    isConnected,
    interimText,
    finalTranscript,
    error,
    startRecording,
    stopRecording,
    clearTranscript,
  };
}
