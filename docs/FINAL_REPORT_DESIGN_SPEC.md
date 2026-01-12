# Final Report Design Specification

## Analysis Report

**Version:** 1.0
**Last Updated:** December 2024
**Component:** `ReportScreen.tsx`, `DiagnosisCard.tsx`, `DrugDetailDropdown.tsx`

---

## 1. Overview

The Final Report is the culmination of the workflow. It displays the analysis results from the backend after processing a clinical consultation through guideline analysis, diagnosis extraction, and drug enrichment.

### 1.1 Purpose

- Present clinicians with evidence-based diagnostic recommendations
- Display treatment options with medication details from BNF/DrugBank
- Provide links to authoritative clinical guidelines
- Enable quick review of patient context
- Include appropriate clinical disclaimers

### 1.2 User Flow Context

```
InputScreen → ProgressScreen → AnalysisComplete → ReportScreen (Final Report)
```

---

## 2. Report Structure

The Final Report is organized into **6 main sections**, displayed in the following order:

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER: "Clinical Analysis Report"                            │
├─────────────────────────────────────────────────────────────────┤
│  [Optional] Appointment Context Banner                          │
├─────────────────────────────────────────────────────────────────┤
│  1. Patient Details (Expandable)                                │
├─────────────────────────────────────────────────────────────────┤
│  2. Errors/Warnings Section (Conditional)                       │
├─────────────────────────────────────────────────────────────────┤
│  3. Clinical Diagnoses                                          │
│     ├── Primary Diagnosis (DiagnosisCard - expanded by default) │
│     └── Alternative Diagnoses (DiagnosisCards - collapsed)      │
├─────────────────────────────────────────────────────────────────┤
│  4. Resources Consulted                                         │
│     ├── NICE Guidelines                                         │
│     ├── CKS Topics                                              │
│     └── BNF Summaries                                           │
├─────────────────────────────────────────────────────────────────┤
│  5. Clinical Disclaimer                                         │
├─────────────────────────────────────────────────────────────────┤
│  6. Start New Analysis Button                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Structures

### 3.1 API Response Structure

The report receives data from the backend `/api/analyze-stream` endpoint:

```typescript
interface AnalysisResult {
  // Core diagnosis data
  diagnoses: Diagnosis[];

  // Resources used during analysis
  guidelines_found: GuidelineReference[];
  cks_topics: CKSTopicReference[];
  bnf_summaries: BNFSummaryReference[];

  // Patient context (echoed from input)
  patient_info: PatientInfo;

  // Metadata
  location: {
    country_code: string;
    country_name: string;
  };
  seasonal_context: {
    notes: string;
  };

  // Error handling
  errors?: string[];
  warnings?: string[];
}
```

### 3.2 Diagnosis Structure

Each diagnosis follows this hierarchical structure:

```typescript
interface Diagnosis {
  // Identification
  diagnosis: string;           // Name of the condition
  confidence: 'high' | 'medium' | 'low';

  // Source attribution
  source: string;              // e.g., "NICE Guidelines"
  url: string;                 // Link to source guideline
  summary: string;             // Brief description

  // Treatment sections
  primary_care?: PrimaryCare;
  surgery?: Surgery;
  diagnostics?: Diagnostics;
  follow_up?: FollowUp;
}
```

### 3.3 Primary Care Section

```typescript
interface PrimaryCare {
  medications: string[];       // List of recommended medications
  supportive_care: string[];   // Non-pharmacological interventions
  clinical_guidance?: string;  // Free-text clinical advice
  when_to_escalate: string[];  // Red flags requiring escalation
}
```

### 3.4 Surgery Section (for surgical conditions)

```typescript
interface Surgery {
  indicated: boolean;
  procedure: string;
  phases: SurgeryPhases;
}

interface SurgeryPhases {
  preoperative: {
    investigations: string[];
    medications: string[];
    preparation: string[];
  };
  operative: {
    technique: string;
    anesthesia: string;
    duration?: string;
  };
  postoperative: {
    immediate_care: string[];
    medications: string[];
    mobilization?: string;
    complications?: string[];
  };
}
```

