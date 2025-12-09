import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Missing Supabase environment variables. Authentication will not work.');
  console.warn('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.warn('VITE_SUPABASE_KEY:', supabaseKey ? 'Set' : 'Missing');
  console.warn('Key value:', supabaseKey);
} else {
  console.log('✅ Supabase configuration loaded');
  console.log('URL:', supabaseUrl);
  console.log('Key type:', supabaseKey.startsWith('sb_publishable_') ? 'Publishable (new format)' : 'Legacy anon key');
  console.log('Key (first 30 chars):', supabaseKey.substring(0, 30) + '...');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
