import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const sessionStart = performance.now();
    supabase.auth.getSession().then(({ data: { session } }) => {
      const sessionEnd = performance.now();
      console.log(`⏱️ Get session: ${(sessionEnd - sessionStart).toFixed(0)}ms`);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const signInStart = performance.now();

    // Retry logic for network failures
    let lastError: AuthError | null = null;
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const { data: _data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        const signInEnd = performance.now();

        if (!error) {
          console.log(`⏱️ Sign in: ${(signInEnd - signInStart).toFixed(0)}ms ✅ Success${attempt > 0 ? ` (retry ${attempt})` : ''}`);
          return { error: null };
        }

        // Check if it's a network error that we should retry
        const isNetworkError = error.message?.includes('Load failed') ||
                               error.message?.includes('network') ||
                               error.message?.includes('Failed to fetch');

        if (!isNetworkError || attempt === maxRetries) {
          // Not a network error, or we've exhausted retries
          console.log(`⏱️ Sign in: ${(signInEnd - signInStart).toFixed(0)}ms ❌ Failed${attempt > 0 ? ` (after ${attempt} retries)` : ''}`);
          return { error };
        }

        // Network error - retry after delay
        lastError = error;
        const delay = Math.min(1000 * Math.pow(2, attempt), 3000); // 1s, 2s, 3s max
        console.log(`⚠️ Sign in network error, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));

      } catch (err) {
        const signInEnd = performance.now();
        console.log(`⏱️ Sign in: ${(signInEnd - signInStart).toFixed(0)}ms ❌ Exception thrown`);
        throw err;
      }
    }

    // Should never reach here, but just in case
    return { error: lastError };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
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
