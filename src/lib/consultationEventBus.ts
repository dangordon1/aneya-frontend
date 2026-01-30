/**
 * Consultation Event Bus
 *
 * Provides a pub-sub pattern for communication between consultation recording
 * (InputScreen) and form auto-fill components.
 *
 * This decouples the recording flow from the form components, allowing
 * forms to reactively update as consultation data becomes available.
 */

export type ConsultationEventType =
  | 'diarization_chunk_complete'
  | 'recording_started'
  | 'recording_stopped'
  | 'recording_paused'
  | 'recording_resumed';

export interface DiarizationChunkEvent {
  segments: DiarizedSegment[];
  chunk_index: number;
  form_type: string | null; // Dynamic form type from custom_forms table
  patient_id?: string;
  speaker_role_mapping?: Record<string, string>;  // Maps speaker IDs to roles
  speaker_confidence_scores?: Record<string, number>;  // Confidence scores (0.0-1.0)
  requires_manual_assignment?: boolean;  // True if any speaker has low confidence
}

export interface DiarizedSegment {
  speaker_id: string;
  speaker_role?: string;
  speaker_role_confidence?: number;  // Confidence score (0.0-1.0) for this speaker's role
  text: string;
  start_time: number;
  end_time: number;
  chunk_index: number;
}

export interface RecordingStartedEvent {
  patient_id?: string;
  appointment_id?: string;
}

export interface RecordingStoppedEvent {
  duration_seconds: number;
  total_chunks: number;
}

type EventCallback = (event: any) => void;

interface Subscription {
  unsubscribe: () => void;
}

/**
 * ConsultationEventBus class
 *
 * Manages event subscriptions and publishing for consultation-related events.
 */
class ConsultationEventBus {
  private subscribers: Map<ConsultationEventType, EventCallback[]>;

  constructor() {
    this.subscribers = new Map();
  }

  /**
   * Subscribe to a specific event type
   *
   * @param eventType - The type of event to listen for
   * @param callback - Function to call when event is emitted
   * @returns Subscription object with unsubscribe method
   */
  subscribe(eventType: ConsultationEventType, callback: EventCallback): Subscription {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }

    const callbacks = this.subscribers.get(eventType)!;
    callbacks.push(callback);

    // Return subscription object with unsubscribe method
    return {
      unsubscribe: () => {
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
        }
      },
    };
  }

  /**
   * Emit an event to all subscribers
   *
   * @param eventType - The type of event to emit
   * @param event - The event data
   */
  emit(eventType: ConsultationEventType, event: any): void {
    const callbacks = this.subscribers.get(eventType);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Remove all subscribers for a specific event type
   *
   * @param eventType - The type of event to clear
   */
  clear(eventType: ConsultationEventType): void {
    this.subscribers.delete(eventType);
  }

  /**
   * Remove all subscribers for all event types
   */
  clearAll(): void {
    this.subscribers.clear();
  }

  /**
   * Get the number of subscribers for a specific event type
   *
   * @param eventType - The type of event to check
   * @returns Number of active subscribers
   */
  getSubscriberCount(eventType: ConsultationEventType): number {
    return this.subscribers.get(eventType)?.length || 0;
  }

  /**
   * Check if there are any active subscribers for a specific event type
   *
   * @param eventType - The type of event to check
   * @returns True if there are active subscribers
   */
  hasSubscribers(eventType: ConsultationEventType): boolean {
    return this.getSubscriberCount(eventType) > 0;
  }
}

// Singleton instance
export const consultationEventBus = new ConsultationEventBus();

// Export type for use in components
export type { Subscription };
