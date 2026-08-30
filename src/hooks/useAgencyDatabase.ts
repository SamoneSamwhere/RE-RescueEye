import { useState } from 'react'
import { supabase, handleDatabaseError } from '../lib/supabase'

export interface AgencyRecord {
  id: number
  name: string
  registrationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMISSION_REQUIRED'
  subscriptionStatus: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED'
  createdBy: number
  createdAt: string
  validatedBy?: number
  validatedAt?: string
}

interface CreateAgencyInput {
  agencyName: string
  agencyType: string
  agencyAddress: string
  agencyPhone: string
  agencyEmail: string
  agencyWebsite?: string
  adminFullName: string
  adminPosition: string
  adminEmail: string
  adminPhone: string
  adminPassword: string
}

export function useAgencyDatabase() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Get all agencies (optionally filtered by status)
   */
  const getAgencies = async (filters?: {
    registrationStatus?: string
  }): Promise<AgencyRecord[]> => {
    setIsLoading(true)
    setError(null)
    try {
      let query = supabase.from('agency').select('*')

      if (filters?.registrationStatus) {
        query = query.eq('registrationStatus', filters.registrationStatus)
      }

      const { data, error: dbError } = await query.order('createdAt', { ascending: false })

      if (dbError) throw dbError
      return data || []
    } catch (err) {
      const errorMsg = handleDatabaseError(err)
      setError(errorMsg)
      console.error('Error fetching agencies:', err)
      return []
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Get pending agencies for System Admin review
   */
  const getPendingAgencies = async (): Promise<AgencyRecord[]> => {
    return getAgencies({ registrationStatus: 'PENDING' })
  }

  /**
   * Get agency by ID
   */
  const getAgencyById = async (agencyId: number): Promise<AgencyRecord | null> => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: dbError } = await supabase
        .from('agency')
        .select('*')
        .eq('id', agencyId)
        .single()

      if (dbError) {
        if (dbError.code === 'PGRST116') return null
        throw dbError
      }

      return data
    } catch (err) {
      const errorMsg = handleDatabaseError(err)
      setError(errorMsg)
      console.error('Error fetching agency:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Create agency registration (with Agency Admin user)
   */
  const createAgency = async (input: CreateAgencyInput) => {
    setIsLoading(true)
    setError(null)

    try {
      // Step 1: Create admin user account (inactive until agency is approved)
      const passwordHash = await hashPassword(input.adminPassword)

      const { data: userData, error: userError } = await supabase
        .from('user')
        .insert([
          {
            email: input.adminEmail.toLowerCase(),
            passwordHash: passwordHash,
            name: input.adminFullName,
            phone: input.adminPhone,
            role: 'AGENCY_ADMIN',
            agencyId: null, // Will be set after agency creation
            active: false, // Inactive until approved
            dutyStatus: 'OFF_DUTY',
          },
        ])
        .select()
        .single()

      if (userError) throw userError
      if (!userData) throw new Error('Failed to create user')

      // Step 2: Create agency with the user as creator
      const { data: agencyData, error: agencyError } = await supabase
        .from('agency')
        .insert([
          {
            name: input.agencyName,
            registrationStatus: 'PENDING',
            subscriptionStatus: 'ACTIVE',
            createdBy: userData.id,
          },
        ])
        .select()
        .single()

      if (agencyError) throw agencyError
      if (!agencyData) throw new Error('Failed to create agency')

      // Step 3: Update user with agencyId
      const { error: updateError } = await supabase
        .from('user')
        .update({ agencyId: agencyData.id })
        .eq('id', userData.id)

      if (updateError) throw updateError

      return { agencyId: agencyData.id, userId: userData.id, success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create agency'
      setError(errorMessage)
      console.error('Agency creation error:', err)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Approve agency (System Admin action)
   */
  const approveAgency = async (agencyId: number, validatedByUserId: number): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: dbError } = await supabase
        .from('agency')
        .update({
          registrationStatus: 'APPROVED',
          subscriptionStatus: 'ACTIVE',
          validatedBy: validatedByUserId,
          validatedAt: new Date().toISOString(),
        })
        .eq('id', agencyId)

      if (dbError) throw dbError

      // Also activate the Agency Admin user
      const agency = await getAgencyById(agencyId)
      if (agency) {
        await supabase.from('user').update({ active: true }).eq('id', agency.createdBy)
      }

      return true
    } catch (err) {
      const errorMsg = handleDatabaseError(err)
      setError(errorMsg)
      console.error('Error approving agency:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Reject agency (System Admin action)
   */
  const rejectAgency = async (agencyId: number, validatedByUserId: number): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: dbError } = await supabase
        .from('agency')
        .update({
          registrationStatus: 'REJECTED',
          subscriptionStatus: 'SUSPENDED',
          validatedBy: validatedByUserId,
          validatedAt: new Date().toISOString(),
        })
        .eq('id', agencyId)

      if (dbError) throw dbError
      return true
    } catch (err) {
      const errorMsg = handleDatabaseError(err)
      setError(errorMsg)
      console.error('Error rejecting agency:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return { createAgency, getAgencies, getPendingAgencies, getAgencyById, approveAgency, rejectAgency, isLoading, error }
}

// Simple password hashing for demo (in production, use proper bcrypt)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
