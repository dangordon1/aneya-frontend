import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '../test/utils/render'
import { EditableSection } from './EditableSection'

describe('EditableSection', () => {
  const defaultProps = {
    value: 'Test value',
    onSave: vi.fn(),
    label: 'Test Label',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('display mode', () => {
    it('renders label correctly', () => {
      render(<EditableSection {...defaultProps} />)
      expect(screen.getByText('Test Label')).toBeInTheDocument()
    })

    it('renders value correctly', () => {
      render(<EditableSection {...defaultProps} />)
      expect(screen.getByText('Test value')).toBeInTheDocument()
    })

    it('renders placeholder when value is empty', () => {
      render(
        <EditableSection
          {...defaultProps}
          value=""
          placeholder="Enter text here"
        />
      )
      expect(screen.getByText('Enter text here')).toBeInTheDocument()
    })

    it('renders default placeholder when no placeholder provided', () => {
      render(<EditableSection {...defaultProps} value="" />)
      expect(screen.getByText('Click to edit...')).toBeInTheDocument()
    })

    it('renders edit icon', () => {
      const { container } = render(<EditableSection {...defaultProps} />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(
        <EditableSection {...defaultProps} className="custom-class" />
      )
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('custom-class')
    })
  })

  describe('edit mode', () => {
    it('enters edit mode when clicked', async () => {
      const { user } = render(<EditableSection {...defaultProps} />)

      await user.click(screen.getByText('Test value'))

      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('shows save button in edit mode', async () => {
      const { user } = render(<EditableSection {...defaultProps} />)

      await user.click(screen.getByText('Test value'))

      expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument()
    })

    it('shows cancel button in edit mode', async () => {
      const { user } = render(<EditableSection {...defaultProps} />)

      await user.click(screen.getByText('Test value'))

      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
    })

    it('pre-fills input with current value', async () => {
      const { user } = render(<EditableSection {...defaultProps} />)

      await user.click(screen.getByText('Test value'))

      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.value).toBe('Test value')
    })

    it('focuses input when entering edit mode', async () => {
      const { user } = render(<EditableSection {...defaultProps} />)

      await user.click(screen.getByText('Test value'))

      expect(screen.getByRole('textbox')).toHaveFocus()
    })
  })

  describe('single-line input', () => {
    it('renders input element by default', async () => {
      const { user } = render(<EditableSection {...defaultProps} />)

      await user.click(screen.getByText('Test value'))

      const input = screen.getByRole('textbox')
      expect(input.tagName).toBe('INPUT')
    })

    it('calls onSave when save button clicked', async () => {
      const { user } = render(<EditableSection {...defaultProps} />)

      await user.click(screen.getByText('Test value'))
      await user.clear(screen.getByRole('textbox'))
      await user.type(screen.getByRole('textbox'), 'New value')
      await user.click(screen.getByRole('button', { name: /Save/i }))

      expect(defaultProps.onSave).toHaveBeenCalledWith('New value')
    })

    it('saves on Enter key press', async () => {
      const { user } = render(<EditableSection {...defaultProps} />)

      await user.click(screen.getByText('Test value'))
      await user.clear(screen.getByRole('textbox'))
      await user.type(screen.getByRole('textbox'), 'New value{Enter}')

      expect(defaultProps.onSave).toHaveBeenCalledWith('New value')
    })
  })

  describe('multiline textarea', () => {
    it('renders textarea when multiline is true', async () => {
      const { user } = render(
        <EditableSection {...defaultProps} multiline />
      )

      await user.click(screen.getByText('Test value'))

      const textarea = screen.getByRole('textbox')
      expect(textarea.tagName).toBe('TEXTAREA')
    })

    it('shows Ctrl+Enter hint in multiline mode', async () => {
      const { user } = render(
        <EditableSection {...defaultProps} multiline />
      )

      await user.click(screen.getByText('Test value'))

      expect(screen.getByText('Ctrl+Enter to save')).toBeInTheDocument()
    })
  })

  describe('cancel behavior', () => {
    it('reverts to original value on cancel', async () => {
      const { user } = render(<EditableSection {...defaultProps} />)

      await user.click(screen.getByText('Test value'))
      await user.clear(screen.getByRole('textbox'))
      await user.type(screen.getByRole('textbox'), 'Changed value')
      await user.click(screen.getByRole('button', { name: /Cancel/i }))

      expect(screen.getByText('Test value')).toBeInTheDocument()
      expect(defaultProps.onSave).not.toHaveBeenCalled()
    })

    it('cancels on Escape key press', async () => {
      const { user } = render(<EditableSection {...defaultProps} />)

      await user.click(screen.getByText('Test value'))
      await user.type(screen.getByRole('textbox'), 'Changed{Escape}')

      expect(screen.getByText('Test value')).toBeInTheDocument()
    })

    it('exits edit mode after cancel', async () => {
      const { user } = render(<EditableSection {...defaultProps} />)

      await user.click(screen.getByText('Test value'))
      await user.click(screen.getByRole('button', { name: /Cancel/i }))

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })

  describe('with onConfirmSave', () => {
    const onConfirmSave = vi.fn().mockResolvedValue(undefined)

    it('shows Confirm change button after editing', async () => {
      const { user } = render(
        <EditableSection
          {...defaultProps}
          value="Original"
          onConfirmSave={onConfirmSave}
        />
      )

      await user.click(screen.getByText('Original'))
      await user.clear(screen.getByRole('textbox'))
      await user.type(screen.getByRole('textbox'), 'Updated')
      await user.click(screen.getByRole('button', { name: /Save/i }))

      await waitFor(() => {
        expect(screen.getByText('Confirm change')).toBeInTheDocument()
      })
    })

    it('calls onConfirmSave when Confirm change clicked', async () => {
      const { user } = render(
        <EditableSection
          {...defaultProps}
          value="Original"
          onConfirmSave={onConfirmSave}
        />
      )

      await user.click(screen.getByText('Original'))
      await user.clear(screen.getByRole('textbox'))
      await user.type(screen.getByRole('textbox'), 'Updated')
      await user.click(screen.getByRole('button', { name: /Save/i }))

      await waitFor(() => {
        expect(screen.getByText('Confirm change')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Confirm change'))

      await waitFor(() => {
        expect(onConfirmSave).toHaveBeenCalledWith('Updated')
      })
    })

    it('shows Saved indicator after successful confirm', async () => {
      const { user } = render(
        <EditableSection
          {...defaultProps}
          value="Original"
          onConfirmSave={onConfirmSave}
        />
      )

      await user.click(screen.getByText('Original'))
      await user.clear(screen.getByRole('textbox'))
      await user.type(screen.getByRole('textbox'), 'Updated')
      await user.click(screen.getByRole('button', { name: /Save/i }))

      await waitFor(() => {
        expect(screen.getByText('Confirm change')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Confirm change'))

      await waitFor(() => {
        expect(screen.getByText('Saved')).toBeInTheDocument()
      })
    })
  })

  describe('styling', () => {
    it('has border styling in display mode', () => {
      const { container } = render(<EditableSection {...defaultProps} />)
      const contentBox = container.querySelector('.border-2')
      expect(contentBox).toBeInTheDocument()
    })
  })
})
