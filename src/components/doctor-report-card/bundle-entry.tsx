/**
 * Bundle entry point for DoctorReportCard PDF generation
 * Exports the component in a format that can be loaded by Playwright
 */

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { DoctorReportCard, PatientData, PregnancyRecord } from './DoctorReportCard';
import { TransposedTable } from './TransposedTable';

// Render function with optional data
const render = (data?: { patientData?: PatientData; pregnancyHistory?: PregnancyRecord[] }) => {
  const root = createRoot(document.getElementById('root')!);

  if (data) {
    // Render with real data (read-only mode for PDFs)
    root.render(
      <DoctorReportCard
        patientData={data.patientData}
        pregnancyHistory={data.pregnancyHistory}
        editable={false}
      />
    );
  } else {
    // Render with sample data (test mode, read-only for PDFs)
    root.render(<DoctorReportCard editable={false} />);
  }
};

// Export as global for browser access
if (typeof window !== 'undefined') {
  (window as any).DoctorReportCardBundle = {
    DoctorReportCard,
    TransposedTable,
    render
  };
}

export { DoctorReportCard, TransposedTable, render };
