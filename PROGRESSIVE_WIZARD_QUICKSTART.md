# ProgressiveWizard Quick Start Guide

## 5-Minute Setup

### 1. Import the Component

```typescript
import { ProgressiveWizard, WizardStep } from '@/components/ProgressiveWizard';
import { useState } from 'react';
```

### 2. Define Your Steps

```typescript
const steps: WizardStep[] = [
  {
    title: 'Step 1: Basic Info',
    content: <div>Your step 1 content here</div>,
    validate: () => true, // Add validation logic
  },
  {
    title: 'Step 2: Details',
    content: <div>Your step 2 content here</div>,
  },
  {
    title: 'Step 3: Confirm',
    content: <div>Your step 3 content here</div>,
  },
];
```

### 3. Use the Component

```typescript
export function MyWizardPage() {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <ProgressiveWizard
        steps={steps}
        currentStep={currentStep}
        onStepChange={(step) => setCurrentStep(step)}
        onComplete={() => console.log('Done!')}
      />
    </div>
  );
}
```

That's it! You now have a working wizard.

---

## Common Use Cases

### Patient Registration Form

```typescript
interface PatientData {
  personalInfo: { name: string; email: string; dob: string };
  medicalHistory: { conditions: string; allergies: string };
  contact: { phone: string; address: string };
}

export function PatientRegistrationWizard() {
  const [data, setData] = useState<PatientData>({
    personalInfo: { name: '', email: '', dob: '' },
    medicalHistory: { conditions: '', allergies: '' },
    contact: { phone: '', address: '' },
  });

  const steps: WizardStep[] = [
    {
      title: 'Personal Information',
      content: (
        <input
          value={data.personalInfo.name}
          onChange={(e) =>
            setData((prev) => ({
              ...prev,
              personalInfo: { ...prev.personalInfo, name: e.target.value },
            }))
          }
          placeholder="Full Name"
          className="w-full p-2 border border-gray-300 rounded"
        />
      ),
      validate: () => data.personalInfo.name.length > 0,
    },
    // ... more steps
  ];

  return <ProgressiveWizard steps={steps} onComplete={() => submitForm(data)} />;
}
```

### Multi-Step Appointment Booking

```typescript
const bookingSteps: WizardStep[] = [
  {
    title: 'Select Doctor',
    content: <DoctorSelector />,
  },
  {
    title: 'Choose Date & Time',
    content: <DateTimeSelector />,
  },
  {
    title: 'Confirm Details',
    content: <BookingReview />,
  },
];

<ProgressiveWizard
  steps={bookingSteps}
  onComplete={async () => {
    await api.createAppointment(bookingData);
  }}
/>
```

### Conditional Steps

```typescript
const [showInsurance, setShowInsurance] = useState(false);

const steps = [
  { title: 'Basic Info', content: <BasicInfo /> },
  ...(showInsurance ? [{ title: 'Insurance', content: <Insurance /> }] : []),
  { title: 'Complete', content: <Summary /> },
];
```

### With Form Validation

```typescript
const [formData, setFormData] = useState({ email: '', password: '' });
const [errors, setErrors] = useState<Record<string, string>>({});

const validateEmail = () => {
  if (!formData.email.includes('@')) {
    setErrors({ email: 'Invalid email' });
    return false;
  }
  return true;
};

const steps: WizardStep[] = [
  {
    title: 'Email',
    content: (
      <div>
        <input
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
        {errors.email && <p className="text-red-500">{errors.email}</p>}
      </div>
    ),
    validate: validateEmail,
  },
];
```

### With API Integration

```typescript
<ProgressiveWizard
  steps={steps}
  onAutoSave={async (stepIndex) => {
    // Save after each step
    const response = await fetch('/api/form-steps', {
      method: 'POST',
      body: JSON.stringify({ step: stepIndex, data: formData }),
    });
    if (!response.ok) throw new Error('Save failed');
  }}
  onComplete={async () => {
    // Final submission
    const response = await fetch('/api/form-submit', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
    if (response.ok) navigate('/success');
  }}
/>
```

### With Session Persistence

