'use client'

import dynamic from 'next/dynamic'
import { Action } from '@/types'

// Dynamic import with ssr: false - this is the only place we need this
const MapComponent = dynamic(
  () => import('./MapComponent'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Chargement de la carte...</p>
        </div>
      </div>
    )
  }
)

interface ParisMapProps {
  actions: Action[]
}

export default function ParisMap({ actions }: ParisMapProps) {
  return <MapComponent actions={actions} />
}
