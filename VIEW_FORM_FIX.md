# Fix: View Consultation Form Now Shows Correct Form Type

**Date**: December 31, 2024
**Issue**: "View Consultation Form" button showed default OB/GYN form instead of AI-detected type (antenatal)

---

## Problem Summary

When clicking "View Consultation Form" after running "Re-summarise" on a pregnancy consultation:
- ❌ Showed OBGynDuringConsultationForm (default)
- ✅ Should show AntenatalDuringConsultationForm (AI-detected)

---

## Root Cause

**Frontend state was missing the `detected_consultation_type` field.**

### Data Flow (BEFORE FIX):

```
1. User clicks "Re-summarise"
   ↓
2. Backend detects type: "antenatal"
   ↓
3. Backend saves to DB: detected_consultation_type = 'antenatal' ✓
   ↓
4. Frontend updates local state with summary data ✓
   ❌ BUT: detected_consultation_type NOT included in state update
   ↓
5. User clicks "View Consultation Form"
   ↓
6. consultation.detected_consultation_type = null/undefined
   ↓
7. Form defaults to 'obgyn' ❌
```

### Code Evidence (AppointmentsTab.tsx:247-258 - BEFORE):

```typescript
// ❌ OLD CODE: Manual state update missing detected_consultation_type
setConsultationsMap((prev) => ({
  ...prev,
  [appointment.id]: {
    ...consultation,
    consultation_text: data.consultation_data.consultation_text,
    summary_data: data.consultation_data.summary_data,
    diagnoses: data.consultation_data.diagnoses,
    guidelines_found: data.consultation_data.guidelines_found,
    patient_snapshot: data.consultation_data.patient_snapshot,
    // ❌ MISSING: detected_consultation_type
  }
}));
```

---

## Solution Implemented

**Refetch fresh consultation data from database after auto-fill completes.**

### Data Flow (AFTER FIX):

```
1. User clicks "Re-summarise"
   ↓
2. Backend detects type: "antenatal"
   ↓
3. Backend saves to DB: detected_consultation_type = 'antenatal' ✓
   ↓
4. Frontend refetches COMPLETE consultation from DB ✅ NEW!
   ↓
5. State updated with ALL fields including detected_consultation_type ✅
   ↓
6. User clicks "View Consultation Form"
   ↓
7. consultation.detected_consultation_type = 'antenatal' ✓
   ↓
8. Shows AntenatalDuringConsultationForm ✅
```

### Code Changes (AppointmentsTab.tsx:247-276 - AFTER):

```typescript
// ✅ NEW CODE: Refetch fresh data from database
console.log('🔄 Refetching fresh consultation data...');
const { data: freshConsultation, error: refetchError } = await supabase
  .from('consultations')
  .select('*')
  .eq('id', consultation.id)
  .single();

if (refetchError) {
  console.error('⚠️  Error refetching consultation:', refetchError);
  // Fall back to manual state update
  setConsultationsMap((prev) => ({
    ...prev,
    [appointment.id]: {
      ...consultation,
      consultation_text: data.consultation_data.consultation_text,
      summary_data: data.consultation_data.summary_data,
      diagnoses: data.consultation_data.diagnoses,
      guidelines_found: data.consultation_data.guidelines_found,
      patient_snapshot: data.consultation_data.patient_snapshot,
    }
  }));
} else if (freshConsultation) {
  // Update state with FRESH data including detected_consultation_type ✅
  console.log('✅ Fresh consultation data retrieved with detected type:', freshConsultation.detected_consultation_type);
  setConsultationsMap((prev) => ({
    ...prev,
    [appointment.id]: freshConsultation  // ✅ Complete fresh data
  }));
}
```

---

## Benefits

1. ✅ **Correct Form Display**: Antenatal consultations now show AntenatalDuringConsultationForm
2. ✅ **Data Consistency**: All fields are fresh and synchronized with database
3. ✅ **Future-Proof**: Any new fields added to consultations table automatically included
4. ✅ **Error Handling**: Graceful fallback if refetch fails
5. ✅ **Simple Solution**: One SELECT query, clean implementation

---

## Testing Steps

1. **Create a pregnancy consultation** (mention "6 weeks pregnant", "LMP", etc.)
2. **Click "Re-summarise"** button
3. **Wait for completion** (check console logs)
4. **Click "View Consultation Form"**
5. **Expected Result**:
   - ✅ Should show **AntenatalDuringConsultationForm** (not OBGynDuringConsultationForm)
   - ✅ Console log should show: `Fresh consultation data retrieved with detected type: antenatal`
   - ✅ Form should display antenatal-specific fields (LMP, gravida, para, etc.)

---

## Console Log Output (Expected)

```
🔄 Re-summarizing consultation...
📋 Extracting form fields from consultation...
🔍 Step 1: Classifying consultation type...
📊 Detected consultation type: antenatal (confidence: 0.95)
🔍 Step 2: Extracting fields for antenatal form...
✅ Form auto-fill successful
🔄 Refetching fresh consultation data...
✅ Fresh consultation data retrieved with detected type: antenatal
✅ Consultation re-summarized and form filled successfully
```

---

## Files Modified

| File | Lines | Change |
|------|-------|--------|
| `aneya-frontend/src/components/AppointmentsTab.tsx` | 247-276 | Added refetch logic after auto-fill |

---

## Related Implementation

This fix complements the earlier consultation type detection fix:
- **Backend**: Uses LLM to classify consultation type FIRST, then extracts fields (api.py:4503-4655)
- **Frontend**: Now receives the classified type via fresh data refetch (AppointmentsTab.tsx:247-276)

Both changes work together to ensure:
1. Backend correctly detects "antenatal" for pregnancy consultations
2. Frontend has access to this detected type when displaying forms
