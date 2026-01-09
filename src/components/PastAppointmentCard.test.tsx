import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../test/utils/render'
import { PastAppointmentCard } from './PastAppointmentCard'
import { createMockAppointmentWithPatient, createMockConsultation, createMockDoctor } from '../test/fixtures'

// Mock dateHelpers
vi.mock('../utils/dateHelpers', () => ({
  formatDateUK: vi.fn(() => '15/01/2024'),
  formatTime24: vi.fn(() => '14:30'),
}))

describe('PastAppointmentCard', () => {
  const mockAppointment = createMockAppointmentWithPatient({
    id: 'apt-123',
    doctor_id: 'doc-456',
    patient_id: 'pat-789',
    scheduled_time: '2024-01-15T14:30:00Z',
    duration_minutes: 30,
    status: 'completed',
    reason: 'Follow-up consultation',
    notes: null,
    patient: {
      id: 'pat-789',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '555-1234',
    },
    doctor: createMockDoctor({
      id: 'doc-456',
      user_id: 'user-456',
      name: 'Dr. Johnson',
      email: 'doc@example.com',
      specialty: 'general',
    }),
  })

  const mockConsultation = createMockConsultation({
    id: 'cons-123',
    appointment_id: 'apt-123',
    patient_id: 'pat-789',
    diagnoses: [
      { diagnosis: 'Acute Bronchitis', confidence: 'high' },
    ],
    prescriptions: [
      {
        drug_name: 'Amoxicillin',
        amount: '500mg',
        method: 'Oral',
        frequency: 'TDS',
        duration: '7 days',
      },
    ],
  })

  const mockOnClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering in doctor view', () => {
    it('renders patient name in doctor view', () => {
      render(
        <PastAppointmentCard
          appointment={mockAppointment}
          consultation={null}
          onClick={mockOnClick}
          viewMode="doctor"
        />
      )
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    it('renders formatted date and time', () => {
      render(
        <PastAppointmentCard
          appointment={mockAppointment}
          consultation={null}
          onClick={mockOnClick}
        />
      )
      expect(screen.getByText('15/01/2024 at 14:30')).toBeInTheDocument()
    })

    it('renders completed status badge', () => {
      render(
        <PastAppointmentCard
          appointment={mockAppointment}
          consultation={null}
          onClick={mockOnClick}
        />
      )
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })

    it('renders reason when provided', () => {
      render(
        <PastAppointmentCard
          appointment={mockAppointment}
          consultation={null}
          onClick={mockOnClick}
        />
      )
      expect(screen.getByText('Reason: Follow-up consultation')).toBeInTheDocument()
    })
  })

  describe('rendering in patient view', () => {
    it('renders doctor name in patient view', () => {
      render(
        <PastAppointmentCard
          appointment={mockAppointment}
          consultation={null}
          onClick={mockOnClick}
          viewMode="patient"
        />
      )
      expect(screen.getByText('Dr. Johnson')).toBeInTheDocument()
    })

    it('renders doctor specialty in patient view', () => {
      render(
        <PastAppointmentCard
          appointment={mockAppointment}
          consultation={null}
          onClick={mockOnClick}
          viewMode="patient"
        />
      )
      expect(screen.getByText('general')).toBeInTheDocument()
    })

    it('shows fallback when doctor not available', () => {
      const appointmentWithoutDoctor = createMockAppointmentWithPatient({
        ...mockAppointment,
        doctor: null,
      })
      render(
        <PastAppointmentCard
          appointment={appointmentWithoutDoctor}
          consultation={null}
          onClick={mockOnClick}
          viewMode="patient"
        />
      )
      expect(screen.getByText('Doctor')).toBeInTheDocument()
    })
  })

  describe('with consultation data', () => {
    it('renders primary diagnosis', () => {
      render(
        <PastAppointmentCard
          appointment={mockAppointment}
          consultation={mockConsultation}
          onClick={mockOnClick}
        />
      )
      expect(screen.getByText('Diagnosis:')).toBeInTheDocument()
      expect(screen.getByText('Acute Bronchitis')).toBeInTheDocument()
    })

    it('renders prescriptions section', () => {
      render(
        <PastAppointmentCard
          appointment={mockAppointment}
          consultation={mockConsultation}
          onClick={mockOnClick}
        />
      )
      expect(screen.getByText('Prescriptions')).toBeInTheDocument()
      expect(screen.getByText('Amoxicillin')).toBeInTheDocument()
    })

    it('renders prescription details', () => {
      render(
        <PastAppointmentCard
          appointment={mockAppointment}
          consultation={mockConsultation}
          onClick={mockOnClick}
        />
      )
      expect(screen.getByText(/500mg/)).toBeInTheDocument()
      expect(screen.getByText(/Oral/)).toBeInTheDocument()
      expect(screen.getByText(/TDS/)).toBeInTheDocument()
      expect(screen.getByText(/7 days/)).toBeInTheDocument()
    })
  })

  describe('without consultation data', () => {
    it('does not render diagnosis section', () => {
      render(
        <PastAppointmentCard
          appointment={mockAppointment}
          consultation={null}
          onClick={mockOnClick}
        />
      )
      expect(screen.queryByText('Diagnosis:')).not.toBeInTheDocument()
    })

    it('does not render prescriptions section', () => {
      render(
        <PastAppointmentCard
          appointment={mockAppointment}
          consultation={null}
          onClick={mockOnClick}
        />
      )
      expect(screen.queryByText('Prescriptions')).not.toBeInTheDocument()
    })
  })

  describe('without reason', () => {
    it('does not render reason line', () => {
      const appointmentNoReason = createMockAppointmentWithPatient({
        ...mockAppointment,
        reason: null,
      })
      render(
        <PastAppointmentCard
          appointment={appointmentNoReason}
          consultation={null}
          onClick={mockOnClick}
        />
      )
      expect(screen.queryByText(/Reason:/)).not.toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onClick when card clicked', async () => {
      const { user } = render(
        <PastAppointmentCard
          appointment={mockAppointment}
          consultation={null}
          onClick={mockOnClick}
        />
      )

      await user.click(screen.getByRole('button'))

      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('status display', () => {
    it('shows completed status correctly', () => {
      render(
        <PastAppointmentCard
          appointment={mockAppointment}
          consultation={null}
          onClick={mockOnClick}
        />
      )
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })

    it('shows other status as-is', () => {
      const cancelledAppointment = createMockAppointmentWithPatient({
        ...mockAppointment,
        status: 'cancelled',
      })
      render(
        <PastAppointmentCard
          appointment={cancelledAppointment}
          consultation={null}
          onClick={mockOnClick}
        />
      )
      expect(screen.getByText('cancelled')).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('has card styling', () => {
      render(
        <PastAppointmentCard
          appointment={mockAppointment}
          consultation={null}
          onClick={mockOnClick}
        />
      )
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-white')
      expect(button).toHaveClass('rounded-[16px]')
      expect(button).toHaveClass('border')
    })

    it('has hover effect classes', () => {
      render(
        <PastAppointmentCard
          appointment={mockAppointment}
          consultation={null}
          onClick={mockOnClick}
        />
      )
      const button = screen.getByRole('button')
      expect(button).toHaveClass('hover:shadow-md')
      expect(button).toHaveClass('hover:border-aneya-teal')
    })
  })

  describe('multiple prescriptions', () => {
    it('renders all prescriptions', () => {
      const multiPrescriptionConsultation = createMockConsultation({
        prescriptions: [
          { drug_name: 'Amoxicillin', amount: '500mg', method: 'Oral', frequency: 'TDS', duration: '7 days' },
          { drug_name: 'Ibuprofen', amount: '400mg', method: 'Oral', frequency: 'BD', duration: '5 days' },
          { drug_name: 'Paracetamol', amount: '1g', method: 'Oral', frequency: 'QDS', duration: '3 days' },
        ],
      })

      render(
        <PastAppointmentCard
          appointment={mockAppointment}
          consultation={multiPrescriptionConsultation}
          onClick={mockOnClick}
        />
      )

      expect(screen.getByText('Amoxicillin')).toBeInTheDocument()
      expect(screen.getByText('Ibuprofen')).toBeInTheDocument()
      expect(screen.getByText('Paracetamol')).toBeInTheDocument()
    })
  })
})
