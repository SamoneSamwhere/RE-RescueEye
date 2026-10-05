import { useState } from 'react'
import { supabase, emailPattern, handleDatabaseError } from '../lib/supabase'

interface CreateAgencyInput {
  agencyName: string
  agencyType: string
  agencyAddress: string
  /** PSGC codes for the office address — see supabase/migrations/04_address_psgc_codes.sql. */
  agencyAddressRegionCode?: string
  agencyAddressProvinceCode?: string
  agencyAddressCityCode?: string
  agencyAddressBarangayCode?: string
  agencyPhone: string
  agencyEmail: string
  agencyWebsite?: string
  adminFirstName: string
  adminMiddleName: string
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
  addressRegionCode?: string | null
  addressProvinceCode?: string | null
  addressCityCode?: string | null
  addressBarangayCode?: string | null
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

/**
 * Best-effort undo of a registration that failed part-way. Errors are logged,
 * not thrown: the user is already being shown the original failure, which is
 * the one they can act on.
 */
async function rollback(agencyId: number | null, userId: number | null): Promise<void> {
  if (agencyId != null) {
    const { error } = await supabase.from('agency').delete().eq('id', agencyId)
    if (error) console.error('Registration rollback: could not remove agency', agencyId, error)
  }
  if (userId != null) {
    const { error } = await supabase.from('user').delete().eq('id', userId)
    if (error) console.error('Registration rollback: could not remove user', userId, error)
  }
}

/**
 * Insert a row that carries columns added by supabase/migrations/02_registration_fields.sql.
 *
 * Until that migration has been run, PostgREST rejects an unknown column
 * (PGRST204). Registration must keep working in the meantime, so a rejected
 * new column is dropped and the insert retried — with a console warning, so
 * the missing migration is visible rather than silently losing the field.
 */
async function insertWithNewColumns(table: string, row: Record<string, unknown>, newColumns: string[]) {
  let current = { ...row }
  for (;;) {
    const result = await supabase.from(table).insert([current]).select().single()
    const missing =
      result.error?.code === 'PGRST204'
        ? newColumns.find((col) => col in current && result.error!.message.includes(col))
        : undefined
    if (!missing) return result
    console.warn(`${table}.${missing} column missing — run migration 02_registration_fields.sql. Saving without it.`)
    const { [missing]: _dropped, ...rest } = current
    void _dropped
    current = rest
  }
}

export function useAgencyDatabase() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createAgency = async (
    input: CreateAgencyInput,
  ): Promise<
    | { success: true; agencyId: number; userId: number }
    | { success: false; error: string; field?: 'adminEmail' }
  > => {
    setIsLoading(true)
    setError(null)

    // Registration is three writes with no transaction around them. Track what
    // was created so a failure part-way can be undone: a user row left behind
    // by a failed agency insert kept its email taken, so every retry of the
    // same registration failed as a "duplicate" and the agency could never
    // sign up at all.
    let createdUserId: number | null = null
    let createdAgencyId: number | null = null

    try {
      const adminEmail = input.adminEmail.trim()

      // Login matches email case-insensitively, but the unique constraint does
      // not — without this check "Ana@x.org" and "ana@x.org" could both be
      // registered, and neither could then sign in.
      const { data: existing, error: lookupError } = await supabase
        .from('user')
        .select('id')
        .ilike('email', emailPattern(adminEmail))
        .limit(1)
      if (lookupError) throw lookupError
      if (existing && existing.length > 0) {
        const message = 'An account with this email address already exists. Sign in instead, or use a different email.'
        setError(message)
        return { success: false, error: message, field: 'adminEmail' }
      }

      // Step 1: Create admin user account (inactive until agency is approved)
      const passwordHash = await hashPassword(input.adminPassword)

      const userRow = {
        email: adminEmail,
        passwordHash: passwordHash,
        firstName: input.adminFirstName.trim(),
        middleName: input.adminMiddleName.trim(),
        lastName: input.adminLastName.trim(),
        position: input.adminPosition.trim(),
        phone: input.adminPhone.trim(),
        role: 'AGENCY_ADMIN',
        agencyId: null, // Will be set after agency creation
        active: false, // Inactive until approved
        createdAt: new Date().toISOString(),
      }
      const { data: userData, error: userError } = await insertWithNewColumns('user', userRow, ['middleName'])

      if (userError) throw userError
      if (!userData) throw new Error('Failed to create user')
      createdUserId = userData.id

      // Step 2: Create agency with the user as creator
      const { data: agencyData, error: agencyError } = await insertWithNewColumns(
        'agency',
        {
          name: input.agencyName.trim(),
          agencyType: input.agencyType,
          address: input.agencyAddress.trim(),
          addressRegionCode: input.agencyAddressRegionCode || null,
          addressProvinceCode: input.agencyAddressProvinceCode || null,
          addressCityCode: input.agencyAddressCityCode || null,
          addressBarangayCode: input.agencyAddressBarangayCode || null,
          website: input.agencyWebsite?.trim() || null,
          contactEmail: input.agencyEmail.trim(),
          contactPhone: input.agencyPhone.trim(),
          registrationStatus: 'PENDING',
          accountStatus: 'INACTIVE',
          subscriptionStatus: 'ACTIVE',
          createdBy: userData.id,
          createdAt: new Date().toISOString(),
        },
        ['addressRegionCode', 'addressProvinceCode', 'addressCityCode', 'addressBarangayCode'],
      )

      if (agencyError) throw agencyError
      if (!agencyData) throw new Error('Failed to create agency')
      createdAgencyId = agencyData.id

      // Step 3: Update user with agencyId
      const { error: updateError } = await supabase
        .from('user')
        .update({ agencyId: agencyData.id })
        .eq('id', userData.id)

      if (updateError) throw updateError

      return { agencyId: agencyData.id, userId: userData.id, success: true }
    } catch (err) {
      console.error('Agency creation error:', err)
      await rollback(createdAgencyId, createdUserId)
      const errorMessage = handleDatabaseError(err)
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage,
        field: /email/i.test(errorMessage) ? 'adminEmail' : undefined,
      }
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
