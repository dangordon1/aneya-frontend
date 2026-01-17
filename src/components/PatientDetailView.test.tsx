import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test/utils/render'
import { PatientDetailView } from './PatientDetailView'
import { Patient } from '../types/database'

// Mock the hooks
const mockUpdatePatient = vi.fn()
const mockDeleteAppointment = vi.fn()

vi.mock('../hooks/usePatients', () => ({
  usePatients: () => ({
    updatePatient: mockUpdatePatient,
    patients: [],
    loading: false,
    error: null,
    createPatient: vi.fn(),
    deletePatient: vi.fn(),
    refetch: vi.fn(),
  }),
}))

vi.mock('../hooks/useAppointments', () => ({
  useAppointments: () => ({
    deleteAppointment: mockDeleteAppointment,
    appointments: [],
    loading: false,
    error: null,
    createAppointment: vi.fn(),
    updateAppointment: vi.fn(),
    refetch: vi.fn(),
  }),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          in: () => ({
            order: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }),
      }),
    }),
  },
}))

describe('PatientDetailView', () => {
  const mockPatient: Patient = {
    id: 'patient-123',
    name: 'John Doe',
    date_of_birth: '1990-01-15',
    sex: 'Male',
    current_medications: 'Aspirin 100mg daily',
    current_conditions: 'Hypertension',
    allergies: 'Penicillin',
    height_cm: 180,
    weight_kg: 75,
    email: 'john@example.com',
    phone: '123456789',
    archived: false,
    created_by: 'user-123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  const defaultProps = {
    patient: mockPatient,
    onBack: vi.fn(),
    onEditPatient: vi.fn(),
    onStartConsultation: vi.fn(),
    onAnalyzeConsultation: vi.fn(),
    onPatientUpdated: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('current conditions editing', () => {
    it('displays current conditions from patient prop', () => {
      render(<PatientDetailView {...defaultProps} />)
      expect(screen.getByText('Hypertension')).toBeInTheDocument()
    })

    it('shows edit button for current conditions', () => {
      render(<PatientDetailView {...defaultProps} />)
      const editButtons = screen.getAllByRole('button', { name: /Edit/i })
      expect(editButtons.length).toBeGreaterThan(0)
    })

    it('enters edit mode when Edit is clicked', async () => {
      const { user } = render(<PatientDetailView {...defaultProps} />)

      // Find the Edit button in the Current Conditions section
      const conditionsSection = screen.getByText('Current Conditions').parentElement?.parentElement
      const editButton = conditionsSection?.querySelector('button')

      await user.click(editButton!)

      // Should now show textarea with the value
      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveValue('Hypertension')
    })

    it('calls onPatientUpdated after saving conditions', async () => {
      const updatedPatient = { ...mockPatient, current_conditions: 'Diabetes Type 2' }
      mockUpdatePatient.mockResolvedValue(updatedPatient)

      const { user } = render(<PatientDetailView {...defaultProps} />)

      // Find and click the Edit button for conditions
      const conditionsSection = screen.getByText('Current Conditions').parentElement?.parentElement
      const editButton = conditionsSection?.querySelector('button')
      await user.click(editButton!)

      // Update the textarea
      const textarea = screen.getByRole('textbox')
      await user.clear(textarea)
      await user.type(textarea, 'Diabetes Type 2')

      // Click Save
      const saveButton = screen.getByRole('button', { name: /Save/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockUpdatePatient).toHaveBeenCalledWith('patient-123', {
          current_conditions: 'Diabetes Type 2'
        })
      })

      await waitFor(() => {
        expect(defaultProps.onPatientUpdated).toHaveBeenCalledWith(updatedPatient)
      })
    })

    it('does not call onPatientUpdated if update fails', async () => {
      mockUpdatePatient.mockResolvedValue(null)

      const { user } = render(<PatientDetailView {...defaultProps} />)

      // Find and click the Edit button for conditions
      const conditionsSection = screen.getByText('Current Conditions').parentElement?.parentElement
      const editButton = conditionsSection?.querySelector('button')
      await user.click(editButton!)

      // Update and save
      const textarea = screen.getByRole('textbox')
      await user.clear(textarea)
      await user.type(textarea, 'New condition')

      const saveButton = screen.getByRole('button', { name: /Save/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockUpdatePatient).toHaveBeenCalled()
      })

      expect(defaultProps.onPatientUpdated).not.toHaveBeenCalled()
    })

    it('reverts to original value when Cancel is clicked', async () => {
      const { user } = render(<PatientDetailView {...defaultProps} />)

      // Enter edit mode
      const conditionsSection = screen.getByText('Current Conditions').parentElement?.parentElement
      const editButton = conditionsSection?.querySelector('button')
      await user.click(editButton!)

      // Type something different
      const textarea = screen.getByRole('textbox')
      await user.clear(textarea)
      await user.type(textarea, 'Something else')

      // Cancel
      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      await user.click(cancelButton)

      // Should revert to original
      expect(screen.getByText('Hypertension')).toBeInTheDocument()
      expect(mockUpdatePatient).not.toHaveBeenCalled()
    })
  })

  describe('current medications editing', () => {
    it('displays current medications from patient prop', () => {
      render(<PatientDetailView {...defaultProps} />)
      expect(screen.getByText('Aspirin 100mg daily')).toBeInTheDocument()
    })

    it('calls onPatientUpdated after saving medications', async () => {
      const updatedPatient = { ...mockPatient, current_medications: 'Metformin 500mg' }
      mockUpdatePatient.mockResolvedValue(updatedPatient)

      const { user } = render(<PatientDetailView {...defaultProps} />)

      // Find and click the Edit button for medications
      const medsSection = screen.getByText('Current Medications').parentElement?.parentElement
      const editButton = medsSection?.querySelector('button')
      await user.click(editButton!)

      // Update the textarea
      const textarea = screen.getByRole('textbox')
      await user.clear(textarea)
      await user.type(textarea, 'Metformin 500mg')

      // Click Save
      const saveButton = screen.getByRole('button', { name: /Save/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockUpdatePatient).toHaveBeenCalledWith('patient-123', {
          current_medications: 'Metformin 500mg'
        })
      })

      await waitFor(() => {
        expect(defaultProps.onPatientUpdated).toHaveBeenCalledWith(updatedPatient)
      })
    })
  })

  describe('syncing with patient prop changes', () => {
    it('updates local state when patient prop changes', async () => {
      const { rerender } = render(<PatientDetailView {...defaultProps} />)

      expect(screen.getByText('Hypertension')).toBeInTheDocument()

      // Re-render with updated patient
      const updatedPatient = { ...mockPatient, current_conditions: 'Updated Condition' }
      rerender(<PatientDetailView {...defaultProps} patient={updatedPatient} />)

      expect(screen.getByText('Updated Condition')).toBeInTheDocument()
    })
  })

  describe('without onPatientUpdated callback', () => {
    it('works without the optional callback', async () => {
      const propsWithoutCallback = { ...defaultProps, onPatientUpdated: undefined }
      mockUpdatePatient.mockResolvedValue(mockPatient)

      const { user } = render(<PatientDetailView {...propsWithoutCallback} />)

      // Enter edit mode and save
      const conditionsSection = screen.getByText('Current Conditions').parentElement?.parentElement
      const editButton = conditionsSection?.querySelector('button')
      await user.click(editButton!)

      const saveButton = screen.getByRole('button', { name: /Save/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockUpdatePatient).toHaveBeenCalled()
      })

      // Should not throw
    })
  })
})
