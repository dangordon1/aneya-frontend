/**
 * Offline Audio Service
 * Handles queuing and storing audio chunks when recording offline.
 * Audio chunks are stored locally and uploaded when network is restored.
 */

import {
  addAudioChunk,
  getAudioChunks,
  getUnuploadedAudioChunks,
  markAudioChunkUploaded,
  deleteAudioChunks,
  AudioChunkItem,
  generateLocalId,
} from './offlineDb';

const API_URL = import.meta.env.VITE_API_URL || '';

// Event types for audio sync
type AudioSyncEventType = 'audio_upload_started' | 'audio_upload_progress' | 'audio_upload_completed' | 'audio_upload_failed';
type AudioSyncEventCallback = (data?: any) => void;

const audioEventListeners: Map<AudioSyncEventType, Set<AudioSyncEventCallback>> = new Map();

export function onAudioSyncEvent(event: AudioSyncEventType, callback: AudioSyncEventCallback): () => void {
  if (!audioEventListeners.has(event)) {
    audioEventListeners.set(event, new Set());
  }
  audioEventListeners.get(event)!.add(callback);

  return () => {
    audioEventListeners.get(event)?.delete(callback);
  };
}

function emitAudioSyncEvent(event: AudioSyncEventType, data?: any): void {
  audioEventListeners.get(event)?.forEach(callback => callback(data));
}

/**
 * Queue an audio chunk for offline storage
 */
export async function queueAudioChunk(
  appointmentId: string,
  chunkIndex: number,
  blob: Blob,
  transcriptionLanguage: string
): Promise<void> {
  const chunk: AudioChunkItem = {
    id: generateLocalId(),
    appointmentId,
    chunkIndex,
    blob,
    timestamp: new Date().toISOString(),
    transcriptionLanguage,
    uploaded: false,
  };

  await addAudioChunk(chunk);
  console.log(`📦 Queued audio chunk ${chunkIndex} for appointment ${appointmentId}`);
}

/**
 * Get all queued audio chunks for an appointment
 */
export async function getQueuedAudioChunks(appointmentId: string): Promise<AudioChunkItem[]> {
  return getAudioChunks(appointmentId);
}

/**
 * Combine multiple audio chunks into a single blob
 */
export function combineAudioChunks(chunks: AudioChunkItem[]): Blob {
  const sortedChunks = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
  const blobs = sortedChunks.map(c => c.blob);
  return new Blob(blobs, { type: 'audio/webm' });
}

/**
 * Upload a single audio chunk to the backend
 */
