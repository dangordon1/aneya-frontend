# Advanced Form Field Types - Guide

The dynamic form system supports many advanced field types beyond simple text inputs and numbers.

## Supported Field Types

### 1. Dropdown Menu (Single Select)

**Use case**: When you want the user to select ONE option from a predefined list.

**Database schema example**:
```json
{
  "delivery_method": {
    "type": "string",
    "input_type": "dropdown",
    "description": "Preferred delivery method",
    "placeholder": "Select delivery method...",
    "options": [
      "Normal vaginal delivery",
      "Cesarean section",
      "Assisted delivery (forceps/vacuum)",
      "Water birth",
      "Home birth"
    ],
    "extraction_hints": ["delivery", "birth method", "how baby born"]
  }
}
```

**What it looks like**: A dropdown menu with options. User clicks to expand and selects one.

---

### 2. Radio Buttons (Single Choice)

**Use case**: When you want to show all options visually and let user select ONE.

**Database schema example**:
```json
{
  "contraception_type": {
    "type": "string",
    "input_type": "radio",
    "description": "Current contraception method",
    "options": [
      "Oral contraceptive pill",
      "IUD (copper)",
      "IUD (hormonal)",
      "Condoms",
      "Injectable",
      "Implant",
      "None"
    ],
    "extraction_hints": ["contraception", "birth control", "family planning"]
  }
}
```

**What it looks like**: Radio buttons displayed vertically. User clicks one circle.

---

### 3. Checkboxes (Multiple Choice)

**Use case**: When you want the user to select MULTIPLE options from a list.

**Database schema example**:
```json
{
  "pregnancy_symptoms": {
    "type": "string",
    "input_type": "checkbox",
    "description": "Select all symptoms experienced",
    "options": [
      "Nausea/vomiting",
      "Fatigue",
      "Breast tenderness",
      "Frequent urination",
      "Food cravings/aversions",
      "Mood swings",
      "Back pain",
      "Headaches"
    ],
    "extraction_hints": ["symptoms", "experiencing", "feeling"]
  }
}
```

**What it looks like**: Multiple checkboxes. User can tick multiple boxes.

---

### 4. Multi-Select Dropdown

**Use case**: Like dropdown but allows selecting multiple options. Good for long lists where checkboxes would be overwhelming.

**Database schema example**:
```json
{
  "risk_factors": {
    "type": "string",
    "input_type": "multi-select",
    "description": "Select all applicable risk factors",
    "placeholder": "Select risk factors...",
    "options": [
      "Diabetes",
      "Hypertension",
      "Previous cesarean",
      "Advanced maternal age (>35)",
      "Multiple pregnancy",
      "Obesity (BMI >30)",
      "Previous preterm birth",
      "Smoking",
      "Autoimmune condition"
    ],
    "extraction_hints": ["risk", "complications", "medical history"]
  }
}
```

**What it looks like**: Dropdown that shows selected items as tags. User can select multiple.

---

### 5. Rating Scale

**Use case**: For pain scales, satisfaction ratings, severity assessments.

**Database schema example**:
```json
{
  "pain_level": {
    "type": "number",
    "input_type": "rating",
    "description": "Rate your pain level",
    "min_rating": 0,
    "max_rating": 10,
    "extraction_hints": ["pain", "hurts", "discomfort", "scale"]
  }
}
```

**What it looks like**: Star rating or number scale (0-10). User clicks on a number/star.

---

### 6. Simple Yes/No Toggle

**Use case**: For true/false, yes/no questions.

**Database schema example**:
```json
{
  "prenatal_vitamins": {
    "type": "boolean",
    "description": "Taking prenatal vitamins?",
    "extraction_hints": ["prenatal vitamins", "supplements", "folic acid"]
  }
}
```

**What it looks like**: Toggle switch or checkbox for yes/no.

---

## Complete Example: Enhanced Antenatal Form

Here's how to update the antenatal form schema in the database to use these advanced fields:

