import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { StreetStatut, ActionType } from '@/types'

interface StreetListItem {
  id: string
  name: string
  street_type: string | null
  statut: StreetStatut
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const arrondissementId = parseInt(params.id)

  if (isNaN(arrondissementId) || arrondissementId < 1 || arrondissementId > 20) {
    return NextResponse.json({ error: 'Invalid arrondissement ID' }, { status: 400 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get query params
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q') || ''
  const actionType = (searchParams.get('type') || 'tractage') as ActionType
  const statutFilter = searchParams.get('statut') as StreetStatut | null

  // Normalize search query (remove accents, lowercase)
  const normalizedQuery = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  // Build query
  let queryBuilder = supabase
    .from('streets')
    .select('id, name, street_type')
    .eq('arrondissement', arrondissementId)
    .order('name')
    .limit(100)

  if (normalizedQuery) {
    queryBuilder = queryBuilder.ilike('name_normalized', `%${normalizedQuery}%`)
  }

  const { data: streets, error: streetsError } = await queryBuilder

  if (streetsError) {
    return NextResponse.json({ error: streetsError.message }, { status: 500 })
  }

  // Fetch street actions
  const streetIds = streets?.map(s => s.id) || []
  let streetActions: Record<string, StreetStatut> = {}

  if (streetIds.length > 0) {
    const { data: actions } = await supabase
      .from('street_actions')
      .select('street_id, statut')
      .in('street_id', streetIds)
      .eq('type', actionType)

    if (actions) {
      actions.forEach(action => {
        streetActions[action.street_id] = action.statut as StreetStatut
      })
    }
  }

  // Build result with status
  let results: StreetListItem[] = (streets || []).map(street => ({
    id: street.id,
    name: street.name,
    street_type: street.street_type,
    statut: streetActions[street.id] || 'non_fait'
  }))

  // Apply status filter if provided
  if (statutFilter) {
    results = results.filter(s => s.statut === statutFilter)
  }

  return NextResponse.json(results)
}
