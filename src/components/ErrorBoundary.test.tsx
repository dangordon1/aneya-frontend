import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '../test/utils/render'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary } from './ErrorBoundary'

// Component that throws an error
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>Normal content</div>
}

describe('ErrorBoundary', () => {
  // Suppress console.error during error boundary tests
  const originalError = console.error
  beforeEach(() => {
    console.error = vi.fn()
  })
  afterEach(() => {
    console.error = originalError
  })

  describe('normal rendering', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      )
      expect(screen.getByText('Child content')).toBeInTheDocument()
    })

    it('renders multiple children correctly', () => {
      render(
        <ErrorBoundary>
          <div>First child</div>
          <div>Second child</div>
        </ErrorBoundary>
      )
      expect(screen.getByText('First child')).toBeInTheDocument()
      expect(screen.getByText('Second child')).toBeInTheDocument()
    })
  })

  describe('error handling', () => {
    it('shows error UI when child throws', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('shows helpful message to user', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )
      expect(
        screen.getByText(/We encountered an unexpected error/i)
      ).toBeInTheDocument()
    })

    it('displays error details section', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )
      expect(screen.getByText('Error details')).toBeInTheDocument()
    })

    it('shows error message in details', async () => {
      const user = userEvent.setup()
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )

      // Click on details summary to expand
      await user.click(screen.getByText('Error details'))
      expect(screen.getByText(/Test error message/)).toBeInTheDocument()
    })
  })

  describe('custom fallback', () => {
    it('renders custom fallback when provided', () => {
      render(
        <ErrorBoundary fallback={<div>Custom error message</div>}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )
      expect(screen.getByText('Custom error message')).toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })
  })

  describe('recovery actions', () => {
    it('shows Try Again button', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
    })

    it('shows Refresh Page button', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )
      expect(screen.getByRole('button', { name: 'Refresh Page' })).toBeInTheDocument()
    })

    it('resets error state when Try Again is clicked', async () => {
      const user = userEvent.setup()

      // We need a component that can stop throwing
      let shouldThrow = true
      function ConditionalThrower() {
        if (shouldThrow) {
          throw new Error('Initial error')
        }
        return <div>Recovered content</div>
      }

      render(
        <ErrorBoundary>
          <ConditionalThrower />
        </ErrorBoundary>
      )

      // Should show error UI
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()

      // Fix the error condition
      shouldThrow = false

      // Click Try Again
      await user.click(screen.getByRole('button', { name: 'Try Again' }))

      // Should now show recovered content
      expect(screen.getByText('Recovered content')).toBeInTheDocument()
    })

    it('calls window.location.reload when Refresh Page is clicked', async () => {
      const user = userEvent.setup()
      const mockReload = vi.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      })

      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )

      await user.click(screen.getByRole('button', { name: 'Refresh Page' }))
      expect(mockReload).toHaveBeenCalledTimes(1)
    })
  })

  describe('styling', () => {
    it('centers content on screen', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('flex')
      expect(wrapper).toHaveClass('items-center')
      expect(wrapper).toHaveClass('justify-center')
    })

    it('has white card with shadow', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )
      const card = screen.getByText('Something went wrong').closest('.bg-white')
      expect(card).toHaveClass('rounded-lg')
      expect(card).toHaveClass('shadow-lg')
    })
  })
})
