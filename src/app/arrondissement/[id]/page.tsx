import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Header from '@/components/Header'
import { Profile, parseArrondissements } from '@/types'
import Link from 'next/link'
import ArrondissementStreetView from '@/components/streets/ArrondissementStreetView'

interface Props {
  params: { id: string }
}

export default async function ArrondissementPage({ params }: Props) {
  const arrondissementId = parseInt(params.id)

  if (isNaN(arrondissementId) || arrondissementId < 1 || arrondissementId > 20) {
    notFound()
  }

  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const userArrondissements = parseArrondissements(profile?.arrondissement || '')
  const canEdit = profile?.role === 'admin' || userArrondissements.includes(arrondissementId)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header profile={profile as Profile} />

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="mb-4">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 text-sm">
            ← Retour au tableau de bord
          </Link>
        </nav>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Suivi des rues
          </h1>
          <p className="text-gray-600">
            Sélectionnez un arrondissement et un type d'action
          </p>
          {!canEdit && (
            <p className="mt-2 text-sm text-orange-600">
              Mode lecture seule
            </p>
          )}
        </div>

        <ArrondissementStreetView
          initialArrondissement={arrondissementId}
          canEdit={canEdit}
        />
      </main>
    </div>
  )
}
