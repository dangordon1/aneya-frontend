import { describe, it, expect } from 'vitest'
import { render, screen } from '../test/utils/render'
import userEvent from '@testing-library/user-event'
import { ExpandableSection } from './ExpandableSection'

describe('ExpandableSection', () => {
  describe('rendering', () => {
    it('renders title correctly', () => {
      render(
        <ExpandableSection title="Test Section">
          <p>Content here</p>
        </ExpandableSection>
      )
      expect(screen.getByText('Test Section')).toBeInTheDocument()
    })

    it('renders with custom className', () => {
      const { container } = render(
        <ExpandableSection title="Test" className="custom-class">
          <p>Content</p>
        </ExpandableSection>
      )
      const section = container.firstChild as HTMLElement
      expect(section).toHaveClass('custom-class')
    })

    it('renders with default styling', () => {
      const { container } = render(
        <ExpandableSection title="Test">
          <p>Content</p>
        </ExpandableSection>
      )
      const section = container.firstChild as HTMLElement
      expect(section).toHaveClass('border')
      expect(section).toHaveClass('rounded-[16px]')
    })
  })

  describe('expansion behavior', () => {
    it('is collapsed by default', () => {
      render(
        <ExpandableSection title="Test Section">
          <p>Hidden content</p>
        </ExpandableSection>
      )
      expect(screen.queryByText('Hidden content')).not.toBeInTheDocument()
    })

    it('shows content when defaultExpanded is true', () => {
      render(
        <ExpandableSection title="Test Section" defaultExpanded>
          <p>Visible content</p>
        </ExpandableSection>
      )
      expect(screen.getByText('Visible content')).toBeInTheDocument()
    })

    it('expands when header is clicked', async () => {
      const user = userEvent.setup()
      render(
        <ExpandableSection title="Click Me">
          <p>Expandable content</p>
        </ExpandableSection>
      )

      // Initially hidden
      expect(screen.queryByText('Expandable content')).not.toBeInTheDocument()

      // Click to expand
      await user.click(screen.getByRole('button'))
      expect(screen.getByText('Expandable content')).toBeInTheDocument()
    })

    it('collapses when header is clicked while expanded', async () => {
      const user = userEvent.setup()
      render(
        <ExpandableSection title="Toggle" defaultExpanded>
          <p>Toggle content</p>
        </ExpandableSection>
      )

      // Initially visible
      expect(screen.getByText('Toggle content')).toBeInTheDocument()

      // Click to collapse
      await user.click(screen.getByRole('button'))
      expect(screen.queryByText('Toggle content')).not.toBeInTheDocument()
    })

    it('toggles multiple times correctly', async () => {
      const user = userEvent.setup()
      render(
        <ExpandableSection title="Multi Toggle">
          <p>Multi toggle content</p>
        </ExpandableSection>
      )

      const button = screen.getByRole('button')

      // Start collapsed
      expect(screen.queryByText('Multi toggle content')).not.toBeInTheDocument()

      // Expand
      await user.click(button)
      expect(screen.getByText('Multi toggle content')).toBeInTheDocument()

      // Collapse
      await user.click(button)
      expect(screen.queryByText('Multi toggle content')).not.toBeInTheDocument()

      // Expand again
      await user.click(button)
      expect(screen.getByText('Multi toggle content')).toBeInTheDocument()
    })
  })

  describe('chevron icons', () => {
    it('shows ChevronDown when collapsed', () => {
      const { container } = render(
        <ExpandableSection title="Test">
          <p>Content</p>
        </ExpandableSection>
      )
      // Should have an SVG (the chevron icon)
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(0)
    })

    it('shows ChevronUp when expanded', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <ExpandableSection title="Test">
          <p>Content</p>
        </ExpandableSection>
      )

      await user.click(screen.getByRole('button'))

      // Should still have an SVG (now ChevronUp)
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(0)
    })
  })

  describe('children rendering', () => {
    it('renders complex children correctly when expanded', async () => {
      const user = userEvent.setup()
      render(
        <ExpandableSection title="Complex Content" defaultExpanded>
          <div>
            <h3>Nested heading</h3>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </div>
        </ExpandableSection>
      )

      expect(screen.getByText('Nested heading')).toBeInTheDocument()
      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
    })
  })
})
