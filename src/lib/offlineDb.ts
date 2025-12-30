/**
 * IndexedDB wrapper for offline data storage
 * Provides persistent local storage for patients, appointments, consultations
 * and a sync queue for offline mutations
 */

import type { PatientWithAppointments, AppointmentWithPatient, Consultation } from '../types/database';

const DB_NAME = 'aneya-offline-db';
const DB_VERSION = 1;

// Store names
export const STORES = {
  PATIENTS: 'patients',
  APPOINTMENTS: 'appointments',
  CONSULTATIONS: 'consultations',
  SYNC_QUEUE: 'syncQueue',
  AUDIO_CHUNKS: 'audioChunks',
  METADATA: 'metadata',
} as const;

// Sync queue operation types
export type SyncOperationType =
  | 'CREATE_PATIENT'
  | 'UPDATE_PATIENT'
  | 'DELETE_PATIENT'
  | 'CREATE_APPOINTMENT'
  | 'UPDATE_APPOINTMENT'
  | 'CANCEL_APPOINTMENT'
  | 'CREATE_CONSULTATION'
  | 'UPDATE_CONSULTATION'
  | 'UPLOAD_AUDIO';

export interface SyncQueueItem {
  id: string;
  operation: SyncOperationType;
  table: string;
  data: Record<string, any>;
  localId: string; // Local temp ID for optimistic updates
  createdAt: string;
  retryCount: number;
  lastError?: string;
  userId: string;
}

export interface AudioChunkItem {
  id: string;
  appointmentId: string;
  chunkIndex: number;
  blob: Blob;
  timestamp: string;
  transcriptionLanguage: string;
  uploaded: boolean;
}

export interface MetadataItem {
  key: string;
  value: any;
  updatedAt: string;
}

let dbInstance: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;

/**
 * Initialize the IndexedDB database
 */
export async function initOfflineDb(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log('✅ IndexedDB initialized successfully');
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      console.log('📦 Creating IndexedDB stores...');

      // Patients store - indexed by id and created_by
      if (!db.objectStoreNames.contains(STORES.PATIENTS)) {
        const patientsStore = db.createObjectStore(STORES.PATIENTS, { keyPath: 'id' });
        patientsStore.createIndex('created_by', 'created_by', { unique: false });
        patientsStore.createIndex('phone', 'phone', { unique: false });
        patientsStore.createIndex('updated_at', 'updated_at', { unique: false });
      }

      // Appointments store - indexed by id, patient_id, created_by
      if (!db.objectStoreNames.contains(STORES.APPOINTMENTS)) {
        const appointmentsStore = db.createObjectStore(STORES.APPOINTMENTS, { keyPath: 'id' });
        appointmentsStore.createIndex('patient_id', 'patient_id', { unique: false });
        appointmentsStore.createIndex('created_by', 'created_by', { unique: false });
        appointmentsStore.createIndex('scheduled_time', 'scheduled_time', { unique: false });
        appointmentsStore.createIndex('status', 'status', { unique: false });
      }

      // Consultations store
      if (!db.objectStoreNames.contains(STORES.CONSULTATIONS)) {
        const consultationsStore = db.createObjectStore(STORES.CONSULTATIONS, { keyPath: 'id' });
        consultationsStore.createIndex('patient_id', 'patient_id', { unique: false });
        consultationsStore.createIndex('appointment_id', 'appointment_id', { unique: false });
        consultationsStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // Sync queue store - for offline mutations
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncQueueStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
        syncQueueStore.createIndex('operation', 'operation', { unique: false });
        syncQueueStore.createIndex('createdAt', 'createdAt', { unique: false });
        syncQueueStore.createIndex('userId', 'userId', { unique: false });
      }

      // Audio chunks store - for offline recording
      if (!db.objectStoreNames.contains(STORES.AUDIO_CHUNKS)) {
        const audioStore = db.createObjectStore(STORES.AUDIO_CHUNKS, { keyPath: 'id' });
        audioStore.createIndex('appointmentId', 'appointmentId', { unique: false });
        audioStore.createIndex('uploaded', 'uploaded', { unique: false });
      }

      // Metadata store - for sync timestamps, etc.
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
      }

      console.log('✅ IndexedDB stores created');
    };
  });

  return dbInitPromise;
}

/**
 * Get the database instance
 */
export async function getDb(): Promise<IDBDatabase> {
  if (!dbInstance) {
    return initOfflineDb();
  }
  return dbInstance;
}

/**
 * Generic CRUD operations for any store
 */

// Get all items from a store
export async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get items by index
export async function getByIndex<T>(storeName: string, indexName: string, value: IDBValidKey): Promise<T[]> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get single item by key
export async function getById<T>(storeName: string, id: string): Promise<T | undefined> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Put (upsert) item
export async function put<T>(storeName: string, item: T): Promise<T> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => resolve(item);
    request.onerror = () => reject(request.error);
  });
}

// Put multiple items
export async function putMany<T>(storeName: string, items: T[]): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    let completed = 0;
    items.forEach((item) => {
      const request = store.put(item);
      request.onsuccess = () => {
        completed++;
        if (completed === items.length) {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });

    if (items.length === 0) resolve();
  });
}

// Delete item by key
export async function deleteById(storeName: string, id: string): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Clear all items from a store
export async function clearStore(storeName: string): Promise<void> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Patient-specific operations
 */

