import { describe, it, expect } from 'vitest'
import { render, screen } from '../test/utils/render'
import userEvent from '@testing-library/user-event'
import { CollapsibleSection } from './CollapsibleSection'
import { AlertTriangle } from 'lucide-react'

describe('CollapsibleSection', () => {
  describe('rendering', () => {
    it('renders title correctly', () => {
      render(
        <CollapsibleSection title="Section Title">
          <p>Content</p>
        </CollapsibleSection>
      )
      expect(screen.getByText('Section Title')).toBeInTheDocument()
    })

    it('renders badge when provided', () => {
      render(
        <CollapsibleSection title="With Badge" badge="5">
          <p>Content</p>
        </CollapsibleSection>
      )
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('renders numeric badge when provided', () => {
      render(
        <CollapsibleSection title="Numeric Badge" badge={10}>
          <p>Content</p>
        </CollapsibleSection>
      )
      expect(screen.getByText('10')).toBeInTheDocument()
    })

    it('does not render badge when not provided', () => {
      const { container } = render(
        <CollapsibleSection title="No Badge">
          <p>Content</p>
        </CollapsibleSection>
      )
      const badges = container.querySelectorAll('.bg-gray-100.rounded-full')
      expect(badges.length).toBe(0)
    })

    it('renders icon when provided', () => {
      const { container } = render(
        <CollapsibleSection title="With Icon" icon={<AlertTriangle data-testid="custom-icon" />}>
          <p>Content</p>
        </CollapsibleSection>
      )
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
    })
  })

  describe('expansion behavior', () => {
    it('is collapsed by default', () => {
      render(
        <CollapsibleSection title="Test">
          <p>Hidden content</p>
        </CollapsibleSection>
      )
      expect(screen.queryByText('Hidden content')).not.toBeInTheDocument()
    })

    it('shows content when defaultOpen is true', () => {
      render(
        <CollapsibleSection title="Test" defaultOpen>
          <p>Visible content</p>
        </CollapsibleSection>
      )
      expect(screen.getByText('Visible content')).toBeInTheDocument()
    })

    it('expands when clicked', async () => {
      const user = userEvent.setup()
      render(
        <CollapsibleSection title="Click to Expand">
          <p>Expandable content</p>
        </CollapsibleSection>
      )

      expect(screen.queryByText('Expandable content')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button'))
      expect(screen.getByText('Expandable content')).toBeInTheDocument()
    })

    it('collapses when clicked while open', async () => {
      const user = userEvent.setup()
      render(
        <CollapsibleSection title="Toggle" defaultOpen>
          <p>Toggle content</p>
        </CollapsibleSection>
      )

      expect(screen.getByText('Toggle content')).toBeInTheDocument()

      await user.click(screen.getByRole('button'))
      expect(screen.queryByText('Toggle content')).not.toBeInTheDocument()
    })

    it('has aria-expanded attribute', () => {
      render(
        <CollapsibleSection title="Accessible">
          <p>Content</p>
        </CollapsibleSection>
      )
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-expanded', 'false')
    })

    it('updates aria-expanded when opened', async () => {
      const user = userEvent.setup()
      render(
        <CollapsibleSection title="Accessible">
          <p>Content</p>
        </CollapsibleSection>
      )

      const button = screen.getByRole('button')
      await user.click(button)
      expect(button).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('level styling', () => {
    it('applies level 1 styles by default', () => {
      const { container } = render(
        <CollapsibleSection title="Level 1">
          <p>Content</p>
        </CollapsibleSection>
      )
      const section = container.firstChild as HTMLElement
      expect(section).toHaveClass('border-gray-200')
    })

    it('applies level 2 styles when level=2', () => {
      const { container } = render(
        <CollapsibleSection title="Level 2" level={2}>
          <p>Content</p>
        </CollapsibleSection>
      )
      const section = container.firstChild as HTMLElement
      expect(section).toHaveClass('border-gray-100')
    })

    it('applies level 3 styles when level=3', () => {
      const { container } = render(
        <CollapsibleSection title="Level 3" level={3}>
          <p>Content</p>
        </CollapsibleSection>
      )
      const section = container.firstChild as HTMLElement
      expect(section).toHaveClass('border-gray-50')
    })
  })

  describe('chevron rotation', () => {
    it('chevron is not rotated when collapsed', () => {
      const { container } = render(
        <CollapsibleSection title="Test">
          <p>Content</p>
        </CollapsibleSection>
      )
      const svg = container.querySelector('svg')
      expect(svg).not.toHaveClass('rotate-90')
    })

    it('chevron is rotated when expanded', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <CollapsibleSection title="Test">
          <p>Content</p>
        </CollapsibleSection>
      )

      await user.click(screen.getByRole('button'))
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('rotate-90')
    })
  })
})
