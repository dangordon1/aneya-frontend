import React from 'react';
import ReactDOM from 'react-dom/client';
import posthog from 'posthog-js';
import App from './App';
import './index.css';

// Initialize PostHog for user behavior analytics
if (import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    capture_exceptions: true,
    session_recording: {
      recordCrossOriginIframes: true,
    },
    loaded: (posthogInstance) => {
      // Expose PostHog globally for debugging
      (window as any).posthog = posthogInstance;
      console.log('✅ PostHog initialized');
      console.log('📹 Session recording started:', posthogInstance.sessionRecordingStarted());
    },
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
