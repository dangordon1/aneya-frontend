/**
 * Offline Status Bar Component
 * Shows network status, pending sync count, and sync progress
 */

import { useOffline } from '../contexts/OfflineContext';

interface OfflineStatusBarProps {
  className?: string;
}

export function OfflineStatusBar({ className = '' }: OfflineStatusBarProps) {
  const {
    isOnline,
    isOffline,
    isSyncing,
    pendingSyncCount,
    syncProgress,
    syncError,
    triggerSync,
  } = useOffline();

  // Don't show anything if online and no pending changes
  if (isOnline && pendingSyncCount === 0 && !isSyncing && !syncError) {
    return null;
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 ${className}`}
      style={{
        backgroundColor: isOffline ? '#fef3c7' : isSyncing ? '#dbeafe' : syncError ? '#fee2e2' : '#d1fae5',
        borderBottom: `2px solid ${isOffline ? '#f59e0b' : isSyncing ? '#3b82f6' : syncError ? '#ef4444' : '#10b981'}`,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        {/* Status icon and message */}
        <div className="flex items-center gap-2">
          {isOffline ? (
            <>
              <span className="text-amber-600">📵</span>
              <span className="text-sm font-medium text-amber-800">
                You're offline
                {pendingSyncCount > 0 && ` - ${pendingSyncCount} change${pendingSyncCount > 1 ? 's' : ''} pending`}
              </span>
            </>
          ) : isSyncing ? (
            <>
              <span className="text-blue-600 animate-spin">🔄</span>
              <span className="text-sm font-medium text-blue-800">
                Syncing...
                {syncProgress && ` (${syncProgress.current}/${syncProgress.total})`}
              </span>
            </>
          ) : syncError ? (
            <>
              <span className="text-red-600">⚠️</span>
              <span className="text-sm font-medium text-red-800">{syncError}</span>
            </>
          ) : pendingSyncCount > 0 ? (
            <>
              <span className="text-green-600">🔄</span>
              <span className="text-sm font-medium text-green-800">
                {pendingSyncCount} change{pendingSyncCount > 1 ? 's' : ''} ready to sync
              </span>
            </>
          ) : null}
        </div>

        {/* Sync button */}
        {isOnline && pendingSyncCount > 0 && !isSyncing && (
          <button
            onClick={triggerSync}
            className="text-sm px-3 py-1 rounded-md font-medium transition-colors"
            style={{
              backgroundColor: syncError ? '#ef4444' : '#10b981',
              color: 'white',
            }}
          >
            {syncError ? 'Retry Sync' : 'Sync Now'}
          </button>
        )}

        {/* Progress bar for syncing */}
        {isSyncing && syncProgress && (
          <div className="w-32 h-2 bg-blue-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{
                width: `${(syncProgress.current / syncProgress.total) * 100}%`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact offline indicator for headers/navigation
 */
export function OfflineIndicator({ className = '' }: { className?: string }) {
  const { isOffline, pendingSyncCount, isSyncing } = useOffline();

  if (!isOffline && pendingSyncCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${className}`}
      style={{
        backgroundColor: isOffline ? '#fef3c7' : isSyncing ? '#dbeafe' : '#d1fae5',
        color: isOffline ? '#92400e' : isSyncing ? '#1e40af' : '#065f46',
      }}
    >
      {isOffline ? (
        <>
          <span>📵</span>
          <span>Offline</span>
        </>
      ) : isSyncing ? (
        <>
          <span className="animate-spin">🔄</span>
          <span>Syncing</span>
        </>
      ) : (
        <>
          <span>🔄</span>
          <span>{pendingSyncCount}</span>
        </>
      )}
    </div>
  );
}

/**
 * Pending changes badge for items created offline
 */
export function PendingBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 ${className}`}
    >
      <span>⏳</span>
      <span>Pending sync</span>
    </span>
  );
}

/**
 * Local ID indicator (for items created offline)
 */
export function LocalIdBadge({ id, className = '' }: { id: string; className?: string }) {
  const isLocal = id.startsWith('local_');

  if (!isLocal) {
    return null;
  }

  return <PendingBadge className={className} />;
}

export default OfflineStatusBar;
