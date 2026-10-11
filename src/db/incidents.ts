import { supabase } from '../lib/supabase'
import type { IncidentType } from '../lib/incidentClassification'
import type { IncidentPriority } from '../types/incident'

/** The incident table as the database stores it. */
export interface IncidentRow {
  id: number
  detectionId: number | null
  agencyId: number
  incidentType: IncidentType
  severity: IncidentPriority
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED'
  lat: number
  lng: number
  description: string | null
  reportedBy: number
  createdAt: string
  updatedAt: string
}

/**
 * Records a verified incident. Called only from Command Staff verification, so
 * an incident row - and therefore any alert, which must reference one - can
 * only exist for a detection a person has confirmed.
 */
export async function insertIncident(input: {
  agencyId: number
  reportedBy: number
  incidentType: IncidentType
  severity: IncidentPriority
  lat: number
  lng: number
  description?: string
}): Promise<IncidentRow> {
  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from('incident')
    .insert({
      agencyId: input.agencyId,
      reportedBy: input.reportedBy,
      incidentType: input.incidentType,
      severity: input.severity,
      status: 'OPEN',
      lat: input.lat,
      lng: input.lng,
      description: input.description || null,
      createdAt: nowIso,
      updatedAt: nowIso,
    })
    .select()
    .single()
  if (error) throw error
  return data as IncidentRow
}

export async function getIncidentsByIds(ids: number[]): Promise<IncidentRow[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase.from('incident').select('*').in('id', ids)
  if (error) throw error
  return (data as IncidentRow[]) ?? []
}

/** Active Field Responders of an agency - the people Command Staff can dispatch. */
export async function getAgencyResponders(agencyId: number) {
  const { data, error } = await supabase
    .from('user')
    .select('id, firstName, lastName, name, phone, active')
    .eq('agencyId', agencyId)
    .eq('role', 'FIELD_RESPONDER')
  if (error) throw error
  return (data ?? []) as Array<{
    id: number
    firstName: string | null
    lastName: string | null
    name: string | null
    phone: string | null
    active: boolean
  }>
}
