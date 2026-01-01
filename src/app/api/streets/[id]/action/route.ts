import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { ActionType, StreetStatut } from '@/types'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const streetId = params.id

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse request body
  let body: { type: ActionType; statut: StreetStatut }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { type, statut } = body

  // Validate type
  if (!['tractage', 'porte_a_porte', 'affichage'].includes(type)) {
    return NextResponse.json({ error: 'Invalid action type' }, { status: 400 })
  }

  // Validate statut
  if (!['non_fait', 'fait'].includes(statut)) {
    return NextResponse.json({ error: 'Invalid statut' }, { status: 400 })
  }

  // Verify the street exists and get its arrondissement
  const { data: street, error: streetError } = await supabase
    .from('streets')
    .select('id, arrondissement')
    .eq('id', streetId)
    .single()

  if (streetError || !street) {
    return NextResponse.json({ error: 'Street not found' }, { status: 404 })
  }

  // Check user permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, arrondissement')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // Check if user can edit this arrondissement
  const userArrondissements = profile.arrondissement
    ? profile.arrondissement.split(',').map((s: string) => parseInt(s.trim()))
    : []

  const canEdit = profile.role === 'admin' || userArrondissements.includes(street.arrondissement)

  if (!canEdit) {
    return NextResponse.json({ error: 'Forbidden - not assigned to this arrondissement' }, { status: 403 })
  }

  // Upsert the street action
  const { data, error } = await supabase
    .from('street_actions')
    .upsert({
      street_id: streetId,
      type,
      statut,
      responsable_id: user.id,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'street_id,type'
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
