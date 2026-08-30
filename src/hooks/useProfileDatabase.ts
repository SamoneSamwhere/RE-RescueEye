import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { hashPassword } from './useAgencyDatabase'

export interface DbProfileUser {
  id: number
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  role: 'AGENCY_ADMIN' | 'COMMAND_STAFF' | 'FIELD_RESPONDER'
  agencyId: number | null
  active: boolean
  createdAt: string
}

export type ChangePasswordResult = { ok: true } | { ok: false; error: string }

/** Real-account counterpart to the mock UserStore, for any logged-in Agency Admin / Command Staff / Field Responder. */
export function useProfileDatabase() {
  const [isLoading, setIsLoading] = useState(false)

  const getUserById = async (userId: number): Promise<DbProfileUser | null> => {
    const { data, error } = await supabase
      .from('user')
      .select('id, email, firstName, lastName, phone, role, agencyId, active, createdAt')
      .eq('id', userId)
      .single()
    if (error || !data) return null
    return data
  }

  const updateProfile = async (
    userId: number,
    patch: { firstName: string; lastName: string; email: string; phone?: string },
  ): Promise<boolean> => {
    setIsLoading(true)
    const { error } = await supabase
      .from('user')
      .update({
        firstName: patch.firstName,
        lastName: patch.lastName,
        email: patch.email,
        phone: patch.phone || null,
      })
      .eq('id', userId)
    setIsLoading(false)
    return !error
  }

  const changePassword = async (
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<ChangePasswordResult> => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from('user').select('passwordHash').eq('id', userId).single()
      if (error || !data) return { ok: false, error: 'Unable to verify current password.' }

      const currentHash = await hashPassword(currentPassword)
      if (currentHash !== data.passwordHash) {
        return { ok: false, error: 'Current password is incorrect' }
      }

      const newHash = await hashPassword(newPassword)
      const { error: updateError } = await supabase.from('user').update({ passwordHash: newHash }).eq('id', userId)
      if (updateError) return { ok: false, error: 'Failed to update password' }

      return { ok: true }
    } finally {
      setIsLoading(false)
    }
  }

  return { getUserById, updateProfile, changePassword, isLoading }
}
