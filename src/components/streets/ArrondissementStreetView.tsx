'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { ActionType, StreetStatut } from '@/types'
import ActionTypeTabs from './ActionTypeTabs'
import StreetList from './StreetList'
import StreetStats from './StreetStats'
import StreetLegend from './StreetLegend'

const StreetMapComponent = dynamic(
  () => import('./StreetMapComponent'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[650px] bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
          <p className="text-gray-500">Chargement de la carte...</p>
        </div>
      </div>
    )
  }
)

interface ArrondissementStreetViewProps {
  initialArrondissement?: number
  canEdit: boolean
}

export default function ArrondissementStreetView({
  initialArrondissement = 1,
  canEdit
}: ArrondissementStreetViewProps) {
  const [arrondissementId, setArrondissementId] = useState(initialArrondissement)
  const [actionType, setActionType] = useState<ActionType>('tractage')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleStatusChange = useCallback(async (streetId: string, newStatut: StreetStatut) => {
    const response = await fetch(`/api/streets/${streetId}/action`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: actionType, statut: newStatut })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update status')
    }

    setRefreshTrigger(prev => prev + 1)
  }, [actionType])

  const handleStreetClick = useCallback((streetId: string, currentStatut: StreetStatut) => {
    if (!canEdit) return
    const newStatut: StreetStatut = currentStatut === 'fait' ? 'non_fait' : 'fait'
    handleStatusChange(streetId, newStatut)
  }, [canEdit, handleStatusChange])

  // Liste des arrondissements
  const arrondissements = Array.from({ length: 20 }, (_, i) => i + 1)

  return (
    <div className="space-y-6">
      {/* Header avec sélection arrondissement et type d'action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Menu déroulant arrondissement */}
        <div className="flex items-center gap-3">
          <label htmlFor="arrondissement" className="text-gray-700 font-medium">
            Arrondissement :
          </label>
          <select
            id="arrondissement"
            value={arrondissementId}
            onChange={(e) => setArrondissementId(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {arrondissements.map(arr => (
              <option key={arr} value={arr}>
                {arr === 1 ? '1er' : `${arr}ème`}
              </option>
            ))}
          </select>
        </div>

        {/* Tabs type d'action */}
        <ActionTypeTabs activeType={actionType} onChange={setActionType} />
      </div>

      {/* Contenu principal */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Carte - 3 colonnes */}
        <div className="xl:col-span-3">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h2 className="text-lg font-semibold text-gray-900">
                {arrondissementId === 1 ? '1er' : `${arrondissementId}ème`} arrondissement
              </h2>
              <StreetLegend />
            </div>

            <StreetMapComponent
              arrondissementId={arrondissementId}
              actionType={actionType}
              canEdit={canEdit}
              onStreetClick={handleStreetClick}
              refreshTrigger={refreshTrigger}
            />

            <p className="text-sm text-gray-500 mt-3">
              {canEdit
                ? 'Cliquez sur une rue pour changer son statut'
                : 'Mode lecture seule'}
            </p>
          </div>
        </div>

        {/* Sidebar - 1 colonne */}
        <div className="space-y-6">
          <StreetStats
            arrondissementId={arrondissementId}
            refreshTrigger={refreshTrigger}
          />

          <StreetList
            arrondissementId={arrondissementId}
            actionType={actionType}
            canEdit={canEdit}
            onStatusChange={handleStatusChange}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>
    </div>
  )
}
