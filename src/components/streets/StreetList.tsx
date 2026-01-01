'use client'

import { useState, useEffect } from 'react'
import { ActionType, StreetStatut, STREET_COLORS, STREET_STATUT_LABELS } from '@/types'
import { useDebounce } from '@/hooks/useDebounce'

interface StreetListItem {
  id: string
  name: string
  street_type: string | null
  statut: StreetStatut
}

interface StreetListProps {
  arrondissementId: number
  actionType: ActionType
  canEdit: boolean
  onStatusChange: (streetId: string, newStatut: StreetStatut) => Promise<void>
  refreshTrigger?: number
}

export default function StreetList({
  arrondissementId,
  actionType,
  canEdit,
  onStatusChange,
  refreshTrigger
}: StreetListProps) {
  const [streets, setStreets] = useState<StreetListItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statutFilter, setStatutFilter] = useState<StreetStatut | 'all'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())

  const debouncedSearch = useDebounce(searchQuery, 300)

  useEffect(() => {
    const fetchStreets = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          type: actionType,
          ...(debouncedSearch && { q: debouncedSearch }),
          ...(statutFilter !== 'all' && { statut: statutFilter })
        })

        const response = await fetch(
          `/api/arrondissements/${arrondissementId}/streets/search?${params}`
        )

        if (response.ok) {
          const data = await response.json()
          setStreets(data)
        }
      } catch (error) {
        console.error('Error fetching streets:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStreets()
  }, [arrondissementId, actionType, debouncedSearch, statutFilter, refreshTrigger])

  const handleToggle = async (street: StreetListItem) => {
    if (!canEdit) return

    const newStatut: StreetStatut = street.statut === 'fait' ? 'non_fait' : 'fait'

    // Mark as updating
    setUpdatingIds(prev => new Set(prev).add(street.id))

    // Optimistic update
    setStreets(prev =>
      prev.map(s => (s.id === street.id ? { ...s, statut: newStatut } : s))
    )

    try {
      await onStatusChange(street.id, newStatut)
    } catch (error) {
      // Rollback on error
      setStreets(prev =>
        prev.map(s => (s.id === street.id ? { ...s, statut: street.statut } : s))
      )
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev)
        next.delete(street.id)
        return next
      })
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Search and Filter Header */}
      <div className="p-4 border-b space-y-3">
        <input
          type="text"
          placeholder="Rechercher une rue..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />

        <div className="flex gap-2 flex-wrap">
          {(['all', 'non_fait', 'fait'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setStatutFilter(filter)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                statutFilter === filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter === 'all' ? 'Toutes' : STREET_STATUT_LABELS[filter]}
            </button>
          ))}
        </div>
      </div>

      {/* Street List */}
      <div className="max-h-[350px] overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" />
            Chargement...
          </div>
        ) : streets.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {debouncedSearch ? 'Aucune rue trouvee' : 'Aucune rue dans cet arrondissement'}
          </div>
        ) : (
          <ul className="divide-y">
            {streets.map(street => (
              <li
                key={street.id}
                className="flex items-center justify-between p-3 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: STREET_COLORS[street.statut] }}
                  />
                  <span className="text-gray-900 truncate">{street.name}</span>
                </div>

                {canEdit && (
                  <button
                    onClick={() => handleToggle(street)}
                    disabled={updatingIds.has(street.id)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors flex-shrink-0 ml-2 ${
                      updatingIds.has(street.id)
                        ? 'bg-gray-100 text-gray-400 cursor-wait'
                        : street.statut === 'fait'
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {updatingIds.has(street.id)
                      ? '...'
                      : street.statut === 'fait'
                      ? 'Fait'
                      : 'Marquer fait'}
                  </button>
                )}

                {!canEdit && (
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      street.statut === 'fait'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {STREET_STATUT_LABELS[street.statut]}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t bg-gray-50 text-sm text-gray-500">
        {streets.length} rue(s) affichee(s)
      </div>
    </div>
  )
}
