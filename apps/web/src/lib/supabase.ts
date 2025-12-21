import { createClient } from '@supabase/supabase-js';

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

// Create Supabase client using anon/publishable key
// Authentication is handled by Firebase, Supabase is used for database only
// RLS policies allow anon role access, with application-level security via Firebase user_id
export const supabase = createClient(supabaseUrl, supabaseKey);
