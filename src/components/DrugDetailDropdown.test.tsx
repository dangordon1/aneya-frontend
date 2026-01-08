import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../test/utils/render'
import { DrugDetailDropdown } from './DrugDetailDropdown'

describe('DrugDetailDropdown', () => {
  describe('collapsed state', () => {
    it('renders drug name', () => {
      render(<DrugDetailDropdown drugName="Paracetamol" />)
      expect(screen.getByText('Paracetamol')).toBeInTheDocument()
    })

    it('shows loading indicator when details undefined', () => {
      render(<DrugDetailDropdown drugName="Paracetamol" details={undefined} />)
      expect(screen.getByText('(loading...)')).toBeInTheDocument()
    })

    it('does not show loading indicator when details loaded', () => {
      render(
        <DrugDetailDropdown
          drugName="Paracetamol"
          details={{ bnf_data: {}, drugbank_data: null, url: null }}
        />
      )
      expect(screen.queryByText('(loading...)')).not.toBeInTheDocument()
    })

    it('shows chevron down icon', () => {
      const { container } = render(<DrugDetailDropdown drugName="Paracetamol" />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })
  })

  describe('expand/collapse behavior', () => {
    it('expands when clicked', async () => {
      const { user } = render(
        <DrugDetailDropdown
          drugName="Paracetamol"
          details={{
            bnf_data: { dosage: '500mg-1g every 4-6 hours' },
            drugbank_data: null,
            url: 'https://bnf.nice.org.uk/drugs/paracetamol',
          }}
        />
      )

      await user.click(screen.getByRole('button'))

      expect(screen.getByText('Dosage')).toBeInTheDocument()
    })

    it('collapses when clicked again', async () => {
      const { user } = render(
        <DrugDetailDropdown
          drugName="Paracetamol"
          details={{
            bnf_data: { dosage: '500mg-1g every 4-6 hours' },
            drugbank_data: null,
            url: null,
          }}
        />
      )

      await user.click(screen.getByRole('button'))
      expect(screen.getByText('Dosage')).toBeInTheDocument()

      await user.click(screen.getByRole('button'))
      expect(screen.queryByText('Dosage')).not.toBeInTheDocument()
    })

    it('calls onExpand when first expanded', async () => {
      const onExpand = vi.fn()
      const { user } = render(
        <DrugDetailDropdown drugName="Paracetamol" onExpand={onExpand} />
      )

      await user.click(screen.getByRole('button'))

      expect(onExpand).toHaveBeenCalledTimes(1)
    })

    it('does not call onExpand when collapsing', async () => {
      const onExpand = vi.fn()
      const { user } = render(
        <DrugDetailDropdown
          drugName="Paracetamol"
          onExpand={onExpand}
          details={{ bnf_data: {}, drugbank_data: null, url: null }}
        />
      )

      await user.click(screen.getByRole('button'))
      expect(onExpand).toHaveBeenCalledTimes(1)

      await user.click(screen.getByRole('button'))
      expect(onExpand).toHaveBeenCalledTimes(1) // Still 1, not called on collapse
    })
  })

  describe('loading state', () => {
    it('shows loading spinner when expanded with undefined details', async () => {
      const { user } = render(
        <DrugDetailDropdown drugName="Paracetamol" details={undefined} />
      )

      await user.click(screen.getByRole('button'))

      expect(screen.getByText('Loading drug details...')).toBeInTheDocument()
    })

    it('shows loading spinner animation', async () => {
      const { user, container } = render(
        <DrugDetailDropdown drugName="Paracetamol" details={undefined} />
      )

      await user.click(screen.getByRole('button'))

      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })
  })

  describe('failed state', () => {
    it('shows error message when details is null', async () => {
      const { user } = render(
        <DrugDetailDropdown drugName="Paracetamol" details={null} />
      )

      await user.click(screen.getByRole('button'))

      expect(
        screen.getByText(/Could not load details for this medication/)
      ).toBeInTheDocument()
    })
  })

  describe('loaded state with BNF data', () => {
    const bnfDetails = {
      bnf_data: {
        dosage: '500mg-1g every 4-6 hours',
        side_effects: 'Rare: skin rashes',
        interactions: 'Warfarin: increased INR',
      },
      drugbank_data: null,
      url: 'https://bnf.nice.org.uk/drugs/paracetamol',
    }

    it('shows dosage information', async () => {
      const { user } = render(
        <DrugDetailDropdown drugName="Paracetamol" details={bnfDetails} />
      )

      await user.click(screen.getByRole('button'))

      expect(screen.getByText('Dosage')).toBeInTheDocument()
      expect(screen.getByText('500mg-1g every 4-6 hours')).toBeInTheDocument()
    })

    it('shows side effects', async () => {
      const { user } = render(
        <DrugDetailDropdown drugName="Paracetamol" details={bnfDetails} />
      )

      await user.click(screen.getByRole('button'))

      expect(screen.getByText('Side Effects')).toBeInTheDocument()
      expect(screen.getByText('Rare: skin rashes')).toBeInTheDocument()
    })

    it('shows drug interactions', async () => {
      const { user } = render(
        <DrugDetailDropdown drugName="Paracetamol" details={bnfDetails} />
      )

      await user.click(screen.getByRole('button'))

      expect(screen.getByText('Drug Interactions')).toBeInTheDocument()
      expect(screen.getByText('Warfarin: increased INR')).toBeInTheDocument()
    })

    it('shows BNF link', async () => {
      const { user } = render(
        <DrugDetailDropdown drugName="Paracetamol" details={bnfDetails} />
      )

      await user.click(screen.getByRole('button'))

      const link = screen.getByRole('link', { name: /View full details on BNF/i })
      expect(link).toHaveAttribute('href', 'https://bnf.nice.org.uk/drugs/paracetamol')
      expect(link).toHaveAttribute('target', '_blank')
    })
  })

  describe('loaded state with DrugBank data', () => {
    const drugbankDetails = {
      bnf_data: null,
      drugbank_data: {
        dosage: 'Take 500mg orally',
        side_effects: 'Nausea, headache',
        interactions: 'Alcohol may increase liver toxicity',
      },
      url: 'https://drugbank.com/paracetamol',
    }

    it('shows DrugBank link when no BNF data', async () => {
      const { user } = render(
        <DrugDetailDropdown drugName="Paracetamol" details={drugbankDetails} />
      )

      await user.click(screen.getByRole('button'))

      const link = screen.getByRole('link', { name: /View full details on DrugBank/i })
      expect(link).toBeInTheDocument()
    })

    it('uses DrugBank data when BNF not available', async () => {
      const { user } = render(
        <DrugDetailDropdown drugName="Paracetamol" details={drugbankDetails} />
      )

      await user.click(screen.getByRole('button'))

      expect(screen.getByText('Take 500mg orally')).toBeInTheDocument()
    })
  })

  describe('data priority', () => {
    it('prefers BNF data over DrugBank when both available', async () => {
      const { user } = render(
        <DrugDetailDropdown
          drugName="Paracetamol"
          details={{
            bnf_data: { dosage: 'BNF dosage' },
            drugbank_data: { dosage: 'DrugBank dosage' },
            url: null,
          }}
        />
      )

      await user.click(screen.getByRole('button'))

      expect(screen.getByText('BNF dosage')).toBeInTheDocument()
      expect(screen.queryByText('DrugBank dosage')).not.toBeInTheDocument()
    })

    it('falls back to DrugBank when BNF field is "Not specified"', async () => {
      const { user } = render(
        <DrugDetailDropdown
          drugName="Paracetamol"
          details={{
            bnf_data: { dosage: 'Not specified' },
            drugbank_data: { dosage: 'DrugBank dosage info' },
            url: null,
          }}
        />
      )

      await user.click(screen.getByRole('button'))

      expect(screen.getByText('DrugBank dosage info')).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('has proper button styling', () => {
      render(<DrugDetailDropdown drugName="Paracetamol" />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('border')
      expect(button).toHaveClass('rounded-lg')
    })
  })
})
