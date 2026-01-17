# External Data Sources for Table Fields - Implementation Guide

## Overview

The dynamic form system now supports table fields (matrixdynamic) that can automatically populate data from external sources like Supabase tables. This enables forms to display historical data across multiple appointments without any hardcoded logic.

## Problem Solved

**Before:** Forms could only display data that was manually entered or auto-filled from the current consultation. Tables like "Antenatal Visit Records" would be empty even if the patient had previous visits recorded in the database.

**After:** Table fields can now declare a `data_source` in their schema metadata, and the form will automatically fetch and populate historical data when the form loads.

## How It Works

### 1. **Metadata Structure**

Add a `data_source` object to any table field in your form schema:

```json
{
  "antenatal_visit_records": {
    "input_type": "table",
    "label": "Antenatal Visit Records",
    "row_fields": [
      {
        "name": "visit_date",
        "label": "Visit Date",
        "type": "date"
      },
      {
        "name": "gestational_age_weeks",
        "label": "GA (weeks)",
        "type": "number"
      },
      {
        "name": "weight_kg",
        "label": "Weight (kg)",
        "type": "number"
      }
    ],
    "data_source": {
      "table": "antenatal_visits",
      "filters": {
        "patient_id": "{{patient_id}}"
      },
      "order_by": {
        "field": "visit_date",
        "ascending": true
      },
      "field_mapping": {
        "visit_date": "visit_date",
        "gestational_age_weeks": "gestational_age_weeks",
        "weight_kg": "weight_kg"
      }
    }
  }
}
```

### 2. **Metadata Fields**

| Field | Required | Description |
|-------|----------|-------------|
| `table` | Yes | The Supabase table to query |
| `filters` | No | Key-value pairs to filter records. Supports template variables `{{patient_id}}` and `{{appointment_id}}` |
| `order_by` | No | Sorting configuration with `field` (column name) and `ascending` (boolean) |
| `field_mapping` | No | Maps source table columns to form field names. If omitted, uses source columns as-is |

### 3. **Template Variables**

Use these placeholders in `filters` values - they'll be replaced automatically:

- `{{patient_id}}` - Current patient's ID
- `{{appointment_id}}` - Current appointment's ID

Example:
```json
"filters": {
  "patient_id": "{{patient_id}}",
  "appointment_id": "{{appointment_id}}"
}
```

### 4. **Field Mapping**

Maps database columns to table field names:

```json
"field_mapping": {
  "form_field_name": "database_column_name"
}
```

**When to use:**
- Database column names differ from form field names
- You only want a subset of columns from the source table
- You need to rename fields for clarity

**When to omit:**
- Database columns match form fields exactly
- The system will use all columns from fetched records as-is

## Complete Example: Antenatal Visit Records

### Database Schema Update

Update your form schema in the `form_schemas` table:

```sql
UPDATE form_schemas
SET schema_definition = jsonb_set(
  schema_definition,
  '{antenatal_visit_records}',
  '{
    "input_type": "table",
    "label": "Antenatal Visit Records",
    "description": "Record of all antenatal care visits",
    "row_fields": [
      {
        "name": "visit_date",
        "label": "Visit Date",
        "type": "date",
        "required": true
      },
      {
        "name": "visit_number",
        "label": "Visit #",
        "type": "number"
      },
      {
        "name": "gestational_age_weeks",
        "label": "GA (weeks)",
        "type": "number"
      },
      {
        "name": "weight_kg",
        "label": "Weight (kg)",
        "type": "number"
      },
      {
        "name": "blood_pressure_systolic",
        "label": "BP Systolic",
        "type": "number"
      },
      {
        "name": "blood_pressure_diastolic",
        "label": "BP Diastolic",
        "type": "number"
      },
      {
        "name": "fundal_height_cm",
        "label": "Fundal Height (cm)",
        "type": "number"
      },
      {
        "name": "presentation",
        "label": "Presentation",
        "type": "dropdown",
        "options": ["cephalic", "breech", "transverse"]
      },
      {
        "name": "fetal_heart_rate",
        "label": "FHR (bpm)",
        "type": "number"
      },
      {
        "name": "urine_albumin",
        "label": "Urine Albumin",
        "type": "string"
      },
      {
        "name": "urine_sugar",
        "label": "Urine Sugar",
        "type": "string"
      },
      {
        "name": "edema",
        "label": "Edema",
        "type": "boolean"
      },
      {
        "name": "edema_location",
        "label": "Edema Location",
        "type": "string"
      },
      {
        "name": "complaints",
        "label": "Complaints",
        "type": "textarea"
      },
      {
        "name": "clinical_notes",
        "label": "Clinical Notes",
        "type": "textarea"
      },
      {
        "name": "treatment_given",
        "label": "Treatment Given",
        "type": "textarea"
      },
      {
        "name": "next_visit_plan",
        "label": "Next Visit Plan",
        "type": "textarea"
      },
      {
        "name": "remarks",
        "label": "Remarks",
        "type": "textarea"
      }
    ],
    "data_source": {
      "table": "antenatal_visits",
      "filters": {
        "patient_id": "{{patient_id}}"
      },
      "order_by": {
        "field": "visit_date",
        "ascending": true
      }
    }
  }'::jsonb
)
WHERE form_type = 'antenatal' AND is_active = true;
```

