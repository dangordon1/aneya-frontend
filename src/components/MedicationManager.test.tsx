import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test/utils/render'
import { MedicationManager } from './MedicationManager'

// Mock the hook
const mockGetMedications = vi.fn()
const mockCreateMedication = vi.fn()
const mockUpdateMedication = vi.fn()

vi.mock('../hooks/usePatientMedications', () => ({
  usePatientMedications: () => ({
    medications: [],
    loading: false,
    error: null,
    getMedications: mockGetMedications,
    createMedication: mockCreateMedication,
    updateMedication: mockUpdateMedication,
  }),
}))

describe('MedicationManager', () => {
  const defaultProps = {
    patientId: 'patient-123',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateMedication.mockResolvedValue({ id: 'med-123' })
  })

  describe('rendering', () => {
    it('renders Current Medications heading', () => {
      render(<MedicationManager {...defaultProps} />)
      expect(screen.getByText('Current Medications')).toBeInTheDocument()
    })

    it('renders Add Medication button when not readOnly', () => {
      render(<MedicationManager {...defaultProps} />)
      expect(screen.getByRole('button', { name: /Add Medication/i })).toBeInTheDocument()
    })

    it('does not render Add Medication button when readOnly', () => {
      render(<MedicationManager {...defaultProps} readOnly />)
      expect(screen.queryByRole('button', { name: /Add Medication/i })).not.toBeInTheDocument()
    })

    it('shows no medications message when list is empty', () => {
      render(<MedicationManager {...defaultProps} />)
      expect(screen.getByText('No active medications recorded')).toBeInTheDocument()
    })

    it('calls getMedications on mount', () => {
      render(<MedicationManager {...defaultProps} />)
      expect(mockGetMedications).toHaveBeenCalledWith('patient-123', 'active')
    })
  })

  describe('add medication form', () => {
    it('shows form when Add Medication clicked', async () => {
      const { user } = render(<MedicationManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Medication/i }))

      expect(screen.getByText('Add New Medication')).toBeInTheDocument()
    })

    it('shows medication name input field', async () => {
      const { user } = render(<MedicationManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Medication/i }))

      expect(screen.getByPlaceholderText(/Metformin/i)).toBeInTheDocument()
    })

    it('shows dosage input field', async () => {
      const { user } = render(<MedicationManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Medication/i }))

      expect(screen.getByPlaceholderText(/500mg/i)).toBeInTheDocument()
    })

    it('shows frequency input field', async () => {
      const { user } = render(<MedicationManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Medication/i }))

      expect(screen.getByPlaceholderText(/Twice daily/i)).toBeInTheDocument()
    })

    it('shows route dropdown', async () => {
      const { user } = render(<MedicationManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Medication/i }))

      expect(screen.getByText('Route')).toBeInTheDocument()
      const comboboxes = screen.getAllByRole('combobox')
      expect(comboboxes.length).toBeGreaterThanOrEqual(1)
    })

    it('toggles form visibility', async () => {
      const { user } = render(<MedicationManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Medication/i }))
      expect(screen.getByText('Add New Medication')).toBeInTheDocument()

      // Header button text changes to Cancel
      const cancelButtons = screen.getAllByRole('button', { name: /Cancel/i })
      await user.click(cancelButtons[0])
      expect(screen.queryByText('Add New Medication')).not.toBeInTheDocument()
    })
  })

  describe('form submission', () => {
    it('calls createMedication with form data', async () => {
      const { user } = render(<MedicationManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Medication/i }))

      await user.type(screen.getByPlaceholderText(/Metformin/i), 'Metformin')
      await user.type(screen.getByPlaceholderText(/500mg/i), '500mg')
      await user.type(screen.getByPlaceholderText(/Twice daily/i), 'Twice daily')

      // Select route
      const selects = screen.getAllByRole('combobox')
      await user.selectOptions(selects[0], 'Oral')

      // Click the submit button
      const addButtons = screen.getAllByRole('button', { name: /Add Medication/i })
      const submitButton = addButtons.find(btn => btn.getAttribute('type') === 'submit')
      await user.click(submitButton!)

      await waitFor(() => {
        expect(mockCreateMedication).toHaveBeenCalledWith(
          expect.objectContaining({
            patient_id: 'patient-123',
            medication_name: 'Metformin',
            dosage: '500mg',
            frequency: 'Twice daily',
            route: 'Oral',
            status: 'active',
          })
        )
      })
    })

    it('clears form and hides it after successful submission', async () => {
      const { user } = render(<MedicationManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Medication/i }))
      await user.type(screen.getByPlaceholderText(/Metformin/i), 'Metformin')
      await user.type(screen.getByPlaceholderText(/500mg/i), '500mg')
      await user.type(screen.getByPlaceholderText(/Twice daily/i), 'Twice daily')

      const addButtons = screen.getAllByRole('button', { name: /Add Medication/i })
      const submitButton = addButtons.find(btn => btn.getAttribute('type') === 'submit')
      await user.click(submitButton!)

      await waitFor(() => {
        expect(screen.queryByText('Add New Medication')).not.toBeInTheDocument()
      })
    })

    it('does not submit without required fields', async () => {
      const { user } = render(<MedicationManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /Add Medication/i }))

      // Only fill medication name, not dosage and frequency
      await user.type(screen.getByPlaceholderText(/Metformin/i), 'Metformin')

      const addButtons = screen.getAllByRole('button', { name: /Add Medication/i })
      const submitButton = addButtons.find(btn => btn.getAttribute('type') === 'submit')
      await user.click(submitButton!)

      expect(mockCreateMedication).not.toHaveBeenCalled()
    })
  })

  describe('styling', () => {
    it('renders with space-y-4 class', () => {
      const { container } = render(<MedicationManager {...defaultProps} />)
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('space-y-4')
    })
  })
})
