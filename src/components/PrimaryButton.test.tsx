import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../test/utils/render'
import userEvent from '@testing-library/user-event'
import { PrimaryButton } from './PrimaryButton'

describe('PrimaryButton', () => {
  describe('rendering', () => {
    it('renders children content correctly', () => {
      render(<PrimaryButton>Click me</PrimaryButton>)
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
    })

    it('renders with default styling', () => {
      render(<PrimaryButton>Button</PrimaryButton>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-aneya-navy')
      expect(button).toHaveClass('text-white')
      expect(button).toHaveClass('rounded-[10px]')
    })

    it('renders with fullWidth when specified', () => {
      render(<PrimaryButton fullWidth>Full Width</PrimaryButton>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('w-full')
    })

    it('does not have w-full class by default', () => {
      render(<PrimaryButton>Normal</PrimaryButton>)
      const button = screen.getByRole('button')
      expect(button).not.toHaveClass('w-full')
    })

    it('renders with custom className', () => {
      render(<PrimaryButton className="custom-class">Custom</PrimaryButton>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })
  })

  describe('interactions', () => {
    it('calls onClick handler when clicked', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()

      render(<PrimaryButton onClick={handleClick}>Click me</PrimaryButton>)

      await user.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick when disabled', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()

      render(
        <PrimaryButton onClick={handleClick} disabled>
          Disabled
        </PrimaryButton>
      )

      await user.click(screen.getByRole('button'))
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('disabled state', () => {
    it('applies disabled attribute when disabled prop is true', () => {
      render(<PrimaryButton disabled>Disabled</PrimaryButton>)
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('applies disabled styling when disabled', () => {
      render(<PrimaryButton disabled>Disabled</PrimaryButton>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('disabled:opacity-50')
      expect(button).toHaveClass('disabled:cursor-not-allowed')
    })

    it('is not disabled by default', () => {
      render(<PrimaryButton>Enabled</PrimaryButton>)
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })
  })
})
