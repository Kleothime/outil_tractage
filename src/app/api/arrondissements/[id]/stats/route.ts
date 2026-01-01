import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface ArrondissementStats {
  total_streets: number
  tractage: { fait: number; pourcentage: number }
  porte_a_porte: { fait: number; pourcentage: number }
  affichage: { fait: number; pourcentage: number }
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

  // Get total street count
  const { count: totalStreets, error: countError } = await supabase
    .from('streets')
    .select('*', { count: 'exact', head: true })
    .eq('arrondissement', arrondissementId)

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 })
  }

  // Get street IDs for this arrondissement
  const { data: streetIds } = await supabase
    .from('streets')
    .select('id')
    .eq('arrondissement', arrondissementId)

  const ids = streetIds?.map(s => s.id) || []

  // Get completed counts by action type
  const { data: completedActions, error: actionsError } = await supabase
    .from('street_actions')
    .select('type, statut')
    .in('street_id', ids)
    .eq('statut', 'fait')

  if (actionsError) {
    return NextResponse.json({ error: actionsError.message }, { status: 500 })
  }

  // Count by type
  const countByType = {
    tractage: 0,
    porte_a_porte: 0,
    affichage: 0
  }

  completedActions?.forEach(action => {
    if (action.type in countByType) {
      countByType[action.type as keyof typeof countByType]++
    }
  })

  const total = totalStreets || 0

  const stats: ArrondissementStats = {
    total_streets: total,
    tractage: {
      fait: countByType.tractage,
      pourcentage: total > 0 ? Math.round((countByType.tractage / total) * 100) : 0
    },
    porte_a_porte: {
      fait: countByType.porte_a_porte,
      pourcentage: total > 0 ? Math.round((countByType.porte_a_porte / total) * 100) : 0
    },
    affichage: {
      fait: countByType.affichage,
      pourcentage: total > 0 ? Math.round((countByType.affichage / total) * 100) : 0
    }
  }

  return NextResponse.json(stats)
}
