import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test/utils/render'
import { ConsultationHistoryCard } from './ConsultationHistoryCard'
import { Consultation } from '../types/database'

// Mock dateHelpers
vi.mock('../utils/dateHelpers', () => ({
  formatDateUK: vi.fn(() => '15/01/2024'),
  formatTime24: vi.fn(() => '14:30'),
  formatDuration: vi.fn(() => '15 min'),
}))

describe('ConsultationHistoryCard', () => {
  const mockConsultation: Consultation = {
    id: 'cons-123',
    appointment_id: 'apt-123',
    doctor_id: 'doc-456',
    patient_id: 'pat-789',
    form_data: {},
    created_at: '2024-01-15T14:30:00Z',
    consultation_duration_seconds: 900,
    consultation_text: 'Consultation Transcript:\nPatient complains of headache\n\nConsultation Summary:\nHeadache for 3 days, no red flags.',
    diagnoses: [
      {
        diagnosis: 'Tension Headache',
        confidence: 'high',
        reasoning: 'Classic presentation with bilateral pain',
        primary_care: {
          medications: [
            { name: 'Paracetamol', dose: '1g', frequency: 'QDS' }
          ],
          supportive_care: ['Rest', 'Hydration']
        }
      },
      {
        diagnosis: 'Migraine',
        confidence: 'medium',
        reasoning: 'Alternative if symptoms persist'
      }
    ],
    prescriptions: [],
    summary_data: {
      recommendations_given: ['Rest', 'Hydration'],
      clinical_summary: {
        plan: 'Follow-up in 1 week if symptoms persist',
        investigations_ordered: ['Full blood count'],
        investigations_reviewed: ['Previous MRI - normal']
      }
    },
    guidelines_found: ['NICE NG150', 'CKS Headache'],
    patient_snapshot: {
      age: '35',
      allergies: 'NKDA',
      current_medications: 'None'
    }
  }

  const mockOnDelete = vi.fn()
  const mockOnAnalyze = vi.fn()
  const mockOnResummarize = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnDelete.mockResolvedValue(true)
    mockOnResummarize.mockResolvedValue(undefined)
  })

  describe('collapsed state', () => {
    it('renders date and time', () => {
      render(<ConsultationHistoryCard consultation={mockConsultation} />)
      expect(screen.getByText('15/01/2024 at 14:30')).toBeInTheDocument()
    })

    it('renders completed status badge', () => {
      render(<ConsultationHistoryCard consultation={mockConsultation} />)
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })

    it('renders primary diagnosis', () => {
      render(<ConsultationHistoryCard consultation={mockConsultation} />)
      expect(screen.getByText('Tension Headache')).toBeInTheDocument()
    })

    it('renders confidence badge', () => {
      render(<ConsultationHistoryCard consultation={mockConsultation} />)
      expect(screen.getByText('high confidence')).toBeInTheDocument()
    })

    it('renders duration', () => {
      render(<ConsultationHistoryCard consultation={mockConsultation} />)
      expect(screen.getByText('Duration: 15 min')).toBeInTheDocument()
    })

    it('shows No diagnosis recorded when no diagnoses', () => {
      const consultationNoDiagnosis = { ...mockConsultation, diagnoses: [] }
      render(<ConsultationHistoryCard consultation={consultationNoDiagnosis} />)
      expect(screen.getByText('No diagnosis recorded')).toBeInTheDocument()
    })
  })

  describe('expand/collapse', () => {
    it('expands when clicked', async () => {
      const { user } = render(<ConsultationHistoryCard consultation={mockConsultation} />)

      // Click the main card button (first button)
      const buttons = screen.getAllByRole('button')
      await user.click(buttons[0])

      expect(screen.getByText('Consultation Transcript')).toBeInTheDocument()
    })

    it('collapses when clicked again', async () => {
      const { user } = render(<ConsultationHistoryCard consultation={mockConsultation} />)

      // Click to expand
      const buttons = screen.getAllByRole('button')
      await user.click(buttons[0])
      expect(screen.getByText('Consultation Transcript')).toBeInTheDocument()

      // Get buttons again after expand (the main button is still first)
      const expandedButtons = screen.getAllByRole('button')
      await user.click(expandedButtons[0])
      expect(screen.queryByText('Consultation Transcript')).not.toBeInTheDocument()
    })
  })

  describe('expanded content', () => {
    const expandCard = async (user: any) => {
      const buttons = screen.getAllByRole('button')
      await user.click(buttons[0])
    }

    it('shows transcript section', async () => {
      const { user } = render(<ConsultationHistoryCard consultation={mockConsultation} />)

      await expandCard(user)

      expect(screen.getByText('Consultation Transcript')).toBeInTheDocument()
    })

    it('shows summary section', async () => {
      const { user } = render(<ConsultationHistoryCard consultation={mockConsultation} />)

      await expandCard(user)

      expect(screen.getByText('Consultation Summary')).toBeInTheDocument()
    })

    it('shows treatments section', async () => {
      const { user } = render(<ConsultationHistoryCard consultation={mockConsultation} />)

      await expandCard(user)

      expect(screen.getByText('Treatments')).toBeInTheDocument()
    })

    it('shows AI treatments section', async () => {
      const { user } = render(<ConsultationHistoryCard consultation={mockConsultation} />)

      await expandCard(user)

      expect(screen.getByText('AI Treatments')).toBeInTheDocument()
    })

    it('shows AI-assisted diagnosis section', async () => {
      const { user } = render(<ConsultationHistoryCard consultation={mockConsultation} />)

      await expandCard(user)

      expect(screen.getByText('AI-Assisted Diagnosis')).toBeInTheDocument()
    })

    it('shows alternative diagnoses', async () => {
      const { user } = render(<ConsultationHistoryCard consultation={mockConsultation} />)

      await expandCard(user)

      expect(screen.getByText('Alternative Diagnoses (1)')).toBeInTheDocument()
      expect(screen.getByText('Migraine')).toBeInTheDocument()
    })
  })

  describe('investigations section', () => {
    const expandCard = async (user: any) => {
      const buttons = screen.getAllByRole('button')
      await user.click(buttons[0])
    }

    it('shows investigations ordered', async () => {
      const { user } = render(<ConsultationHistoryCard consultation={mockConsultation} />)

      await expandCard(user)

      expect(screen.getByText('Investigations')).toBeInTheDocument()
      expect(screen.getByText('Investigations Ordered:')).toBeInTheDocument()
      expect(screen.getByText('Full blood count')).toBeInTheDocument()
    })

    it('shows investigations reviewed', async () => {
      const { user } = render(<ConsultationHistoryCard consultation={mockConsultation} />)

      await expandCard(user)

      expect(screen.getByText('Investigations Reviewed:')).toBeInTheDocument()
      expect(screen.getByText('Previous MRI - normal')).toBeInTheDocument()
    })
  })

  describe('AI medications', () => {
    const expandCard = async (user: any) => {
      const buttons = screen.getAllByRole('button')
      await user.click(buttons[0])
    }

    it('shows AI recommended medications', async () => {
      const { user } = render(<ConsultationHistoryCard consultation={mockConsultation} />)

      await expandCard(user)

      expect(screen.getByText('Paracetamol')).toBeInTheDocument()
    })

    it('shows supportive care', async () => {
      const { user } = render(<ConsultationHistoryCard consultation={mockConsultation} />)

      await expandCard(user)

      expect(screen.getByText('Supportive Care:')).toBeInTheDocument()
    })
  })

  describe('guidelines', () => {
    it('shows guidelines referenced', async () => {
      const { user } = render(<ConsultationHistoryCard consultation={mockConsultation} />)

      const buttons = screen.getAllByRole('button')
      await user.click(buttons[0])

      expect(screen.getByText('Clinical Guidelines Referenced (2)')).toBeInTheDocument()
    })
  })

  describe('patient snapshot', () => {
    it('shows patient details at consultation time', async () => {
      const { user } = render(<ConsultationHistoryCard consultation={mockConsultation} />)

      const buttons = screen.getAllByRole('button')
      await user.click(buttons[0])

      expect(screen.getByText('Patient Details (at time of consultation)')).toBeInTheDocument()
      expect(screen.getByText('Age: 35')).toBeInTheDocument()
      expect(screen.getByText('Allergies: NKDA')).toBeInTheDocument()
    })
  })

  describe('delete functionality', () => {
    it('shows delete button when onDelete provided', async () => {
      const { user } = render(
        <ConsultationHistoryCard consultation={mockConsultation} onDelete={mockOnDelete} />
      )

      const buttons = screen.getAllByRole('button')
      await user.click(buttons[0])

      expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument()
    })

    it('does not show delete button when onDelete not provided', async () => {
      const { user } = render(<ConsultationHistoryCard consultation={mockConsultation} />)

      const buttons = screen.getAllByRole('button')
      await user.click(buttons[0])

      expect(screen.queryByRole('button', { name: /Delete/i })).not.toBeInTheDocument()
    })
  })

  describe('analyze functionality', () => {
    it('shows analyze button when no AI analysis exists', async () => {
      const consultationNoAnalysis = { ...mockConsultation, diagnoses: [] }
      const { user } = render(
        <ConsultationHistoryCard consultation={consultationNoAnalysis} onAnalyze={mockOnAnalyze} />
      )

      const buttons = screen.getAllByRole('button')
      await user.click(buttons[0])

      const analyzeButtons = screen.getAllByRole('button', { name: /AI Analysis/i })
      expect(analyzeButtons.length).toBeGreaterThanOrEqual(1)
    })

    it('shows prompt to run AI analysis when not analyzed', async () => {
      const consultationNoAnalysis = { ...mockConsultation, diagnoses: [] }
      const { user } = render(
        <ConsultationHistoryCard consultation={consultationNoAnalysis} onAnalyze={mockOnAnalyze} />
      )

      const buttons = screen.getAllByRole('button')
      await user.click(buttons[0])

      expect(screen.getByText('AI Analysis Not Yet Performed')).toBeInTheDocument()
    })
  })

  describe('re-summarize functionality', () => {
    it('shows re-summarize button when onResummarize provided', async () => {
      const { user } = render(
        <ConsultationHistoryCard
          consultation={mockConsultation}
          onResummarize={mockOnResummarize}
        />
      )

      const buttons = screen.getAllByRole('button')
      await user.click(buttons[0])

      expect(screen.getByRole('button', { name: /Re-summarize/i })).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('has card styling', () => {
      const { container } = render(<ConsultationHistoryCard consultation={mockConsultation} />)
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('bg-white')
      expect(wrapper).toHaveClass('rounded-[16px]')
      expect(wrapper).toHaveClass('border-2')
      expect(wrapper).toHaveClass('border-aneya-teal')
    })
  })

  describe('transcript parsing', () => {
    it('parses separate transcript and summary correctly', async () => {
      const { user } = render(<ConsultationHistoryCard consultation={mockConsultation} />)

      const buttons = screen.getAllByRole('button')
      await user.click(buttons[0])

      // Click to expand transcript
      const transcriptButton = screen.getByText('Consultation Transcript').closest('button')
      await user.click(transcriptButton!)

      expect(screen.getByText('Patient complains of headache')).toBeInTheDocument()
    })

    it('shows summary from parsed text', async () => {
      const { user } = render(<ConsultationHistoryCard consultation={mockConsultation} />)

      const buttons = screen.getAllByRole('button')
      await user.click(buttons[0])

      expect(screen.getByText('Headache for 3 days, no red flags.')).toBeInTheDocument()
    })
  })
})
