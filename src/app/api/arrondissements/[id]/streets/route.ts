import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { StreetGeoJSON, StreetFeature, StreetStatut, ActionType } from '@/types'

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

  // Get action type from query params (default: tractage)
  const searchParams = request.nextUrl.searchParams
  const actionType = (searchParams.get('type') || 'tractage') as ActionType

  // Fetch streets for this arrondissement
  const { data: streets, error: streetsError } = await supabase
    .from('streets')
    .select('id, osm_id, name, geometry, street_type')
    .eq('arrondissement', arrondissementId)
    .order('name')

  if (streetsError) {
    return NextResponse.json({ error: streetsError.message }, { status: 500 })
  }

  // Fetch street actions for this action type
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

  // Build GeoJSON FeatureCollection
  const features: StreetFeature[] = (streets || []).map(street => ({
    type: 'Feature',
    id: street.id,
    properties: {
      id: street.id,
      name: street.name,
      osm_id: street.osm_id,
      street_type: street.street_type,
      statut: streetActions[street.id] || 'non_fait'
    },
    geometry: street.geometry
  }))

  const geojson: StreetGeoJSON = {
    type: 'FeatureCollection',
    features
  }

  return NextResponse.json(geojson)
}
