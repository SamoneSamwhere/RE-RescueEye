import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('Supabase Config:')
console.log('URL:', supabaseUrl ? 'loaded ✓' : 'MISSING ✗')
console.log('Key:', supabaseAnonKey ? 'loaded ✓' : 'MISSING ✗')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Environment variables:', {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  })
  throw new Error(`Missing Supabase environment variables. URL: ${!!supabaseUrl}, Key: ${!!supabaseAnonKey}`)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
console.log('Supabase client initialized successfully')

// Helper function to handle database errors
export function handleDatabaseError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('duplicate key')) {
      if (error.message.includes('serial_number')) {
        return 'This serial number is already registered.'
      }
      if (error.message.includes('registration_number')) {
        return 'This registration number is already in use.'
      }
      return 'This record already exists.'
    }
    return error.message
  }
  return 'An error occurred'
}
