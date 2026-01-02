# Historical Forms Upload UI Integration Guide

## Components Created

### 1. HistoricalFormUpload
Main upload component for selecting and uploading files.

**Location:** `src/components/doctor-portal/HistoricalFormUpload.tsx`

**Props:**
```typescript
{
  patient: Patient;
  onUploadComplete?: (importId: string) => void;
}
```

**Features:**
- File drag & drop zone
- Multiple file support (1-10 files)
- File type validation (JPEG, PNG, HEIC, PDF)
- File size validation (10MB per file)
- Optional form date input
- Upload progress indication
- Success/error messages

### 2. HistoricalFormUploadModal
Modal wrapper for the upload component.

**Location:** `src/components/doctor-portal/HistoricalFormUploadModal.tsx`

**Props:**
```typescript
{
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  onUploadComplete?: () => void;
}
```

### 3. PendingHistoricalImports
List view for pending imports awaiting review.

**Location:** `src/components/doctor-portal/PendingHistoricalImports.tsx`

**Props:**
```typescript
{
  patientId?: string;  // Optional filter by patient
  onViewImport?: (importRecord: HistoricalFormImport) => void;
}
```

**Features:**
- Auto-refresh functionality
- Processing status badges
- Conflict indicators
- Confidence score badges
- Delete import functionality
- Review button for completed imports

## Integration Example

### Adding Upload Button to Patient Detail View

```typescript
// In PatientDetailView.tsx or similar component

import { useState } from 'react';
import { HistoricalFormUploadModal } from './doctor-portal/HistoricalFormUploadModal';

function PatientDetailView({ patient }: { patient: Patient }) {
  const [showUploadModal, setShowUploadModal] = useState(false);

  return (
    <div>
      {/* Existing patient detail UI */}

      {/* Add Upload Button */}
      <button
        onClick={() => setShowUploadModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-aneya-navy text-white rounded-lg hover:bg-opacity-90 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        Upload Historical Forms
      </button>

      {/* Upload Modal */}
      <HistoricalFormUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        patient={patient}
        onUploadComplete={() => {
          // Optional: Refresh patient data or show success message
          console.log('Upload complete');
        }}
      />
    </div>
  );
}
```

### Adding Pending Imports Section

```typescript
// In a dashboard or patient detail view

import { PendingHistoricalImports } from './doctor-portal/PendingHistoricalImports';

function DoctorDashboard() {
  const [selectedImport, setSelectedImport] = useState(null);

  return (
    <div>
      <h2>Pending Form Imports</h2>

      <PendingHistoricalImports
        onViewImport={(importRecord) => {
          setSelectedImport(importRecord);
          // TODO: Open review modal
        }}
      />
    </div>
  );
}
```

## Styling

All components use the existing Tailwind design system:
- **Primary Color:** `aneya-navy` (#0c3555)
- **Accent Color:** `aneya-teal` (#1d9e99)
- **Background:** `aneya-cream` (#f6f5ee)

## Status Badges

### Processing Status
- **Pending/Processing:** Yellow badge with spinner
- **Completed:** Blue "Ready for Review" badge
- **Failed:** Red badge

### Confidence Scores
- **High (≥0.8):** Green badge
- **Medium (0.5-0.8):** Yellow badge
- **Low (<0.5):** Orange badge

### Conflicts
- Orange badge with warning icon when conflicts detected

## User Flow

1. **Upload**
   - Doctor clicks "Upload Historical Forms" button
   - Modal opens with patient info pre-filled
   - Doctor selects files (images or PDFs)
   - Optionally enters original form date
   - Clicks "Upload & Extract Data"
   - Files uploaded to GCS
   - AI processing begins (30-60 seconds)

2. **Processing**
   - Backend extracts data using Claude Vision API
   - Detects conflicts with existing patient data
   - Updates import record with results
   - Import appears in pending list

3. **Review** (TODO)
   - Doctor clicks "Review" button
   - Review modal shows side-by-side comparison
   - Doctor approves/rejects specific fields
   - Submits review decision

4. **Apply** (TODO)
   - System applies approved changes
   - Creates audit trail
   - Updates patient record

## File Validation

### Supported Formats
- **Images:** JPEG, PNG, HEIC
- **Documents:** PDF

### File Limits
- **Count:** 1-10 files per upload
- **Size:** 10MB per file
- **Total:** No hard limit, but recommend staying under 100MB total

### Validation Errors
- Too few files (< 1)
- Too many files (> 10)
- File too large (> 10MB)
- Invalid file type

## Error Handling

### Upload Errors
- Network errors
- File validation errors
- Authentication errors
- Server errors (500)

### Processing Errors
- PDF extraction failures
- Vision API errors
- Invalid file format
- Timeout errors

### Display
All errors shown in red alert boxes with:
- Error icon
- Clear error message
- Retry option (where applicable)

## Next Steps

To complete the feature:

1. **Build Review Modal** - Create side-by-side comparison UI
2. **Implement Apply Logic** - Complete the backend apply function
3. **Add Notifications** - Toast notifications for upload success
4. **Add Analytics** - Track upload success rates, processing times
5. **Testing** - End-to-end testing with real forms

## API Integration

The components use the `useHistoricalFormImports` hook which wraps these API endpoints:

```typescript
POST /api/historical-forms/upload
GET  /api/historical-forms/pending
GET  /api/historical-forms/{import_id}
POST /api/historical-forms/review
POST /api/historical-forms/apply
DELETE /api/historical-forms/{import_id}
```

## Performance Considerations

- File uploads use multipart/form-data
- Processing happens asynchronously in background
- Frontend polls for status updates (via refresh button)
- Consider adding WebSocket for real-time updates
- Large files may take longer to upload/process

## Security

- RLS policies ensure doctors only see their patients' imports
- File uploads require authentication
- Files stored in secure GCS bucket
- No direct file URLs exposed to frontend

## Accessibility

- Keyboard navigation support
- ARIA labels on interactive elements
- Focus management in modals
- Screen reader friendly status messages
