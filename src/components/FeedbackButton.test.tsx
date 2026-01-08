import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '../test/utils/render'
import userEvent from '@testing-library/user-event'
import { FeedbackButton } from './FeedbackButton'

describe('FeedbackButton', () => {
  const mockOnFeedback = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    mockOnFeedback.mockClear()
  })

  describe('rendering', () => {
    it('renders thumbs up and thumbs down buttons', () => {
      render(<FeedbackButton onFeedback={mockOnFeedback} />)
      expect(screen.getByTitle('Helpful')).toBeInTheDocument()
      expect(screen.getByTitle('Not helpful')).toBeInTheDocument()
    })

    it('shows labels when showLabels is true', () => {
      render(<FeedbackButton onFeedback={mockOnFeedback} showLabels />)
      expect(screen.getByText('Was this helpful?')).toBeInTheDocument()
    })

    it('does not show labels by default', () => {
      render(<FeedbackButton onFeedback={mockOnFeedback} />)
      expect(screen.queryByText('Was this helpful?')).not.toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(
        <FeedbackButton onFeedback={mockOnFeedback} className="custom-class" />
      )
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('custom-class')
    })
  })

  describe('size variants', () => {
    it('applies small padding with size=sm', () => {
      render(<FeedbackButton onFeedback={mockOnFeedback} size="sm" />)
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveClass('p-1')
      })
    })

    it('applies medium padding with size=md', () => {
      render(<FeedbackButton onFeedback={mockOnFeedback} size="md" />)
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveClass('p-2')
      })
    })

    it('applies large padding with size=lg', () => {
      render(<FeedbackButton onFeedback={mockOnFeedback} size="lg" />)
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveClass('p-3')
      })
    })
  })

  describe('interactions', () => {
    it('calls onFeedback with positive when thumbs up clicked', async () => {
      const user = userEvent.setup()
      render(<FeedbackButton onFeedback={mockOnFeedback} />)

      await user.click(screen.getByTitle('Helpful'))
      expect(mockOnFeedback).toHaveBeenCalledWith('positive')
    })

    it('calls onFeedback with negative when thumbs down clicked', async () => {
      const user = userEvent.setup()
      render(<FeedbackButton onFeedback={mockOnFeedback} />)

      await user.click(screen.getByTitle('Not helpful'))
      expect(mockOnFeedback).toHaveBeenCalledWith('negative')
    })

    it('highlights positive button after positive feedback', async () => {
      const user = userEvent.setup()
      render(<FeedbackButton onFeedback={mockOnFeedback} />)

      await user.click(screen.getByTitle('Helpful'))

      await waitFor(() => {
        const thumbsUp = screen.getByTitle('Helpful')
        expect(thumbsUp).toHaveClass('bg-green-100')
        expect(thumbsUp).toHaveClass('text-green-700')
      })
    })

    it('highlights negative button after negative feedback', async () => {
      const user = userEvent.setup()
      render(<FeedbackButton onFeedback={mockOnFeedback} />)

      await user.click(screen.getByTitle('Not helpful'))

      await waitFor(() => {
        const thumbsDown = screen.getByTitle('Not helpful')
        expect(thumbsDown).toHaveClass('bg-red-100')
        expect(thumbsDown).toHaveClass('text-red-700')
      })
    })

    it('does not call onFeedback twice when same button clicked', async () => {
      const user = userEvent.setup()
      render(<FeedbackButton onFeedback={mockOnFeedback} />)

      await user.click(screen.getByTitle('Helpful'))
      await user.click(screen.getByTitle('Helpful'))

      expect(mockOnFeedback).toHaveBeenCalledTimes(1)
    })

    it('allows changing feedback from positive to negative', async () => {
      const user = userEvent.setup()
      render(<FeedbackButton onFeedback={mockOnFeedback} />)

      await user.click(screen.getByTitle('Helpful'))
      await user.click(screen.getByTitle('Not helpful'))

      expect(mockOnFeedback).toHaveBeenCalledTimes(2)
      expect(mockOnFeedback).toHaveBeenLastCalledWith('negative')
    })
  })

  describe('disabled state', () => {
    it('does not call onFeedback when disabled', async () => {
      const user = userEvent.setup()
      render(<FeedbackButton onFeedback={mockOnFeedback} disabled />)

      await user.click(screen.getByTitle('Helpful'))
      expect(mockOnFeedback).not.toHaveBeenCalled()
    })

    it('applies disabled styling', () => {
      render(<FeedbackButton onFeedback={mockOnFeedback} disabled />)
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toBeDisabled()
        expect(button).toHaveClass('opacity-50')
        expect(button).toHaveClass('cursor-not-allowed')
      })
    })
  })

  describe('initial sentiment', () => {
    it('highlights positive button when initialSentiment is positive', () => {
      render(
        <FeedbackButton onFeedback={mockOnFeedback} initialSentiment="positive" />
      )
      const thumbsUp = screen.getByTitle('Helpful')
      expect(thumbsUp).toHaveClass('bg-green-100')
    })

    it('highlights negative button when initialSentiment is negative', () => {
      render(
        <FeedbackButton onFeedback={mockOnFeedback} initialSentiment="negative" />
      )
      const thumbsDown = screen.getByTitle('Not helpful')
      expect(thumbsDown).toHaveClass('bg-red-100')
    })

    it('updates when initialSentiment prop changes', () => {
      const { rerender } = render(
        <FeedbackButton onFeedback={mockOnFeedback} initialSentiment="positive" />
      )

      expect(screen.getByTitle('Helpful')).toHaveClass('bg-green-100')

      rerender(
        <FeedbackButton onFeedback={mockOnFeedback} initialSentiment="negative" />
      )

      expect(screen.getByTitle('Not helpful')).toHaveClass('bg-red-100')
    })
  })

  describe('error handling', () => {
    it('handles onFeedback rejection gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const failingOnFeedback = vi.fn().mockRejectedValue(new Error('API error'))
      const user = userEvent.setup()

      render(<FeedbackButton onFeedback={failingOnFeedback} />)

      await user.click(screen.getByTitle('Helpful'))

      // Should not throw, should log error
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled()
      })

      consoleError.mockRestore()
    })
  })

  describe('confirmation', () => {
    it('shows confirmation checkmark briefly after feedback', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      render(<FeedbackButton onFeedback={mockOnFeedback} />)

      await user.click(screen.getByTitle('Helpful'))

      // Confirmation should appear
      await waitFor(() => {
        const checkmark = document.querySelector('.animate-pulse')
        expect(checkmark).toBeInTheDocument()
      })

      vi.useRealTimers()
    })
  })
})
