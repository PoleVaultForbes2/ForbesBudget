import { createClient } from '@supabase/supabase-js'

// Safely pull the variables with empty fallbacks to prevent "cannot read properties of undefined"
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || ''
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials are missing. Check your .env.local file!')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)