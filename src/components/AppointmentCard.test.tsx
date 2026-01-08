import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../test/utils/render'
import { AppointmentCard } from './AppointmentCard'
import { AppointmentWithPatient } from '../types/database'

// Mock the formatTime24 utility
vi.mock('../utils/dateHelpers', () => ({
  formatTime24: vi.fn(() => '14:30'),
}))

describe('AppointmentCard', () => {
  const mockAppointment: AppointmentWithPatient = {
    id: 'apt-123',
    doctor_id: 'doc-456',
    patient_id: 'pat-789',
    scheduled_time: '2024-01-15T14:30:00Z',
    duration_minutes: 30,
    status: 'scheduled',
    reason: 'Annual checkup',
    notes: 'Patient requested morning appointment',
    created_at: '2024-01-01T00:00:00Z',
    patient: {
      id: 'pat-789',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '555-1234',
      created_at: '2024-01-01T00:00:00Z',
    },
  }

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
      const noNotesAppointment = { ...mockAppointment, notes: null }
      render(
        <AppointmentCard appointment={noNotesAppointment} {...mockHandlers} />
      )
      expect(screen.queryByText(/Notes:/)).not.toBeInTheDocument()
    })

    it('truncates long reason text', () => {
      const longReasonAppointment = {
        ...mockAppointment,
        reason: 'A'.repeat(150),
      }
      render(
        <AppointmentCard appointment={longReasonAppointment} {...mockHandlers} />
      )
      const reasonText = screen.getByText(/^A+\.\.\.$/i)
      expect(reasonText.textContent).toHaveLength(103) // 100 chars + "..."
    })

    it('shows No reason specified when reason is null', () => {
      const noReasonAppointment = { ...mockAppointment, reason: null }
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
    const inProgressAppointment = {
      ...mockAppointment,
      status: 'in_progress' as const,
    }

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
    const completedAppointment = {
      ...mockAppointment,
      status: 'completed' as const,
    }

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
    const cancelledAppointment = {
      ...mockAppointment,
      status: 'cancelled' as const,
    }

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
    const appointmentWithConsultation = {
      ...mockAppointment,
      consultation_id: 'cons-123',
    }

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
    const consultation = {
      id: 'cons-123',
      appointment_id: 'apt-123',
      doctor_id: 'doc-456',
      patient_id: 'pat-789',
      form_data: {},
      created_at: '2024-01-15T15:00:00Z',
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
    }

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
      const noPresConsultation = { ...consultation, prescriptions: [] }
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
