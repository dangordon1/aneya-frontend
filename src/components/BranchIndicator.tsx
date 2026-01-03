import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function BranchIndicator() {
  const [backendBranch, setBackendBranch] = useState<string | null>(null);
  const frontendBranch = __GIT_BRANCH__;

  useEffect(() => {
    // Fetch backend branch from health endpoint
    const fetchBackendBranch = async () => {
      try {
        const response = await fetch(`${API_URL}/api/health`);
        const data = await response.json();
        if (data.branch && data.branch !== 'main') {
          setBackendBranch(data.branch);
        }
      } catch (error) {
        console.error('Failed to fetch backend branch:', error);
      }
    };

    fetchBackendBranch();
  }, []);

  // Don't show anything if both are on main
  if (frontendBranch === 'main' && !backendBranch) {
    return null;
  }

  return (
    <div className="flex flex-col gap-0.5 text-right">
      {frontendBranch !== 'main' && (
        <span className="text-aneya-cream/60 text-xs font-mono">
          FE: {frontendBranch}
        </span>
      )}
      {backendBranch && (
        <span className="text-aneya-cream/60 text-xs font-mono">
          BE: {backendBranch}
        </span>
      )}
    </div>
  );
}
