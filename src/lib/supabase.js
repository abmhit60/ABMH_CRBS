import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,     // Don't store Supabase auth session
    autoRefreshToken: false,   // Don't make background refresh calls
    detectSessionInUrl: false, // Don't check URL for auth tokens
  }
})
