import { vi } from 'vitest'

// Mock Firebase user
export const mockFirebaseUser = {
  uid: 'test-firebase-uid',
  email: 'test@example.com',
  emailVerified: true,
  displayName: 'Test User',
  photoURL: null,
  phoneNumber: null,
  isAnonymous: false,
  tenantId: null,
  providerData: [],
  metadata: {
    creationTime: new Date().toISOString(),
    lastSignInTime: new Date().toISOString(),
  },
  getIdToken: vi.fn().mockResolvedValue('mock-id-token'),
  getIdTokenResult: vi.fn().mockResolvedValue({
    token: 'mock-id-token',
    claims: {},
    expirationTime: new Date(Date.now() + 3600000).toISOString(),
    issuedAtTime: new Date().toISOString(),
    signInProvider: 'password',
  }),
  reload: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  toJSON: vi.fn().mockReturnValue({}),
}

// Mock Firebase Auth instance
export const mockAuth = {
  currentUser: null as typeof mockFirebaseUser | null,
  app: {},
  name: 'mock-auth',
  config: {},
  languageCode: 'en',
  tenantId: null,
  settings: {},
  onAuthStateChanged: vi.fn((callback: (user: typeof mockFirebaseUser | null) => void) => {
    // Immediately call with current user
    callback(mockAuth.currentUser)
    // Return unsubscribe function
    return vi.fn()
  }),
  onIdTokenChanged: vi.fn((_callback: (user: typeof mockFirebaseUser | null) => void) => {
    return vi.fn()
  }),
  signOut: vi.fn().mockResolvedValue(undefined),
  updateCurrentUser: vi.fn().mockResolvedValue(undefined),
}

// Mock Auth functions
export const signInWithEmailAndPassword = vi.fn().mockResolvedValue({
  user: mockFirebaseUser,
  providerId: 'password',
  operationType: 'signIn',
})

export const createUserWithEmailAndPassword = vi.fn().mockResolvedValue({
  user: mockFirebaseUser,
  providerId: 'password',
  operationType: 'signUp',
})

export const signInWithPopup = vi.fn().mockResolvedValue({
  user: mockFirebaseUser,
  providerId: 'google.com',
  operationType: 'signIn',
})

export const signOut = vi.fn().mockResolvedValue(undefined)

export const sendEmailVerification = vi.fn().mockResolvedValue(undefined)

export const sendPasswordResetEmail = vi.fn().mockResolvedValue(undefined)

export const onAuthStateChanged = vi.fn((auth: unknown, callback: (user: typeof mockFirebaseUser | null) => void) => {
  callback(mockAuth.currentUser)
  return vi.fn()
})

export const getAuth = vi.fn().mockReturnValue(mockAuth)

export const GoogleAuthProvider = vi.fn().mockImplementation(() => ({
  setCustomParameters: vi.fn().mockReturnThis(),
  addScope: vi.fn().mockReturnThis(),
  providerId: 'google.com',
}))

export const EmailAuthProvider = vi.fn().mockImplementation(() => ({
  providerId: 'password',
}))

// Helper to set auth state for tests
export function setMockAuthUser(user: typeof mockFirebaseUser | null) {
  mockAuth.currentUser = user
}

// Helper to simulate successful sign in
export function simulateSignIn(user = mockFirebaseUser) {
  mockAuth.currentUser = user
  return user
}

// Helper to simulate sign out
export function simulateSignOut() {
  mockAuth.currentUser = null
}

// Helper to create a custom mock user
export function createMockUser(overrides: Partial<typeof mockFirebaseUser> = {}) {
  return {
    ...mockFirebaseUser,
    ...overrides,
  }
}

// Reset all Firebase mocks
export function resetFirebaseMocks() {
  mockAuth.currentUser = null
  vi.clearAllMocks()
}

// Mock Firebase app initialization
export const initializeApp = vi.fn().mockReturnValue({
  name: '[DEFAULT]',
  options: {},
})

// Mock Google Auth Provider instance
export const googleProvider = new GoogleAuthProvider()

// Export auth instance
export const auth = mockAuth
