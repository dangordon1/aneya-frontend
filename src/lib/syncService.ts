/**
 * Sync Service
 * Manages the queue of offline operations and syncs them when network is available.
 * Handles conflict resolution and retry logic.
 */

import { supabase } from './supabase';
import {
  SyncQueueItem,
  addToSyncQueue,
  getAllPendingSyncItems,
  removeSyncQueueItem,
  updateSyncQueueItem,
  generateLocalId,
  getSyncQueueCount,
  setLastSyncTime,
  getCachedPatient,
  cachePatient,
} from './offlineDb';
import type { CreatePatientInput, UpdatePatientInput, CreateAppointmentInput, UpdateAppointmentInput } from '../types/database';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Event emitter for sync status updates
type SyncEventType = 'sync_started' | 'sync_completed' | 'sync_failed' | 'sync_progress' | 'queue_updated';
type SyncEventCallback = (data?: any) => void;

const eventListeners: Map<SyncEventType, Set<SyncEventCallback>> = new Map();

export function onSyncEvent(event: SyncEventType, callback: SyncEventCallback): () => void {
  if (!eventListeners.has(event)) {
    eventListeners.set(event, new Set());
  }
  eventListeners.get(event)!.add(callback);

  // Return unsubscribe function
  return () => {
    eventListeners.get(event)?.delete(callback);
  };
}

function emitSyncEvent(event: SyncEventType, data?: any): void {
  eventListeners.get(event)?.forEach(callback => callback(data));
}

// ID mapping for local IDs to server IDs after sync
const idMappings: Map<string, string> = new Map();

export function getServerIdForLocalId(localId: string): string | undefined {
  return idMappings.get(localId);
}

export function mapLocalIdToServerId(localId: string, serverId: string): void {
  idMappings.set(localId, serverId);
}

/**
 * Queue a patient creation for offline sync
 */
export async function queuePatientCreate(
  input: CreatePatientInput,
  userId: string
): Promise<string> {
  const localId = generateLocalId();

  const queueItem: SyncQueueItem = {
    id: generateLocalId(),
    operation: 'CREATE_PATIENT',
    table: 'patients',
    data: { ...input, id: localId, created_by: userId },
    localId,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    userId,
  };

  await addToSyncQueue(queueItem);
  emitSyncEvent('queue_updated', { count: await getSyncQueueCount() });

  return localId;
}

/**
 * Queue a patient update for offline sync
 */
export async function queuePatientUpdate(
  id: string,
  input: UpdatePatientInput,
  userId: string
): Promise<void> {
  const queueItem: SyncQueueItem = {
    id: generateLocalId(),
    operation: 'UPDATE_PATIENT',
    table: 'patients',
    data: { id, ...input },
    localId: id,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    userId,
  };

  await addToSyncQueue(queueItem);
  emitSyncEvent('queue_updated', { count: await getSyncQueueCount() });
}

/**
 * Queue a patient deletion for offline sync
 */
export async function queuePatientDelete(id: string, userId: string): Promise<void> {
  const queueItem: SyncQueueItem = {
    id: generateLocalId(),
    operation: 'DELETE_PATIENT',
    table: 'patients',
    data: { id },
    localId: id,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    userId,
  };

  await addToSyncQueue(queueItem);
  emitSyncEvent('queue_updated', { count: await getSyncQueueCount() });
}

/**
 * Queue an appointment creation for offline sync
 */
export async function queueAppointmentCreate(
  input: CreateAppointmentInput,
  userId: string
): Promise<string> {
  const localId = generateLocalId();

  // Resolve any local patient IDs
  let patientId = input.patient_id;
  const mappedPatientId = getServerIdForLocalId(input.patient_id);
  if (mappedPatientId) {
    patientId = mappedPatientId;
  }

  const queueItem: SyncQueueItem = {
    id: generateLocalId(),
    operation: 'CREATE_APPOINTMENT',
    table: 'appointments',
    data: { ...input, id: localId, patient_id: patientId, created_by: userId },
    localId,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    userId,
  };

  await addToSyncQueue(queueItem);
  emitSyncEvent('queue_updated', { count: await getSyncQueueCount() });

  return localId;
}

