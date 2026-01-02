# Dynamic Consultation Forms - Implementation Guide

## Overview

We've implemented a fully dynamic form system using **react-jsonschema-form** that generates consultation forms from database schemas. This eliminates hardcoded form types and allows adding new forms without code changes.

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Database (Supabase)                                       │
│                                                             │
│  ┌─────────────────────────────────┐                      │
│  │ form_schemas                    │                      │
│  │ - form_type (text)              │                      │
│  │ - description (text) ────────┐  │                      │
│  │ - schema_definition (JSONB)  │  │                      │
│  │ - version                     │  │                      │
│  └───────────────────────────────┘  │                      │
│                                     │                      │
│  ┌─────────────────────────────────┘                      │
│  │ consultation_forms               │                      │
│  │ - form_type (text)              │                      │
│  │ - form_data (JSONB)             │                      │
│  │ - patient_id, appointment_id    │                      │
│  └─────────────────────────────────┘                      │
└────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────────┐
│  Backend API (FastAPI)                                     │
│                                                             │
│  GET /api/form-schema/{form_type}                         │
│  ├─ Returns: schema, title, description, version          │
│  └─ NO hardcoded validation - any DB form type is valid   │
│                                                             │
│  GET /api/consultation-form?appointment_id=X&form_type=Y  │
│  POST /api/consultation-form                              │
│  PUT /api/consultation-form/{id}                          │
└────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────────┐
│  Frontend (React)                                          │
│                                                             │
│  DynamicConsultationForm                                  │
│  ├─ formType: string (not hardcoded enum!)                │
│  ├─ Fetches schema from API                               │
│  ├─ Generates UI using react-jsonschema-form              │
│  ├─ Auto-fill from WebSocket events                       │
│  └─ Auto-save to JSONB form_data column                   │
└────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. **No Hardcoded Form Types**

**Before:**
```typescript
interface Props {
  formType: 'antenatal' | 'obgyn' | 'infertility'; // ❌ Hardcoded!
}

const formTitles = {
  antenatal: 'Antenatal Consultation',
  obgyn: 'OB/GYN Consultation',
  infertility: 'Infertility Consultation',
}; // ❌ Hardcoded!
```

**After:**
```typescript
interface Props {
  formType: string; // ✅ Any form type from database!
}

// Title comes from database
const { title } = await fetch(`/api/form-schema/${formType}`);
```

### 2. **Dynamic Form Rendering**

The component converts backend schemas to JSON Schema format and renders using `react-jsonschema-form`:

```typescript
// Backend schema format
{
  "gestational_age_weeks": {
    "type": "number",
    "range": [0, 45],
    "description": "Gestational age in weeks",
    "extraction_hints": ["weeks pregnant", "GA"]
  }
}

// Converted to JSON Schema
{
  "type": "object",
  "properties": {
    "gestational_age_weeks": {
      "type": "number",
      "title": "Gestational age in weeks",
      "minimum": 0,
      "maximum": 45
    }
  }
}
```

### 3. **Auto-Fill Integration**

The component subscribes to WebSocket events and applies auto-filled data:

```typescript
useEffect(() => {
  const subscription = consultationEventBus.subscribe(
    'diarization_chunk_complete',
    (event) => {
      if (event.form_type === formType && event.patient_id === patientId) {
        setFormData(prev => ({
          ...prev,
          ...event.field_updates
        }));

        // Track which fields were auto-filled
        setAutoFilledFields(prev => {
          const updated = new Set(prev);
          Object.keys(event.field_updates).forEach(key => updated.add(key));
          return updated;
        });
      }
    }
  );

  return () => subscription.unsubscribe();
}, [formType, patientId]);
```

### 4. **Auto-Save with Debouncing**

Form data auto-saves to the database every 2 seconds:

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    if (Object.keys(formData).length > 0) {
      handleAutoSave();
    }
  }, 2000);

  return () => clearTimeout(timer);
}, [formData]);
```

## Usage

### Basic Usage

```tsx
import { DynamicConsultationForm } from './components/doctor-portal/DynamicConsultationForm';

