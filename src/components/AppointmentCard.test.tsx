import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../test/utils/render'
import { AppointmentCard } from './AppointmentCard'
import { createMockAppointmentWithPatient, createMockConsultation } from '../test/fixtures'

// Mock the formatTime24 utility
vi.mock('../utils/dateHelpers', () => ({
  formatTime24: vi.fn(() => '14:30'),
}))

describe('AppointmentCard', () => {
  const mockAppointment = createMockAppointmentWithPatient({
    id: 'apt-123',
    doctor_id: 'doc-456',
    patient_id: 'pat-789',
    scheduled_time: '2024-01-15T14:30:00Z',
    duration_minutes: 30,
    status: 'scheduled',
    reason: 'Annual checkup',
    notes: 'Patient requested morning appointment',
    patient: {
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '555-1234',
    },
  })

  const mockHandlers = {
    onStartConsultation: vi.fn(),
    onModify: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders patient name', () => {
      render(<AppointmentCard appointment={mockAppointment} {...mockHandlers} />)
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    it('renders formatted time', () => {
      render(<AppointmentCard appointment={mockAppointment} {...mockHandlers} />)
      expect(screen.getByText('14:30')).toBeInTheDocument()
    })

    it('renders duration', () => {
      render(<AppointmentCard appointment={mockAppointment} {...mockHandlers} />)
      expect(screen.getByText('• 30 min')).toBeInTheDocument()
    })

    it('renders reason', () => {
      render(<AppointmentCard appointment={mockAppointment} {...mockHandlers} />)
      expect(screen.getByText('Annual checkup')).toBeInTheDocument()
    })

    it('renders notes when provided', () => {
      render(<AppointmentCard appointment={mockAppointment} {...mockHandlers} />)
      expect(
        screen.getByText('Notes: Patient requested morning appointment')
      ).toBeInTheDocument()
    })

    it('does not render notes section when notes is empty', () => {
      const noNotesAppointment = createMockAppointmentWithPatient({
        ...mockAppointment,
        notes: null,
      })
      render(
        <AppointmentCard appointment={noNotesAppointment} {...mockHandlers} />
      )
      expect(screen.queryByText(/Notes:/)).not.toBeInTheDocument()
    })

    it('truncates long reason text', () => {
      const longReasonAppointment = createMockAppointmentWithPatient({
        ...mockAppointment,
        reason: 'A'.repeat(150),
      })
      render(
        <AppointmentCard appointment={longReasonAppointment} {...mockHandlers} />
      )
      const reasonText = screen.getByText(/^A+\.\.\.$/i)
      expect(reasonText.textContent).toHaveLength(103) // 100 chars + "..."
    })

    it('shows No reason specified when reason is null', () => {
      const noReasonAppointment = createMockAppointmentWithPatient({
        ...mockAppointment,
        reason: null,
      })
      render(
        <AppointmentCard appointment={noReasonAppointment} {...mockHandlers} />
      )
      expect(screen.getByText('No reason specified')).toBeInTheDocument()
    })

    it('renders AppointmentStatusBadge', () => {
      render(<AppointmentCard appointment={mockAppointment} {...mockHandlers} />)
      expect(screen.getByText('Scheduled')).toBeInTheDocument()
    })
  })

  describe('scheduled status actions', () => {
    it('shows Start Consultation button', () => {
      render(<AppointmentCard appointment={mockAppointment} {...mockHandlers} />)
      expect(
        screen.getByRole('button', { name: 'Start Consultation' })
      ).toBeInTheDocument()
    })

    it('shows Modify button', () => {
      render(<AppointmentCard appointment={mockAppointment} {...mockHandlers} />)
      expect(screen.getByRole('button', { name: 'Modify' })).toBeInTheDocument()
    })

    it('shows Cancel button', () => {
      render(<AppointmentCard appointment={mockAppointment} {...mockHandlers} />)
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('calls onStartConsultation when Start Consultation clicked', async () => {
      const { user } = render(
        <AppointmentCard appointment={mockAppointment} {...mockHandlers} />
      )
      await user.click(screen.getByRole('button', { name: 'Start Consultation' }))
      expect(mockHandlers.onStartConsultation).toHaveBeenCalledWith(mockAppointment)
    })

    it('calls onModify when Modify clicked', async () => {
      const { user } = render(
        <AppointmentCard appointment={mockAppointment} {...mockHandlers} />
      )
      await user.click(screen.getByRole('button', { name: 'Modify' }))
      expect(mockHandlers.onModify).toHaveBeenCalledWith(mockAppointment)
    })

    it('calls onCancel when Cancel clicked', async () => {
      const { user } = render(
        <AppointmentCard appointment={mockAppointment} {...mockHandlers} />
      )
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(mockHandlers.onCancel).toHaveBeenCalledWith(mockAppointment)
    })
  })

  describe('in_progress status', () => {
    const inProgressAppointment = createMockAppointmentWithPatient({
      ...mockAppointment,
      status: 'in_progress',
    })

    it('shows Start Consultation button', () => {
      render(
        <AppointmentCard appointment={inProgressAppointment} {...mockHandlers} />
      )
      expect(
        screen.getByRole('button', { name: 'Start Consultation' })
      ).toBeInTheDocument()
    })

    it('shows Modify and Cancel buttons', () => {
      render(
        <AppointmentCard appointment={inProgressAppointment} {...mockHandlers} />
      )
      expect(screen.getByRole('button', { name: 'Modify' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })
  })

  describe('completed status', () => {
    const completedAppointment = createMockAppointmentWithPatient({
      ...mockAppointment,
      status: 'completed',
    })

    it('does not show Start Consultation button', () => {
      render(
        <AppointmentCard appointment={completedAppointment} {...mockHandlers} />
      )
      expect(
        screen.queryByRole('button', { name: 'Start Consultation' })
      ).not.toBeInTheDocument()
    })

    it('does not show Modify button', () => {
      render(
        <AppointmentCard appointment={completedAppointment} {...mockHandlers} />
      )
      expect(
        screen.queryByRole('button', { name: 'Modify' })
      ).not.toBeInTheDocument()
    })

    it('does not show Cancel button', () => {
      render(
        <AppointmentCard appointment={completedAppointment} {...mockHandlers} />
      )
      expect(
        screen.queryByRole('button', { name: 'Cancel' })
      ).not.toBeInTheDocument()
    })
  })

  describe('cancelled status', () => {
    const cancelledAppointment = createMockAppointmentWithPatient({
      ...mockAppointment,
      status: 'cancelled',
    })

    it('does not show action buttons', () => {
      render(
        <AppointmentCard appointment={cancelledAppointment} {...mockHandlers} />
      )
      expect(
        screen.queryByRole('button', { name: 'Start Consultation' })
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Modify' })
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Cancel' })
      ).not.toBeInTheDocument()
    })
  })

  describe('with consultation_id', () => {
    const appointmentWithConsultation = createMockAppointmentWithPatient({
      ...mockAppointment,
      consultation_id: 'cons-123',
    })

    it('shows Generate PDF button', () => {
      render(
        <AppointmentCard
          appointment={appointmentWithConsultation}
          {...mockHandlers}
        />
      )
      expect(
        screen.getByRole('button', { name: /Generate PDF/i })
      ).toBeInTheDocument()
    })
  })

  describe('prescriptions display', () => {
    const consultation = createMockConsultation({
      prescriptions: [
        {
          drug_name: 'Paracetamol',
          amount: '500mg',
          method: 'Oral',
          frequency: 'TDS',
          duration: '5 days',
        },
        {
          drug_name: 'Ibuprofen',
          amount: '400mg',
          method: 'Oral',
          frequency: 'BD',
          duration: '3 days',
        },
      ],
    })

    it('shows Prescriptions section when consultation has prescriptions', () => {
      render(
        <AppointmentCard
          appointment={mockAppointment}
          consultation={consultation}
          {...mockHandlers}
        />
      )
      expect(screen.getByText('Prescriptions')).toBeInTheDocument()
    })

    it('renders prescription drug names', () => {
      render(
        <AppointmentCard
          appointment={mockAppointment}
          consultation={consultation}
          {...mockHandlers}
        />
      )
      expect(screen.getByText('Paracetamol')).toBeInTheDocument()
      expect(screen.getByText('Ibuprofen')).toBeInTheDocument()
    })

    it('does not show Prescriptions section when no prescriptions', () => {
      const noPresConsultation = createMockConsultation({ prescriptions: [] })
      render(
        <AppointmentCard
          appointment={mockAppointment}
          consultation={noPresConsultation}
          {...mockHandlers}
        />
      )
      expect(screen.queryByText('Prescriptions')).not.toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('has card styling', () => {
      const { container } = render(
        <AppointmentCard appointment={mockAppointment} {...mockHandlers} />
      )
      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('bg-white')
      expect(card).toHaveClass('rounded-[16px]')
      expect(card).toHaveClass('border-2')
    })
  })
})
