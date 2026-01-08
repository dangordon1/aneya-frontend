import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../test/utils/render'
import userEvent from '@testing-library/user-event'
import { DiagnosisCard } from './DiagnosisCard'

// Mock the DrugDetailDropdown component to simplify testing
vi.mock('./DrugDetailDropdown', () => ({
  DrugDetailDropdown: ({ drugName }: { drugName: string }) => (
    <div data-testid="drug-dropdown">{drugName}</div>
  ),
}))

describe('DiagnosisCard', () => {
  const defaultProps = {
    diagnosisNumber: 1,
    diagnosis: 'Acute Tonsillitis',
  }

  describe('rendering', () => {
    it('renders diagnosis title correctly', () => {
      render(<DiagnosisCard {...defaultProps} />)
      expect(screen.getByText('Acute Tonsillitis')).toBeInTheDocument()
    })

    it('renders as Primary Diagnosis when isPrimary is true', () => {
      render(<DiagnosisCard {...defaultProps} isPrimary />)
      expect(screen.getByText('Primary Diagnosis')).toBeInTheDocument()
    })

    it('renders as Alternative Diagnosis with number when isPrimary is false', () => {
      render(<DiagnosisCard {...defaultProps} diagnosisNumber={2} />)
      expect(screen.getByText('Alternative Diagnosis 2')).toBeInTheDocument()
    })

    it('renders source information when provided', () => {
      render(<DiagnosisCard {...defaultProps} source="NICE Guidelines" />)
      expect(screen.getByText('Source: NICE Guidelines')).toBeInTheDocument()
    })

    it('renders with custom className', () => {
      const { container } = render(
        <DiagnosisCard {...defaultProps} className="custom-class" />
      )
      const card = container.firstChild as HTMLElement
      expect(card).toHaveClass('custom-class')
    })
  })

  describe('confidence badge', () => {
    it('renders high confidence badge with green styling', () => {
      render(<DiagnosisCard {...defaultProps} confidence="high" />)
      const badge = screen.getByText('high confidence')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('bg-green-100')
      expect(badge).toHaveClass('text-green-700')
    })

    it('renders medium confidence badge with yellow styling', () => {
      render(<DiagnosisCard {...defaultProps} confidence="medium" />)
      const badge = screen.getByText('medium confidence')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('bg-yellow-100')
      expect(badge).toHaveClass('text-yellow-700')
    })

    it('renders low confidence badge with red styling', () => {
      render(<DiagnosisCard {...defaultProps} confidence="low" />)
      const badge = screen.getByText('low confidence')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('bg-red-100')
      expect(badge).toHaveClass('text-red-700')
    })

    it('does not render confidence badge when not provided', () => {
      render(<DiagnosisCard {...defaultProps} />)
      expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument()
    })
  })

  describe('expansion behavior', () => {
    it('is expanded by default when isPrimary is true', () => {
      render(
        <DiagnosisCard
          {...defaultProps}
          isPrimary
          summary="This is the summary"
        />
      )
      expect(screen.getByText('This is the summary')).toBeInTheDocument()
    })

    it('is collapsed by default when isPrimary is false', () => {
      render(
        <DiagnosisCard {...defaultProps} summary="This is the summary" />
      )
      expect(screen.queryByText('This is the summary')).not.toBeInTheDocument()
    })

    it('toggles content visibility on click', async () => {
      const user = userEvent.setup()
      render(
        <DiagnosisCard {...defaultProps} summary="Expandable summary" />
      )

      // Initially collapsed
      expect(screen.queryByText('Expandable summary')).not.toBeInTheDocument()

      // Click to expand
      const header = screen.getByRole('button')
      await user.click(header)
      expect(screen.getByText('Expandable summary')).toBeInTheDocument()

      // Click to collapse
      await user.click(header)
      expect(screen.queryByText('Expandable summary')).not.toBeInTheDocument()
    })

    it('shows chevron up icon when expanded', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <DiagnosisCard {...defaultProps} summary="Test" />
      )

      // Click to expand
      await user.click(screen.getByRole('button'))

      // Should have the ChevronUp icon visible
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(0)
    })
  })

  describe('guideline URL', () => {
    it('renders guideline link when url is provided', async () => {
      const user = userEvent.setup()
      render(
        <DiagnosisCard
          {...defaultProps}
          url="https://nice.org.uk/guidance/test"
        />
      )

      // Expand the card first
      await user.click(screen.getByRole('button'))

      const link = screen.getByRole('link', { name: /View full guideline/i })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', 'https://nice.org.uk/guidance/test')
      expect(link).toHaveAttribute('target', '_blank')
    })
  })

  describe('primary care section', () => {
    it('renders medications when primary_care.medications is provided', async () => {
      const user = userEvent.setup()
      render(
        <DiagnosisCard
          {...defaultProps}
          primary_care={{
            medications: ['Paracetamol 500mg', 'Ibuprofen 400mg'],
            supportive_care: [],
            when_to_escalate: [],
          }}
        />
      )

      // Expand the card
      await user.click(screen.getByRole('button'))

      expect(screen.getByText('Primary Care Management')).toBeInTheDocument()
      expect(screen.getByText('Medications')).toBeInTheDocument()
      // Check for mocked DrugDetailDropdown
      expect(screen.getAllByTestId('drug-dropdown')).toHaveLength(2)
    })

    it('renders supportive care list when provided', async () => {
      const user = userEvent.setup()
      render(
        <DiagnosisCard
          {...defaultProps}
          primary_care={{
            medications: [],
            supportive_care: ['Rest', 'Hydration', 'Warm fluids'],
            when_to_escalate: [],
          }}
        />
      )

      await user.click(screen.getByRole('button'))

      expect(screen.getByText('Supportive Care')).toBeInTheDocument()
      expect(screen.getByText('Rest')).toBeInTheDocument()
      expect(screen.getByText('Hydration')).toBeInTheDocument()
      expect(screen.getByText('Warm fluids')).toBeInTheDocument()
    })

    it('renders clinical guidance when provided', async () => {
      const user = userEvent.setup()
      render(
        <DiagnosisCard
          {...defaultProps}
          primary_care={{
            medications: [],
            supportive_care: [],
            clinical_guidance: 'Monitor symptoms for 48 hours',
            when_to_escalate: [],
          }}
        />
      )

      await user.click(screen.getByRole('button'))

      expect(screen.getByText('Clinical Guidance')).toBeInTheDocument()
      expect(
        screen.getByText('Monitor symptoms for 48 hours')
      ).toBeInTheDocument()
    })

    it('renders escalation warning when when_to_escalate is provided', async () => {
      const user = userEvent.setup()
      render(
        <DiagnosisCard
          {...defaultProps}
          primary_care={{
            medications: [],
            supportive_care: [],
            when_to_escalate: ['Difficulty breathing', 'High fever persists'],
          }}
        />
      )

      await user.click(screen.getByRole('button'))

      expect(screen.getByText('When to Seek Further Care')).toBeInTheDocument()
      expect(screen.getByText('Difficulty breathing')).toBeInTheDocument()
      expect(screen.getByText('High fever persists')).toBeInTheDocument()
    })
  })

  describe('diagnostics section', () => {
    it('renders required investigations when diagnostics is provided', async () => {
      const user = userEvent.setup()
      render(
        <DiagnosisCard
          {...defaultProps}
          diagnostics={{
            required: ['FBC', 'CRP'],
            monitoring: ['Vital signs'],
            referral_criteria: ['No improvement in 48h'],
          }}
        />
      )

      await user.click(screen.getByRole('button'))

      expect(screen.getByText('Diagnostic Workup')).toBeInTheDocument()
      expect(screen.getByText('Required Investigations')).toBeInTheDocument()
      expect(screen.getByText('FBC')).toBeInTheDocument()
      expect(screen.getByText('CRP')).toBeInTheDocument()
    })

    it('renders monitoring and referral criteria', async () => {
      const user = userEvent.setup()
      render(
        <DiagnosisCard
          {...defaultProps}
          diagnostics={{
            required: [],
            monitoring: ['Temperature check twice daily'],
            referral_criteria: ['Refer if symptoms worsen'],
          }}
        />
      )

      await user.click(screen.getByRole('button'))

      expect(screen.getByText('Monitoring')).toBeInTheDocument()
      expect(
        screen.getByText('Temperature check twice daily')
      ).toBeInTheDocument()
      expect(screen.getByText('Refer if symptoms worsen')).toBeInTheDocument()
    })
  })

  describe('follow-up section', () => {
    it('renders follow-up information when provided', async () => {
      const user = userEvent.setup()
      render(
        <DiagnosisCard
          {...defaultProps}
          follow_up={{
            timeframe: 'Review in 1 week',
            monitoring: ['Check symptoms', 'Assess improvement'],
            referral_criteria: ['If no improvement after treatment'],
          }}
        />
      )

      await user.click(screen.getByRole('button'))

      expect(screen.getByText('Follow-up Care')).toBeInTheDocument()
      expect(screen.getByText('Timeframe:')).toBeInTheDocument()
      expect(screen.getByText('Review in 1 week')).toBeInTheDocument()
    })
  })

  describe('surgery section', () => {
    it('renders surgery section when surgery is indicated', async () => {
      const user = userEvent.setup()
      render(
        <DiagnosisCard
          {...defaultProps}
          surgery={{
            indicated: true,
            procedure: 'Tonsillectomy',
            phases: {
              preoperative: {
                investigations: ['Blood tests'],
                medications: ['Prophylactic antibiotics'],
                preparation: ['Nil by mouth'],
              },
              operative: {
                technique: 'Cold steel technique',
                anesthesia: 'General anesthesia',
                duration: '45 minutes',
              },
              postoperative: {
                immediate_care: ['Pain management'],
                medications: ['Paracetamol'],
                mobilization: 'Same day',
                complications: ['Bleeding'],
              },
            },
          }}
        />
      )

      await user.click(screen.getByRole('button'))

      expect(
        screen.getByText('Surgical Management: Tonsillectomy')
      ).toBeInTheDocument()
      expect(screen.getByText('Pre-operative')).toBeInTheDocument()
      expect(screen.getByText('Operative')).toBeInTheDocument()
      expect(screen.getByText('Post-operative')).toBeInTheDocument()
    })

    it('does not render surgery section when not indicated', async () => {
      const user = userEvent.setup()
      render(
        <DiagnosisCard
          {...defaultProps}
          surgery={{
            indicated: false,
            procedure: '',
            phases: {
              preoperative: {
                investigations: [],
                medications: [],
                preparation: [],
              },
              operative: {
                technique: '',
                anesthesia: '',
              },
              postoperative: {
                immediate_care: [],
                medications: [],
              },
            },
          }}
        />
      )

      await user.click(screen.getByRole('button'))

      expect(screen.queryByText('Surgical Management')).not.toBeInTheDocument()
    })
  })
})
