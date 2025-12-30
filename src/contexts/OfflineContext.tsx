/**
 * Offline Context
 * Provides network status and sync functionality to the entire app.
 * Handles automatic sync when network is restored.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { initOfflineDb, clearAllOfflineData } from '../lib/offlineDb';
import {
  processSync,
  hasPendingSyncItems,
  getPendingSyncCount,
  onSyncEvent,
} from '../lib/syncService';

interface OfflineContextValue {
  // Network status
  isOnline: boolean;
  isOffline: boolean;

  // Sync status
  isSyncing: boolean;
  pendingSyncCount: number;
  lastSyncTime: string | null;
  syncError: string | null;

  // Sync progress (during active sync)
  syncProgress: {
    current: number;
    total: number;
    success: number;
    failed: number;
  } | null;

  // Actions
  triggerSync: () => Promise<void>;
  clearOfflineData: () => Promise<void>;

  // Database ready state
  isDbReady: boolean;
}

const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  // Network status
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Database status
  const [isDbReady, setIsDbReady] = useState(false);

  // Sync status
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<OfflineContextValue['syncProgress']>(null);

  // Ref to prevent multiple sync attempts
  const syncInProgressRef = useRef(false);

  // Initialize IndexedDB on mount
  useEffect(() => {
    const initDb = async () => {
      try {
        await initOfflineDb();
        setIsDbReady(true);
        console.log('✅ Offline database ready');

        // Check initial sync queue count
        const count = await getPendingSyncCount();
        setPendingSyncCount(count);
      } catch (error) {
        console.error('Failed to initialize offline database:', error);
      }
    };

    initDb();
  }, []);

  // Subscribe to sync events
  useEffect(() => {
    const unsubscribeQueueUpdate = onSyncEvent('queue_updated', (data) => {
      setPendingSyncCount(data?.count || 0);
    });

    const unsubscribeSyncStarted = onSyncEvent('sync_started', (data) => {
      setIsSyncing(true);
      setSyncError(null);
      setSyncProgress({
        current: 0,
        total: data?.total || 0,
        success: 0,
        failed: 0,
      });
    });

    const unsubscribeSyncProgress = onSyncEvent('sync_progress', (data) => {
      setSyncProgress({
        current: data?.current || 0,
        total: data?.total || 0,
        success: data?.success || 0,
        failed: data?.failed || 0,
      });
    });

    const unsubscribeSyncCompleted = onSyncEvent('sync_completed', () => {
      setIsSyncing(false);
      setSyncProgress(null);
      setLastSyncTime(new Date().toISOString());
    });

    const unsubscribeSyncFailed = onSyncEvent('sync_failed', (data) => {
      setIsSyncing(false);
      setSyncProgress(null);
      setSyncError(`${data?.failed || 0} items failed to sync`);
    });

    return () => {
      unsubscribeQueueUpdate();
      unsubscribeSyncStarted();
      unsubscribeSyncProgress();
      unsubscribeSyncCompleted();
      unsubscribeSyncFailed();
    };
  }, []);

  // Network status listeners
  useEffect(() => {
    const handleOnline = () => {
      console.log('📶 Network online');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('📵 Network offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    const autoSync = async () => {
      if (isOnline && isDbReady && !syncInProgressRef.current) {
        const hasPending = await hasPendingSyncItems();
        if (hasPending) {
          console.log('🔄 Network restored, starting auto-sync...');
          triggerSync();
        }
      }
    };

    autoSync();
  }, [isOnline, isDbReady]);

  // Trigger manual sync
  const triggerSync = useCallback(async () => {
    if (!isOnline) {
      console.log('⚠️ Cannot sync while offline');
      return;
    }

    if (syncInProgressRef.current) {
      console.log('⚠️ Sync already in progress');
      return;
    }

    syncInProgressRef.current = true;

    try {
      await processSync();
    } catch (error: any) {
      console.error('Sync error:', error);
      setSyncError(error.message);
    } finally {
      syncInProgressRef.current = false;
    }
  }, [isOnline]);

  // Clear all offline data (for logout)
  const clearOfflineData = useCallback(async () => {
    await clearAllOfflineData();
    setPendingSyncCount(0);
    setLastSyncTime(null);
    setSyncError(null);
  }, []);

  const value: OfflineContextValue = {
    isOnline,
    isOffline: !isOnline,
    isSyncing,
    pendingSyncCount,
    lastSyncTime,
    syncError,
    syncProgress,
    triggerSync,
    clearOfflineData,
    isDbReady,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline(): OfflineContextValue {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}

/**
 * Hook for checking if currently offline
 */
export function useIsOffline(): boolean {
  const { isOffline } = useOffline();
  return isOffline;
}

/**
 * Hook for getting pending sync count
 */
export function usePendingSyncCount(): number {
  const { pendingSyncCount } = useOffline();
  return pendingSyncCount;
}
