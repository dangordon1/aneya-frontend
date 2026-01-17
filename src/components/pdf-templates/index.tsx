/**
 * PDF Templates Export
 *
 * These components are designed for headless browser PDF generation.
 * They use DoctorReportCard styling and support clinic-specific branding.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { PdfConsultationForm } from './PdfConsultationForm';
import { PdfAnalysisReport } from './PdfAnalysisReport';
import { PdfTableRenderer } from './PdfTableRenderer';

// Render function for PDF generation
const render = (componentName: string, props: any) => {
  const root = createRoot(document.getElementById('root')!);

  const components: Record<string, React.ComponentType<any>> = {
    PdfConsultationForm,
    PdfAnalysisReport,
    PdfTableRenderer
  };

  const Component = components[componentName];

  if (Component) {
    root.render(React.createElement(Component, props));
  } else {
    root.render(
      React.createElement('h1', null, `Error: Component ${componentName} not found`)
    );
  }
};

// Export as global for browser access
if (typeof window !== 'undefined') {
  (window as any).PdfTemplates = {
    PdfConsultationForm,
    PdfAnalysisReport,
    PdfTableRenderer,
    render
  };
}

export { PdfConsultationForm, PdfAnalysisReport, PdfTableRenderer, render };