async function uploadAudioChunk(chunk: AudioChunkItem): Promise<boolean> {
  try {
    const formData = new FormData();
    formData.append('audio', chunk.blob, `chunk_${chunk.chunkIndex}.webm`);
    formData.append('appointment_id', chunk.appointmentId);
    formData.append('chunk_index', chunk.chunkIndex.toString());
    formData.append('language', chunk.transcriptionLanguage);
    formData.append('timestamp', chunk.timestamp);

    const response = await fetch(`${API_URL}/api/upload-audio-chunk`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    await markAudioChunkUploaded(chunk.id);
    console.log(`✅ Uploaded audio chunk ${chunk.chunkIndex} for appointment ${chunk.appointmentId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to upload audio chunk ${chunk.chunkIndex}:`, error);
    return false;
  }
}

/**
 * Process and upload all pending audio chunks
 */
export async function processAudioUploadQueue(): Promise<{ success: number; failed: number }> {
  const pendingChunks = await getUnuploadedAudioChunks();

  if (pendingChunks.length === 0) {
    console.log('📭 No pending audio chunks to upload');
    return { success: 0, failed: 0 };
  }

  emitAudioSyncEvent('audio_upload_started', { total: pendingChunks.length });
  console.log(`🔄 Uploading ${pendingChunks.length} pending audio chunks...`);

  let success = 0;
  let failed = 0;

  // Group chunks by appointment
  const chunksByAppointment = new Map<string, AudioChunkItem[]>();
  for (const chunk of pendingChunks) {
    if (!chunksByAppointment.has(chunk.appointmentId)) {
      chunksByAppointment.set(chunk.appointmentId, []);
    }
    chunksByAppointment.get(chunk.appointmentId)!.push(chunk);
  }

  // Upload chunks for each appointment in order
  for (const [appointmentId, chunks] of chunksByAppointment) {
    const sortedChunks = chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

    for (const chunk of sortedChunks) {
      const wasSuccessful = await uploadAudioChunk(chunk);
      if (wasSuccessful) {
        success++;
      } else {
        failed++;
      }

      emitAudioSyncEvent('audio_upload_progress', {
        current: success + failed,
        total: pendingChunks.length,
        success,
        failed,
        appointmentId,
      });
    }
  }

  if (failed === 0) {
    emitAudioSyncEvent('audio_upload_completed', { success, failed });
    console.log(`✅ Audio upload completed: ${success} chunks uploaded`);
  } else {
    emitAudioSyncEvent('audio_upload_failed', { success, failed });
    console.log(`⚠️ Audio upload completed with errors: ${success} uploaded, ${failed} failed`);
  }

  return { success, failed };
}

/**
 * Clear all audio chunks for an appointment after successful consultation save
 */
export async function clearAudioChunks(appointmentId: string): Promise<void> {
  await deleteAudioChunks(appointmentId);
  console.log(`🗑️ Cleared audio chunks for appointment ${appointmentId}`);
}

/**
 * Get the total duration of queued audio for an appointment
 */
export async function getQueuedAudioDuration(appointmentId: string): Promise<number> {
  const chunks = await getAudioChunks(appointmentId);
  // Rough estimate: 1 second per chunk (assuming 1-second recording intervals)
  return chunks.length;
}

/**
 * Check if there are pending audio uploads
 */
export async function hasPendingAudioUploads(): Promise<boolean> {
  const chunks = await getUnuploadedAudioChunks();
  return chunks.length > 0;
}

/**
 * Offline Recording Session Manager
 * Manages a complete offline recording session for an appointment
 */
export class OfflineRecordingSession {
  private appointmentId: string;
  private transcriptionLanguage: string;
  private chunkIndex: number = 0;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording: boolean = false;

  constructor(appointmentId: string, transcriptionLanguage: string) {
    this.appointmentId = appointmentId;
    this.transcriptionLanguage = transcriptionLanguage;
  }

  /**
   * Start recording and queueing audio chunks
   */
  async startRecording(stream: MediaStream): Promise<void> {
    if (this.isRecording) {
      console.warn('Recording already in progress');
      return;
    }

    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
    });

    this.audioChunks = [];

    this.mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);

        // Queue chunk every 5 seconds of audio (5 blobs at 1-second intervals)
        if (this.audioChunks.length >= 5) {
          const combinedBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          await queueAudioChunk(
            this.appointmentId,
            this.chunkIndex++,
            combinedBlob,
            this.transcriptionLanguage
          );
          this.audioChunks = [];
        }
      }
    };

    this.mediaRecorder.start(1000); // Emit data every 1 second
    this.isRecording = true;
    console.log('🎤 Started offline recording session');
  }

  /**
   * Stop recording and queue any remaining audio
   */
  async stopRecording(): Promise<void> {
    if (!this.isRecording || !this.mediaRecorder) {
      console.warn('No recording in progress');
      return;
    }

    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = async () => {
        // Queue any remaining audio chunks
        if (this.audioChunks.length > 0) {
          const combinedBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          await queueAudioChunk(
            this.appointmentId,
            this.chunkIndex++,
            combinedBlob,
            this.transcriptionLanguage
          );
        }

        this.isRecording = false;
        console.log('🛑 Stopped offline recording session');
        resolve();
      };

      this.mediaRecorder!.stop();
    });
  }

  /**
   * Get the current chunk count
   */
  getChunkCount(): number {
    return this.chunkIndex;
  }

  /**
   * Check if currently recording
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }
}

/**
 * Create a new offline recording session
 */
export function createOfflineRecordingSession(
  appointmentId: string,
  transcriptionLanguage: string
): OfflineRecordingSession {
  return new OfflineRecordingSession(appointmentId, transcriptionLanguage);
}
