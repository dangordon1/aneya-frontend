import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test/utils/render'
import { VitalsEntryForm } from './VitalsEntryForm'

// Mock the hook
const mockCreateVitals = vi.fn()
vi.mock('../hooks/usePatientVitals', () => ({
  usePatientVitals: () => ({
    createVitals: mockCreateVitals,
    loading: false,
    error: null,
  }),
}))

describe('VitalsEntryForm', () => {
  const defaultProps = {
    patientId: 'patient-123',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateVitals.mockResolvedValue({ id: 'vitals-123' })
  })

  describe('rendering', () => {
    it('renders form heading', () => {
      render(<VitalsEntryForm {...defaultProps} />)
      expect(screen.getByText('Record Vital Signs')).toBeInTheDocument()
    })

    it('renders blood pressure fields', () => {
      render(<VitalsEntryForm {...defaultProps} />)
      expect(screen.getByText('Systolic BP (mmHg)')).toBeInTheDocument()
      expect(screen.getByText('Diastolic BP (mmHg)')).toBeInTheDocument()
    })

    it('renders heart rate and respiratory rate fields', () => {
      render(<VitalsEntryForm {...defaultProps} />)
      expect(screen.getByText('Heart Rate (bpm)')).toBeInTheDocument()
      expect(screen.getByText('Respiratory Rate (breaths/min)')).toBeInTheDocument()
    })

    it('renders temperature and SpO2 fields', () => {
      render(<VitalsEntryForm {...defaultProps} />)
      expect(screen.getByText('Temperature (°C)')).toBeInTheDocument()
      expect(screen.getByText('SpO2 (%)')).toBeInTheDocument()
    })

    it('renders blood glucose field', () => {
      render(<VitalsEntryForm {...defaultProps} />)
      expect(screen.getByText('Blood Glucose (mg/dL)')).toBeInTheDocument()
    })

    it('renders weight and height fields', () => {
      render(<VitalsEntryForm {...defaultProps} />)
      expect(screen.getByText('Weight (kg)')).toBeInTheDocument()
      expect(screen.getByText('Height (cm)')).toBeInTheDocument()
    })

    it('renders notes field', () => {
      render(<VitalsEntryForm {...defaultProps} />)
      expect(screen.getByText('Notes (Optional)')).toBeInTheDocument()
    })

    it('renders Save Vitals button', () => {
      render(<VitalsEntryForm {...defaultProps} />)
      expect(screen.getByRole('button', { name: /Save Vitals/i })).toBeInTheDocument()
    })
  })

  describe('cancel button', () => {
    it('renders cancel button when onCancel provided', () => {
      const onCancel = vi.fn()
      render(<VitalsEntryForm {...defaultProps} onCancel={onCancel} />)
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
    })

    it('does not render cancel button when onCancel not provided', () => {
      render(<VitalsEntryForm {...defaultProps} />)
      expect(screen.queryByRole('button', { name: /Cancel/i })).not.toBeInTheDocument()
    })

    it('calls onCancel when cancel button clicked', async () => {
      const onCancel = vi.fn()
      const { user } = render(<VitalsEntryForm {...defaultProps} onCancel={onCancel} />)

      await user.click(screen.getByRole('button', { name: /Cancel/i }))

      expect(onCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('form input', () => {
    it('updates blood pressure values on input', async () => {
      const { user } = render(<VitalsEntryForm {...defaultProps} />)

      const systolicInput = screen.getByPlaceholderText('120')
      await user.type(systolicInput, '120')

      expect(systolicInput).toHaveValue(120)
    })

    it('updates weight and height values', async () => {
      const { user } = render(<VitalsEntryForm {...defaultProps} />)

      const weightInput = screen.getByPlaceholderText('70.0')
      const heightInput = screen.getByPlaceholderText('170.0')

      await user.type(weightInput, '70')
      await user.type(heightInput, '170')

      expect(weightInput).toHaveValue(70)
      expect(heightInput).toHaveValue(170)
    })
  })

  describe('BMI calculation', () => {
    it('shows calculated BMI when weight and height provided', async () => {
      const { user } = render(<VitalsEntryForm {...defaultProps} />)

      await user.type(screen.getByPlaceholderText('70.0'), '70')
      await user.type(screen.getByPlaceholderText('170.0'), '175')

      await waitFor(() => {
        expect(screen.getByText(/Calculated BMI/i)).toBeInTheDocument()
      })
    })

    it('does not show BMI when only weight provided', async () => {
      const { user } = render(<VitalsEntryForm {...defaultProps} />)

      await user.type(screen.getByPlaceholderText('70.0'), '70')

      expect(screen.queryByText(/Calculated BMI/i)).not.toBeInTheDocument()
    })

    it('does not show BMI when only height provided', async () => {
      const { user } = render(<VitalsEntryForm {...defaultProps} />)

      await user.type(screen.getByPlaceholderText('170.0'), '175')

      expect(screen.queryByText(/Calculated BMI/i)).not.toBeInTheDocument()
    })
  })

  describe('form submission', () => {
    it('calls createVitals with form data on submit', async () => {
      const { user } = render(<VitalsEntryForm {...defaultProps} />)

      await user.type(screen.getByPlaceholderText('120'), '120')
      await user.type(screen.getByPlaceholderText('80'), '80')
      await user.type(screen.getByPlaceholderText('72'), '72')

      await user.click(screen.getByRole('button', { name: /Save Vitals/i }))

      await waitFor(() => {
        expect(mockCreateVitals).toHaveBeenCalledWith(
          expect.objectContaining({
            patient_id: 'patient-123',
            systolic_bp: 120,
            diastolic_bp: 80,
            heart_rate: 72,
          })
        )
      })
    })

    it('passes appointment_id when provided', async () => {
      const { user } = render(
        <VitalsEntryForm {...defaultProps} appointmentId="apt-456" />
      )

      await user.type(screen.getByPlaceholderText('120'), '120')
      await user.click(screen.getByRole('button', { name: /Save Vitals/i }))

      await waitFor(() => {
        expect(mockCreateVitals).toHaveBeenCalledWith(
          expect.objectContaining({
            appointment_id: 'apt-456',
          })
        )
      })
    })

    it('calls onSuccess with vitals id on successful save', async () => {
      const onSuccess = vi.fn()
      const { user } = render(
        <VitalsEntryForm {...defaultProps} onSuccess={onSuccess} />
      )

      await user.type(screen.getByPlaceholderText('120'), '120')
      await user.click(screen.getByRole('button', { name: /Save Vitals/i }))

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith('vitals-123')
      })
    })

    it('does not call onSuccess when createVitals returns null', async () => {
      mockCreateVitals.mockResolvedValue(null)
      const onSuccess = vi.fn()
      const { user } = render(
        <VitalsEntryForm {...defaultProps} onSuccess={onSuccess} />
      )

      await user.type(screen.getByPlaceholderText('120'), '120')
      await user.click(screen.getByRole('button', { name: /Save Vitals/i }))

      await waitFor(() => {
        expect(mockCreateVitals).toHaveBeenCalled()
      })

      expect(onSuccess).not.toHaveBeenCalled()
    })
  })

  describe('empty fields handling', () => {
    it('does not include empty fields in submission', async () => {
      const { user } = render(<VitalsEntryForm {...defaultProps} />)

      await user.type(screen.getByPlaceholderText('120'), '120')
      await user.click(screen.getByRole('button', { name: /Save Vitals/i }))

      await waitFor(() => {
        expect(mockCreateVitals).toHaveBeenCalled()
      })

      const callArg = mockCreateVitals.mock.calls[0][0]
      expect(callArg).not.toHaveProperty('diastolic_bp')
      expect(callArg).not.toHaveProperty('heart_rate')
      expect(callArg).not.toHaveProperty('notes')
    })
  })

  describe('styling', () => {
    it('has card styling', () => {
      const { container } = render(<VitalsEntryForm {...defaultProps} />)
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('bg-white')
      expect(wrapper).toHaveClass('rounded-lg')
      expect(wrapper).toHaveClass('border')
    })
  })
})
