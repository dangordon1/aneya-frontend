import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock supabase - simplified for synchronous tests
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}))

// Mock useAuth
vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
  })),
}))

// Import after mocks are set up
import { useConsultations } from './useConsultations'

describe('useConsultations', () => {
  describe('hook interface', () => {
    it('returns expected properties', () => {
      const { result } = renderHook(() => useConsultations())

      expect(result.current).toHaveProperty('consultations')
      expect(result.current).toHaveProperty('loading')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('saveConsultation')
      expect(result.current).toHaveProperty('deleteConsultation')
      expect(result.current).toHaveProperty('refetch')
    })

    it('consultations is an array', () => {
      const { result } = renderHook(() => useConsultations())
      expect(Array.isArray(result.current.consultations)).toBe(true)
    })

    it('loading is a boolean', () => {
      const { result } = renderHook(() => useConsultations())
      expect(typeof result.current.loading).toBe('boolean')
    })

    it('saveConsultation is a function', () => {
      const { result } = renderHook(() => useConsultations())
      expect(typeof result.current.saveConsultation).toBe('function')
    })

    it('deleteConsultation is a function', () => {
      const { result } = renderHook(() => useConsultations())
      expect(typeof result.current.deleteConsultation).toBe('function')
    })

    it('refetch is a function', () => {
      const { result } = renderHook(() => useConsultations())
      expect(typeof result.current.refetch).toBe('function')
    })
  })

  describe('initial state', () => {
    it('starts with loading true', () => {
      const { result } = renderHook(() => useConsultations())
      expect(result.current.loading).toBe(true)
    })

    it('starts with empty consultations array', () => {
      const { result } = renderHook(() => useConsultations())
      expect(result.current.consultations).toEqual([])
    })

    it('starts with null error', () => {
      const { result } = renderHook(() => useConsultations())
      expect(result.current.error).toBeNull()
    })
  })

  describe('with patient ID filter', () => {
    it('accepts optional patient ID parameter', () => {
      // Should not throw when called with patient ID
      const { result } = renderHook(() => useConsultations('patient-123'))
      expect(result.current).toBeDefined()
    })
  })
})