/**
 * Queue an appointment update for offline sync
 */
export async function queueAppointmentUpdate(
  id: string,
  input: UpdateAppointmentInput,
  userId: string
): Promise<void> {
  const queueItem: SyncQueueItem = {
    id: generateLocalId(),
    operation: 'UPDATE_APPOINTMENT',
    table: 'appointments',
    data: { id, ...input },
    localId: id,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    userId,
  };

  await addToSyncQueue(queueItem);
  emitSyncEvent('queue_updated', { count: await getSyncQueueCount() });
}

/**
 * Queue an appointment cancellation for offline sync
 */
export async function queueAppointmentCancel(
  id: string,
  reason: string | undefined,
  userId: string
): Promise<void> {
  const queueItem: SyncQueueItem = {
    id: generateLocalId(),
    operation: 'CANCEL_APPOINTMENT',
    table: 'appointments',
    data: { id, status: 'cancelled', cancellation_reason: reason, cancelled_at: new Date().toISOString() },
    localId: id,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    userId,
  };

  await addToSyncQueue(queueItem);
  emitSyncEvent('queue_updated', { count: await getSyncQueueCount() });
}

/**
 * Queue a consultation save for offline sync
 */
export async function queueConsultationCreate(
  data: any,
  userId: string
): Promise<string> {
  const localId = generateLocalId();

  // Resolve any local patient/appointment IDs
  let patientId = data.patient_id;
  let appointmentId = data.appointment_id;

  const mappedPatientId = getServerIdForLocalId(data.patient_id);
  if (mappedPatientId) patientId = mappedPatientId;

  const mappedAppointmentId = data.appointment_id ? getServerIdForLocalId(data.appointment_id) : null;
  if (mappedAppointmentId) appointmentId = mappedAppointmentId;

  const queueItem: SyncQueueItem = {
    id: generateLocalId(),
    operation: 'CREATE_CONSULTATION',
    table: 'consultations',
    data: { ...data, id: localId, patient_id: patientId, appointment_id: appointmentId, performed_by: userId },
    localId,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    userId,
  };

  await addToSyncQueue(queueItem);
  emitSyncEvent('queue_updated', { count: await getSyncQueueCount() });

  return localId;
}

/**
 * Process a single sync queue item
 */
