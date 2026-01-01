'use client'

import { Action, ACTION_LABELS, ActionType } from '@/types'

interface StatsPanelProps {
  actions: Action[]
}

export default function StatsPanel({ actions }: StatsPanelProps) {
  const getStatsByType = (type: ActionType) => {
    const typeActions = actions.filter(a => a.type === type)
    if (typeActions.length === 0) return { pourcentage: 0, termine: 0, total: 0 }

    const avgPourcentage = Math.round(
      typeActions.reduce((sum, a) => sum + a.pourcentage, 0) / typeActions.length
    )
    const termine = typeActions.filter(a => a.statut === 'termine').length

    return { pourcentage: avgPourcentage, termine, total: typeActions.length }
  }

  const globalStats = () => {
    if (actions.length === 0) return { pourcentage: 0, termine: 0, total: 0 }

    const avgPourcentage = Math.round(
      actions.reduce((sum, a) => sum + a.pourcentage, 0) / actions.length
    )
    const termine = actions.filter(a => a.statut === 'termine').length

    return { pourcentage: avgPourcentage, termine, total: actions.length }
  }

  const types: ActionType[] = ['tractage', 'porte_a_porte', 'affichage']
  const global = globalStats()

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Progression globale</h2>

      {/* Global progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Toutes actions</span>
          <span>{global.pourcentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-blue-600 h-4 rounded-full transition-all duration-300"
            style={{ width: `${global.pourcentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {global.termine} / {global.total} actions terminées
        </p>
      </div>

      {/* Stats by type */}
      <div className="space-y-4">
        {types.map(type => {
          const stats = getStatsByType(type)
          const colors = {
            tractage: 'bg-green-500',
            porte_a_porte: 'bg-purple-500',
            affichage: 'bg-orange-500'
          }

          return (
            <div key={type}>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{ACTION_LABELS[type]}</span>
                <span>{stats.pourcentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`${colors[type]} h-2 rounded-full transition-all duration-300`}
                  style={{ width: `${stats.pourcentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Légende carte</h3>
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded bg-red-500 mr-1" />
            <span>Non commencé</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded bg-orange-500 mr-1" />
            <span>En cours</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded bg-green-500 mr-1" />
            <span>Terminé</span>
          </div>
        </div>
      </div>
    </div>
  )
}
