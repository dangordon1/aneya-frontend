import React, { ReactElement, Suspense } from 'react'
import { render, RenderOptions, RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

// Mock auth context values for different test scenarios
export interface MockAuthState {
  user?: { id: string; email: string | null } | null
  session?: { access_token: string; user: { id: string; email: string | null } } | null
  loading?: boolean
  isAdmin?: boolean
  isDoctor?: boolean
  isPatient?: boolean
  userRole?: 'user' | 'admin' | 'superadmin' | 'doctor' | 'patient' | null
  doctorProfile?: {
    id: string
    user_id: string
    name: string
    email: string
    specialty?: string | null
    clinic_name?: string | null
  } | null
  patientProfile?: {
    id: string
    user_id: string
    name: string
    email: string
    date_of_birth: string
    sex: string
  } | null
}

const defaultMockAuth: MockAuthState = {
  user: { id: 'test-user-id', email: 'test@example.com' },
  session: { access_token: 'test-token', user: { id: 'test-user-id', email: 'test@example.com' } },
  loading: false,
  isAdmin: false,
  isDoctor: true,
  isPatient: false,
  userRole: 'doctor',
  doctorProfile: {
    id: 'test-doctor-id',
    user_id: 'test-user-id',
    name: 'Dr. Test',
    email: 'test@example.com',
    specialty: 'general',
    clinic_name: 'Test Clinic',
  },
  patientProfile: null,
}

// Create mock auth context value
function createMockAuthValue(authState: MockAuthState = {}) {
  const state = { ...defaultMockAuth, ...authState }

  return {
    ...state,
    signIn: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({ error: null, session: state.session }),
    signInWithGoogle: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue(undefined),
    getIdToken: vi.fn().mockResolvedValue('mock-id-token'),
    resetPassword: vi.fn().mockResolvedValue({ error: null }),
    refreshProfiles: vi.fn().mockResolvedValue(undefined),
    refreshDoctorProfile: vi.fn().mockResolvedValue(undefined),
  }
}

// Mock AuthContext
const MockAuthContext = React.createContext(createMockAuthValue())

// Simple ErrorBoundary for tests
class TestErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Test Error Boundary: {this.state.error?.message}</div>
    }
    return this.props.children
  }
}

// Loading fallback for Suspense
function LoadingFallback() {
  return <div data-testid="loading">Loading...</div>
}

interface AllProvidersProps {
  children: React.ReactNode
  authState?: MockAuthState
}

function AllProviders({ children, authState = {} }: AllProvidersProps) {
  const authValue = createMockAuthValue(authState)

  return (
    <MockAuthContext.Provider value={authValue}>
      <TestErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
      </TestErrorBoundary>
    </MockAuthContext.Provider>
  )
}

// Custom render options
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authState?: MockAuthState
}

// Extended render result with userEvent user
interface CustomRenderResult extends RenderResult {
  user: ReturnType<typeof userEvent.setup>
}

/**
 * Custom render function that wraps components with all necessary providers
 * Returns the render result plus a userEvent user for interactions
 */
function customRender(ui: ReactElement, options: CustomRenderOptions = {}): CustomRenderResult {
  const { authState, ...renderOptions } = options
  const user = userEvent.setup()

  const renderResult = render(ui, {
    wrapper: ({ children }) => <AllProviders authState={authState}>{children}</AllProviders>,
    ...renderOptions,
  })

  return {
    ...renderResult,
    user,
  }
}

/**
 * Render without providers - for testing components in isolation
 */
function renderWithoutProviders(ui: ReactElement, options?: RenderOptions): RenderResult {
  return render(ui, options)
}

/**
 * Hook to use mock auth context in tests
 */
export function useMockAuth() {
  return React.useContext(MockAuthContext)
}

// Pre-configured auth states for common test scenarios
export const authStates = {
  authenticated: defaultMockAuth,

  unauthenticated: {
    user: null,
    session: null,
    loading: false,
    isAdmin: false,
    isDoctor: false,
    isPatient: false,
    userRole: null,
    doctorProfile: null,
    patientProfile: null,
  } as MockAuthState,

  loading: {
    user: null,
    session: null,
    loading: true,
    isAdmin: false,
    isDoctor: false,
    isPatient: false,
    userRole: null,
    doctorProfile: null,
    patientProfile: null,
  } as MockAuthState,

  admin: {
    ...defaultMockAuth,
    isAdmin: true,
    isDoctor: false,
    userRole: 'admin',
    doctorProfile: null,
  } as MockAuthState,

  patient: {
    user: { id: 'test-patient-user-id', email: 'patient@example.com' },
    session: { access_token: 'test-token', user: { id: 'test-patient-user-id', email: 'patient@example.com' } },
    loading: false,
    isAdmin: false,
    isDoctor: false,
    isPatient: true,
    userRole: 'patient',
    doctorProfile: null,
    patientProfile: {
      id: 'test-patient-id',
      user_id: 'test-patient-user-id',
      name: 'Test Patient',
      email: 'patient@example.com',
      date_of_birth: '1990-01-01',
      sex: 'Male',
    },
  } as MockAuthState,
}

// Re-export everything from testing library
export * from '@testing-library/react'

// Export custom render as default render
export { customRender as render, renderWithoutProviders }