export async function getCachedPatients(userId: string): Promise<PatientWithAppointments[]> {
  const patients = await getByIndex<PatientWithAppointments>(STORES.PATIENTS, 'created_by', userId);
  return patients.filter(p => !p.archived).sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function cachePatients(patients: PatientWithAppointments[]): Promise<void> {
  await putMany(STORES.PATIENTS, patients);
}

export async function cachePatient(patient: PatientWithAppointments): Promise<void> {
  await put(STORES.PATIENTS, patient);
}

export async function getCachedPatient(id: string): Promise<PatientWithAppointments | undefined> {
  return getById<PatientWithAppointments>(STORES.PATIENTS, id);
}

/**
 * Appointment-specific operations
 */

export async function getCachedAppointments(userId: string): Promise<AppointmentWithPatient[]> {
  const appointments = await getByIndex<AppointmentWithPatient>(STORES.APPOINTMENTS, 'created_by', userId);
  return appointments
    .filter(a => a.status === 'scheduled' || a.status === 'in_progress')
    .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
}

export async function cacheAppointments(appointments: AppointmentWithPatient[]): Promise<void> {
  await putMany(STORES.APPOINTMENTS, appointments);
}

export async function cacheAppointment(appointment: AppointmentWithPatient): Promise<void> {
  await put(STORES.APPOINTMENTS, appointment);
}

export async function getCachedAppointment(id: string): Promise<AppointmentWithPatient | undefined> {
  return getById<AppointmentWithPatient>(STORES.APPOINTMENTS, id);
}

/**
 * Consultation-specific operations
 */

export async function getCachedConsultations(patientId: string): Promise<Consultation[]> {
  return getByIndex<Consultation>(STORES.CONSULTATIONS, 'patient_id', patientId);
}

export async function cacheConsultations(consultations: Consultation[]): Promise<void> {
  await putMany(STORES.CONSULTATIONS, consultations);
}

export async function cacheConsultation(consultation: Consultation): Promise<void> {
  await put(STORES.CONSULTATIONS, consultation);
}

/**
 * Sync Queue operations
 */

export async function addToSyncQueue(item: SyncQueueItem): Promise<void> {
  await put(STORES.SYNC_QUEUE, item);
}

export async function getSyncQueue(userId: string): Promise<SyncQueueItem[]> {
  const items = await getByIndex<SyncQueueItem>(STORES.SYNC_QUEUE, 'userId', userId);
  return items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function getAllPendingSyncItems(): Promise<SyncQueueItem[]> {
  const items = await getAll<SyncQueueItem>(STORES.SYNC_QUEUE);
  return items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  await deleteById(STORES.SYNC_QUEUE, id);
}

export async function updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
  await put(STORES.SYNC_QUEUE, item);
}

export async function getSyncQueueCount(): Promise<number> {
  const items = await getAll<SyncQueueItem>(STORES.SYNC_QUEUE);
  return items.length;
}

/**
 * Audio Chunk operations
 */

export async function addAudioChunk(chunk: AudioChunkItem): Promise<void> {
  await put(STORES.AUDIO_CHUNKS, chunk);
}

export async function getAudioChunks(appointmentId: string): Promise<AudioChunkItem[]> {
  const chunks = await getByIndex<AudioChunkItem>(STORES.AUDIO_CHUNKS, 'appointmentId', appointmentId);
  return chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
}

export async function getUnuploadedAudioChunks(): Promise<AudioChunkItem[]> {
  const chunks = await getByIndex<AudioChunkItem>(STORES.AUDIO_CHUNKS, 'uploaded', 0);
  return chunks.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export async function markAudioChunkUploaded(id: string): Promise<void> {
  const chunk = await getById<AudioChunkItem>(STORES.AUDIO_CHUNKS, id);
  if (chunk) {
    chunk.uploaded = true;
    await put(STORES.AUDIO_CHUNKS, chunk);
  }
}

export async function deleteAudioChunks(appointmentId: string): Promise<void> {
  const chunks = await getAudioChunks(appointmentId);
  for (const chunk of chunks) {
    await deleteById(STORES.AUDIO_CHUNKS, chunk.id);
  }
}

/**
 * Metadata operations
 */

export async function setMetadata(key: string, value: any): Promise<void> {
  await put(STORES.METADATA, {
    key,
    value,
    updatedAt: new Date().toISOString(),
  });
}

export async function getMetadata<T>(key: string): Promise<T | undefined> {
  const item = await getById<MetadataItem>(STORES.METADATA, key);
  return item?.value;
}

export async function getLastSyncTime(): Promise<string | undefined> {
  return getMetadata<string>('lastSyncTime');
}

export async function setLastSyncTime(time: string): Promise<void> {
  await setMetadata('lastSyncTime', time);
}

/**
 * Generate a temporary local ID for optimistic updates
 */
export function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if an ID is a temporary local ID
 */
export function isLocalId(id: string): boolean {
  return id.startsWith('local_');
}

/**
 * Clear all offline data (useful for logout)
 */
export async function clearAllOfflineData(): Promise<void> {
  await clearStore(STORES.PATIENTS);
  await clearStore(STORES.APPOINTMENTS);
  await clearStore(STORES.CONSULTATIONS);
  await clearStore(STORES.SYNC_QUEUE);
  await clearStore(STORES.AUDIO_CHUNKS);
  await clearStore(STORES.METADATA);
  console.log('🗑️ All offline data cleared');
}
