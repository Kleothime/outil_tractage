'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { arrondissements, PARIS_CENTER, PARIS_ZOOM } from '@/data/paris-arrondissements'
import { Action, STATUT_COLORS } from '@/types'

interface MapComponentProps {
  actions: Action[]
}

export default function MapComponent({ actions }: MapComponentProps) {
  const router = useRouter()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const initMap = async () => {
      // Check if container exists
      if (!mapContainerRef.current) {
        console.log('Map container not found')
        return
      }

      // Check if map already exists
      if (mapInstanceRef.current) {
        console.log('Map already initialized')
        setIsLoading(false)
        return
      }

      try {
        console.log('Loading Leaflet...')

        // Dynamically import Leaflet
        const L = await import('leaflet')

        if (!isMounted) return

        // Check again if container exists and map not created
        if (!mapContainerRef.current) {
          console.log('Container disappeared during load')
          return
        }

        // Check if Leaflet already initialized this container
        const container = mapContainerRef.current as any
        if (container._leaflet_id) {
          console.log('Container already has Leaflet map')
          setIsLoading(false)
          return
        }

        console.log('Creating map instance...')

        // Create map
        const map = L.map(mapContainerRef.current, {
          center: PARIS_CENTER as [number, number],
          zoom: PARIS_ZOOM,
          zoomControl: true,
          scrollWheelZoom: true
        })

        mapInstanceRef.current = map

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19
        }).addTo(map)

        console.log('Adding arrondissements polygons...')

        // Add arrondissements polygons
        arrondissements.forEach((arr) => {
          const arrActions = actions.filter(a => a.arrondissement === arr.id)

          // Calculate color based on progress
          let color = '#94a3b8' // gray default
          let avgPourcentage = 0

          if (arrActions.length > 0) {
            avgPourcentage = Math.round(
              arrActions.reduce((sum, a) => sum + a.pourcentage, 0) / arrActions.length
            )
            if (avgPourcentage === 0) color = STATUT_COLORS.non_commence
            else if (avgPourcentage === 100) color = STATUT_COLORS.termine
            else color = STATUT_COLORS.en_cours
          }

          // Convert coordinates [lng, lat] to [lat, lng] for Leaflet
          const latLngs: [number, number][] = arr.coordinates.map(
            coord => [coord[1], coord[0]] as [number, number]
          )

          // Create polygon
          const polygon = L.polygon(latLngs, {
            color: color,
            fillColor: color,
            fillOpacity: 0.5,
            weight: 2
          }).addTo(map)

          // Add tooltip
          polygon.bindTooltip(
            `<div style="text-align:center"><strong>${arr.id}${arr.id === 1 ? 'er' : 'ème'} arr.</strong><br/>${avgPourcentage}% complété</div>`,
            { sticky: true, direction: 'top' }
          )

          // Add click handler
          polygon.on('click', () => {
            router.push(`/arrondissement/${arr.id}`)
          })

          // Hover effects
          polygon.on('mouseover', () => {
            polygon.setStyle({ fillOpacity: 0.8, weight: 3 })
          })

          polygon.on('mouseout', () => {
            polygon.setStyle({ fillOpacity: 0.5, weight: 2 })
          })
        })

        console.log('Map initialized successfully')

        if (isMounted) {
          setIsLoading(false)
        }

        // Force resize after a short delay to ensure proper rendering
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize()
          }
        }, 100)

      } catch (err) {
        console.error('Error initializing map:', err)
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Erreur lors du chargement de la carte')
          setIsLoading(false)
        }
      }
    }

    initMap()

    // Cleanup
    return () => {
      isMounted = false
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove()
        } catch (e) {
          console.log('Error removing map:', e)
        }
        mapInstanceRef.current = null
      }
    }
  }, [actions, router])

  if (error) {
    return (
      <div className="w-full h-[500px] bg-red-50 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 font-medium">Erreur de chargement</p>
          <p className="text-red-400 text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-[500px]">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center z-10">
          <p className="text-gray-500">Chargement de la carte...</p>
        </div>
      )}
      <div
        ref={mapContainerRef}
        className="w-full h-full rounded-lg"
        style={{ zIndex: 1 }}
      />
    </div>
  )
}