### 3.5 Diagnostics Section

```typescript
interface Diagnostics {
  required: string[];          // Essential investigations
  monitoring: string[];        // Ongoing monitoring needs
  referral_criteria: string[]; // When to refer
}
```

### 3.6 Follow-up Section

```typescript
interface FollowUp {
  timeframe?: string;          // e.g., "Review in 2 weeks"
  monitoring?: string[];       // What to monitor
  referral_criteria?: string[];// When to escalate
}
```

### 3.7 Drug Details Structure

Medications are enriched with BNF/DrugBank data:

```typescript
interface DrugDetails {
  drug_name: string;
  url?: string;                // Link to BNF or DrugBank
  bnf_data?: {
    dosage: string;
    side_effects: string;
    interactions: string;
  };
  drugbank_data?: {
    dosage: string;
    side_effects: string;
    interactions: string;
  };
}
```

### 3.8 Patient Details Structure

```typescript
interface PatientDetails {
  name: string;
  sex: string;
  age: string;
  height: string;
  weight: string;
  currentMedications: string;
  currentConditions: string;
}
```

### 3.9 Resource References

```typescript
interface GuidelineReference {
  reference: string;           // e.g., "NG123"
  title: string;
  url: string;
}

interface CKSTopicReference {
  title: string;
  url: string;
}

interface BNFSummaryReference {
  title: string;
  url: string;
}
```

---

## 4. Component Hierarchy

```
ReportScreen
├── Header ("Clinical Analysis Report")
├── AppointmentContextBanner (optional)
│   └── Save Consultation Button
├── PatientDetailsSection (expandable)
│   └── PatientDetailsContent
├── WarningsSection (conditional)
│   └── WarningBox
├── ClinicalDiagnosesSection
│   ├── PrimaryDiagnosis
│   │   └── DiagnosisCard (expanded)
│   │       ├── DiagnosisHeader
│   │       ├── Summary
│   │       ├── GuidelineLink
│   │       ├── PrimaryCareSection
│   │       │   ├── Medications
│   │       │   │   └── DrugDetailDropdown (per medication)
│   │       │   ├── ClinicalGuidance
│   │       │   ├── SupportiveCare
│   │       │   └── WhenToEscalate (WarningBox)
│   │       ├── SurgerySection (if indicated)
│   │       │   ├── PreoperativePhase
│   │       │   ├── OperativePhase
│   │       │   └── PostoperativePhase
│   │       ├── DiagnosticsSection
│   │       │   ├── RequiredInvestigations
│   │       │   ├── Monitoring
│   │       │   └── ReferralCriteria
│   │       └── FollowUpSection
│   └── AlternativeDiagnoses
│       └── DiagnosisCard[] (collapsed)
├── ResourcesConsultedSection
│   ├── NICEGuidelinesList
│   ├── CKSTopicsList
│   └── BNFSummariesList
├── ClinicalDisclaimerSection
│   └── WarningBox
└── StartNewAnalysisButton
    └── PrimaryButton
```

---

## 5. Visual Layout & Styling

### 5.1 Page Layout

| Property | Value |
|----------|-------|
| Max Width | 1280px (`max-w-5xl`) |
| Horizontal Padding | 24px (`px-6`) |
| Vertical Padding | 32px (`py-8`) |
| Background | White (`bg-white`) |
| Section Spacing | 32px (`mb-8`) |

### 5.2 Typography

| Element | Font | Size | Line Height | Color |
|---------|------|------|-------------|-------|
| Page Title | Georgia (serif) | 32px | 38px | `#0c3555` (aneya-navy) |
| Section Header | Georgia (serif) | 26px | 32px | `#0c3555` |
| Subsection Header | Inter (sans-serif) | 18px | 24px | `#0c3555` |
| Body Text | Inter (sans-serif) | 15px | 22px | `#0c3555` |
| Labels | Inter (sans-serif) | 12px | 16px | `#6B7280` (gray-600) |
| Badge Text | Inter (sans-serif) | 13px | - | varies by confidence |

