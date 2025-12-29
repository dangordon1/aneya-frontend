# OB/GYN Forms Integration - Implementation Guide

## Task Summary
Integrated OB/GYN pre-consultation and during-consultation forms into the existing appointment workflow with conditional rendering based on doctor specialty.

## Completed Tasks

### Task 1: Create Specialty Detector Utility
**File:** `/src/utils/specialtyDetector.ts` (NEW)

```typescript
export function isOBGynAppointment(doctorSpecialty: string | null | undefined): boolean
export function requiresSpecialtyForms(doctorSpecialty: string | null | undefined): boolean
export function getSpecialtyCategory(doctorSpecialty: string | null | undefined): 'obgyn' | 'general'
```

**Features:**
- Robust specialty detection with multiple naming convention support
- Extensible for future specialty-specific forms
- Pure functions with no side effects

---

### Task 2: Update Patient Portal Appointment View
**File:** `/src/components/patient-portal/PatientAppointments.tsx`

#### Changes Made:

**1. New Imports**
```typescript
import type { Appointment, Doctor, Consultation } from '../../types/database';
import { isOBGynAppointment } from '../../utils/specialtyDetector';
import { OBGynPreConsultationForm } from './OBGynPreConsultationForm';
```

**2. Extended Interface**
```typescript
interface AppointmentWithOBGynForm extends AppointmentWithDetails {
  obgynFormStatus?: 'draft' | 'partial' | 'completed' | null;
}
```

**3. New State**
```typescript
const [selectedOBGynForm, setSelectedOBGynForm] = useState<{ appointmentId: string; patientId: string } | null>(null);
```

**4. Enhanced Fetch Logic**
- Queries `ob_gyn_consultation_forms` table for pre-consultation forms
- Filters by: `appointment_id`, `form_type = 'pre_consultation'`
- Attaches form status to appointment data
- Gracefully handles missing forms

**5. New Badge Component**
```typescript
const getOBGynFormBadge = (formStatus: string | null | undefined) => {
  // Returns color-coded badge with status label and checkmark icon
  // Draft: Orange
  // Partial: Blue
  // Completed: Green
}
```

**6. Conditional Button in Appointment Card**
- Only shows for upcoming OB/GYN appointments
- Label changes: "Fill Pre-consultation Form" or "Continue Pre-consultation Form"
- Opens modal when clicked

**7. Form Modal**
- Displays `OBGynPreConsultationForm` component
- Passes: `patientId`, `appointmentId`, `onComplete`
- Refreshes appointment data on completion
- Purple header matching theme

#### Conditional Rendering Logic
```typescript
{isOBGyn && !isPast && patientProfile && (
  <button onClick={() => setSelectedOBGynForm({ appointmentId: apt.id, patientId: patientProfile.id })}>
    {hasOBGynForm ? 'Continue Pre-consultation Form' : 'Fill Pre-consultation Form'}
  </button>
)}
```

---

### Task 3: Update Doctor Portal InputScreen
**File:** `/src/components/InputScreen.tsx`

#### Changes Made:

**1. New Imports**
```typescript
import { isOBGynAppointment } from '../utils/specialtyDetector';
import { OBGynDuringConsultationForm } from './doctor-portal/OBGynDuringConsultationForm';
```

**2. New State**
```typescript
const [showOBGynForm, setShowOBGynForm] = useState(false);
```

**3. OB/GYN Form Button**
- Positioned after "Summarise Consultation" button
- Only appears when:
  - `appointmentContext` exists
  - Doctor specialty is OB/GYN
  - `consultationSummary` has been generated
- Opens modal with clinical assessment form

**4. OB/GYN Form Modal**
```typescript
{showOBGynForm && appointmentContext && preFilledPatient && appointmentContext.consultation_id && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      {/* Header with close button */}
      {/* OBGynDuringConsultationForm component */}
    </div>
  </div>
)}
```

**Props Passed:**
- `patientId`: From `preFilledPatient.id`
- `appointmentId`: From `appointmentContext.id`
- `consultationId`: From `appointmentContext.consultation_id`
- `onComplete`: Closes modal when form is completed

#### Visibility Conditions
```typescript
{appointmentContext &&
 preFilledPatient &&
 isOBGynAppointment((appointmentContext as any).doctor?.specialty) &&
 consultationSummary && (
  <button onClick={() => setShowOBGynForm(true)}>
    Fill OB/GYN Clinical Assessment
  </button>
)}
```

---

### Task 4: Add Form Status Indicator
**File:** `/src/components/patient-portal/PatientAppointments.tsx`

#### Implemented Badge System

**Visual Display:**
- Shows above appointment action buttons
- Only visible for appointments with forms
- Color-coded by status

**Status Labels:**
- `draft`: "Form Started" (Orange: `bg-orange-100 text-orange-800`)
- `partial`: "Form In Progress" (Blue: `bg-blue-100 text-blue-800`)
- `completed`: "Pre-consultation Form Completed" (Green: `bg-green-100 text-green-800`)

**Badge Features:**
- Checkmark icon for visual clarity
- Responsive sizing
- Consistent with appointment status badges

---

## Design Decisions

### 1. Specialty Detection
- **Why:** Allows clean separation of specialty-specific logic
- **Implementation:** Separate utility file for reusability
- **Naming Conventions:** Supports multiple variations to handle data entry inconsistencies

### 2. Form Status in UI
- **Why:** Patients should know if they've started the form
- **Display:** Badge-based to match existing appointment status
- **Storage:** Fetched from database on appointment load

