import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  storage?: any; // Optional storage adapter for React Native
}

/**
 * Create a Supabase client instance
 * Platform-agnostic factory that works for both web and mobile
 */
export function createSupabaseClient(config: SupabaseConfig): SupabaseClient {
  const { url, anonKey, storage } = config;

  if (!url || !anonKey) {
    console.warn('⚠️ Missing Supabase configuration. Database access will not work.');
    console.warn('URL:', url ? 'Set' : 'Missing');
    console.warn('Key:', anonKey ? 'Set' : 'Missing');
  } else {
    console.log('✅ Supabase configuration loaded');
    console.log('URL:', url);
    console.log('Key type:', anonKey.startsWith('sb_publishable_') ? 'Publishable (new format)' : 'Legacy anon key');
  }

  const options: any = {};

  // For React Native, pass custom storage adapter
  if (storage) {
    options.auth = {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    };
  }

  return createClient(url, anonKey, options);
}
