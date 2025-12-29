# Code Changes Summary

## File 1: src/types/database.ts

### Changes to OBGynConsultationForm interface (line 632)
```typescript
export interface OBGynConsultationForm {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  form_type: FormType;
  status: FormStatus;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  filled_by?: string | null;  // NEW: Doctor's user_id if filled by doctor
  // ... rest of fields
}
```

### Changes to CreateOBGynFormInput interface (line 761)
```typescript
export interface CreateOBGynFormInput {
  appointment_id?: string | null;
  form_type: FormType;
  status?: FormStatus;
  filled_by?: string | null;  // NEW: For setting doctor attribution on creation
  // ... rest of fields
}
```

### Changes to UpdateOBGynFormInput interface (line 815)
```typescript
export interface UpdateOBGynFormInput {
  form_type?: FormType;
  status?: FormStatus;
  filled_by?: string | null;  // NEW: For updating doctor attribution
  // ... rest of fields
}
```

---

## File 2: src/components/AppointmentCard.tsx

### Added import
```typescript
// Removed: import { isOBGynAppointment } from '../utils/specialtyDetector';
// (Not needed for AppointmentCard logic)
```

### Updated interface
```typescript
interface AppointmentCardProps {
  appointment: AppointmentWithPatient;
  onStartConsultation: (appointment: AppointmentWithPatient) => void;
  onModify: (appointment: AppointmentWithPatient) => void;
  onCancel: (appointment: AppointmentWithPatient) => void;
  onFillPreConsultationForm?: (appointment: AppointmentWithPatient) => void;  // NEW
  obgynFormStatus?: 'draft' | 'partial' | 'completed' | null;  // NEW
}
```

### Updated component function
```typescript
export function AppointmentCard({
  appointment,
  onStartConsultation,
  onModify,
  onCancel,
  onFillPreConsultationForm,  // NEW
  obgynFormStatus  // NEW
}: AppointmentCardProps) {
  // ... existing code ...

  // NEW: Determine button text and visibility for pre-consultation form
  const getFormButtonText = () => {
    if (!obgynFormStatus) return 'Fill Pre-consultation Form';
    if (obgynFormStatus === 'draft' || obgynFormStatus === 'partial') return 'Review/Edit Pre-consultation Form';
    return 'Review Pre-consultation Form';
  };

  const canShowFormButton = onFillPreConsultationForm !== undefined;

  // ... existing JSX code ...

  // NEW: Form button section in JSX
  {canShowFormButton && (appointment.status === 'scheduled' || appointment.status === 'in_progress') && (
    <button
      onClick={() => onFillPreConsultationForm?.(appointment)}
      className="w-full px-4 py-2 bg-purple-600 text-white rounded-[10px] text-[14px] font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {getFormButtonText()}
    </button>
  )}
}
```

---

## File 3: src/components/patient-portal/OBGynPreConsultationForm.tsx

### Updated interface
```typescript
interface OBGynPreConsultationFormProps {
  patientId: string;
  appointmentId: string;
  onComplete?: () => void;
  filledBy?: 'patient' | 'doctor';  // NEW: Indicates who is filling the form
  doctorUserId?: string;  // NEW: Doctor's user ID if filled by doctor
}
```

### Updated component function
```typescript
export function OBGynPreConsultationForm({
  patientId,
  appointmentId,
  onComplete,
  filledBy = 'patient',  // NEW: Default to patient mode
  doctorUserId,  // NEW
}: OBGynPreConsultationFormProps) {
  // ... existing code ...

  const [formData, setFormData] = useState<CreateOBGynFormInput>({
    form_type: 'pre_consultation',
    status: 'draft',
    appointment_id: appointmentId,
    filled_by: filledBy === 'doctor' ? doctorUserId : null,  // NEW: Set filled_by based on mode
  });
```

### Updated handleAutoSave
```typescript
const handleAutoSave = async (_stepIndex: number) => {
  if (!currentFormId) {
    const newForm = await createForm(patientId, {
      ...formData,
      filled_by: filledBy === 'doctor' ? doctorUserId : null,  // NEW: Include filled_by
    });
    if (newForm) {
      setCurrentFormId(newForm.id);
    }
  } else {
    const updateData: UpdateOBGynFormInput = {
      ...formData,
      status: 'partial',
      filled_by: filledBy === 'doctor' ? doctorUserId : null,  // NEW: Include filled_by
    };
    autoSaveForm(currentFormId, updateData);
  }
};
```

### Updated handleComplete
```typescript
const handleComplete = async () => {
  if (!currentFormId) {
    const newForm = await createForm(patientId, {
      ...formData,
      status: 'completed',
      filled_by: filledBy === 'doctor' ? doctorUserId : null,  // NEW: Include filled_by
    });
    if (newForm) {
      setCurrentFormId(newForm.id);
    }
  } else {
    await updateForm(currentFormId, {
      ...formData,
      status: 'completed',
      filled_by: filledBy === 'doctor' ? doctorUserId : null,  // NEW: Include filled_by
    });
  }
  onComplete?.();
};
```

