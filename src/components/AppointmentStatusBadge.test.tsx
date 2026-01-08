import { describe, it, expect } from 'vitest'
import { render, screen } from '../test/utils/render'
import { AppointmentStatusBadge } from './AppointmentStatusBadge'

describe('AppointmentStatusBadge', () => {
  describe('scheduled status', () => {
    it('renders Scheduled label', () => {
      render(<AppointmentStatusBadge status="scheduled" />)
      expect(screen.getByText('Scheduled')).toBeInTheDocument()
    })

    it('has blue styling', () => {
      render(<AppointmentStatusBadge status="scheduled" />)
      const badge = screen.getByText('Scheduled')
      expect(badge).toHaveClass('bg-blue-100')
      expect(badge).toHaveClass('text-blue-700')
      expect(badge).toHaveClass('border-blue-300')
    })
  })

  describe('in_progress status', () => {
    it('renders In Progress label', () => {
      render(<AppointmentStatusBadge status="in_progress" />)
      expect(screen.getByText('In Progress')).toBeInTheDocument()
    })

    it('has yellow styling', () => {
      render(<AppointmentStatusBadge status="in_progress" />)
      const badge = screen.getByText('In Progress')
      expect(badge).toHaveClass('bg-yellow-100')
      expect(badge).toHaveClass('text-yellow-700')
      expect(badge).toHaveClass('border-yellow-300')
    })
  })

  describe('completed status', () => {
    it('renders Completed label', () => {
      render(<AppointmentStatusBadge status="completed" />)
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })

    it('has green styling', () => {
      render(<AppointmentStatusBadge status="completed" />)
      const badge = screen.getByText('Completed')
      expect(badge).toHaveClass('bg-green-100')
      expect(badge).toHaveClass('text-green-700')
      expect(badge).toHaveClass('border-green-300')
    })
  })

  describe('cancelled status', () => {
    it('renders Cancelled label', () => {
      render(<AppointmentStatusBadge status="cancelled" />)
      expect(screen.getByText('Cancelled')).toBeInTheDocument()
    })

    it('has red styling', () => {
      render(<AppointmentStatusBadge status="cancelled" />)
      const badge = screen.getByText('Cancelled')
      expect(badge).toHaveClass('bg-red-100')
      expect(badge).toHaveClass('text-red-700')
      expect(badge).toHaveClass('border-red-300')
    })
  })

  describe('no_show status', () => {
    it('renders No Show label', () => {
      render(<AppointmentStatusBadge status="no_show" />)
      expect(screen.getByText('No Show')).toBeInTheDocument()
    })

    it('has gray styling', () => {
      render(<AppointmentStatusBadge status="no_show" />)
      const badge = screen.getByText('No Show')
      expect(badge).toHaveClass('bg-gray-100')
      expect(badge).toHaveClass('text-gray-700')
      expect(badge).toHaveClass('border-gray-300')
    })
  })

  describe('common styling', () => {
    it('has rounded-full class', () => {
      render(<AppointmentStatusBadge status="scheduled" />)
      const badge = screen.getByText('Scheduled')
      expect(badge).toHaveClass('rounded-full')
    })

    it('has border class', () => {
      render(<AppointmentStatusBadge status="completed" />)
      const badge = screen.getByText('Completed')
      expect(badge).toHaveClass('border')
    })

    it('has proper padding', () => {
      render(<AppointmentStatusBadge status="in_progress" />)
      const badge = screen.getByText('In Progress')
      expect(badge).toHaveClass('px-3')
      expect(badge).toHaveClass('py-1')
    })
  })
})
