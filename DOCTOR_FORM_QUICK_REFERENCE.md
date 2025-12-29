# Doctor Portal Pre-Consultation Form - Quick Reference

## What Was Implemented

Doctors can now fill out OB/GYN pre-consultation forms on behalf of patients. The system tracks who filled the form using a `filled_by` field.

## Components Changed

### 1. **AppointmentCard**
- Shows purple "Fill Pre-consultation Form" button for upcoming appointments
- Button text varies based on form status (fill / edit / review)
- Only appears when doctor is OB/GYN specialist

### 2. **OBGynPreConsultationForm**
- Now accepts `filledBy` ('patient' | 'doctor') parameter
- When doctor fills form, sets `filled_by` to doctor's user_id
- Reuses all existing form logic - no duplication

### 3. **AppointmentsTab**
- Fetches form status for each appointment (OB/GYN doctors only)
- Opens modal when doctor clicks "Fill Pre-consultation Form"
- Modal header with purple theme
- Auto-closes after form completion

## Database Field Added

```typescript
// In OBGynConsultationForm interface
filled_by?: string | null;  // Doctor's user_id if filled by doctor, null if filled by patient
```

## Button Behavior

| Form Status | Button Text | Action |
|------------|------------|--------|
| No form exists | "Fill Pre-consultation Form" | Create and open form |
| Draft/Partial | "Review/Edit Pre-consultation Form" | Load and allow editing |
| Completed | "Review Pre-consultation Form" | Load in read-only mode |

## Code Snippets

### Using the Form (Doctor Mode)
```typescript
<OBGynPreConsultationForm
  patientId={appointment.patient_id}
  appointmentId={appointment.id}
  filledBy="doctor"
  doctorUserId={user.id}
  onComplete={() => {
    // Handle completion
  }}
/>
```

### Checking Form Status
```typescript
// Form status is cached in component state
const formStatus = appointmentOBGynFormStatus[appointmentId];
// Returns: 'draft' | 'partial' | 'completed' | null
```

### Determining Doctor Specialty
```typescript
import { isOBGynAppointment } from '../utils/specialtyDetector';

const canFillForm = isOBGynAppointment(doctor.specialty);
```

## UI Flow

1. Doctor logs in to doctor portal
2. Views upcoming appointments for today/selected date
3. For OB/GYN appointments, sees purple "Fill Pre-consultation Form" button
4. Clicks button → modal opens with form
5. Fills form (auto-saves as they progress)
6. Completes form → modal closes
7. Button text updates to reflect completion status

## Database Changes Required

The `ob_gyn_consultation_forms` table needs:
- `filled_by` column (VARCHAR, nullable, default NULL)

This tracks who filled the form:
- `NULL` = patient filled it
- `user_id` = doctor (user) filled it

## Key Design Decisions

1. **Reuse Component**: Used existing `OBGynPreConsultationForm` rather than creating new component
2. **Doctor ID Tracking**: Stores doctor's user_id (not doctor_id) for consistency with created_by pattern
3. **Optional Property**: `filled_by` is optional to maintain backward compatibility
4. **Auto-save**: Existing auto-save mechanism works for both patient and doctor fills
5. **Modal Isolation**: Form modal appears only when doctor selects an appointment

## Testing Checklist

- [ ] OB/GYN doctor sees button for OB/GYN appointments
- [ ] Non-OB/GYN doctor doesn't see button
- [ ] Button opens modal successfully
- [ ] Form auto-saves with filled_by set correctly
- [ ] Button text updates after form completion
- [ ] Doctor can edit previously filled forms
- [ ] Form status fetches without errors
- [ ] Modal closes after completion
- [ ] All form validation still works

## Edge Cases Handled

1. ✓ Non-OB/GYN appointments - button hidden
2. ✓ Past appointments - button hidden
3. ✓ No form exists - creates new one
4. ✓ Form already exists - loads existing
5. ✓ Doctor specialty null - button hidden
6. ✓ User not authenticated - modal not shown

## Related Files

- `/src/types/database.ts` - Type definitions
- `/src/components/AppointmentCard.tsx` - Button rendering
- `/src/components/AppointmentsTab.tsx` - Modal and state management
- `/src/components/patient-portal/OBGynPreConsultationForm.tsx` - Form component
- `/src/hooks/useOBGynForms.ts` - Form data operations
- `/src/utils/specialtyDetector.ts` - Specialty detection utility