**Note:** We omit `field_mapping` since the `antenatal_visits` table columns match the form field names exactly.

## How the Frontend Processes This

### Step 1: Schema Loading
When `DynamicConsultationForm` loads, it fetches the schema from `/api/form-schema/{form_type}`.

### Step 2: Element Conversion
The schema converter (`convertFieldToElement`) creates a SurveyJS `matrixdynamic` element and passes through the `data_source` metadata:

```typescript
element.type = 'matrixdynamic';
element.columns = [...];

// Pass through data_source metadata
if (fieldDef.data_source) {
  element.data_source = fieldDef.data_source;
}
```

### Step 3: External Data Population
A dedicated `useEffect` hook runs after the form loads:

1. Scans all survey questions for `matrixdynamic` types with `data_source` property
2. For each one, builds a Supabase query using the metadata:
   ```typescript
   let query = supabase.from(tableName).select('*');

   // Apply filters with template variable replacement
   query = query.eq('patient_id', actualPatientId);

   // Apply ordering
   query = query.order(orderBy.field, { ascending: true });
   ```
3. Fetches the data
4. Transforms using `field_mapping` if provided
5. Sets the data: `survey.setValue(fieldName, transformedRecords)`

### Step 4: Rendering
The table automatically displays the fetched records with "Add Visit" and "Remove" buttons for editing.

## Examples for Other Form Types

### Example 1: Medication History

```json
{
  "medication_history": {
    "input_type": "table",
    "label": "Previous Medications",
    "row_fields": [
      {
        "name": "medication_name",
        "label": "Medication",
        "type": "string"
      },
      {
        "name": "dosage",
        "label": "Dosage",
        "type": "string"
      },
      {
        "name": "start_date",
        "label": "Started",
        "type": "date"
      },
      {
        "name": "end_date",
        "label": "Ended",
        "type": "date"
      }
    ],
    "data_source": {
      "table": "prescriptions",
      "filters": {
        "patient_id": "{{patient_id}}"
      },
      "order_by": {
        "field": "start_date",
        "ascending": false
      },
      "field_mapping": {
        "medication_name": "medication",
        "dosage": "dosage",
        "start_date": "prescribed_date",
        "end_date": "discontinued_date"
      }
    }
  }
}
```

### Example 2: Lab Results

```json
{
  "lab_results": {
    "input_type": "table",
    "label": "Previous Lab Results",
    "row_fields": [
      {
        "name": "test_date",
        "label": "Date",
        "type": "date"
      },
      {
        "name": "test_name",
        "label": "Test",
        "type": "string"
      },
      {
        "name": "result",
        "label": "Result",
        "type": "string"
      },
      {
        "name": "reference_range",
        "label": "Normal Range",
        "type": "string"
      }
    ],
    "data_source": {
      "table": "lab_results",
      "filters": {
        "patient_id": "{{patient_id}}"
      },
      "order_by": {
        "field": "test_date",
        "ascending": false
      }
    }
  }
}
```

### Example 3: Appointment-Specific Data

Show only data from the current appointment:

```json
{
  "vital_signs_log": {
    "input_type": "table",
    "label": "Vital Signs During Consultation",
    "row_fields": [
      {
        "name": "time",
        "label": "Time",
        "type": "time"
      },
      {
        "name": "bp_systolic",
        "label": "BP Systolic",
        "type": "number"
      },
      {
        "name": "bp_diastolic",
        "label": "BP Diastolic",
        "type": "number"
      }
    ],
    "data_source": {
      "table": "vital_signs",
      "filters": {
        "appointment_id": "{{appointment_id}}"
      },
      "order_by": {
        "field": "recorded_at",
        "ascending": true
      }
    }
  }
}
```

