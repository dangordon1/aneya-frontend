import { describe, it, expect } from 'vitest'
import { render, screen } from '../test/utils/render'
import { MedicationBox } from './MedicationBox'

describe('MedicationBox', () => {
  const defaultProps = {
    drugName: 'Paracetamol',
    dose: '500mg',
    route: 'Oral',
    duration: '5 days',
  }

  describe('rendering', () => {
    it('renders drug name correctly', () => {
      render(<MedicationBox {...defaultProps} />)
      expect(screen.getByText('Paracetamol')).toBeInTheDocument()
    })

    it('renders dose information', () => {
      render(<MedicationBox {...defaultProps} />)
      expect(screen.getByText('500mg')).toBeInTheDocument()
      expect(screen.getByText('Dose:')).toBeInTheDocument()
    })

    it('renders route information', () => {
      render(<MedicationBox {...defaultProps} />)
      expect(screen.getByText('Oral')).toBeInTheDocument()
      expect(screen.getByText('Route:')).toBeInTheDocument()
    })

    it('renders duration information', () => {
      render(<MedicationBox {...defaultProps} />)
      expect(screen.getByText('5 days')).toBeInTheDocument()
      expect(screen.getByText('Duration:')).toBeInTheDocument()
    })

    it('renders with custom className', () => {
      const { container } = render(
        <MedicationBox {...defaultProps} className="custom-class" />
      )
      const medicationBox = container.firstChild as HTMLElement
      expect(medicationBox).toHaveClass('custom-class')
    })

    it('renders with default styling', () => {
      const { container } = render(<MedicationBox {...defaultProps} />)
      const medicationBox = container.firstChild as HTMLElement
      expect(medicationBox).toHaveClass('bg-white')
      expect(medicationBox).toHaveClass('rounded-[16px]')
      expect(medicationBox).toHaveClass('border')
    })
  })

  describe('optional fields', () => {
    it('renders notes when provided', () => {
      render(<MedicationBox {...defaultProps} notes="Take with food" />)
      expect(screen.getByText('Notes:')).toBeInTheDocument()
      expect(screen.getByText('Take with food')).toBeInTheDocument()
    })

    it('does not render notes when not provided', () => {
      render(<MedicationBox {...defaultProps} />)
      expect(screen.queryByText('Notes:')).not.toBeInTheDocument()
    })

    it('renders drug interactions when provided', () => {
      render(
        <MedicationBox
          {...defaultProps}
          drugInteractions="Avoid with warfarin"
        />
      )
      expect(screen.getByText('Drug Interactions:')).toBeInTheDocument()
      expect(screen.getByText('Avoid with warfarin')).toBeInTheDocument()
    })

    it('does not render drug interactions when not provided', () => {
      render(<MedicationBox {...defaultProps} />)
      expect(screen.queryByText('Drug Interactions:')).not.toBeInTheDocument()
    })
  })

  describe('BNF URL linking', () => {
    it('renders as link when valid bnfUrl is provided', () => {
      render(
        <MedicationBox
          {...defaultProps}
          bnfUrl="https://bnf.nice.org.uk/drugs/paracetamol"
        />
      )
      const link = screen.getByRole('link', { name: /Paracetamol/i })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute(
        'href',
        'https://bnf.nice.org.uk/drugs/paracetamol'
      )
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('renders ExternalLink icon when bnfUrl is provided', () => {
      const { container } = render(
        <MedicationBox
          {...defaultProps}
          bnfUrl="https://bnf.nice.org.uk/drugs/paracetamol"
        />
      )
      // Lucide icons render as SVG
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('renders as plain text when bnfUrl is "#"', () => {
      render(<MedicationBox {...defaultProps} bnfUrl="#" />)
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
      expect(screen.getByText('Paracetamol')).toBeInTheDocument()
    })

    it('renders as plain text when bnfUrl is not provided', () => {
      render(<MedicationBox {...defaultProps} />)
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
      expect(screen.getByText('Paracetamol')).toBeInTheDocument()
    })

    it('renders as plain text when bnfUrl is empty string', () => {
      render(<MedicationBox {...defaultProps} bnfUrl="" />)
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
    })
  })

  describe('complete medication display', () => {
    it('renders all fields when provided', () => {
      render(
        <MedicationBox
          drugName="Ibuprofen"
          dose="400mg"
          route="Oral"
          duration="7 days"
          notes="Take after meals"
          drugInteractions="Caution with aspirin"
          bnfUrl="https://bnf.nice.org.uk/drugs/ibuprofen"
        />
      )

      expect(screen.getByRole('link', { name: /Ibuprofen/i })).toBeInTheDocument()
      expect(screen.getByText('400mg')).toBeInTheDocument()
      expect(screen.getByText('Oral')).toBeInTheDocument()
      expect(screen.getByText('7 days')).toBeInTheDocument()
      expect(screen.getByText('Take after meals')).toBeInTheDocument()
      expect(screen.getByText('Caution with aspirin')).toBeInTheDocument()
    })
  })
})