### 5.3 Color Palette

| Purpose | Color | Hex |
|---------|-------|-----|
| Navy (primary text) | aneya-navy | `#0c3555` |
| Teal (accent/links) | aneya-teal | `#1d9e99` |
| Cream (background) | aneya-cream | `#f6f5ee` |
| Soft Pink (borders) | aneya-soft-pink | `#fdf2f8` |
| Primary Care Section | Blue | `bg-blue-50`, `border-blue-200` |
| Surgery Section | Purple | `bg-purple-50`, `border-purple-200` |
| Diagnostics Section | Amber | `bg-amber-50`, `border-amber-200` |
| Follow-up Section | Gray | `bg-gray-50`, `border-gray-200` |

### 5.4 Confidence Badges

| Confidence | Background | Text | Border |
|------------|------------|------|--------|
| High | `bg-green-100` | `text-green-700` | `border-green-300` |
| Medium | `bg-yellow-100` | `text-yellow-700` | `border-yellow-300` |
| Low | `bg-red-100` | `text-red-700` | `border-red-300` |

### 5.5 Cards & Containers

| Component | Border Radius | Border | Shadow |
|-----------|---------------|--------|--------|
| DiagnosisCard | 16px | `border-aneya-soft-pink` | `aneya-shadow-card` |
| Patient Details | 10px | `border-aneya-teal` (2px) | none |
| Drug Dropdown | 8px | `border-aneya-teal` | none |
| Section Containers | 8px | varies by section | none |

---

## 6. Interaction Behaviors

### 6.1 Expandable Sections

| Section | Default State | Trigger |
|---------|---------------|---------|
| Patient Details | Collapsed | Click header button |
| Primary Diagnosis | Expanded | Click card header |
| Alternative Diagnoses | Collapsed | Click card header |
| Drug Details | Collapsed | Click medication button |

### 6.2 State Transitions

```
Patient Details:
  Collapsed → Expanded: 200ms ease, chevron rotates 180°
  Expanded → Collapsed: 200ms ease, chevron rotates back

DiagnosisCard:
  Collapsed: Shows header (name, confidence badge, source)
  Expanded: Shows full content with all treatment sections

DrugDetailDropdown:
  Loading: Spinner animation
  Loaded: Display BNF/DrugBank data
  Failed: Fallback message with external links
```

### 6.3 External Links

All external links open in a new tab with:
- `target="_blank"`
- `rel="noopener noreferrer"`
- Accompanied by `ExternalLink` icon (lucide-react)

---

## 7. Section Details

### 7.1 Appointment Context Banner (Optional)

**Displays when:** `appointmentContext` prop is provided

**Content:**
- Calendar icon
- Patient name from appointment
- Scheduled time and duration
- Appointment reason (if provided)
- "Save Consultation" button (if `onSaveConsultation` callback provided)

**Styling:**
- Background: `bg-aneya-teal/10`
- Border: `border-aneya-teal` (2px)
- Border Radius: 10px

### 7.2 Patient Details Section

**Always visible header showing:**
- Person icon
- "Patient Details" label
- Patient name in parentheses
- Chevron indicator

**Expanded content (2-column grid):**
- Name / Sex
- Age / Height
- Weight
- Current Medications (full width)
- Current Conditions (full width)

### 7.3 Errors/Warnings Section

**Displays when:** `errors.length > 0`

**Content:**
- Header: "Analysis Warnings"
- Explanation text
- Bulleted list of error messages

**Purpose:** Alert user to incomplete or problematic analysis

### 7.4 Clinical Diagnoses Section

**Primary Diagnosis:**
- Label: "Primary Diagnosis:"
- Single `DiagnosisCard` component
- Expanded by default
- Shows confidence level

**Alternative Diagnoses:**
- Label: "Alternative Diagnoses:" (only if > 1 diagnosis)
- List of `DiagnosisCard` components
- Collapsed by default
- Numbered sequentially (starting at 2)

### 7.5 DiagnosisCard Structure