```typescript
const [currentStep, setCurrentStep] = useState(() => {
  // Load from localStorage
  return JSON.parse(localStorage.getItem('wizardStep') || '0');
});

const handleStepChange = (step: number) => {
  setCurrentStep(step);
  localStorage.setItem('wizardStep', JSON.stringify(step));
};

const handleAutoSave = async (stepIndex: number) => {
  // Save form data to localStorage
  localStorage.setItem(`step-${stepIndex}`, JSON.stringify(formData));

  // Also sync to backend
  await api.saveStep(stepIndex, formData);
};
```

---

## Props Cheat Sheet

| Prop | Type | Default | Purpose |
|------|------|---------|---------|
| `steps` | `WizardStep[]` | Required | Array of form steps |
| `currentStep` | `number` | `0` | Currently active step |
| `onStepChange` | `(step) => void` | Optional | Called when step changes |
| `onComplete` | `(count) => void` | Optional | Called when wizard finishes |
| `onAutoSave` | `(step) => void` | Optional | Called when moving to next step |
| `canNavigateToStep` | `(step, completed) => boolean` | Optional | Control which steps are clickable |
| `showProgressBar` | `boolean` | `true` | Show/hide progress bar |
| `showStepNumbers` | `boolean` | `true` | Show/hide step numbers |
| `allowSkip` | `boolean` | `false` | Show skip indicator |

---

## Styling & Customization

### Change Progress Bar Color

Wrap wizard in a custom style:

```typescript
<div className="custom-wizard">
  <ProgressiveWizard steps={steps} />
</div>
```

Then add CSS or Tailwind:

```css
.custom-wizard ::-webkit-progress-bar {
  background-color: #f0f0f0;
}
```

### Customize Button Text

The component uses fixed English text. To customize, either:

1. **Extend the component** and add text props
2. **Use CSS to hide/show elements** conditionally
3. **Create a wrapper** with custom labels

### Mobile-First Responsive

Component automatically adapts to screen size. No changes needed!

---

## Debugging Tips

### Validation Not Working?

Check your validate function returns boolean:

```typescript
// Bad ❌
validate: () => { doSomething(); }

// Good ✅
validate: () => {
  doSomething();
  return true;
}
```

### Step Not Advancing?

Make sure validate returns true:

```typescript
validate: () => {
  console.log('Validating...');
  const isValid = formData.email !== '';
  console.log('Is valid?', isValid);
  return isValid;
}
```

### Auto-Save Not Triggering?

Verify onAutoSave prop is provided:

```typescript
<ProgressiveWizard
  steps={steps}
  onAutoSave={async (stepIndex) => {
    console.log('Saving step', stepIndex);
    // your save logic
  }}
/>
```

Check browser console for errors and network tab for API calls.

---

## Performance Tips

1. **Memoize step content** if complex:
   ```typescript
   const MemoizedStep = React.memo(StepComponent);
   ```

2. **Lazy load heavy steps** if needed:
   ```typescript
   const HeavyStep = lazy(() => import('./HeavyStep'));
   ```

3. **Debounce API calls**:
   ```typescript
   const debouncedSave = debounce(api.save, 500);
   ```

---

## Accessibility

Component includes:
- Semantic HTML
- ARIA labels
- Keyboard navigation
- Focus management
- Error announcements

Test with screen readers:
- Mac: VoiceOver (Cmd+F5)
- Windows: NVDA (free)
- Browser: Chrome DevTools

---

## Browser Support

Works on:
- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- iOS Safari
- Chrome Android

---

## Related Components

- `PatientFormModal` - Single-step modal form
- `AppointmentFormModal` - Appointment booking form
- `PrimaryButton` - Primary action button

See `/PROGRESSIVE_WIZARD_DOCS.md` for complete documentation.

---

## Examples to Explore

Check `/src/components/ProgressiveWizardExample.tsx` for:
- Complete working example
- Form state management
- Multi-step validation
- Success screen
- Form reset

Copy and adapt it for your use case!

---

## Need Help?

1. **Read the docs:** `/PROGRESSIVE_WIZARD_DOCS.md`
2. **Check the example:** `/src/components/ProgressiveWizardExample.tsx`
3. **Review the code:** `/src/components/ProgressiveWizard.tsx` (well-commented)

Happy building! 🚀
