import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import StatsPanel from '@/components/StatsPanel'
import RecentActivity from '@/components/RecentActivity'
import ParisMap from '@/components/ParisMap'
import { Action, Profile } from '@/types'

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get all actions
  const { data: actions } = await supabase
    .from('actions')
    .select('*')
    .order('updated_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <Header profile={profile as Profile} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-600">Vue d'ensemble des actions de terrain sur Paris</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map - spans 2 columns on large screens */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Carte des arrondissements
              </h2>
              <ParisMap actions={(actions as Action[]) || []} />
              <p className="text-sm text-gray-500 mt-2">
                Cliquez sur un arrondissement pour voir les détails
              </p>
            </div>
          </div>

          {/* Stats panel */}
          <div className="space-y-6">
            <StatsPanel actions={(actions as Action[]) || []} />
            <RecentActivity actions={(actions as Action[]) || []} />
          </div>
        </div>
      </main>
    </div>
  )
}
