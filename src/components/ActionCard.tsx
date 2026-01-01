'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Action, ActionType, ActionStatut, ACTION_LABELS, STATUT_LABELS, STATUT_COLORS } from '@/types'

interface ActionCardProps {
  arrondissement: number
  type: ActionType
  action: Action | null
  canEdit: boolean
}

export default function ActionCard({ arrondissement, type, action, canEdit }: ActionCardProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [statut, setStatut] = useState<ActionStatut>(action?.statut || 'non_commence')
  const [pourcentage, setPourcentage] = useState(action?.pourcentage || 0)
  const [notes, setNotes] = useState(action?.notes || '')

  const handleSave = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (action) {
      // Update existing action
      await supabase
        .from('actions')
        .update({
          statut,
          pourcentage,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', action.id)
    } else {
      // Create new action
      await supabase
        .from('actions')
        .insert({
          arrondissement,
          type,
          statut,
          pourcentage,
          notes: notes || null,
          responsable_id: user?.id,
        })
    }

    setLoading(false)
    setIsEditing(false)
    router.refresh()
  }

  const handlePourcentageChange = (value: number) => {
    setPourcentage(value)
    // Auto-update statut based on pourcentage
    if (value === 0) {
      setStatut('non_commence')
    } else if (value === 100) {
      setStatut('termine')
    } else {
      setStatut('en_cours')
    }
  }

  const typeColors = {
    tractage: 'border-green-200 bg-green-50',
    porte_a_porte: 'border-purple-200 bg-purple-50',
    affichage: 'border-orange-200 bg-orange-50'
  }

  const typeIcons = {
    tractage: '📄',
    porte_a_porte: '🚪',
    affichage: '📋'
  }

  return (
    <div className={`border-2 rounded-lg p-6 ${typeColors[type]}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {typeIcons[type]} {ACTION_LABELS[type]}
          </h3>
          {action && (
            <p className="text-sm text-gray-500">
              Dernière mise à jour : {new Date(action.updated_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          )}
        </div>
        {canEdit && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Modifier
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          {/* Pourcentage slider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Progression : {pourcentage}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={pourcentage}
              onChange={(e) => handlePourcentageChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Statut */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statut
            </label>
            <select
              value={statut}
              onChange={(e) => setStatut(e.target.value as ActionStatut)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="non_commence">Non commencé</option>
              <option value="en_cours">En cours</option>
              <option value="termine">Terminé</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optionnel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ajouter des notes ou commentaires..."
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button
              onClick={() => {
                setIsEditing(false)
                setStatut(action?.statut || 'non_commence')
                setPourcentage(action?.pourcentage || 0)
                setNotes(action?.notes || '')
              }}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Progression</span>
              <span className="font-medium">{action?.pourcentage || 0}%</span>
            </div>
            <div className="w-full bg-white rounded-full h-3 border">
              <div
                className="h-3 rounded-full transition-all duration-300"
                style={{
                  width: `${action?.pourcentage || 0}%`,
                  backgroundColor: STATUT_COLORS[action?.statut || 'non_commence']
                }}
              />
            </div>
          </div>

          {/* Status badge */}
          <div className="flex items-center space-x-2">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: STATUT_COLORS[action?.statut || 'non_commence'] }}
            />
            <span className="text-sm text-gray-700">
              {STATUT_LABELS[action?.statut || 'non_commence']}
            </span>
          </div>

          {/* Notes */}
          {action?.notes && (
            <div className="mt-3 p-3 bg-white rounded-md">
              <p className="text-sm text-gray-600">{action.notes}</p>
            </div>
          )}

          {!action && (
            <p className="text-sm text-gray-500 italic mt-2">
              Aucune donnée enregistrée
            </p>
          )}
        </div>
      )}
    </div>
  )
}
