import { useState } from 'react';
import { ProgressiveWizard, WizardStep } from './ProgressiveWizard';

/**
 * Example usage of the ProgressiveWizard component
 * This demonstrates a multi-step form with validation and auto-save
 */

interface FormData {
  personalInfo: {
    name: string;
    email: string;
  };
  medicalHistory: {
    conditions: string;
    medications: string;
  };
  contact: {
    phone: string;
    address: string;
  };
}

export function ProgressiveWizardExample() {
  const [formData, setFormData] = useState<FormData>({
    personalInfo: { name: '', email: '' },
    medicalHistory: { conditions: '', medications: '' },
    contact: { phone: '', address: '' },
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [completionMessage, setCompletionMessage] = useState('');

  // Step 1: Personal Information
  const PersonalInfoStep = () => (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <label htmlFor="name" className="block mb-2 text-[12px] text-gray-600 font-medium">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          value={formData.personalInfo.name}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              personalInfo: { ...prev.personalInfo, name: e.target.value },
            }))
          }
          placeholder="Enter your full name"
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-aneya-teal text-[14px] text-aneya-navy"
        />
      </div>
      <div>
        <label htmlFor="email" className="block mb-2 text-[12px] text-gray-600 font-medium">
          Email Address <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          type="email"
          value={formData.personalInfo.email}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              personalInfo: { ...prev.personalInfo, email: e.target.value },
            }))
          }
          placeholder="your.email@example.com"
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-aneya-teal text-[14px] text-aneya-navy"
        />
      </div>
      <p className="text-[12px] text-gray-600 mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
        This information helps us identify you in the system.
      </p>
    </div>
  );

  // Step 2: Medical History
  const MedicalHistoryStep = () => (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <label htmlFor="conditions" className="block mb-2 text-[12px] text-gray-600 font-medium">
          Current Medical Conditions
        </label>
        <textarea
          id="conditions"
          value={formData.medicalHistory.conditions}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              medicalHistory: { ...prev.medicalHistory, conditions: e.target.value },
            }))
          }
          placeholder="e.g., Type 2 Diabetes, Hypertension"
          rows={4}
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-aneya-teal text-[14px] text-aneya-navy resize-none"
        />
      </div>
      <div>
        <label htmlFor="medications" className="block mb-2 text-[12px] text-gray-600 font-medium">
          Current Medications
        </label>
        <textarea
          id="medications"
          value={formData.medicalHistory.medications}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              medicalHistory: { ...prev.medicalHistory, medications: e.target.value },
            }))
          }
          placeholder="e.g., Metformin 500mg twice daily, Lisinopril 10mg once daily"
          rows={4}
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-aneya-teal text-[14px] text-aneya-navy resize-none"
        />
      </div>
    </div>
  );

  // Step 3: Contact Information
  const ContactStep = () => (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <label htmlFor="phone" className="block mb-2 text-[12px] text-gray-600 font-medium">
          Phone Number <span className="text-red-500">*</span>
        </label>
        <input
          id="phone"
          type="tel"
          value={formData.contact.phone}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              contact: { ...prev.contact, phone: e.target.value },
            }))
          }
          placeholder="+91-98765-43210"
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-aneya-teal text-[14px] text-aneya-navy"
        />
      </div>
      <div>
        <label htmlFor="address" className="block mb-2 text-[12px] text-gray-600 font-medium">
          Address
        </label>
        <textarea
          id="address"
          value={formData.contact.address}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              contact: { ...prev.contact, address: e.target.value },
            }))
          }
          placeholder="123 Main St, Apartment 4B, City, State 12345"
          rows={3}
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-aneya-teal text-[14px] text-aneya-navy resize-none"
        />
      </div>
    </div>
  );

  // Step 4: Review & Confirm
  const ReviewStep = () => (
    <div className="space-y-4 sm:space-y-5">
      <div className="bg-aneya-cream rounded-lg p-4 border border-gray-200">
        <h4 className="font-semibold text-aneya-navy mb-3 text-[14px]">Personal Information</h4>
        <div className="space-y-2 text-[13px]">
          <p>
            <span className="text-gray-600">Name:</span> <span className="text-aneya-navy font-medium">{formData.personalInfo.name || '(Not provided)'}</span>
          </p>
          <p>
            <span className="text-gray-600">Email:</span> <span className="text-aneya-navy font-medium">{formData.personalInfo.email || '(Not provided)'}</span>
          </p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="font-semibold text-aneya-navy mb-3 text-[14px]">Medical History</h4>
        <div className="space-y-2 text-[13px]">
          <p>
            <span className="text-gray-600">Conditions:</span>{' '}
            <span className="text-aneya-navy">{formData.medicalHistory.conditions || '(None reported)'}</span>
          </p>
          <p>
            <span className="text-gray-600">Medications:</span>{' '}
            <span className="text-aneya-navy">{formData.medicalHistory.medications || '(None reported)'}</span>
          </p>
        </div>
      </div>

      <div className="bg-aneya-cream rounded-lg p-4 border border-gray-200">
        <h4 className="font-semibold text-aneya-navy mb-3 text-[14px]">Contact Information</h4>
        <div className="space-y-2 text-[13px]">
          <p>
            <span className="text-gray-600">Phone:</span> <span className="text-aneya-navy font-medium">{formData.contact.phone || '(Not provided)'}</span>
          </p>
          <p>
            <span className="text-gray-600">Address:</span>{' '}
            <span className="text-aneya-navy">{formData.contact.address || '(Not provided)'}</span>
          </p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-[12px] text-amber-900">
          Please review all information carefully before submitting. Once submitted, this data will be saved to the system.
        </p>
      </div>
    </div>
  );

  // Define wizard steps
  const steps: WizardStep[] = [
    {
      title: 'Personal Information',
      content: <PersonalInfoStep />,
      validate: () => {
        return formData.personalInfo.name.trim() !== '' && formData.personalInfo.email.trim() !== '';
      },
    },
    {
      title: 'Medical History',
      content: <MedicalHistoryStep />,
      validate: () => {
        // Medical history is optional, so always valid
        return true;
      },
    },
    {
      title: 'Contact Details',
      content: <ContactStep />,
      validate: () => {
        return formData.contact.phone.trim() !== '';
      },
    },
    {
      title: 'Review & Confirm',
      content: <ReviewStep />,
      validate: () => true,
    },
  ];

  // Handle step changes
  const handleStepChange = (step: number) => {
    setCurrentStep(step);
    setCompletionMessage('');
  };

  // Handle auto-save
  const handleAutoSave = async (stepIndex: number): Promise<void> => {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Auto-saved step ${stepIndex}:`, formData);
        resolve();
      }, 500);
    });
  };

  // Handle completion
  const handleComplete = async (_completedSteps: number): Promise<void> => {
    // Simulate final submission
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Form completed with all data:', formData);
        setCompletionMessage('Thank you! Your information has been successfully submitted.');
        resolve();
      }, 1000);
    });
  };

  // Custom navigation logic
  const canNavigateToStep = (stepIndex: number, _completedSteps: number) => {
    // Allow navigation to completed steps and forward navigation for current step
    return stepIndex <= currentStep + 1;
  };

  if (completionMessage) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4 sm:p-8">
        <div className="bg-white rounded-[20px] p-6 sm:p-8 text-center">
          <svg className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-[24px] sm:text-[28px] text-aneya-navy font-serif mb-3">Success!</h2>
          <p className="text-[14px] sm:text-[16px] text-gray-700 mb-6">{completionMessage}</p>
          <button
            onClick={() => {
              setFormData({
                personalInfo: { name: '', email: '' },
                medicalHistory: { conditions: '', medications: '' },
                contact: { phone: '', address: '' },
              });
              setCurrentStep(0);
              setCompletionMessage('');
            }}
            className="px-6 py-2.5 bg-aneya-navy text-white rounded-[10px] font-medium text-[14px] hover:bg-opacity-90 transition-colors"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-8">
      <ProgressiveWizard
        steps={steps}
        currentStep={currentStep}
        onStepChange={handleStepChange}
        onAutoSave={handleAutoSave}
        onComplete={handleComplete}
        canNavigateToStep={canNavigateToStep}
        showProgressBar={true}
        showStepNumbers={true}
        allowSkip={false}
      />
    </div>
  );
}
