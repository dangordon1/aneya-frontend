import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../test/utils/render'
import { LocationSelector } from './LocationSelector'

describe('LocationSelector', () => {
  const mockOnLocationChange = vi.fn()

  beforeEach(() => {
    mockOnLocationChange.mockClear()
  })

  describe('rendering', () => {
    it('shows Auto when no location selected', () => {
      render(
        <LocationSelector
          selectedLocation={null}
          onLocationChange={mockOnLocationChange}
        />
      )
      expect(screen.getByText(/Auto/)).toBeInTheDocument()
    })

    it('shows selected location when provided', () => {
      render(
        <LocationSelector
          selectedLocation="GB"
          onLocationChange={mockOnLocationChange}
        />
      )
      expect(screen.getByText(/United Kingdom/)).toBeInTheDocument()
    })

    it('shows India when IN selected', () => {
      render(
        <LocationSelector
          selectedLocation="IN"
          onLocationChange={mockOnLocationChange}
        />
      )
      expect(screen.getByText(/India/)).toBeInTheDocument()
    })

    it('shows United States when US selected', () => {
      render(
        <LocationSelector
          selectedLocation="US"
          onLocationChange={mockOnLocationChange}
        />
      )
      expect(screen.getByText(/United States/)).toBeInTheDocument()
    })
  })

  describe('dropdown behavior', () => {
    it('opens dropdown when button clicked', async () => {
      const { user } = render(
        <LocationSelector
          selectedLocation={null}
          onLocationChange={mockOnLocationChange}
        />
      )

      await user.click(screen.getByRole('button'))

      expect(screen.getByText('Select Guidelines Region')).toBeInTheDocument()
    })

    it('shows all location options when open', async () => {
      const { user } = render(
        <LocationSelector
          selectedLocation={null}
          onLocationChange={mockOnLocationChange}
        />
      )

      await user.click(screen.getByRole('button'))

      expect(screen.getByText('Auto-detect (from IP)')).toBeInTheDocument()
      expect(screen.getByText('United Kingdom')).toBeInTheDocument()
      expect(screen.getByText('India')).toBeInTheDocument()
      expect(screen.getByText('United States')).toBeInTheDocument()
      expect(screen.getByText('Australia')).toBeInTheDocument()
    })

    it('closes dropdown when clicking outside', async () => {
      const { user } = render(
        <LocationSelector
          selectedLocation={null}
          onLocationChange={mockOnLocationChange}
        />
      )

      await user.click(screen.getByRole('button'))
      expect(screen.getByText('Select Guidelines Region')).toBeInTheDocument()

      // Click the backdrop
      const backdrop = document.querySelector('.fixed.inset-0')
      if (backdrop) {
        await user.click(backdrop)
      }

      expect(
        screen.queryByText('Select Guidelines Region')
      ).not.toBeInTheDocument()
    })
  })

  describe('location selection', () => {
    it('calls onLocationChange with null for auto-detect', async () => {
      const { user } = render(
        <LocationSelector
          selectedLocation="GB"
          onLocationChange={mockOnLocationChange}
        />
      )

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('Auto-detect (from IP)'))

      expect(mockOnLocationChange).toHaveBeenCalledWith(null)
    })

    it('calls onLocationChange with GB for United Kingdom', async () => {
      const { user } = render(
        <LocationSelector
          selectedLocation={null}
          onLocationChange={mockOnLocationChange}
        />
      )

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('United Kingdom'))

      expect(mockOnLocationChange).toHaveBeenCalledWith('GB')
    })

    it('calls onLocationChange with IN for India', async () => {
      const { user } = render(
        <LocationSelector
          selectedLocation={null}
          onLocationChange={mockOnLocationChange}
        />
      )

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('India'))

      expect(mockOnLocationChange).toHaveBeenCalledWith('IN')
    })

    it('closes dropdown after selection', async () => {
      const { user } = render(
        <LocationSelector
          selectedLocation={null}
          onLocationChange={mockOnLocationChange}
        />
      )

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('United States'))

      expect(
        screen.queryByText('Select Guidelines Region')
      ).not.toBeInTheDocument()
    })
  })

  describe('selected state indication', () => {
    it('highlights currently selected location', async () => {
      const { user } = render(
        <LocationSelector
          selectedLocation="GB"
          onLocationChange={mockOnLocationChange}
        />
      )

      await user.click(screen.getByRole('button'))

      // Find all UK buttons - one is the main trigger, one is in dropdown
      const ukButtons = screen.getAllByRole('button', { name: /United Kingdom/i })
      // The dropdown option should have the selected styling
      const dropdownButton = ukButtons.find(btn =>
        btn.classList.contains('bg-aneya-teal/20')
      )
      expect(dropdownButton).toBeDefined()
    })
  })

  describe('styling', () => {
    it('has proper button styling', () => {
      render(
        <LocationSelector
          selectedLocation={null}
          onLocationChange={mockOnLocationChange}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveClass('rounded-lg')
    })
  })
})
