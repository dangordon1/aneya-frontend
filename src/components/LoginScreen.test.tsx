import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test/utils/render'
import { LoginScreen } from './LoginScreen'

// Mock the auth context
const mockSignIn = vi.fn()
const mockSignUp = vi.fn()
const mockSignInWithGoogle = vi.fn()
const mockResetPassword = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    signUp: mockSignUp,
    signInWithGoogle: mockSignInWithGoogle,
    resetPassword: mockResetPassword,
  }),
}))

// Mock supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        not: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  },
}))

describe('LoginScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignIn.mockResolvedValue({ error: null })
    mockSignUp.mockResolvedValue({ error: null, session: { user: {} } })
    mockSignInWithGoogle.mockResolvedValue({ error: null })
    mockResetPassword.mockResolvedValue({ error: null })
  })

  describe('rendering', () => {
    it('renders logo', () => {
      render(<LoginScreen />)
      expect(screen.getByAltText('aneya')).toBeInTheDocument()
    })

    it('renders doctor and patient tabs', () => {
      render(<LoginScreen />)
      expect(screen.getByRole('button', { name: /Doctor Login/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Patient Login/i })).toBeInTheDocument()
    })

    it('renders email input', () => {
      render(<LoginScreen />)
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument()
    })

    it('renders password input', () => {
      render(<LoginScreen />)
      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument()
    })

    it('renders sign in button', () => {
      render(<LoginScreen />)
      expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument()
    })

    it('renders Google sign in button', () => {
      render(<LoginScreen />)
      expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeInTheDocument()
    })

    it('renders sign up link', () => {
      render(<LoginScreen />)
      expect(screen.getByText(/Don't have an account/i)).toBeInTheDocument()
    })

    it('renders forgot password link', () => {
      render(<LoginScreen />)
      expect(screen.getByRole('button', { name: /Forgot password/i })).toBeInTheDocument()
    })
  })

  describe('login mode tabs', () => {
    it('defaults to doctor login mode', () => {
      render(<LoginScreen />)
      const doctorTab = screen.getByRole('button', { name: /Doctor Login/i })
      expect(doctorTab).toHaveClass('bg-aneya-teal')
    })

    it('switches to patient login when clicked', async () => {
      const { user } = render(<LoginScreen />)

      await user.click(screen.getByRole('button', { name: /Patient Login/i }))

      const patientTab = screen.getByRole('button', { name: /Patient Login/i })
      expect(patientTab).toHaveClass('bg-aneya-teal')
    })
  })

  describe('sign up mode', () => {
    it('switches to sign up mode when clicked', async () => {
      const { user } = render(<LoginScreen />)

      await user.click(screen.getByText(/Sign up/i))

      expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument()
    })

    it('shows confirm password field in sign up mode', async () => {
      const { user } = render(<LoginScreen />)

      await user.click(screen.getByText(/Sign up/i))

      expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument()
    })

    it('shows doctor name field for doctor sign up', async () => {
      const { user } = render(<LoginScreen />)

      await user.click(screen.getByText(/Sign up/i))

      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument()
    })

    it('shows specialty dropdown for doctor sign up', async () => {
      const { user } = render(<LoginScreen />)

      await user.click(screen.getByText(/Sign up/i))

      expect(screen.getByLabelText(/Specialty/i)).toBeInTheDocument()
    })

    it('shows clinic name field for doctor sign up', async () => {
      const { user } = render(<LoginScreen />)

      await user.click(screen.getByText(/Sign up/i))

      expect(screen.getByLabelText(/Clinic\/Hospital Name/i)).toBeInTheDocument()
    })

    it('shows patient name field for patient sign up', async () => {
      const { user } = render(<LoginScreen />)

      await user.click(screen.getByRole('button', { name: /Patient Login/i }))
      await user.click(screen.getByText(/Sign up/i))

      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument()
    })
  })

  describe('forgot password mode', () => {
    it('shows forgot password form when clicked', async () => {
      const { user } = render(<LoginScreen />)

      await user.click(screen.getByRole('button', { name: /Forgot password/i }))

      expect(screen.getByRole('button', { name: /Send Reset Link/i })).toBeInTheDocument()
    })

    it('shows back to sign in button', async () => {
      const { user } = render(<LoginScreen />)

      await user.click(screen.getByRole('button', { name: /Forgot password/i }))

      expect(screen.getByText(/Back to sign in/i)).toBeInTheDocument()
    })

    it('calls resetPassword when form submitted', async () => {
      const { user } = render(<LoginScreen />)

      await user.click(screen.getByRole('button', { name: /Forgot password/i }))
      await user.type(screen.getByLabelText(/Email Address/i), 'test@example.com')
      await user.click(screen.getByRole('button', { name: /Send Reset Link/i }))

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith('test@example.com')
      })
    })
  })

  describe('form submission', () => {
    it('calls signIn with credentials on sign in', async () => {
      const { user } = render(<LoginScreen />)

      await user.type(screen.getByLabelText(/Email Address/i), 'doctor@example.com')
      await user.type(screen.getByLabelText(/^Password$/i), 'password123')
      await user.click(screen.getByRole('button', { name: /Sign In/i }))

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('doctor@example.com', 'password123', 'doctor')
      })
    })

    it('calls signUp with profile data on sign up', async () => {
      mockSignUp.mockResolvedValue({ error: null, session: { user: {} } })
      const { user } = render(<LoginScreen />)

      await user.click(screen.getByText(/Sign up/i))

      await user.type(screen.getByLabelText(/Email Address/i), 'newdoc@example.com')
      await user.type(screen.getByLabelText(/^Password$/i), 'password123')
      await user.type(screen.getByLabelText(/Confirm Password/i), 'password123')
      await user.type(screen.getByLabelText(/Full Name/i), 'Dr. Smith')

      await user.click(screen.getByRole('button', { name: /Create Account/i }))

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith(
          'newdoc@example.com',
          'password123',
          'doctor',
          expect.objectContaining({
            name: 'Dr. Smith',
          })
        )
      })
    })

    it('calls signInWithGoogle when Google button clicked', async () => {
      const { user } = render(<LoginScreen />)

      await user.click(screen.getByRole('button', { name: /Continue with Google/i }))

      await waitFor(() => {
        expect(mockSignInWithGoogle).toHaveBeenCalled()
      })
    })
  })

  describe('validation', () => {
    it('shows error when email is empty', async () => {
      const { user } = render(<LoginScreen />)

      await user.type(screen.getByLabelText(/^Password$/i), 'password123')
      await user.click(screen.getByRole('button', { name: /Sign In/i }))

      expect(screen.getByText(/Please enter both email and password/i)).toBeInTheDocument()
    })

    it('shows error when passwords do not match on sign up', async () => {
      const { user } = render(<LoginScreen />)

      await user.click(screen.getByText(/Sign up/i))

      await user.type(screen.getByLabelText(/Email Address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^Password$/i), 'password123')
      await user.type(screen.getByLabelText(/Confirm Password/i), 'different456')
      await user.type(screen.getByLabelText(/Full Name/i), 'Dr. Smith')

      await user.click(screen.getByRole('button', { name: /Create Account/i }))

      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument()
    })

    it('shows error when password is too short on sign up', async () => {
      const { user } = render(<LoginScreen />)

      await user.click(screen.getByText(/Sign up/i))

      await user.type(screen.getByLabelText(/Email Address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^Password$/i), '12345')
      await user.type(screen.getByLabelText(/Confirm Password/i), '12345')
      await user.type(screen.getByLabelText(/Full Name/i), 'Dr. Smith')

      await user.click(screen.getByRole('button', { name: /Create Account/i }))

      expect(screen.getByText(/Password must be at least 6 characters/i)).toBeInTheDocument()
    })
  })

  describe('show password toggle', () => {
    it('renders show password checkbox', () => {
      render(<LoginScreen />)
      expect(screen.getByLabelText(/Show password/i)).toBeInTheDocument()
    })
  })

  describe('disclaimer', () => {
    it('shows doctor disclaimer for doctor login', () => {
      render(<LoginScreen />)
      expect(screen.getByText(/For healthcare professionals only/i)).toBeInTheDocument()
    })

    it('shows patient disclaimer for patient login', async () => {
      const { user } = render(<LoginScreen />)

      await user.click(screen.getByRole('button', { name: /Patient Login/i }))

      expect(screen.getByText(/Manage your health appointments/i)).toBeInTheDocument()
    })
  })
})
