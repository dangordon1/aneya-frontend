import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '../test/utils/render'
import { BranchIndicator } from './BranchIndicator'

// Extend the global Window interface for our custom property
declare global {
  interface Window {
    __GIT_BRANCH__?: string
  }
}

describe('BranchIndicator', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.resetAllMocks()
    ;(globalThis as unknown as { __GIT_BRANCH__: string }).__GIT_BRANCH__ = 'main'
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('when on main branch', () => {
    it('returns null when both FE and BE are on main', async () => {
      ;(globalThis as unknown as { __GIT_BRANCH__: string }).__GIT_BRANCH__ = 'main'
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ branch: 'main' }),
      })

      const { container } = render(<BranchIndicator />)

      // Wait for fetch to complete
      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalled()
      })

      // Should render nothing
      expect(container.firstChild).toBeNull()
    })

    it('returns null when FE is main and BE is master', async () => {
      ;(globalThis as unknown as { __GIT_BRANCH__: string }).__GIT_BRANCH__ = 'main'
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ branch: 'master' }),
      })

      const { container } = render(<BranchIndicator />)

      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalled()
      })

      expect(container.firstChild).toBeNull()
    })
  })

  describe('when on feature branch', () => {
    it('shows frontend branch when not main/master', async () => {
      ;(globalThis as unknown as { __GIT_BRANCH__: string }).__GIT_BRANCH__ = 'feature/new-ui'
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ branch: 'main' }),
      })

      render(<BranchIndicator />)

      expect(screen.getByText('FE: feature/new-ui')).toBeInTheDocument()
    })

    it('shows backend branch when backend is on feature branch', async () => {
      ;(globalThis as unknown as { __GIT_BRANCH__: string }).__GIT_BRANCH__ = 'main'
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ branch: 'feature/api-update' }),
      })

      render(<BranchIndicator />)

      await waitFor(() => {
        expect(screen.getByText('BE: feature/api-update')).toBeInTheDocument()
      })
    })

    it('shows both FE and BE branches when both are on feature branches', async () => {
      ;(globalThis as unknown as { __GIT_BRANCH__: string }).__GIT_BRANCH__ = 'feature/frontend'
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ branch: 'feature/backend' }),
      })

      render(<BranchIndicator />)

      expect(screen.getByText('FE: feature/frontend')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByText('BE: feature/backend')).toBeInTheDocument()
      })
    })
  })

  describe('API interaction', () => {
    it('fetches from health endpoint', async () => {
      ;(globalThis as unknown as { __GIT_BRANCH__: string }).__GIT_BRANCH__ = 'main'
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ branch: 'develop' }),
      })

      render(<BranchIndicator />)

      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/health')
        )
      })
    })

    it('handles fetch error gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      ;(globalThis as unknown as { __GIT_BRANCH__: string }).__GIT_BRANCH__ = 'feature/test'
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      render(<BranchIndicator />)

      // Should still show FE branch
      expect(screen.getByText('FE: feature/test')).toBeInTheDocument()

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to fetch backend branch:',
          expect.any(Error)
        )
      })

      consoleError.mockRestore()
    })

    it('handles missing branch in response', async () => {
      ;(globalThis as unknown as { __GIT_BRANCH__: string }).__GIT_BRANCH__ = 'main'
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({}),
      })

      const { container } = render(<BranchIndicator />)

      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalled()
      })

      // No branch in response, so nothing to show
      expect(container.firstChild).toBeNull()
    })
  })

  describe('styling', () => {
    it('has text-right class', async () => {
      ;(globalThis as unknown as { __GIT_BRANCH__: string }).__GIT_BRANCH__ = 'feature/test'
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ branch: 'main' }),
      })

      const { container } = render(<BranchIndicator />)

      expect(container.firstChild).toHaveClass('text-right')
    })

    it('uses monospace font', async () => {
      ;(globalThis as unknown as { __GIT_BRANCH__: string }).__GIT_BRANCH__ = 'feature/test'
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ branch: 'main' }),
      })

      render(<BranchIndicator />)

      const branchText = screen.getByText('FE: feature/test')
      expect(branchText).toHaveClass('font-mono')
    })
  })
})
