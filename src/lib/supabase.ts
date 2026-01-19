import { createClient } from '@supabase/supabase-js';
import { auth } from './firebase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Missing Supabase environment variables. Database access will not work.');
  console.warn('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.warn('VITE_SUPABASE_KEY:', supabaseKey ? 'Set' : 'Missing');
} else {
  console.log('✅ Supabase configuration loaded');
  console.log('URL:', supabaseUrl);
  console.log('Key type:', supabaseKey.startsWith('sb_publishable_') ? 'Publishable (new format)' : 'Legacy anon key');
}

/**
 * Supabase client with Firebase token passthrough.
 *
 * This client uses Supabase's native third-party Firebase auth support.
 * The `accessToken` option automatically passes Firebase ID tokens to Supabase,
 * which validates them directly (no backend token exchange needed).
 *
 * When a user is logged in via Firebase:
 * - `auth.uid()` in RLS policies returns the Firebase UID
 * - The "authenticated" role is used (from Firebase JWT custom claims)
 * - Data access is restricted based on the user's Firebase UID
 *
 * When no user is logged in:
 * - The anon key is used (accessToken returns null)
 * - RLS policies apply anon rules
 */
export const supabase = createClient(supabaseUrl, supabaseKey, {
  accessToken: async () => {
    const user = auth.currentUser;
    if (!user) {
      return null;
    }
    try {
      // Get the Firebase ID token - Firebase handles automatic refresh
      const token = await user.getIdToken();
      return token;
    } catch (error) {
      console.error('❌ Error getting Firebase ID token for Supabase:', error);
      return null;
    }
  },
});
