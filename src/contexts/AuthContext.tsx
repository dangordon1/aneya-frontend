import { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  AuthError as FirebaseAuthError
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

// Compatible User interface (maps Firebase user to expected shape)
interface User {
  id: string;
  email: string | null;
  email_confirmed_at?: string | null;
}

// Compatible Session interface
interface Session {
  access_token: string;
  user: User;
}

// Error interface for compatibility
interface AuthError {
  message: string;
  code?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null; session: Session | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Map Firebase error codes to user-friendly messages
function mapFirebaseError(error: FirebaseAuthError): AuthError {
  const errorMessages: Record<string, string> = {
    'auth/email-already-in-use': 'An account with this email already exists',
    'auth/invalid-email': 'Please enter a valid email address',
    'auth/operation-not-allowed': 'This sign-in method is not enabled',
    'auth/weak-password': 'Password must be at least 6 characters',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/invalid-credential': 'Invalid email or password',
    'auth/too-many-requests': 'Too many attempts. Please try again later',
    'auth/popup-closed-by-user': 'Sign-in was cancelled',
    'auth/popup-blocked': 'Popup was blocked. Please allow popups for this site',
    'auth/network-request-failed': 'Network error. Please check your connection',
  };

  return {
    message: errorMessages[error.code] || error.message || 'An error occurred',
    code: error.code
  };
}

// Map Firebase user to compatible User interface
function mapFirebaseUser(firebaseUser: FirebaseUser): User {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email,
    email_confirmed_at: firebaseUser.emailVerified ? new Date().toISOString() : null
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionStart = performance.now();

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const sessionEnd = performance.now();
      console.log(`⏱️ Auth state check: ${(sessionEnd - sessionStart).toFixed(0)}ms`);

      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          const mappedUser = mapFirebaseUser(firebaseUser);

          setUser(mappedUser);
          setSession({
            access_token: token,
            user: mappedUser
          });

          console.log('✅ User authenticated:', firebaseUser.email);
          console.log('📧 Email verified:', firebaseUser.emailVerified);
        } catch (err) {
          console.error('❌ Error getting auth token:', err);
          setUser(null);
          setSession(null);
        }
      } else {
        setUser(null);
        setSession(null);
        console.log('👤 No user signed in');
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const signInStart = performance.now();

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const signInEnd = performance.now();

      // Check if email is verified (optional - you can remove this check if not needed)
      if (!result.user.emailVerified) {
        console.log('⚠️ Email not verified, but allowing sign-in');
        // You can optionally block unverified users here:
        // return { error: { message: 'Please verify your email before signing in' } };
      }

      console.log(`⏱️ Sign in: ${(signInEnd - signInStart).toFixed(0)}ms ✅ Success`);
      return { error: null };
    } catch (err) {
      const signInEnd = performance.now();
      const firebaseError = err as FirebaseAuthError;
      console.log(`⏱️ Sign in: ${(signInEnd - signInStart).toFixed(0)}ms ❌ Failed: ${firebaseError.code}`);
      return { error: mapFirebaseError(firebaseError) };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);

      // Send email verification
      try {
        await sendEmailVerification(result.user);
        console.log('✅ Verification email sent to:', email);
      } catch (verifyErr) {
        console.warn('⚠️ Could not send verification email:', verifyErr);
      }

      // User is automatically signed in after registration
      const token = await result.user.getIdToken();
      const mappedUser = mapFirebaseUser(result.user);

      const newSession: Session = {
        access_token: token,
        user: mappedUser
      };

      console.log('✅ Signup successful - auto-logged in');
      return { error: null, session: newSession };
    } catch (err) {
      const firebaseError = err as FirebaseAuthError;
      console.error('❌ Signup error:', firebaseError.code, firebaseError.message);
      return { error: mapFirebaseError(firebaseError), session: null };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log('✅ Google sign-in successful:', result.user.email);
      return { error: null };
    } catch (err) {
      const firebaseError = err as FirebaseAuthError;

      // Don't show error if user just closed the popup
      if (firebaseError.code === 'auth/popup-closed-by-user') {
        console.log('ℹ️ Google sign-in cancelled by user');
        return { error: null };
      }

      console.error('❌ Google sign-in error:', firebaseError.code, firebaseError.message);
      return { error: mapFirebaseError(firebaseError) };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      console.log('✅ Signed out successfully');
    } catch (err) {
      console.error('❌ Sign out error:', err);
    }
  };

  // Get current ID token (for API calls)
  const getIdToken = async (): Promise<string | null> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;

    try {
      return await currentUser.getIdToken();
    } catch (err) {
      console.error('❌ Error getting ID token:', err);
      return null;
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    getIdToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
