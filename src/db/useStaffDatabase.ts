import { useState } from 'react'
import { supabase, emailPattern, handleDatabaseError } from '../lib/supabase'
import { hashPassword } from './useAgencyDatabase'

export type StaffRole = 'COMMAND_STAFF' | 'FIELD_RESPONDER'

export interface DbStaffUser {
  id: number
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  role: StaffRole
  agencyId: number
  active: boolean
  createdAt: string
}

export interface CreateStaffInput {
  agencyId: number
  firstName: string
  lastName: string
  email: string
  phone?: string
  password: string
  role: StaffRole
}

export type CreateStaffResult =
  | { ok: true; userId: number }
  | { ok: false; error: string; field?: 'email' }

export function useStaffDatabase() {
  const [isLoading, setIsLoading] = useState(false)

  const getAgencyStaff = async (agencyId: number): Promise<DbStaffUser[]> => {
    setIsLoading(true)
    try {
      const { data, error: dbError } = await supabase
        .from('user')
        .select('id, email, firstName, lastName, phone, role, agencyId, active, createdAt')
        .eq('agencyId', agencyId)
        .in('role', ['COMMAND_STAFF', 'FIELD_RESPONDER'])
        .order('createdAt', { ascending: false })

      if (dbError) throw dbError
      return (data as DbStaffUser[]) || []
    } catch (err) {
      console.error('Get agency staff error:', err)
      return []
    } finally {
      setIsLoading(false)
    }
  }

  const createStaffUser = async (input: CreateStaffInput): Promise<CreateStaffResult> => {
    setIsLoading(true)
    try {
      // A failed lookup used to be ignored — the insert then went ahead with
      // no duplicate check at all. Login matches email case-insensitively, so
      // the check must too, or two case-variants of one address could exist.
      const { data: existing, error: lookupError } = await supabase
        .from('user')
        .select('id')
        .ilike('email', emailPattern(input.email))
        .limit(1)
      if (lookupError) throw lookupError
      if (existing && existing.length > 0) {
        return { ok: false, error: 'A user with this email address already exists.', field: 'email' }
      }

      const passwordHash = await hashPassword(input.password)
      const { data, error: dbError } = await supabase
        .from('user')
        .insert([
          {
            email: input.email.trim(),
            passwordHash,
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            phone: input.phone?.trim() || null,
            role: input.role,
            agencyId: input.agencyId,
            active: true,
            createdAt: new Date().toISOString(),
          },
        ])
        .select('id')
        .single()

      if (dbError || !data) throw dbError || new Error('Failed to create user')
      return { ok: true, userId: data.id }
    } catch (err) {
      console.error('Create staff user error:', err)
      const errorMessage = handleDatabaseError(err)
      return { ok: false, error: errorMessage, field: /email/i.test(errorMessage) ? 'email' : undefined }
    } finally {
      setIsLoading(false)
    }
  }

  const setStaffActive = async (userId: number, active: boolean) => {
    const { error: dbError } = await supabase.from('user').update({ active }).eq('id', userId)
    if (dbError) console.error('Set staff active error:', dbError)
    return !dbError
  }

  return { getAgencyStaff, createStaffUser, setStaffActive, isLoading }
}