### 3. Conditional Rendering
- **Why:** Non-OB/GYN appointments shouldn't be affected
- **Pattern:** Multiple conditions checked before rendering
- **Safety:** Uses optional chaining and null checks

### 4. Modal Approach
- **Why:** Keeps user in appointment context
- **Consistency:** Matches existing ConsultationModal pattern
- **User Experience:** Dedicated space for form with scrollable content

### 5. Timing in Doctor Portal
- **Why:** Form shown after consultation summarized
- **Rationale:** Clinical data collection should happen after history taking
- **Logic:** Button appears when summarization complete

---

## Data Flow Diagram

```
PATIENT PORTAL
==============
PatientAppointments
    ↓
fetch appointments + OB/GYN form status
    ↓
isOBGynAppointment check
    ↓
Display form status badge + button
    ↓
Click button → setSelectedOBGynForm
    ↓
Modal opens with OBGynPreConsultationForm
    ↓
Form saved to database
    ↓
fetchAppointments refreshes status
    ↓
Badge updates


DOCTOR PORTAL
=============
InputScreen (with appointmentContext)
    ↓
Consultation recorded + summarized
    ↓
isOBGynAppointment check
    ↓
Display "Fill OB/GYN Clinical Assessment" button
    ↓
Click button → setShowOBGynForm(true)
    ↓
Modal opens with OBGynDuringConsultationForm
    ↓
Form saved to database
    ↓
onComplete closes modal
```

---

## Type Safety Implementation

### AppointmentWithOBGynForm Interface
```typescript
interface AppointmentWithOBGynForm extends AppointmentWithDetails {
  obgynFormStatus?: 'draft' | 'partial' | 'completed' | null;
}
```

### Form Status Checking
```typescript
const hasOBGynForm = apt.obgynFormStatus !== null && apt.obgynFormStatus !== undefined;
```

### Specialty Type Guard
```typescript
if (isOBGynAppointment(apt.doctor?.specialty)) {
  // Safe to use OB/GYN-specific code
}
```

---

## Error Handling

### Form Query Errors
```typescript
try {
  const { data: formData, error: formError } = await supabase
    .from('ob_gyn_consultation_forms')
    .select('status')
    .eq('appointment_id', apt.id)
    .eq('form_type', 'pre_consultation')
    .single();

  if (!formError && formData) {
    return { ...apt, obgynFormStatus: formData.status };
  }
} catch (err) {
  // Form doesn't exist yet, that's ok
}
```

### Missing Context Checks
```typescript
{showOBGynForm && appointmentContext && preFilledPatient && appointmentContext.consultation_id && (
  // Safe to render form
)}
```

---

## Performance Considerations

### Lazy Query Loading
- Form status only queried for OB/GYN appointments
- Single query per OB/GYN appointment on list load
- Not triggered for general appointments

### Efficient Re-fetching
- `fetchAppointments()` called only on completion
- No polling or continuous updates
- Manual refresh as needed

### Modal Rendering
- Form components only rendered when modal visible
- No pre-rendering of hidden forms
- Clean up on modal close

---

## Compatibility Notes

### Backward Compatibility
- No breaking changes to existing interfaces
- Non-OB/GYN appointments completely unaffected
- Existing functionality preserved
- Optional form features

### Browser Support
- Uses standard React patterns
- No new browser APIs
- Works with existing Tailwind setup
- Compatible with current build system

### Database Requirements
- Assumes `ob_gyn_consultation_forms` table exists
- Assumes `form_type` and `status` columns exist
- Assumes `appointment_id` foreign key exists
- No new database migrations required

---

## Testing Scenarios

### Scenario 1: Patient Pre-consultation Flow
1. Patient logs in and views appointments
2. OB/GYN appointment visible with empty form status
3. Click "Fill Pre-consultation Form"
4. Modal opens with form
5. Fill and save form
6. Status badge updates to "Form In Progress"
7. Continue form later → status updates

### Scenario 2: Doctor During-consultation Flow
1. Doctor records consultation
2. Click "Summarise Consultation"
3. "Fill OB/GYN Clinical Assessment" button appears
4. Click button → modal opens
5. Fill clinical findings
6. Click complete → modal closes
7. Continue with analysis

### Scenario 3: Non-OB/GYN Appointment
1. Appointment with non-OB/GYN doctor
2. No form buttons visible
3. All existing functionality works
4. No form status badge displayed

---

## Future Enhancements

### Potential Extensions
1. **Other Specialties:** Reuse `isOBGynAppointment` pattern
2. **Form Templates:** Store and retrieve template versions
3. **Form Analytics:** Track form completion rates
4. **Reminder System:** Notify patients about incomplete forms
5. **Mobile Optimization:** Responsive form modal sizing

### Extensibility Points
- `specialtyDetector.ts`: Add new specialty check functions
- `PatientAppointments.tsx`: Support multiple form types
- `InputScreen.tsx`: Support multiple clinical assessment forms
- Database schema: Add form versioning and archival

---

## Code Quality

### Linting & Types
- All new code passes TypeScript compilation
- Follows existing code style
- Uses consistent naming conventions
- Proper import/export organization

### Comments
- Clarifying comments where logic is complex
- Section markers for readability
- Inline explanations for non-obvious decisions

### Reusability
- Specialty detector is utility-based
- Form components are self-contained
- Modal pattern consistent with existing code
- Conditional rendering is clear and maintainable
