'use client'

import { STREET_COLORS, STREET_STATUT_LABELS, StreetStatut } from '@/types'

export default function StreetLegend() {
  const statuts: StreetStatut[] = ['non_fait', 'fait']

  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="text-gray-500">Statut:</span>
      {statuts.map(statut => (
        <div key={statut} className="flex items-center gap-1">
          <span
            className="w-4 h-1 rounded"
            style={{ backgroundColor: STREET_COLORS[statut] }}
          />
          <span className="text-gray-600">{STREET_STATUT_LABELS[statut]}</span>
        </div>
      ))}
    </div>
  )
}
