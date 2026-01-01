'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types'

interface HeaderProps {
  profile: Profile | null
}

export default function Header({ profile }: HeaderProps) {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="text-xl font-bold text-blue-600">
              Outil Tractage
            </Link>
            <nav className="hidden md:flex space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
              {profile?.role === 'admin' && (
                <Link
                  href="/admin"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Administration
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            {profile && (
              <span className="text-sm text-gray-600">
                {profile.nom || profile.username}
                {profile.role === 'admin' && (
                  <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    Admin
                  </span>
                )}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
