import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface CreateAgencyInput {
  agencyName: string
  agencyType: string
  agencyAddress: string
  agencyPhone: string
  agencyEmail: string
  agencyWebsite?: string
  adminFirstName: string
  adminLastName: string
  adminPosition: string
  adminEmail: string
  adminPhone: string
  adminPassword: string
}

export interface DbAgency {
  id: number
  name: string
  agencyType: string | null
  address: string | null
  website: string | null
  contactEmail: string | null
  contactPhone: string | null
  registrationStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  accountStatus: 'ACTIVE' | 'INACTIVE' | null
  subscriptionStatus: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED'
  createdBy: number
  createdAt: string
  validatedBy: number | null
  validatedAt: string | null
  reviewNotes: string | null
}

export function useAgencyDatabase() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
            email: input.adminEmail,
            passwordHash: passwordHash,
            firstName: input.adminFirstName,
            lastName: input.adminLastName,
            position: input.adminPosition,
            phone: input.adminPhone,
            role: 'AGENCY_ADMIN',
            agencyId: null, // Will be set after agency creation
            active: false, // Inactive until approved
            createdAt: new Date().toISOString(),
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
            agencyType: input.agencyType,
            address: input.agencyAddress,
            website: input.agencyWebsite || null,
            contactEmail: input.agencyEmail,
            contactPhone: input.agencyPhone,
            registrationStatus: 'PENDING',
            accountStatus: 'INACTIVE',
            subscriptionStatus: 'ACTIVE',
            createdBy: userData.id,
            createdAt: new Date().toISOString(),
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

  const getAgencies = async (): Promise<DbAgency[]> => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: dbError } = await supabase
        .from('agency')
        .select('*')
        .order('createdAt', { ascending: false })

      if (dbError) throw dbError
      return data || []
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load agencies'
      setError(errorMessage)
      console.error('Get agencies error:', err)
      return []
    } finally {
      setIsLoading(false)
    }
  }

  /** Looks up who created an agency, so approve/reject can also flip that admin's active flag. */
  const getAgencyCreator = async (agencyId: number): Promise<number | null> => {
    const { data, error: dbError } = await supabase.from('agency').select('createdBy').eq('id', agencyId).single()
    if (dbError || !data) return null
    return data.createdBy
  }

  const approveAgency = async (agencyId: number, reviewedByUserId: number | null) => {
    const { error: dbError } = await supabase
      .from('agency')
      .update({
        registrationStatus: 'APPROVED',
        accountStatus: 'ACTIVE',
        validatedBy: reviewedByUserId,
        validatedAt: new Date().toISOString(),
        reviewNotes: null,
      })
      .eq('id', agencyId)

    if (dbError) {
      console.error('Approve agency error:', dbError)
      return false
    }

    const creatorId = await getAgencyCreator(agencyId)
    if (creatorId) {
      const { error: userError } = await supabase.from('user').update({ active: true }).eq('id', creatorId)
      if (userError) console.error('Activate agency admin error:', userError)
    }

    return true
  }

  const rejectAgency = async (agencyId: number, reviewedByUserId: number | null, reason: string) => {
    const { error: dbError } = await supabase
      .from('agency')
      .update({
        registrationStatus: 'REJECTED',
        accountStatus: 'INACTIVE',
        validatedBy: reviewedByUserId,
        validatedAt: new Date().toISOString(),
        reviewNotes: reason,
      })
      .eq('id', agencyId)

    if (dbError) {
      console.error('Reject agency error:', dbError)
      return false
    }

    const creatorId = await getAgencyCreator(agencyId)
    if (creatorId) {
      const { error: userError } = await supabase.from('user').update({ active: false }).eq('id', creatorId)
      if (userError) console.error('Deactivate agency admin error:', userError)
    }

    return true
  }

  const requestResubmission = async (agencyId: number, reviewedByUserId: number | null, notes: string) => {
    const { error: dbError } = await supabase
      .from('agency')
      .update({
        registrationStatus: 'PENDING',
        accountStatus: 'INACTIVE',
        validatedBy: reviewedByUserId,
        validatedAt: new Date().toISOString(),
        reviewNotes: notes,
      })
      .eq('id', agencyId)

    if (dbError) console.error('Request resubmission error:', dbError)
    return !dbError
  }

  const resubmitAgency = async (agencyId: number) => {
    const { error: dbError } = await supabase
      .from('agency')
      .update({
        registrationStatus: 'PENDING',
        validatedBy: null,
        validatedAt: null,
        reviewNotes: null,
      })
      .eq('id', agencyId)

    if (dbError) console.error('Resubmit agency error:', dbError)
    return !dbError
  }

  const setAgencyAccountStatus = async (agencyId: number, status: 'ACTIVE' | 'INACTIVE') => {
    const { error: dbError } = await supabase.from('agency').update({ accountStatus: status }).eq('id', agencyId)

    if (dbError) console.error('Set agency account status error:', dbError)
    return !dbError
  }

  return {
    createAgency,
    getAgencies,
    approveAgency,
    rejectAgency,
    requestResubmission,
    resubmitAgency,
    setAgencyAccountStatus,
    isLoading,
    error,
  }
}

// Simple password hashing for demo (in production, use proper bcrypt)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