## Console Logs to Monitor

When viewing a form with external data sources, watch for these logs:

### Success Case
```
📊 Found 2 table(s) with external data sources
📊 Fetching data from table: antenatal_visits for field: antenatal_visit_records
✅ Found 5 records from antenatal_visits
✅ Populated antenatal_visit_records with 5 records
```

### No Data Case
```
📊 Found 1 table(s) with external data sources
📊 Fetching data from table: antenatal_visits for field: antenatal_visit_records
ℹ️ No records found in antenatal_visits for this patient_id
```

### No External Data Sources
```
ℹ️ No table fields with external data sources found
```

### Error Case
```
❌ Error fetching from antenatal_visits: [error details]
```

## Benefits

### 1. **Zero Hardcoded Logic**
- No form-type-specific code in components
- Add new forms with external data by updating database only
- Works for ANY form type: antenatal, pediatrics, cardiology, etc.

### 2. **Flexible Data Sources**
- Pull from any Supabase table
- Filter by patient, appointment, date ranges, etc.
- Map source fields to target fields flexibly

### 3. **Maintainable**
- Schema updates don't require deployments
- Easy to add new fields or change data sources
- Clear separation between data fetching and rendering

### 4. **Automatic Population**
- No manual data entry for historical records
- Forms always show complete patient history
- Reduces doctor workload during consultations

## Limitations & Future Enhancements

### Current Limitations
- Only supports Supabase tables (not external APIs)
- Simple equality filters only (no `gt`, `lt`, `in` operators yet)
- No computed fields or aggregations

### Planned Enhancements
- [ ] Support for complex filters (`gt`, `lt`, `in`, `between`)
- [ ] Support for external API data sources
- [ ] Computed/aggregated fields (e.g., "Average BP over last 3 visits")
- [ ] Conditional data loading (load only if certain field has value)
- [ ] Data caching to avoid redundant queries
- [ ] Real-time updates via Supabase realtime subscriptions

## Troubleshooting

### Table Not Populating

1. **Check Console Logs**
   - Do you see "No table fields with external data sources found"?
   - This means `data_source` metadata is missing or not being passed through

2. **Verify Schema**
   ```sql
   SELECT schema_definition->'antenatal_visit_records'->'data_source'
   FROM form_schemas
   WHERE form_type = 'antenatal' AND is_active = true;
   ```

3. **Verify Data Exists**
   ```sql
   SELECT * FROM antenatal_visits WHERE patient_id = '<patient-id>';
   ```

4. **Check Field Names**
   - Ensure `row_fields` names match database columns (or use `field_mapping`)
   - Case-sensitive!

### Template Variables Not Working

Ensure you're using correct syntax:
- ✅ `"{{patient_id}}"` (double quotes, double curly braces)
- ❌ `{patient_id}` (missing quotes and braces)
- ❌ `"${patient_id}"` (wrong syntax)

### Wrong Data Showing

Check your `filters`:
```json
"filters": {
  "patient_id": "{{patient_id}}"  // Filters to current patient
}
```

Not:
```json
"filters": {
  "appointment_id": "{{appointment_id}}"  // Only shows current appointment's data
}
```

## Related Files

### Frontend
- `/src/components/doctor-portal/DynamicConsultationForm.tsx:396-494` - External data loading logic
- `/src/components/doctor-portal/DynamicConsultationForm.tsx:283-286` - Metadata passthrough

### Database
- `form_schemas` table - Where `data_source` metadata is stored in `schema_definition` JSONB
- Target tables (e.g., `antenatal_visits`, `lab_results`) - Where historical data lives

## Migration Guide

### For Existing Forms

1. **Identify table fields** that should show historical data
2. **Add `data_source` metadata** to those fields in the database schema
3. **Test** by viewing the form - data should populate automatically
4. **No code changes needed!**

Example migration SQL:
```sql
-- Add data_source to existing antenatal_visit_records field
UPDATE form_schemas
SET schema_definition = jsonb_set(
  schema_definition,
  '{antenatal_visit_records,data_source}',
  '{
    "table": "antenatal_visits",
    "filters": {
      "patient_id": "{{patient_id}}"
    },
    "order_by": {
      "field": "visit_date",
      "ascending": true
    }
  }'::jsonb,
  true
)
WHERE form_type = 'antenatal' AND is_active = true;
```

## Conclusion

This metadata-driven approach enables any form type to pull historical data from any table without writing form-specific code. Simply declare the `data_source` in your schema, and the system handles the rest automatically.