**Header (always visible):**
```
┌─────────────────────────────────────────────────────────────┐
│ Primary Diagnosis / Alternative Diagnosis N                 │
│ [Confidence Badge: high/medium/low]                         │
│                                                             │
│ Diagnosis Name                                      [▼/▲]   │
│ Source: NICE Guidelines                                     │
└─────────────────────────────────────────────────────────────┘
```

**Expanded Content:**
1. **Summary** - Brief description of condition
2. **Guideline Link** - "View full guideline" with external link
3. **Primary Care Management** (blue box)
   - Medications with DrugDetailDropdown
   - Clinical Guidance
   - Supportive Care list
   - When to Escalate (warning box with AlertTriangle icon)
4. **Surgical Management** (purple box, if indicated)
   - Pre-operative phase (numbered step 1, blue border)
   - Operative phase (numbered step 2, purple border)
   - Post-operative phase (numbered step 3, green border)
5. **Diagnostic Workup** (amber box)
   - Required Investigations
   - Monitoring
   - Referral Criteria
6. **Follow-up Care** (gray box)
   - Timeframe
   - Monitoring
   - Referral Criteria

### 7.6 DrugDetailDropdown Structure

**Collapsed State:**
```
┌─────────────────────────────────────────────┐
│ Medication Name              (loading...) ▼ │
└─────────────────────────────────────────────┘
```

**Expanded State:**
```
┌─────────────────────────────────────────────┐
│ Medication Name                          ▲  │
├─────────────────────────────────────────────┤
│ [External Link] View full details on BNF    │
│                                             │
│ Dosage                                      │
│ [dosage information]                        │
│                                             │
│ Side Effects                                │
│ [side effects information]                  │
│                                             │
│ Drug Interactions                           │
│ [interactions information]                  │
└─────────────────────────────────────────────┘
```

**States:**
- `undefined`: Loading (spinner)
- `null`: Failed (fallback message)
- `object`: Loaded (display data)

### 7.7 Resources Consulted Section

**Card container** with three subsections:
1. **NICE Guidelines** - List of guideline references with external links
2. **CKS Topics** - List of CKS topic links
3. **BNF Summaries** - List of BNF treatment summary links

Each item shows:
- External link icon
- Clickable text (reference + title for NICE, title only for others)

### 7.8 Clinical Disclaimer Section

**Fixed content warning box:**

> **Clinical Disclaimer**
>
> This analysis should not replace clinical judgment. Always consider individual patient factors, local antimicrobial resistance patterns, and current clinical guidelines. Verify all medication doses and interactions before prescribing. In case of clinical deterioration or uncertainty, seek senior clinical advice or specialist input.

### 7.9 Action Button

**Start New Analysis:**
- Full-width `PrimaryButton`
- Calls `onStartNew` callback
- Returns user to InputScreen

---

## 8. Backward Compatibility

### 8.1 Legacy Format Conversion

The report handles both new and legacy diagnosis formats:

```typescript
// Check if new format
const hasNewStructure = (diag) => {
  return diag.primary_care || diag.surgery || diag.diagnostics;
};

// Convert legacy to new format
const convertToNewFormat = (diag) => {
  if (hasNewStructure(diag)) return diag;

  return {
    ...diag,
    primary_care: {
      medications: [],
      supportive_care: [],
      clinical_guidance: diag.summary || "Legacy format...",
      when_to_escalate: []
    }
  };
};
```

### 8.2 Drug Name Handling

Medications can be either strings or objects:

```typescript
const drugName = typeof drug === 'string'
  ? drug
  : (drug as any)?.drug_name || String(drug);
```

---

## 9. Props Interface

### 9.1 ReportScreen Props

```typescript
interface ReportScreenProps {
  onStartNew: () => void;              // Callback to start new analysis
  result: any;                         // Analysis result from backend
  patientDetails: PatientDetails | null;
  errors?: string[];                   // Analysis warnings/errors
  drugDetails?: Record<string, any>;   // Medication details map
  appointmentContext?: AppointmentWithPatient;  // Optional appointment
  onSaveConsultation?: () => void;     // Save callback for appointments
}
```

### 9.2 DiagnosisCard Props

