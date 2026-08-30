import { useState } from 'react'
import { supabase, handleDatabaseError } from '../lib/supabase'

export interface UserRecord {
  id: number
  email: string
  name: string
  phone?: string
  role: 'SYSTEM_ADMIN' | 'AGENCY_ADMIN' | 'COMMAND_STAFF' | 'FIELD_RESPONDER'
  agencyId?: number
  active: boolean
  dutyStatus: string
  createdAt: string
  lastLogin?: string
}

export function useUserDatabase() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Get all users (optionally filtered by agency or role)
   */
  const getUsers = async (filters?: {
    agencyId?: number
    role?: string
  }): Promise<UserRecord[]> => {
    setIsLoading(true)
    setError(null)
    try {
      let query = supabase.from('user').select('*')

      if (filters?.agencyId) {
        query = query.eq('agencyId', filters.agencyId)
      }
      if (filters?.role) {
        query = query.eq('role', filters.role)
      }

      const { data, error: dbError } = await query.order('createdAt', { ascending: false })

      if (dbError) throw dbError
      return data || []
    } catch (err) {
      const errorMsg = handleDatabaseError(err)
      setError(errorMsg)
      console.error('Error fetching users:', err)
      return []
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Get System Admin users
   */
  const getSystemAdmins = async (): Promise<UserRecord[]> => {
    return getUsers({ role: 'SYSTEM_ADMIN' })
  }

  /**
   * Get Agency Admins for a specific agency
   */
  const getAgencyAdmins = async (agencyId: number): Promise<UserRecord[]> => {
    return getUsers({ agencyId, role: 'AGENCY_ADMIN' })
  }

  /**
   * Get Command Staff for a specific agency
   */
  const getCommandStaff = async (agencyId: number): Promise<UserRecord[]> => {
    return getUsers({ agencyId, role: 'COMMAND_STAFF' })
  }

  /**
   * Get Field Responders for a specific agency
   */
  const getFieldResponders = async (agencyId: number): Promise<UserRecord[]> => {
    return getUsers({ agencyId, role: 'FIELD_RESPONDER' })
  }

  /**
   * Get user by email and verify password
   */
  const authenticateUser = async (email: string, passwordHash: string): Promise<UserRecord | null> => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: dbError } = await supabase
        .from('user')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('passwordHash', passwordHash)
        .eq('active', true)
        .single()

      if (dbError) {
        if (dbError.code === 'PGRST116') {
          return null // Not found or inactive
        }
        throw dbError
      }

      return data
    } catch (err) {
      const errorMsg = handleDatabaseError(err)
      setError(errorMsg)
      console.error('Authentication error:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Create a new user (Agency Admin during registration)
   */
  const createUser = async (userData: {
    email: string
    name: string
    phone?: string
    passwordHash: string
    role: 'AGENCY_ADMIN' | 'COMMAND_STAFF' | 'FIELD_RESPONDER'
    agencyId: number
    active?: boolean
  }): Promise<UserRecord | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: dbError } = await supabase
        .from('user')
        .insert([
          {
            email: userData.email.toLowerCase(),
            name: userData.name,
            phone: userData.phone || null,
            passwordHash: userData.passwordHash,
            role: userData.role,
            agencyId: userData.agencyId,
            active: userData.active ?? false, // Default to inactive until approved
            dutyStatus: 'AVAILABLE',
          },
        ])
        .select()
        .single()

      if (dbError) throw dbError
      return data
    } catch (err) {
      const errorMsg = handleDatabaseError(err)
      setError(errorMsg)
      console.error('User creation error:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Activate/deactivate a user
   */
  const setUserActive = async (userId: number, active: boolean): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: dbError } = await supabase.from('user').update({ active }).eq('id', userId)

      if (dbError) throw dbError
      return true
    } catch (err) {
      const errorMsg = handleDatabaseError(err)
      setError(errorMsg)
      console.error('User update error:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Update user last login timestamp
   */
  const recordLogin = async (userId: number): Promise<boolean> => {
    try {
      const { error: dbError } = await supabase
        .from('user')
        .update({ lastLogin: new Date().toISOString() })
        .eq('id', userId)

      if (dbError) throw dbError
      return true
    } catch (err) {
      console.error('Error recording login:', err)
      return false
    }
  }

  return {
    isLoading,
    error,
    getUsers,
    getSystemAdmins,
    getAgencyAdmins,
    getCommandStaff,
    getFieldResponders,
    authenticateUser,
    createUser,
    setUserActive,
    recordLogin,
  }
}
