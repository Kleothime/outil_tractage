'use client'

import { useEffect, useState } from 'react'
import { ACTION_LABELS, ActionType } from '@/types'

interface ArrondissementStats {
  total_streets: number
  tractage: { fait: number; pourcentage: number }
  porte_a_porte: { fait: number; pourcentage: number }
  affichage: { fait: number; pourcentage: number }
}

interface StreetStatsProps {
  arrondissementId: number
  refreshTrigger?: number
}

export default function StreetStats({ arrondissementId, refreshTrigger }: StreetStatsProps) {
  const [stats, setStats] = useState<ArrondissementStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/arrondissements/${arrondissementId}/stats`)
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStats()
  }, [arrondissementId, refreshTrigger])

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-gray-500">Erreur de chargement des stats</p>
      </div>
    )
  }

  const types: ActionType[] = ['tractage', 'porte_a_porte', 'affichage']
  const colors: Record<ActionType, string> = {
    tractage: 'bg-green-500',
    porte_a_porte: 'bg-purple-500',
    affichage: 'bg-orange-500'
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">
        Progression ({stats.total_streets} rues)
      </h3>

      {stats.total_streets === 0 ? (
        <p className="text-gray-500 text-sm">
          Aucune rue importee pour cet arrondissement.
          Executez le script d'import.
        </p>
      ) : (
        <div className="space-y-4">
          {types.map(type => {
            const typeStats = stats[type]
            return (
              <div key={type}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{ACTION_LABELS[type]}</span>
                  <span className="font-medium text-gray-900">
                    {typeStats.fait}/{stats.total_streets} ({typeStats.pourcentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`${colors[type]} h-2.5 rounded-full transition-all duration-500`}
                    style={{ width: `${typeStats.pourcentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
