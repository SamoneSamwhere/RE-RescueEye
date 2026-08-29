import { useState } from 'react'
import { supabase } from '../lib/supabase'

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
            name: input.adminFullName,
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
            registrationStatus: 'PENDING',
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

  return { createAgency, isLoading, error }
}

// Simple password hashing for demo (in production, use proper bcrypt)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
