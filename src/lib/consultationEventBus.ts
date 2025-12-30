/**
 * Consultation Event Bus
 * Simple event bus for communication between consultation-related components.
 * Used for real-time form auto-fill based on diarization chunks.
 */

type EventCallback = (data: any) => void;

class ConsultationEventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  /**
   * Subscribe to an event
   * @returns Unsubscribe function
   */
  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  /**
   * Emit an event to all subscribers
   */
  emit(event: string, data?: any): void {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Remove all listeners for an event
   */
  off(event: string): void {
    this.listeners.delete(event);
  }

  /**
   * Remove all listeners
   */
  clear(): void {
    this.listeners.clear();
  }
}

// Singleton instance
export const consultationEventBus = new ConsultationEventBus();

// Common event types
export const CONSULTATION_EVENTS = {
  DIARIZATION_CHUNK_COMPLETE: 'diarization_chunk_complete',
  TRANSCRIPT_UPDATE: 'transcript_update',
  RECORDING_STARTED: 'recording_started',
  RECORDING_STOPPED: 'recording_stopped',
  ANALYSIS_STARTED: 'analysis_started',
  ANALYSIS_COMPLETE: 'analysis_complete',
} as const;
