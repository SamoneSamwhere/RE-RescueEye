import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