function ConsultationPage() {
  return (
    <DynamicConsultationForm
      formType="antenatal"  // Can be ANY type from database!
      patientId="patient-uuid"
      appointmentId="appointment-uuid"
      doctorUserId="firebase-uid"
      onComplete={() => console.log('Form submitted!')}
    />
  );
}
```

### Adding a New Form Type

**No code changes needed!** Just add to the database:

```sql
-- 1. Add schema to form_schemas table
INSERT INTO form_schemas (
  form_type,
  specialty,
  description,
  schema_definition,
  version,
  is_active
) VALUES (
  'pediatrics',
  'pediatrics',
  'Pediatric consultation form for child health assessment',
  '{
    "age_months": {
      "type": "number",
      "range": [0, 216],
      "description": "Child age in months",
      "extraction_hints": ["months old", "age"]
    },
    "weight_kg": {
      "type": "number",
      "range": [0, 150],
      "description": "Child weight in kg",
      "extraction_hints": ["weight", "kg"]
    },
    "vaccination_status": {
      "type": "string",
      "max_length": 500,
      "description": "Current vaccination status",
      "extraction_hints": ["vaccines", "immunization"]
    }
  }'::jsonb,
  '1.0',
  true
);

-- 2. Use it immediately in the frontend!
<DynamicConsultationForm formType="pediatrics" ... />
```

## Component API

### Props

```typescript
interface DynamicConsultationFormProps {
  formType: string;           // Any form type from database (e.g., 'antenatal')
  patientId: string;          // Patient UUID
  appointmentId: string;      // Appointment UUID
  doctorUserId?: string;      // Doctor's Firebase UID
  filledBy?: 'patient' | 'doctor'; // Who is filling the form
  onComplete?: () => void;    // Called when form is submitted
  onBack?: () => void;        // Called when back button clicked
  displayMode?: 'wizard' | 'flat'; // Display mode (currently only 'flat' implemented)
}
```

### State Management

The component manages:
- `schema`: JSON Schema fetched from database
- `uiSchema`: UI customization (textarea for long fields, etc.)
- `formData`: Current form data (JSONB)
- `formId`: UUID of created form (null until first save)
- `formTitle`: Dynamic title from database
- `autoFilledFields`: Set of field names that were auto-filled

## Backend API

### Get Schema with Metadata

```http
GET /api/form-schema/{form_type}

Response:
{
  "schema": { ... },              // Field definitions
  "title": "Antenatal Consultation",
  "description": "Antenatal care consultation form...",
  "version": "1.0",
  "form_type": "antenatal",
  "specialty": "obstetrics_gynecology",
  "fetched_at": 1767385312.34
}
```

### Get Existing Form

```http
GET /api/consultation-form?appointment_id=X&form_type=antenatal

Response:
{
  "form": {
    "id": "uuid",
    "form_type": "antenatal",
    "form_data": {
      "gestational_age_weeks": 9,
      "weight_kg": 65,
      ...
    },
    "status": "partial",
    "created_at": "...",
    ...
  }
}
```

### Create Form

```http
POST /api/consultation-form

Body:
{
  "patient_id": "uuid",
  "appointment_id": "uuid",
  "form_type": "antenatal",
  "form_data": { ... },
  "status": "draft",
  "created_by": "firebase_uid",
  "updated_by": "firebase_uid",
  "filled_by": "firebase_uid"
}
```

### Update Form

```http
PUT /api/consultation-form/{form_id}

Body:
{
  "form_data": { ... },
  "status": "completed"
}
```

## Schema Format

Backend schemas use this format:

```json
{
  "field_name": {
    "type": "string|number|boolean",
    "description": "Human-readable description",
    "extraction_hints": ["keyword1", "keyword2"],
    "max_length": 500,         // For strings
    "range": [min, max],       // For numbers
    "format": "date"           // For date strings
  }
}
```

Nested objects:

```json
{
  "vital_signs": {
    "type": "object",
    "description": "Vital sign measurements",
    "fields": {
      "systolic_bp": {
        "type": "number",
        "range": [0, 250],
        ...
      }
    }
  }
}
```

## Benefits

### For Developers
- ✅ **No code changes** to add new form types
- ✅ **Single component** handles all consultation types
- ✅ **Type-safe** with TypeScript
- ✅ **Automatic validation** from JSON Schema
- ✅ **Auto-save** prevents data loss

### For Users
- ✅ **Consistent UI** across all form types
- ✅ **Real-time auto-fill** from consultation audio
- ✅ **Visual indicators** for auto-filled fields
- ✅ **Validation feedback** on form errors

### For Administrators
- ✅ **Database-driven** schemas (no deployments)
- ✅ **Version tracking** built-in
- ✅ **Schema updates** without downtime
- ✅ **Audit trail** of changes

## Migration Path

### Step 1: Replace Old Components

**Old way (3 separate components):**
```tsx
import { AntenatalDuringConsultationForm } from './AntenatalDuringConsultationForm';
import { OBGynDuringConsultationForm } from './OBGynDuringConsultationForm';
import { InfertilityDuringConsultationForm } from './InfertilityDuringConsultationForm';

