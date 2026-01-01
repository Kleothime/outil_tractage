export type ActionType = 'tractage' | 'porte_a_porte' | 'affichage'
export type ActionStatut = 'non_commence' | 'en_cours' | 'termine'
export type UserRole = 'admin' | 'responsable'

export interface Profile {
  id: string
  username: string
  nom: string
  prenom: string
  role: UserRole
  arrondissement: string // comma-separated list "1,2,3"
  is_active: boolean
  created_at: string
  updated_at: string
}

// Helper to parse arrondissements from string to array
export function parseArrondissements(arr: string | null): number[] {
  if (!arr) return []
  return arr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
}

export interface Action {
  id: string
  arrondissement: number
  type: ActionType
  statut: ActionStatut
  pourcentage: number
  responsable_id: string | null
  updated_at: string
  notes: string | null
}

export interface ActionWithProfile extends Action {
  profiles?: Profile
}

export const ACTION_LABELS: Record<ActionType, string> = {
  tractage: 'Tractage',
  porte_a_porte: 'Porte-à-porte',
  affichage: 'Affichage'
}

export const STATUT_LABELS: Record<ActionStatut, string> = {
  non_commence: 'Non commencé',
  en_cours: 'En cours',
  termine: 'Terminé'
}

export const STATUT_COLORS: Record<ActionStatut, string> = {
  non_commence: '#ef4444', // red
  en_cours: '#f59e0b', // orange
  termine: '#22c55e' // green
}

// =============================================
// TYPES POUR LES RUES
// =============================================

export type StreetStatut = 'non_fait' | 'fait'

export interface Street {
  id: string
  osm_id: number
  name: string
  name_normalized: string
  arrondissement: number
  geometry: {
    type: 'LineString'
    coordinates: number[][]
  }
  street_type: string | null
  created_at: string
}

export interface StreetAction {
  id: string
  street_id: string
  type: ActionType
  statut: StreetStatut
  responsable_id: string | null
  updated_at: string
  created_at: string
}

export interface StreetWithStatus extends Street {
  statut: StreetStatut
}

export interface StreetFeature {
  type: 'Feature'
  id: string
  properties: {
    id: string
    name: string
    osm_id: number
    street_type: string | null
    statut: StreetStatut
  }
  geometry: {
    type: 'LineString'
    coordinates: number[][]
  }
}

export interface StreetGeoJSON {
  type: 'FeatureCollection'
  features: StreetFeature[]
}

export const STREET_STATUT_LABELS: Record<StreetStatut, string> = {
  non_fait: 'Non fait',
  fait: 'Fait'
}

export const STREET_COLORS: Record<StreetStatut, string> = {
  non_fait: '#ef4444', // rouge
  fait: '#22c55e'      // vert
}
