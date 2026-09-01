import { useState } from 'react'
import { supabase } from '../lib/supabase'
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

export type CreateStaffResult = { ok: true; userId: number } | { ok: false; error: string }

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
      return data || []
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
      const { data: existing } = await supabase
        .from('user')
        .select('id')
        .ilike('email', input.email.trim())
        .maybeSingle()
      if (existing) {
        return { ok: false, error: 'A user with this email address already exists.' }
      }

      const passwordHash = await hashPassword(input.password)
      const { data, error: dbError } = await supabase
        .from('user')
        .insert([
          {
            email: input.email.trim(),
            passwordHash,
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone || null,
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to create user'
      console.error('Create staff user error:', err)
      return { ok: false, error: errorMessage }
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
