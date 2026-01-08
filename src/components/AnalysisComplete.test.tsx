import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../test/utils/render'
import { AnalysisComplete } from './AnalysisComplete'

describe('AnalysisComplete', () => {
  const mockOnShowReport = vi.fn()

  beforeEach(() => {
    mockOnShowReport.mockClear()
  })

  describe('rendering', () => {
    it('renders analysis complete heading', () => {
      render(<AnalysisComplete onShowReport={mockOnShowReport} />)
      expect(screen.getByText('Analysis Complete')).toBeInTheDocument()
    })

    it('renders success message', () => {
      render(<AnalysisComplete onShowReport={mockOnShowReport} />)
      expect(
        screen.getByText(/Your consultation has been successfully analysed/i)
      ).toBeInTheDocument()
    })

    it('renders preparing report message', () => {
      render(<AnalysisComplete onShowReport={mockOnShowReport} />)
      expect(screen.getByText('Preparing your report...')).toBeInTheDocument()
    })

    it('renders Show Report Now button', () => {
      render(<AnalysisComplete onShowReport={mockOnShowReport} />)
      expect(
        screen.getByRole('button', { name: 'Show Report Now' })
      ).toBeInTheDocument()
    })

    it('renders CheckCircle icon', () => {
      const { container } = render(
        <AnalysisComplete onShowReport={mockOnShowReport} />
      )
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })
  })

  describe('auto-show behavior', () => {
    it('calls onShowReport immediately on mount', () => {
      render(<AnalysisComplete onShowReport={mockOnShowReport} />)
      expect(mockOnShowReport).toHaveBeenCalledTimes(1)
    })
  })

  describe('button interaction', () => {
    it('calls onShowReport when button is clicked', async () => {
      const { user } = render(
        <AnalysisComplete onShowReport={mockOnShowReport} />
      )

      // Clear the auto-call
      mockOnShowReport.mockClear()

      await user.click(screen.getByRole('button', { name: 'Show Report Now' }))
      expect(mockOnShowReport).toHaveBeenCalledTimes(1)
    })
  })

  describe('styling', () => {
    it('has centered layout', () => {
      const { container } = render(
        <AnalysisComplete onShowReport={mockOnShowReport} />
      )
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('flex')
      expect(wrapper).toHaveClass('items-center')
      expect(wrapper).toHaveClass('justify-center')
    })

    it('has min-height screen', () => {
      const { container } = render(
        <AnalysisComplete onShowReport={mockOnShowReport} />
      )
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('min-h-screen')
    })
  })
})
