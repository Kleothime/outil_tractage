'use client'

import Link from 'next/link'
import { Action, ACTION_LABELS, STATUT_LABELS } from '@/types'

interface RecentActivityProps {
  actions: Action[]
}

export default function RecentActivity({ actions }: RecentActivityProps) {
  // Sort by updated_at and take the 5 most recent
  const recentActions = [...actions]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "À l'instant"
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`
    return date.toLocaleDateString('fr-FR')
  }

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'termine':
        return 'text-green-600 bg-green-50'
      case 'en_cours':
        return 'text-orange-600 bg-orange-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  if (recentActions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Activité récente</h2>
        <p className="text-gray-500 text-sm">Aucune activité pour le moment</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Activité récente</h2>
      <div className="space-y-3">
        {recentActions.map((action) => (
          <Link
            key={action.id}
            href={`/arrondissement/${action.arrondissement}`}
            className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {action.arrondissement}e - {ACTION_LABELS[action.type]}
                </p>
                <span
                  className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${getStatusColor(action.statut)}`}
                >
                  {STATUT_LABELS[action.statut]} ({action.pourcentage}%)
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {formatDate(action.updated_at)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
