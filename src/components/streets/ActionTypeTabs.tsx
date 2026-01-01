'use client'

import { ActionType, ACTION_LABELS } from '@/types'

interface ActionTypeTabsProps {
  activeType: ActionType
  onChange: (type: ActionType) => void
}

export default function ActionTypeTabs({ activeType, onChange }: ActionTypeTabsProps) {
  const types: ActionType[] = ['tractage', 'porte_a_porte', 'affichage']

  const typeStyles: Record<ActionType, { active: string; icon: string }> = {
    tractage: {
      active: 'border-green-500 bg-green-50 text-green-700',
      icon: '📄'
    },
    porte_a_porte: {
      active: 'border-purple-500 bg-purple-50 text-purple-700',
      icon: '🚪'
    },
    affichage: {
      active: 'border-orange-500 bg-orange-50 text-orange-700',
      icon: '📋'
    }
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {types.map(type => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all font-medium ${
            activeType === type
              ? typeStyles[type].active
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
          }`}
        >
          <span>{typeStyles[type].icon}</span>
          <span>{ACTION_LABELS[type]}</span>
        </button>
      ))}
    </div>
  )
}
