import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import UserManager from '@/components/UserManager'
import { Profile } from '@/types'
import Link from 'next/link'

export default async function AdminPage() {
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

  // Check if user is admin
  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  // Get all profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <Header profile={profile as Profile} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-4">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 text-sm">
            ← Retour au tableau de bord
          </Link>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
          <p className="text-gray-600">Gérez les utilisateurs et leurs arrondissements assignés</p>
        </div>

        {/* User Manager */}
        <UserManager profiles={(profiles as Profile[]) || []} />
      </main>
    </div>
  )
}
