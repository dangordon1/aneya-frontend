# ProgressiveWizard Component Documentation

## Overview

The `ProgressiveWizard` is a reusable, flexible multi-step form component that provides a guided user experience for complex workflows. It includes progress tracking, step validation, auto-save functionality, and navigation controls.

**Location:** `/src/components/ProgressiveWizard.tsx`

## Features

- **Multi-Step Form Management** - Organize forms into logical steps
- **Progress Bar** - Visual progress indicator showing completion percentage
- **Step Indicators** - Clickable step tabs with completion status
- **Validation** - Step-level validation before allowing progression
- **Auto-Save** - Automatically save data on step completion
- **Smart Navigation** - Jump to previously completed steps with optional custom rules
- **Responsive Design** - Mobile-first approach with Tailwind CSS
- **Loading States** - Visual feedback during validation and saving
- **Error Handling** - Display validation errors to users
- **Accessibility** - Semantic HTML and keyboard navigation support

## Component API

### Props

```typescript
interface ProgressiveWizardProps {
  steps: WizardStep[];
  onStepChange?: (currentStep: number) => void | Promise<void>;
  onComplete?: (completedSteps: number) => void | Promise<void>;
  currentStep?: number;
  canNavigateToStep?: (stepIndex: number, completedSteps: number) => boolean;
  onAutoSave?: (stepIndex: number, stepData?: any) => void | Promise<void>;
  showProgressBar?: boolean;
  showStepNumbers?: boolean;
  allowSkip?: boolean;
}
```

#### Props Explanation

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `steps` | `WizardStep[]` | Required | Array of steps with title, content, and optional validation |
| `onStepChange` | `(step: number) => void \| Promise<void>` | Optional | Callback when user navigates to a different step |
| `onComplete` | `(completedSteps: number) => void \| Promise<void>` | Optional | Callback when wizard is completed |
| `currentStep` | `number` | `0` | Initial/controlled current step index |
| `canNavigateToStep` | `(stepIndex: number, completed: number) => boolean` | Optional | Custom logic to determine if a step is navigable |
| `onAutoSave` | `(stepIndex: number, data?: any) => void \| Promise<void>` | Optional | Called on step completion for auto-save |
| `showProgressBar` | `boolean` | `true` | Show/hide the progress bar |
| `showStepNumbers` | `boolean` | `true` | Show/hide step numbers in indicators |
| `allowSkip` | `boolean` | `false` | Show skip indicator (visual only) |

### WizardStep Interface

```typescript
interface WizardStep {
  title: string;
  content: React.ReactNode;
  validate?: () => boolean | Promise<boolean>;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `title` | `string` | Display name of the step |
| `content` | `React.ReactNode` | React component or JSX to render as step content |
| `validate` | `() => boolean \| Promise<boolean>` | Optional validation function (async supported) |

## Usage Examples

### Basic Multi-Step Form

```typescript
import { ProgressiveWizard, WizardStep } from './ProgressiveWizard';
import { useState } from 'react';

export function MyWizard() {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: WizardStep[] = [
    {
      title: 'Step 1',
      content: <div>Step 1 content</div>,
      validate: () => true,
    },
    {
      title: 'Step 2',
      content: <div>Step 2 content</div>,
    },
    {
      title: 'Step 3',
      content: <div>Step 3 content</div>,
    },
  ];

  return (
    <ProgressiveWizard
      steps={steps}
      currentStep={currentStep}
      onStepChange={(step) => setCurrentStep(step)}
      onComplete={(completed) => console.log(`Completed ${completed} steps`)}
    />
  );
}
```

### With Validation

```typescript
const steps: WizardStep[] = [
  {
    title: 'Personal Info',
    content: <PersonalInfoForm />,
    validate: () => {
      // Validate form data
      return formData.name !== '' && formData.email !== '';
    },
  },
  // ... more steps
];
```

### With Async Validation

```typescript
const steps: WizardStep[] = [
  {
    title: 'Email Verification',
    content: <EmailForm />,
    validate: async () => {
      // Validate with API call
      const response = await fetch('/api/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email: formData.email }),
      });
      return response.ok;
    },
  },
  // ... more steps
];
```

### With Auto-Save

```typescript
<ProgressiveWizard
  steps={steps}
  onAutoSave={async (stepIndex) => {
    // Save step data when user clicks "Next"
    await fetch('/api/save-form-step', {
      method: 'POST',
      body: JSON.stringify({
        stepIndex,
        data: formData,
      }),
    });
  }}
/>
```

### With Custom Navigation Rules

```typescript
<ProgressiveWizard
  steps={steps}
  canNavigateToStep={(stepIndex, completedSteps) => {
    // Only allow navigation if all previous steps are completed
    return stepIndex <= completedSteps;
  }}
/>
```

### Full Example with Form State

```typescript
import { ProgressiveWizard, WizardStep } from './ProgressiveWizard';
import { useState } from 'react';

interface FormData {
  step1: { name: string; email: string };
  step2: { phone: string };
  step3: { address: string };
}