```sql
UPDATE form_schemas
SET schema_definition = '{
  "lmp": {
    "type": "string",
    "format": "date",
    "description": "Last Menstrual Period date",
    "extraction_hints": ["LMP", "last period"]
  },
  "gravida": {
    "type": "number",
    "range": [0, 20],
    "description": "Total number of pregnancies (including current)",
    "extraction_hints": ["gravida", "G", "pregnant before"]
  },
  "para": {
    "type": "number",
    "range": [0, 20],
    "description": "Number of deliveries beyond 20 weeks",
    "extraction_hints": ["para", "P", "deliveries"]
  },
  "planned_delivery": {
    "type": "string",
    "input_type": "dropdown",
    "description": "Planned delivery method",
    "placeholder": "Select delivery method...",
    "options": [
      "Normal vaginal delivery",
      "Elective cesarean section",
      "Trial of labor after cesarean (TOLAC)",
      "To be decided"
    ],
    "extraction_hints": ["delivery plan", "birth plan"]
  },
  "current_symptoms": {
    "type": "string",
    "input_type": "checkbox",
    "description": "Current pregnancy symptoms (select all that apply)",
    "options": [
      "Nausea/vomiting",
      "Fatigue",
      "Breast tenderness",
      "Frequent urination",
      "Heartburn",
      "Back pain",
      "Leg cramps",
      "Mood changes"
    ],
    "extraction_hints": ["symptoms", "experiencing", "feeling"]
  },
  "prenatal_vitamins": {
    "type": "boolean",
    "description": "Currently taking prenatal vitamins?",
    "extraction_hints": ["prenatal vitamins", "supplements", "folic acid"]
  },
  "risk_factors": {
    "type": "string",
    "input_type": "multi-select",
    "description": "Risk factors (select all applicable)",
    "placeholder": "Select risk factors...",
    "options": [
      "None",
      "Gestational diabetes",
      "Hypertension",
      "Previous cesarean",
      "Advanced maternal age (>35)",
      "Multiple pregnancy",
      "Obesity (BMI >30)",
      "Previous preterm birth"
    ],
    "extraction_hints": ["risk", "complications", "medical history"]
  },
  "pain_level": {
    "type": "number",
    "input_type": "rating",
    "description": "Current pain/discomfort level (0-10)",
    "min_rating": 0,
    "max_rating": 10,
    "extraction_hints": ["pain", "discomfort", "hurts"]
  },
  "fetal_movement": {
    "type": "string",
    "input_type": "radio",
    "description": "Fetal movement pattern",
    "options": [
      "Normal - active movements",
      "Reduced movements",
      "No movements felt",
      "Too early to feel (< 20 weeks)"
    ],
    "extraction_hints": ["baby moving", "kicks", "fetal movement"]
  },
  "blood_pressure_systolic": {
    "type": "number",
    "range": [60, 250],
    "description": "Systolic blood pressure",
    "extraction_hints": ["systolic", "BP", "blood pressure"]
  },
  "blood_pressure_diastolic": {
    "type": "number",
    "range": [40, 150],
    "description": "Diastolic blood pressure",
    "extraction_hints": ["diastolic", "BP"]
  },
  "gestational_age_weeks": {
    "type": "number",
    "range": [0, 45],
    "description": "Gestational age in weeks",
    "extraction_hints": ["weeks pregnant", "GA", "gestation"]
  },
  "fetal_heart_rate": {
    "type": "number",
    "range": [100, 200],
    "description": "Fetal heart rate (bpm)",
    "extraction_hints": ["fetal heart rate", "FHR", "baby heartbeat", "bpm"]
  },
  "plan_mother": {
    "type": "string",
    "max_length": 2000,
    "description": "Management plan for mother",
    "extraction_hints": ["plan for mother", "advise"]
  },
  "plan_fetus": {
    "type": "string",
    "max_length": 2000,
    "description": "Management plan for fetus",
    "extraction_hints": ["plan for baby", "fetal plan"]
  },
  "followup_plan": {
    "type": "string",
    "max_length": 2000,
    "description": "Follow-up instructions",
    "extraction_hints": ["follow up", "next visit", "come back"]
  }
}'::jsonb
WHERE form_type = 'antenatal' AND is_active = true;
```

## How to Add These to Your Forms

### Step 1: Update Database Schema

Run SQL to update the `form_schemas` table (example above).

### Step 2: Test the Form

1. Navigate to a consultation
2. Click "View Consultation Form"
3. The form will automatically render with the new field types:
   - Dropdowns for single selection
   - Radio buttons for visible single choice
   - Checkboxes for multiple selection
   - Multi-select for multiple items from long lists
   - Rating scales for pain/satisfaction
   - Toggle switches for yes/no

### Step 3: No Code Changes Needed!

The `DynamicConsultationForm` component automatically detects the `input_type` field and renders the appropriate widget.

## Field Type Decision Guide

| Scenario | Use This Field Type | Reason |
|----------|-------------------|---------|
| Pick ONE from 2-5 options | **Radio buttons** | All options visible at once |
| Pick ONE from 6+ options | **Dropdown** | Saves space, cleaner UI |
| Pick MULTIPLE from any list | **Checkbox** or **Multi-select** | Checkbox if short list, multi-select if long |
| Yes/No question | **Boolean** | Simple toggle |
| Rate something 1-5 or 0-10 | **Rating** | Visual scale |
| Long text answer | **Text** with max_length > 200 | Becomes textarea |
| Short text answer | **Text** | Standard input |
| Number with range | **Number** with range | Validates min/max |
| Date | **String** with format: "date" | Date picker |

## Advanced Features Coming Soon

These are possible with SurveyJS and can be added:

- **Matrix questions** (grid of checkboxes/radios)
- **Image picker** (select from images)
- **File upload** (attach documents)
- **Conditional logic** (show field X only if Y is selected)
- **Dynamic dropdowns** (options change based on other fields)
- **Calculated fields** (BMI auto-calculated from height/weight)

Let me know if you need any of these implemented!

## Notes

- The `extraction_hints` still work with all field types for AI auto-fill
- Validation (required fields, ranges) works automatically
- All field types save to the same JSONB `form_data` column
- Frontend requires no changes - it's all driven by the database schema
