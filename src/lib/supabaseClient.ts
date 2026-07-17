import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bzfyakbdihvedyatvzwg.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'PLACEHOLDER_KEY';

/**
 * Checks whether Supabase is fully configured and ready for data operations.
 */
export const isSupabaseConfigured = (): boolean => {
  const urlSet = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const keySet = 
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'your_supabase_anon_key_here' &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'PLACEHOLDER_KEY';

  return urlSet && keySet;
};

// Create client connection
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