async function processSyncItem(item: SyncQueueItem): Promise<boolean> {
  try {
    let result: any;

    switch (item.operation) {
      case 'CREATE_PATIENT': {
        const { id: localId, ...patientData } = item.data;
        const { data, error } = await supabase
          .from('patients')
          .insert(patientData)
          .select()
          .single();

        if (error) throw error;

        // Map local ID to server ID
        mapLocalIdToServerId(localId, data.id);

        // Update local cache with real ID
        const cachedPatient = await getCachedPatient(localId);
        if (cachedPatient) {
          await cachePatient({ ...cachedPatient, id: data.id });
        }

        result = data;
        break;
      }

      case 'UPDATE_PATIENT': {
        const { id, ...updateData } = item.data;
        // Check if this is a local ID that was synced
        const serverId = getServerIdForLocalId(id) || id;

        const { data, error } = await supabase
          .from('patients')
          .update(updateData)
          .eq('id', serverId)
          .select()
          .single();

        if (error) throw error;
        result = data;
        break;
      }

      case 'DELETE_PATIENT': {
        const serverId = getServerIdForLocalId(item.data.id) || item.data.id;

        const { error } = await supabase
          .from('patients')
          .delete()
          .eq('id', serverId);

        if (error) throw error;
        break;
      }

      case 'CREATE_APPOINTMENT': {
        const { id: localId, patient_id, ...appointmentData } = item.data;
        // Resolve patient ID in case it was created offline
        const resolvedPatientId = getServerIdForLocalId(patient_id) || patient_id;

        const { data, error } = await supabase
          .from('appointments')
          .insert({ ...appointmentData, patient_id: resolvedPatientId })
          .select('*, patient:patients(*)')
          .single();

        if (error) throw error;

        // Map local ID to server ID
        mapLocalIdToServerId(localId, data.id);

        result = data;
        break;
      }

      case 'UPDATE_APPOINTMENT': {
        const { id, ...updateData } = item.data;
        const serverId = getServerIdForLocalId(id) || id;

        const { data, error } = await supabase
          .from('appointments')
          .update(updateData)
          .eq('id', serverId)
          .select('*, patient:patients(*)')
          .single();

        if (error) throw error;
        result = data;
        break;
      }

      case 'CANCEL_APPOINTMENT': {
        const { id, ...cancelData } = item.data;
        const serverId = getServerIdForLocalId(id) || id;

        const { data, error } = await supabase
          .from('appointments')
          .update(cancelData)
          .eq('id', serverId)
          .select('*, patient:patients(*)')
          .single();

        if (error) throw error;
        result = data;
        break;
      }

      case 'CREATE_CONSULTATION': {
        const { id: localId, patient_id, appointment_id, ...consultationData } = item.data;
        const resolvedPatientId = getServerIdForLocalId(patient_id) || patient_id;
        const resolvedAppointmentId = appointment_id
          ? getServerIdForLocalId(appointment_id) || appointment_id
          : null;

        const { data, error } = await supabase
          .from('consultations')
          .insert({
            ...consultationData,
            patient_id: resolvedPatientId,
            appointment_id: resolvedAppointmentId,
          })
          .select()
          .single();

        if (error) throw error;

        mapLocalIdToServerId(localId, data.id);
        result = data;
        break;
      }

      default:
        console.warn(`Unknown sync operation: ${item.operation}`);
        return true; // Remove unknown operations
    }

    console.log(`✅ Synced ${item.operation}:`, result?.id || 'success');
    return true;
  } catch (error: any) {
    console.error(`❌ Failed to sync ${item.operation}:`, error.message);

    // Update retry count
    item.retryCount++;
    item.lastError = error.message;
    await updateSyncQueueItem(item);

    // If max retries exceeded, log and keep in queue for manual review
    if (item.retryCount >= MAX_RETRIES) {
      console.error(`🚫 Max retries exceeded for ${item.operation}. Item will remain in queue.`);
    }

    return false;
  }
}

/**
 * Process all pending sync items
 */
export async function processSync(): Promise<{ success: number; failed: number }> {
  const items = await getAllPendingSyncItems();

  if (items.length === 0) {
    console.log('📭 No items to sync');
    return { success: 0, failed: 0 };
  }

  emitSyncEvent('sync_started', { total: items.length });
  console.log(`🔄 Processing ${items.length} sync items...`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Skip items that have exceeded max retries
    if (item.retryCount >= MAX_RETRIES) {
      failed++;
      continue;
    }

    const wasSuccessful = await processSyncItem(item);

    if (wasSuccessful) {
      await removeSyncQueueItem(item.id);
      success++;
    } else {
      failed++;
      // Add delay before next attempt
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }

    emitSyncEvent('sync_progress', {
      current: i + 1,
      total: items.length,
      success,
      failed,
    });
  }

  // Update last sync time
  await setLastSyncTime(new Date().toISOString());

  const finalCount = await getSyncQueueCount();
  emitSyncEvent('queue_updated', { count: finalCount });

  if (failed === 0) {
    emitSyncEvent('sync_completed', { success, failed });
    console.log(`✅ Sync completed: ${success} items synced`);
  } else {
    emitSyncEvent('sync_failed', { success, failed });
    console.log(`⚠️ Sync completed with errors: ${success} synced, ${failed} failed`);
  }

  return { success, failed };
}

/**
 * Check if there are pending sync items
 */
export async function hasPendingSyncItems(): Promise<boolean> {
  const count = await getSyncQueueCount();
  return count > 0;
}

/**
 * Get the current sync queue count
 */
export async function getPendingSyncCount(): Promise<number> {
  return getSyncQueueCount();
}
