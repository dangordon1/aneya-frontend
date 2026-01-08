import { describe, it, expect } from 'vitest'
import { render, screen } from '../test/utils/render'
import { WarningBox } from './WarningBox'

describe('WarningBox', () => {
  describe('rendering', () => {
    it('renders children content correctly', () => {
      render(<WarningBox>Test warning message</WarningBox>)
      expect(screen.getByText('Test warning message')).toBeInTheDocument()
    })

    it('renders with custom className', () => {
      const { container } = render(
        <WarningBox className="custom-class">Warning content</WarningBox>
      )
      const warningBox = container.firstChild as HTMLElement
      expect(warningBox).toHaveClass('custom-class')
    })

    it('renders with default styling', () => {
      const { container } = render(<WarningBox>Warning</WarningBox>)
      const warningBox = container.firstChild as HTMLElement
      expect(warningBox).toHaveClass('bg-aneya-warning-bg')
      expect(warningBox).toHaveClass('border-2')
      expect(warningBox).toHaveClass('rounded-[16px]')
    })

    it('renders the AlertTriangle icon', () => {
      const { container } = render(<WarningBox>Warning</WarningBox>)
      // Lucide icons render as SVG elements
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('renders complex children (React nodes)', () => {
      render(
        <WarningBox>
          <strong>Important:</strong> Please read this carefully
        </WarningBox>
      )
      expect(screen.getByText('Important:')).toBeInTheDocument()
      expect(screen.getByText('Please read this carefully')).toBeInTheDocument()
    })
  })
})
