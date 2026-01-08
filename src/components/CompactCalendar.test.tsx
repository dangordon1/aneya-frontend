import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../test/utils/render'
import { CompactCalendar } from './CompactCalendar'
import { createMockAppointment } from '../test/fixtures'

// Mock react-calendar
vi.mock('react-calendar', () => ({
  default: ({ value, onChange, tileContent }: {
    value: Date
    onChange: (date: Date) => void
    tileContent: (props: { date: Date }) => React.ReactNode
  }) => (
    <div data-testid="mock-calendar">
      <span data-testid="selected-date">{value.toDateString()}</span>
      <button
        data-testid="calendar-day"
        onClick={() => onChange(new Date('2024-01-20'))}
      >
        20
      </button>
      {/* Render tile content for test date */}
      <div data-testid="tile-content">
        {tileContent({ date: new Date('2024-01-15') })}
      </div>
    </div>
  ),
}))

describe('CompactCalendar', () => {
  const mockAppointments = [
    createMockAppointment({
      id: 'apt-1',
      doctor_id: 'doc-1',
      patient_id: 'pat-1',
      scheduled_time: '2024-01-15T10:00:00Z',
      status: 'scheduled',
      reason: 'Checkup',
    }),
    createMockAppointment({
      id: 'apt-2',
      doctor_id: 'doc-1',
      patient_id: 'pat-2',
      scheduled_time: '2024-01-15T14:00:00Z',
      status: 'scheduled',
      reason: 'Follow-up',
    }),
  ]

  const mockOnDateChange = vi.fn()
  const mockOnExpand = vi.fn()
  const selectedDate = new Date('2024-01-15')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders Calendar heading', () => {
      render(
        <CompactCalendar
          appointments={mockAppointments}
          selectedDate={selectedDate}
          onDateChange={mockOnDateChange}
          onExpand={mockOnExpand}
        />
      )
      expect(screen.getByText('Calendar')).toBeInTheDocument()
    })

    it('renders Expand button', () => {
      render(
        <CompactCalendar
          appointments={mockAppointments}
          selectedDate={selectedDate}
          onDateChange={mockOnDateChange}
          onExpand={mockOnExpand}
        />
      )
      expect(screen.getByRole('button', { name: 'Expand' })).toBeInTheDocument()
    })

    it('renders the calendar component', () => {
      render(
        <CompactCalendar
          appointments={mockAppointments}
          selectedDate={selectedDate}
          onDateChange={mockOnDateChange}
          onExpand={mockOnExpand}
        />
      )
      expect(screen.getByTestId('mock-calendar')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onExpand when Expand button clicked', async () => {
      const { user } = render(
        <CompactCalendar
          appointments={mockAppointments}
          selectedDate={selectedDate}
          onDateChange={mockOnDateChange}
          onExpand={mockOnExpand}
        />
      )

      await user.click(screen.getByRole('button', { name: 'Expand' }))

      expect(mockOnExpand).toHaveBeenCalledTimes(1)
    })

    it('calls onDateChange when calendar date clicked', async () => {
      const { user } = render(
        <CompactCalendar
          appointments={mockAppointments}
          selectedDate={selectedDate}
          onDateChange={mockOnDateChange}
          onExpand={mockOnExpand}
        />
      )

      await user.click(screen.getByTestId('calendar-day'))

      expect(mockOnDateChange).toHaveBeenCalledWith(new Date('2024-01-20'))
    })
  })

  describe('appointment indicators', () => {
    it('shows indicator dot for dates with appointments', () => {
      render(
        <CompactCalendar
          appointments={mockAppointments}
          selectedDate={selectedDate}
          onDateChange={mockOnDateChange}
          onExpand={mockOnExpand}
        />
      )

      const tileContent = screen.getByTestId('tile-content')
      const dot = tileContent.querySelector('.bg-aneya-teal')
      expect(dot).toBeInTheDocument()
    })

    it('does not show indicator for dates without appointments', () => {
      render(
        <CompactCalendar
          appointments={[]}
          selectedDate={selectedDate}
          onDateChange={mockOnDateChange}
          onExpand={mockOnExpand}
        />
      )

      const tileContent = screen.getByTestId('tile-content')
      const dot = tileContent.querySelector('.bg-aneya-teal')
      expect(dot).not.toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('has card styling', () => {
      const { container } = render(
        <CompactCalendar
          appointments={mockAppointments}
          selectedDate={selectedDate}
          onDateChange={mockOnDateChange}
          onExpand={mockOnExpand}
        />
      )
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('bg-white')
      expect(wrapper).toHaveClass('rounded-[16px]')
      expect(wrapper).toHaveClass('border-2')
    })

    it('has fixed width', () => {
      const { container } = render(
        <CompactCalendar
          appointments={mockAppointments}
          selectedDate={selectedDate}
          onDateChange={mockOnDateChange}
          onExpand={mockOnExpand}
        />
      )
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveStyle({ width: '320px' })
    })
  })

  describe('selected date', () => {
    it('passes selected date to calendar', () => {
      render(
        <CompactCalendar
          appointments={mockAppointments}
          selectedDate={new Date('2024-02-20')}
          onDateChange={mockOnDateChange}
          onExpand={mockOnExpand}
        />
      )
      expect(screen.getByTestId('selected-date')).toHaveTextContent('Tue Feb 20 2024')
    })
  })
})