{formType === 'antenatal' && <AntenatalDuringConsultationForm ... />}
{formType === 'obgyn' && <OBGynDuringConsultationForm ... />}
{formType === 'infertility' && <InfertilityDuringConsultationForm ... />}
```

**New way (1 dynamic component):**
```tsx
import { DynamicConsultationForm } from './DynamicConsultationForm';

<DynamicConsultationForm formType={formType} ... />
```

### Step 2: Test with Existing Forms

The dynamic component works with existing schemas already in the database:
- `antenatal` - 14 fields
- `obgyn` - 32 fields
- `infertility` - 8 fields

### Step 3: Add New Forms

Add new specialties by inserting into `form_schemas` table (see "Adding a New Form Type" above).

## Limitations & Future Work

### Current Limitations
- No wizard mode implemented yet (only flat mode)
- UI schema generation is basic (could be enhanced with custom widgets)
- No conditional field logic (e.g., show field X only if Y is true)
- No field dependencies (e.g., field X required only if Y has value)

### Future Enhancements
- [ ] Custom UI widgets for specific field types (date pickers, dropdowns)
- [ ] Conditional field rendering based on other field values
- [ ] Field dependencies and validation rules
- [ ] Wizard/stepper mode for multi-page forms
- [ ] Rich text editor for long text fields
- [ ] File upload fields for attachments
- [ ] Signature capture for consent forms
- [ ] PDF export of completed forms
- [ ] Form templates with pre-filled common values

## Testing

### Manual Testing

1. Start backend: `cd aneya-backend && python -m uvicorn api:app --reload`
2. Start frontend: `cd aneya-frontend && npm run dev`
3. Navigate to consultation form
4. Verify:
   - Form loads from database schema
   - Title displays correctly
   - Auto-fill updates form fields
   - Auto-save works (check network tab)
   - Form submission creates/updates in `consultation_forms` table

### API Testing

```bash
# Test schema endpoint
curl http://localhost:8000/api/form-schema/antenatal

# Test form CRUD
curl http://localhost:8000/api/consultation-form?appointment_id=X&form_type=antenatal

# Check backend logs
tail -f /tmp/backend.log
```

## Troubleshooting

### "Schema not found" error
- Check `form_schemas` table has active schema for that form_type
- Verify `is_active = true` in database

### Auto-fill not working
- Check WebSocket connection in browser console
- Verify `form_type` matches between WebSocket event and component
- Check `patient_id` matches

### Form not saving
- Check browser network tab for API errors
- Verify `created_by` and `filled_by` fields are provided
- Check backend logs: `tail -f /tmp/backend.log`

### Fields not rendering
- Verify field type is supported (string, number, boolean)
- Check JSON Schema conversion in browser console
- Ensure `schema_definition` in database is valid JSON

## Related Files

### Frontend
- `/src/components/doctor-portal/DynamicConsultationForm.tsx` - Main component
- `/src/hooks/useFormAutoFill.ts` - Auto-fill hook (still used by old components)
- `/src/lib/consultationEventBus.ts` - WebSocket event bus

### Backend
- `/api.py` - Schema and form endpoints (lines 4539-5162)
- `/mcp_servers/form_schemas.py` - Legacy Python schemas (fallback only)

### Database
- `form_schemas` table - Schema storage
- `consultation_forms` table - Form data storage (JSONB)

## Conclusion

This implementation provides a fully dynamic, database-driven form system that:
- ✅ Eliminates hardcoded form types
- ✅ Allows adding new forms without code changes
- ✅ Uses industry-standard react-jsonschema-form library
- ✅ Integrates seamlessly with existing auto-fill system
- ✅ Stores all data in flexible JSONB format

The system is **production-ready** and can be extended to support any medical specialty or consultation type by simply adding a new schema to the database.