```typescript
interface DiagnosisCardProps {
  diagnosisNumber: number;
  diagnosis: string;
  confidence?: string;
  isPrimary?: boolean;
  source?: string;
  url?: string;
  summary?: string;
  primary_care?: PrimaryCare;
  surgery?: Surgery;
  diagnostics?: Diagnostics;
  follow_up?: FollowUp;
  drugDetails?: Record<string, any>;
  className?: string;
}
```

### 9.3 DrugDetailDropdown Props

```typescript
interface DrugDetailDropdownProps {
  drugName: string;
  details?: DrugDetails | null;  // undefined=loading, null=failed
  onExpand?: () => void;         // Callback when expanded
}
```

---

## 10. Accessibility Considerations

### 10.1 Keyboard Navigation

- All expandable sections are accessible via keyboard (button elements)
- External links are focusable
- Chevron rotation provides visual feedback for expand state

### 10.2 Screen Reader Support

- Section headers use semantic heading levels (h1-h5)
- Lists use semantic `<ul>` and `<li>` elements
- Buttons have descriptive text content

### 10.3 Color Contrast

- All text meets WCAG AA contrast requirements against backgrounds
- Confidence badges have sufficient contrast within their color scheme

---

## 11. Performance Considerations

### 11.1 Memoization

Diagnosis conversion is memoized to prevent re-computation on each render:

```typescript
const convertedDiagnoses = useMemo(() => {
  return diagnoses.map((diag) => convertToNewFormat(diag));
}, [diagnoses]);
```

### 11.2 Lazy Loading

- Drug details are loaded on-demand when medications are displayed
- Alternative diagnoses are collapsed by default to reduce initial render

---

## 12. Future Enhancements

### 12.1 Planned Features

- [ ] PDF export functionality
- [ ] Print-optimized styling
- [ ] Share report via link
- [ ] Save to patient record integration
- [ ] Voice summary using TTS

### 12.2 Potential Improvements

- [ ] Collapsible resource sections
- [ ] Search within report
- [ ] Annotation/note-taking capability
- [ ] Comparison view for alternative diagnoses
- [ ] Drug interaction checker across all medications

---

## 13. Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Project overview and architecture
- [ACCUMULATIVE_TRANSCRIPTION.md](../ACCUMULATIVE_TRANSCRIPTION.md) - Voice input details
- [WORKFLOW_GUIDE.md](../WORKFLOW_GUIDE.md) - User workflow documentation

---

## Appendix A: Example Report Data

```json
{
  "diagnoses": [
    {
      "diagnosis": "Community-Acquired Pneumonia",
      "confidence": "high",
      "source": "NICE Guidelines NG138",
      "url": "https://www.nice.org.uk/guidance/ng138",
      "summary": "Acute infection of the lung parenchyma...",
      "primary_care": {
        "medications": ["Amoxicillin 500mg TDS", "Clarithromycin 500mg BD"],
        "supportive_care": ["Rest", "Adequate hydration", "Paracetamol for fever"],
        "clinical_guidance": "Start antibiotics within 4 hours of diagnosis...",
        "when_to_escalate": [
          "SpO2 < 92% on air",
          "Confusion or altered mental state",
          "Respiratory rate > 30/min"
        ]
      },
      "diagnostics": {
        "required": ["Chest X-ray", "FBC", "U&E", "CRP"],
        "monitoring": ["Temperature", "Oxygen saturations", "Respiratory rate"],
        "referral_criteria": ["CURB-65 score >= 3", "Multilobar involvement"]
      },
      "follow_up": {
        "timeframe": "Review at 48-72 hours",
        "monitoring": ["Temperature trending down", "Improving symptoms"],
        "referral_criteria": ["No improvement after 48 hours of antibiotics"]
      }
    }
  ],
  "guidelines_found": [
    {
      "reference": "NG138",
      "title": "Pneumonia (community-acquired): antimicrobial prescribing",
      "url": "https://www.nice.org.uk/guidance/ng138"
    }
  ],
  "errors": []
}
```

---

*Document maintained by the Aneya development team.*