export function CompleteWizard() {
  const [formData, setFormData] = useState<FormData>({
    step1: { name: '', email: '' },
    step2: { phone: '' },
    step3: { address: '' },
  });
  const [currentStep, setCurrentStep] = useState(0);

  const steps: WizardStep[] = [
    {
      title: 'Personal Information',
      content: (
        <div className="space-y-4">
          <input
            value={formData.step1.name}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                step1: { ...prev.step1, name: e.target.value },
              }))
            }
            placeholder="Name"
            className="w-full p-2 border border-gray-300 rounded"
          />
          <input
            value={formData.step1.email}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                step1: { ...prev.step1, email: e.target.value },
              }))
            }
            placeholder="Email"
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
      ),
      validate: () => formData.step1.name && formData.step1.email,
    },
    {
      title: 'Contact Information',
      content: (
        <input
          value={formData.step2.phone}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              step2: { ...prev.step2, phone: e.target.value },
            }))
          }
          placeholder="Phone"
          className="w-full p-2 border border-gray-300 rounded"
        />
      ),
      validate: () => formData.step2.phone,
    },
    {
      title: 'Address',
      content: (
        <textarea
          value={formData.step3.address}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              step3: { ...prev.step3, address: e.target.value },
            }))
          }
          placeholder="Address"
          className="w-full p-2 border border-gray-300 rounded"
        />
      ),
      validate: () => formData.step3.address,
    },
  ];

  return (
    <ProgressiveWizard
      steps={steps}
      currentStep={currentStep}
      onStepChange={(step) => setCurrentStep(step)}
      onAutoSave={async (stepIndex) => {
        console.log(`Saving step ${stepIndex}:`, formData);
        // API call to save
      }}
      onComplete={async (completed) => {
        console.log('Form completed!', formData);
        // API call to submit
      }}
    />
  );
}
```

## Styling & Customization

### Design System Integration

The component uses the Aneya design system colors:

- **Primary (Navy):** `#0c3555` (aneya-navy)
- **Accent (Teal):** `#1d9e99` (aneya-teal)
- **Secondary:** `#409f88` (aneya-seagreen)
- **Background:** `#f6f5ee` (aneya-cream)

### Responsive Behavior

- **Mobile:** Single column layout, compact spacing
- **Tablet/Desktop:** Multi-column support with expanded spacing
- **Breakpoints:** Uses Tailwind's sm, md, lg breakpoints

### Custom Styling

While the component includes built-in styling, you can wrap it in a container with custom classes:

```typescript
<div className="custom-wrapper">
  <ProgressiveWizard steps={steps} />
</div>
```

## Component State Management

### Internal State

The component manages:
- Current active step
- Completed steps (Set of indices)
- Validation state
- Auto-save state
- Error messages

### External State Integration

For complex forms, consider using:
- React Context for deeply nested components
- Zustand or Redux for global state
- Local component state for simpler cases

## Error Handling

### Validation Errors

```typescript
validate: () => {
  if (!formData.email.includes('@')) {
    // Component automatically shows error
    throw new Error('Invalid email format');
  }
  return true;
}
```

### Async Errors

```typescript
validate: async () => {
  try {
    const response = await fetch('/api/validate');
    if (!response.ok) throw new Error('Validation failed');
    return true;
  } catch (error) {
    throw new Error(`Validation error: ${error.message}`);
  }
}
```

## Accessibility Features

- Semantic HTML structure
- ARIA labels and descriptions
- Keyboard navigation support
- Visual feedback for interactive elements
- Clear error messaging
- Progress indication

## Performance Considerations

- Lazy render: Only current step content is in DOM
- Memoization: Consider memoizing step content components
- Validation debouncing: Optional for API-based validation
- Large forms: Consider splitting into fewer, larger steps

## API Integration Examples

### Saving to Database

```typescript
onAutoSave={async (stepIndex, stepData) => {
  const response = await fetch('/api/wizard/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      step: stepIndex,
      data: stepData,
      timestamp: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to save');
  }
}}
```

### Final Submission

```typescript
onComplete={async (completedSteps) => {
  const response = await fetch('/api/wizard/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });

  if (response.ok) {
    // Show success message
    navigateTo('/success');
  } else {
    // Handle error
    showErrorMessage('Failed to submit');
  }
}}
```

## Common Patterns

### Conditional Steps

```typescript
const steps = [
  // Always show
  { title: 'Step 1', content: <Step1 /> },
  // Conditionally show
  ...(showOptionalStep ? [{ title: 'Step 2', content: <Step2 /> }] : []),
  // Always show
  { title: 'Final', content: <Final /> },
];
```

### Progress Persistence

```typescript
const [currentStep, setCurrentStep] = useState(() => {
  // Load from localStorage on mount
  const saved = localStorage.getItem('wizardStep');
  return saved ? parseInt(saved) : 0;
});

const handleStepChange = (step: number) => {
  setCurrentStep(step);
  localStorage.setItem('wizardStep', step.toString());
};
```

### Data Persistence During Session

```typescript
const handleAutoSave = async (stepIndex: number) => {
  // Save to sessionStorage for quick reload
  sessionStorage.setItem(
    `step-${stepIndex}`,
    JSON.stringify(formData)
  );

  // Also save to backend
  await api.saveStep(stepIndex, formData);
};
```

## Troubleshooting

### Step Won't Progress
- Check validation function returns true
- Verify validate() is not throwing an error
- Check browser console for errors

### Auto-save Not Working
- Ensure onAutoSave prop is provided
- Check API endpoint is accessible
- Verify network tab shows requests

### Navigation Issues
- Review canNavigateToStep logic
- Check completedSteps tracking
- Verify step indices match array length

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari, Chrome Android

## Files

- **Component:** `/src/components/ProgressiveWizard.tsx` (298 lines)
- **Example:** `/src/components/ProgressiveWizardExample.tsx`
- **Documentation:** `/PROGRESSIVE_WIZARD_DOCS.md` (this file)

## License

This component is part of the Aneya project.

## Related Components

- `PatientFormModal.tsx` - Single-step form modal
- `AppointmentFormModal.tsx` - Multi-field appointment form
- `PrimaryButton.tsx` - Button component
