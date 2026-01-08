import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../test/utils/render'
import { AppointmentDetailModal } from './AppointmentDetailModal'
import { AppointmentWithPatient, Consultation } from '../types/database'

// Mock dateHelpers
vi.mock('../utils/dateHelpers', () => ({
  formatDateUK: vi.fn(() => '15/01/2024'),
  formatTime24: vi.fn(() => '14:30'),
}))

// Mock AudioPlayer
vi.mock('./AudioPlayer', () => ({
  AudioPlayer: ({ audioUrl }: { audioUrl: string }) => (
    <div data-testid="audio-player">Audio: {audioUrl}</div>
  ),
}))

// Mock StructuredSummaryDisplay
vi.mock('./StructuredSummaryDisplay', () => ({
  StructuredSummaryDisplay: () => (
    <div data-testid="structured-summary">Structured Summary</div>
  ),
}))

describe('AppointmentDetailModal', () => {
  const mockAppointment: AppointmentWithPatient = {
    id: 'apt-123',
    doctor_id: 'doc-456',
    patient_id: 'pat-789',
    scheduled_time: '2024-01-15T14:30:00Z',
    duration_minutes: 30,
    status: 'completed',
    reason: 'Follow-up consultation',
    notes: null,
    created_at: '2024-01-01T00:00:00Z',
    appointment_type: 'Follow-up',
    patient: {
      id: 'pat-789',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '555-1234',
      created_at: '2024-01-01T00:00:00Z',
    },
    doctor: {
      id: 'doc-456',
      user_id: 'user-456',
      name: 'Dr. Johnson',
      email: 'doc@example.com',
      specialty: 'General Practice',
    },
  }

  const mockConsultation: Consultation = {
    id: 'cons-123',
    appointment_id: 'apt-123',
    doctor_id: 'doc-456',
    patient_id: 'pat-789',
    form_data: {},
    created_at: '2024-01-15T15:00:00Z',
    consultation_text: 'Consultation Transcript:\nPatient reports headache\n\nConsultation Summary:\nHeadache for 3 days.',
    audio_url: 'gs://bucket/audio.webm',
    diagnoses: [
      {
        diagnosis: 'Tension Headache',
        confidence: 'high',
        reasoning: 'Classic presentation',
      },
    ],
    summary_data: {
      clinical_summary: { plan: 'Follow-up in 1 week' },
    },
    prescriptions: [],
  }

  const mockOnClose = vi.fn()
  const mockOnAnalyze = vi.fn()
  const mockOnResummarize = vi.fn()
  const mockOnFillForm = vi.fn()
  const mockOnViewConsultationForm = vi.fn()
  const mockOnDelete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnResummarize.mockResolvedValue(undefined)
    mockOnFillForm.mockResolvedValue(undefined)
    mockOnDelete.mockResolvedValue(undefined)
  })

  describe('when closed', () => {
    it('returns null when not open', () => {
      const { container } = render(
        <AppointmentDetailModal
          isOpen={false}
          onClose={mockOnClose}
          appointment={mockAppointment}
          consultation={mockConsultation}
        />
      )
      expect(container.firstChild).toBeNull()
    })
  })

  describe('when open', () => {
    it('renders patient name in doctor view', () => {
      render(
        <AppointmentDetailModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          consultation={mockConsultation}
          viewMode="doctor"
        />
      )
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    it('renders doctor name in patient view', () => {
      render(
        <AppointmentDetailModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          consultation={mockConsultation}
          viewMode="patient"
        />
      )
      expect(screen.getByText('Dr. Johnson')).toBeInTheDocument()
    })

    it('renders date and time', () => {
      render(
        <AppointmentDetailModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          consultation={mockConsultation}
        />
      )
      expect(screen.getByText('15/01/2024 at 14:30')).toBeInTheDocument()
    })

    it('renders completed status badge', () => {
      render(
        <AppointmentDetailModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          consultation={mockConsultation}
        />
      )
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })

    it('renders primary diagnosis', () => {
      render(
        <AppointmentDetailModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          consultation={mockConsultation}
        />
      )
      expect(screen.getByText(/Tension Headache/)).toBeInTheDocument()
    })

    it('renders confidence badge', () => {
      render(
        <AppointmentDetailModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          consultation={mockConsultation}
        />
      )
      expect(screen.getByText('high confidence')).toBeInTheDocument()
    })

    it('renders reason', () => {
      render(
        <AppointmentDetailModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          consultation={mockConsultation}
        />
      )
      expect(screen.getByText('Reason: Follow-up consultation')).toBeInTheDocument()
    })
  })

  describe('close button', () => {
    it('calls onClose when close button clicked', async () => {
      const { user } = render(
        <AppointmentDetailModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          consultation={mockConsultation}
        />
      )

      const closeButton = screen.getByRole('button', { name: '' })
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('audio player', () => {
    it('renders audio player when audio URL exists', () => {
      render(
        <AppointmentDetailModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          consultation={mockConsultation}
        />
      )
      expect(screen.getByTestId('audio-player')).toBeInTheDocument()
    })

    it('does not render audio player when no audio URL', () => {
      const consultationNoAudio = { ...mockConsultation, audio_url: null }
      render(
        <AppointmentDetailModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          consultation={consultationNoAudio}
        />
      )
      expect(screen.queryByTestId('audio-player')).not.toBeInTheDocument()
    })
  })

  describe('action buttons in doctor view', () => {
    it('shows View Consultation Form button when available', () => {
      render(
        <AppointmentDetailModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          consultation={mockConsultation}
          viewMode="doctor"
          onViewConsultationForm={mockOnViewConsultationForm}
        />
      )
      expect(screen.getByRole('button', { name: /View Consultation Form/i })).toBeInTheDocument()
    })

    it('shows Re-summarize button when onResummarize provided', () => {
      render(
        <AppointmentDetailModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          consultation={mockConsultation}
          viewMode="doctor"
          onResummarize={mockOnResummarize}
        />
      )
      expect(screen.getByRole('button', { name: /Re-summarize/i })).toBeInTheDocument()
    })

    it('shows Fill Form button when onFillForm provided', () => {
      render(
        <AppointmentDetailModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          consultation={mockConsultation}
          viewMode="doctor"
          onFillForm={mockOnFillForm}
        />
      )
      expect(screen.getByRole('button', { name: /Fill Form/i })).toBeInTheDocument()
    })

    it('shows Delete button when isAdmin and onDelete provided', () => {
      render(
        <AppointmentDetailModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          consultation={mockConsultation}
          viewMode="doctor"
          isAdmin={true}
          onDelete={mockOnDelete}
          onResummarize={mockOnResummarize} // Need at least one action callback to render the action buttons div
        />
      )
      expect(screen.getByRole('button', { name: /Delete Appointment/i })).toBeInTheDocument()
    })

    it('does not show Delete button when not admin', () => {
      render(
        <AppointmentDetailModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          consultation={mockConsultation}
          viewMode="doctor"
          isAdmin={false}
          onDelete={mockOnDelete}
        />
      )
      expect(screen.queryByRole('button', { name: /Delete Appointment/i })).not.toBeInTheDocument()
    })
  })

  describe('no consultation', () => {
    it('shows no consultation message when null', () => {
      render(
        <AppointmentDetailModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          consultation={null}
        />
      )
      expect(screen.getByText(/No consultation record found/i)).toBeInTheDocument()
    })
  })

  describe('structured summary', () => {
    it('renders structured summary when summary_data exists', () => {
      render(
        <AppointmentDetailModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          consultation={mockConsultation}
        />
      )
      expect(screen.getByTestId('structured-summary')).toBeInTheDocument()
    })
  })

  describe('doctor specialty in patient view', () => {
    it('shows doctor specialty in patient view', () => {
      render(
        <AppointmentDetailModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          consultation={mockConsultation}
          viewMode="patient"
        />
      )
      expect(screen.getByText('General Practice')).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('has modal overlay', () => {
      const { container } = render(
        <AppointmentDetailModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          consultation={mockConsultation}
        />
      )
      const overlay = container.firstChild as HTMLElement
      expect(overlay).toHaveClass('fixed')
      expect(overlay).toHaveClass('inset-0')
      expect(overlay).toHaveClass('bg-black')
      expect(overlay).toHaveClass('bg-opacity-50')
    })

    it('has modal content styling', () => {
      const { container } = render(
        <AppointmentDetailModal
          isOpen={true}
          onClose={mockOnClose}
          appointment={mockAppointment}
          consultation={mockConsultation}
        />
      )
      const content = container.querySelector('.bg-white.rounded-\\[20px\\]')
      expect(content).toBeInTheDocument()
    })
  })
})
