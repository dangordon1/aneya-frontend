# Doctor Report Card Component

This component was imported from Figma Make and provides a comprehensive medical report card template.

## Files

- `DoctorReportCard.tsx` - Main report card component with patient information, vitals, medical conditions, and obstetric history
- `TransposedTable.tsx` - Reusable table component that displays data in transposed format for wide tables
- `index.ts` - Export file for easy importing

## Features

- **Patient Information**: Name, ID, address fields
- **Vital Statistics**: Age, height, weight, BMI (auto-calculated), blood pressure
- **Medical Conditions**: Boolean toggles for diabetes, hypertension, allergies, smoking status
- **Medical History**: Textarea for detailed medical history
- **Obstetric History**: Transposed table showing past pregnancies with multiple data points
- **Additional Notes**: Textarea for observations
- **Physician Signature**: Name, license number, date, and digital signature placeholder
- **Action Buttons**: Save and Print functionality
- **Professional Design**: Medical-themed color scheme with aneya branding

## Usage

```tsx
import { DoctorReportCard } from '@/components/doctor-report-card';

function MyComponent() {
  return <DoctorReportCard />;
}
```

## Color Variables

The component uses CSS variables that are aliased to aneya's existing color palette:

- `--medical-navy` → `--aneya-navy` (#0c3555)
- `--medical-teal` → `--aneya-teal` (#1d9e99)
- `--medical-sea-green` → `--aneya-seagreen` (#409f88)
- `--medical-cream` → `--aneya-cream` (#f6f5ee)

## Dependencies

- React 18+
- TypeScript
- Tailwind CSS
- lucide-react (icons)

## Customization

The component is fully customizable. You can:

1. **Connect to your backend**: Replace the static state with API calls
2. **Add form validation**: Integrate with react-hook-form or similar
3. **Implement save/print**: Add handlers to the action buttons
4. **Extend patient data**: Add more fields to the `patientData` state
5. **Customize styling**: Modify Tailwind classes or CSS variables

## Example Integration

```tsx
import { useState, useEffect } from 'react';
import { DoctorReportCard } from '@/components/doctor-report-card';

function PatientReportPage({ patientId }: { patientId: string }) {
  // Fetch patient data from your API
  // Pass it as props to a modified DoctorReportCard component

  return (
    <div className="container mx-auto">
      <DoctorReportCard />
    </div>
  );
}
```

## Source

Imported from Figma Make project: "Doctor Report Card Template"
- File ID: SqDVDn0q917riV6nF3UUGA
- Date: 2026-01-16