---

## File 4: src/components/AppointmentsTab.tsx

### Added imports
```typescript
import { OBGynPreConsultationForm } from './patient-portal/OBGynPreConsultationForm';  // NEW
import { isOBGynAppointment } from '../utils/specialtyDetector';  // NEW
```

### Updated state
```typescript
// NEW: OB/GYN Pre-consultation Form Modal state
const [showOBGynFormModal, setShowOBGynFormModal] = useState(false);
const [selectedAppointmentForForm, setSelectedAppointmentForForm] = useState<AppointmentWithPatient | null>(null);
const [appointmentOBGynFormStatus, setAppointmentOBGynFormStatus] = useState<Record<string, 'draft' | 'partial' | 'completed' | null>>({});
```

### Added handlers
```typescript
// NEW: Handle filling pre-consultation form
const handleFillPreConsultationForm = (appointment: AppointmentWithPatient) => {
  setSelectedAppointmentForForm(appointment);
  setShowOBGynFormModal(true);
};

// NEW: Handle closing form modal
const handleCloseOBGynFormModal = () => {
  setShowOBGynFormModal(false);
  setSelectedAppointmentForForm(null);
};

// NEW: Handle form completion
const handleOBGynFormComplete = () => {
  if (selectedAppointmentForForm) {
    // Could refetch the status here if needed
  }
  handleCloseOBGynFormModal();
};
```

### Added useEffect for form status fetching
```typescript
// NEW: Fetch OB/GYN form statuses for doctor portal
useEffect(() => {
  const fetchOBGynFormStatuses = async () => {
    if (!doctorProfile || !isOBGynAppointment(doctorProfile.specialty)) {
      return;
    }

    try {
      const { data: allAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id, patient_id')
        .eq('user_id', user?.id)
        .in('status', ['scheduled', 'in_progress']);

      if (appointmentsError) throw appointmentsError;

      const formStatuses: Record<string, 'draft' | 'partial' | 'completed' | null> = {};

      for (const apt of allAppointments || []) {
        try {
          const { data: formData, error: formError } = await supabase
            .from('ob_gyn_consultation_forms')
            .select('status')
            .eq('appointment_id', apt.id)
            .eq('form_type', 'pre_consultation')
            .single();

          if (!formError && formData) {
            formStatuses[apt.id] = formData.status;
          }
        } catch (err) {
          // Form doesn't exist yet
        }
      }

      setAppointmentOBGynFormStatus(formStatuses);
    } catch (err) {
      console.error('Error fetching OB/GYN form statuses:', err);
    }
  };

  if (!loading && user && doctorProfile) {
    fetchOBGynFormStatuses();
  }
}, [user, loading, doctorProfile]);
```

### Updated AppointmentCard call
```typescript
<AppointmentCard
  key={appointment.id}
  appointment={appointment}
  onStartConsultation={onStartConsultation}
  onModify={handleModifyAppointment}
  onCancel={handleCancelAppointment}
  onFillPreConsultationForm={isOBGynAppointment(doctorProfile?.specialty) ? handleFillPreConsultationForm : undefined}  // NEW
  obgynFormStatus={appointmentOBGynFormStatus[appointment.id] || null}  // NEW
/>
```

### Added OB/GYN form modal
```typescript
{/* OB/GYN Pre-Consultation Form Modal */}
{showOBGynFormModal && selectedAppointmentForForm && user?.id && (
  <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
      {/* Background overlay */}
      <div
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={handleCloseOBGynFormModal}
      />

      {/* Modal dialog */}
      <div className="relative inline-block align-bottom bg-white rounded-[20px] text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:w-full sm:max-w-4xl">
        {/* Header */}
        <div className="bg-purple-600 px-6 py-4 flex items-center justify-between">
          <h3 className="text-[18px] font-semibold text-white">
            Fill Pre-Consultation Form
          </h3>
          <button
            onClick={handleCloseOBGynFormModal}
            className="text-white hover:text-purple-100 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Content */}
        <div className="px-6 py-8">
          <OBGynPreConsultationForm
            patientId={selectedAppointmentForForm.patient_id}
            appointmentId={selectedAppointmentForForm.id}
            filledBy="doctor"
            doctorUserId={user.id}
            onComplete={handleOBGynFormComplete}
          />
        </div>
      </div>
    </div>
  </div>
)}
```

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Files Modified | 4 |
| New Type Definitions | 0 (extended 3 existing) |
| New Functions | 3 (handlers) |
| New State Variables | 3 |
| New useEffect Hooks | 1 |
| New UI Components (Modal) | 1 |
| Lines Added (approx) | ~120 |
| Breaking Changes | 0 |

## Key Points

1. All changes are backward compatible
2. No existing functionality is modified
3. New functionality is opt-in (only for OB/GYN doctors)
4. Reuses existing components and hooks
5. Type-safe throughout
6. Follows established patterns
