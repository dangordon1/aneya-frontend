# Figma Design Prompt: Aneya Appointment Management System

## Project Overview
Design a comprehensive appointment management system for healthcare professionals that integrates with the existing Aneya clinical decision support platform.

## Brand Identity
**Colors:**
- Primary Navy: `#0c3555` (aneya-navy)
- Accent Teal: `#1d9e99` (aneya-teal)
- Background Cream: `#f6f5ee` (aneya-cream)
- Use existing Aneya logo

**Typography:**
- Headings: Georgia (serif)
- Body text: Inter (sans-serif)

## Core Requirements

### 1. Main Dashboard Layout (Post-Login)

#### Tab Navigation
Two primary tabs at the top level:
1. **Appointments Tab** (default view)
2. **Patients Tab**

---

### 2. Appointments Tab

#### Default View - Today's Schedule
- **Large central window** displaying all appointments for the current day
- Each appointment card should show:
  - Time slot
  - Patient name
  - Appointment type/reason (brief)
  - Status indicator (upcoming, in progress, completed)
  - Visual highlight for "current" appointment (happening now)

#### Calendar Widget
- **Compact calendar view** (sidebar or corner position)
- Days with appointments should be visually marked (dots, highlights, or bold)
- **Click to expand:** Calendar enlarges to full screen
- **Full-screen calendar view** shows:
  - Month grid layout (similar to Google Calendar)
  - All appointments across the entire month
  - Color-coded by appointment type or status
  - Ability to navigate between months

#### Appointment Interaction States

**Clicking on Existing Appointment:**
- Opens appointment detail modal/panel
- Shows full patient details:
  - Name, age, contact
  - Known allergies
  - Current medications
  - Appointment reason
- Action buttons:
  - **Modify Time** - Edit appointment time slot
  - **Cancel Appointment** - Remove from schedule
  - **Start Consultation** (if current appointment)

**Clicking on Empty Time Slot:**
- Opens "New Appointment" modal
- Form fields:
  - Patient selection (dropdown/search)
  - Date and time picker
  - Appointment type/reason
  - Duration
  - Notes (optional)
- Save/Cancel buttons

#### Current Appointment - Consultation Mode
When doctor clicks on the "happening now" appointment:
- Transitions to consultation recording interface
- Displays patient details prominently at top
- **Consultation recording area** (already implemented in backend)
  - Voice recording controls
  - Real-time transcription display
- **Two action buttons:**
  1. **Save Text** - Saves consultation transcript to database
  2. **Analyze Consultation** - Triggers AI analysis (existing functionality)
- After save: Confirmation that consultation is stored in patient record

---

### 3. Patients Tab

#### Patient List View
- **Table or card-based list** showing all patients
- Columns/fields to display:
  - Patient name
  - Date of birth / Age
  - Last appointment date
  - Next appointment (if scheduled)
  - Number of previous consultations
- **Search functionality:**
  - Search bar at top
  - Real-time filtering by patient name
  - Consider additional filters (date range, condition, etc.)

#### Patient Detail Window
When clicking on a patient name, open a dedicated patient view:

**Layout Sections:**
1. **Patient Details** (header section)
   - Full name, DOB, age
   - Contact information
   - Known allergies (prominently displayed)
   - Emergency contact

2. **Current Conditions**
   - Active diagnoses
   - Chronic conditions
   - Date of diagnosis

3. **Current Medications**
   - List of active prescriptions
   - Dosage and frequency
   - Prescribing date
   - Review date

4. **Previous Appointments**
   - Chronological list (most recent first)
   - Date, time, brief reason
   - Click to view consultation notes
   - Link to analysis results if available

5. **Upcoming Appointments**
   - Future scheduled appointments
   - Quick action to reschedule

6. **Symptom History**
   - Timeline of reported symptoms
   - Associated with specific consultations
   - Visual timeline or accordion format

**Navigation:**
- Back button to return to patient list
- Option to schedule new appointment from patient view
- Edit patient details button

---

### 4. UI/UX Design Guidelines

#### General Principles
- Clean, professional medical interface
- High readability (appropriate font sizes for clinical use)
- Clear visual hierarchy
- Responsive design (desktop primary, tablet secondary)
- Accessibility considerations (WCAG 2.1 AA compliant)

#### Interactive Elements
- **Hover states** for all clickable elements
- **Active states** for current appointment
- **Loading indicators** for analyze consultation
- **Success confirmations** for saved data
- **Error states** with clear messaging

#### Status Indicators
Use color-coding consistently:
- Upcoming appointments: Neutral/aneya-cream
- Current appointment: Accent/aneya-teal with border
- Completed: Muted/gray
- Cancelled: Red/warning color
- Urgent: Attention-grabbing indicator

#### Modals and Overlays
- Semi-transparent backdrop
- Center-aligned modals
- Clear close/cancel options
- Confirm destructive actions (cancel appointment)

---

### 5. Key User Flows to Design

1. **Login → View Today's Appointments → Start Consultation → Save & Analyze**
2. **Create New Appointment from Empty Slot**
3. **Modify Existing Appointment Time**
4. **Search Patient → View Patient Details → Review Consultation History**
5. **Expand Calendar → Navigate Month → Schedule Future Appointment**

---

### 6. Integration Notes

#### Existing Functionality (Backend)
- Voice transcription (Parakeet TDT)
- Consultation analysis (Claude AI)
- Text saving to database

#### New Database Requirements
- Patients table (name, details, allergies, conditions)
- Consultations table (linked to patients and appointments)
- Appointments table (date, time, patient_id, status)

---

### 7. Deliverables

Please provide Figma designs for:
1. **Main Dashboard** - Appointments tab (default view)
2. **Full Calendar View** (expanded state)
3. **Appointment Detail Modal** (existing appointment)
4. **New Appointment Modal** (create flow)
5. **Consultation Recording Interface** (active appointment)
6. **Patients Tab** - List view with search
7. **Patient Detail Window** (full patient record)
8. **Mobile/Tablet Responsive Views** (key screens)

#### Component Library
- Reusable components: buttons, input fields, cards, modals
- Icon set for medical context
- State variations for interactive elements

---

### 8. Design Considerations

#### Clinical Context
- This is used by healthcare professionals during patient care
- Quick access to critical information (allergies, medications)
- Professional, trustworthy aesthetic
- Minimize cognitive load during consultations

#### Data Privacy
- Consider how sensitive patient data is displayed
- Visual indicators for secure/authenticated state
- Appropriate access controls in design

#### Performance
- Smooth transitions between views
- Minimal loading states (data should be pre-fetched)
- Calendar should handle large numbers of appointments

---

## Success Criteria

The design should enable a doctor to:
1. See at-a-glance what appointments they have today
2. Quickly access the current patient's details
3. Record and analyze consultations seamlessly (using existing features)
4. Access comprehensive patient history in 2-3 clicks
5. Manage their schedule efficiently (create, modify, cancel appointments)
6. Search and find any patient quickly

The interface should feel intuitive, professional, and aligned with the existing Aneya clinical decision support aesthetic.
