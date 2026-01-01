'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { ActionType, StreetStatut, STREET_COLORS, StreetGeoJSON } from '@/types'

interface StreetMapComponentProps {
  arrondissementId: number
  actionType: ActionType
  canEdit: boolean
  onStreetClick: (streetId: string, currentStatut: StreetStatut) => void
  refreshTrigger?: number
}

export default function StreetMapComponent({
  arrondissementId,
  actionType,
  canEdit,
  onStreetClick,
  refreshTrigger
}: StreetMapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const geoJsonLayerRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [streetCount, setStreetCount] = useState(0)

  const loadStreets = useCallback(async (L: any, map: any) => {
    setIsLoading(true)

    try {
      const response = await fetch(
        `/api/arrondissements/${arrondissementId}/streets?type=${actionType}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch streets')
      }

      const geojson: StreetGeoJSON = await response.json()
      setStreetCount(geojson.features.length)

      // Remove existing layer
      if (geoJsonLayerRef.current) {
        map.removeLayer(geoJsonLayerRef.current)
      }

      if (geojson.features.length === 0) {
        setIsLoading(false)
        return
      }

      // Add GeoJSON layer - rues colorées
      geoJsonLayerRef.current = L.geoJSON(geojson, {
        style: (feature: any) => ({
          color: STREET_COLORS[feature.properties.statut as StreetStatut],
          weight: 2.5,
          opacity: 1,
          lineCap: 'round',
          lineJoin: 'round'
        }),
        onEachFeature: (feature: any, layer: any) => {
          const statutText = feature.properties.statut === 'fait' ? 'Fait' : 'Non fait'
          layer.bindTooltip(
            `<div style="text-align:center;font-size:12px;padding:4px;">
              <strong>${feature.properties.name}</strong><br/>
              <span style="color:${STREET_COLORS[feature.properties.statut]};font-weight:bold;">${statutText}</span>
            </div>`,
            { sticky: true, direction: 'top', offset: [0, -5] }
          )

          if (canEdit) {
            layer.on('click', () => {
              onStreetClick(feature.properties.id, feature.properties.statut)
            })
          }

          layer.on('mouseover', () => {
            layer.setStyle({ weight: 4, opacity: 1 })
            layer.bringToFront()
          })
          layer.on('mouseout', () => {
            layer.setStyle({ weight: 2.5, opacity: 1 })
          })
        }
      }).addTo(map)

      // Fit bounds
      if (geoJsonLayerRef.current.getBounds().isValid()) {
        map.fitBounds(geoJsonLayerRef.current.getBounds(), { padding: [20, 20] })
      }

    } catch (error) {
      console.error('Error loading streets:', error)
    } finally {
      setIsLoading(false)
    }
  }, [arrondissementId, actionType, canEdit, onStreetClick])

  useEffect(() => {
    let isMounted = true

    const initMap = async () => {
      if (!mapRef.current || mapInstanceRef.current) return

      const L = await import('leaflet')

      if (!isMounted || !mapRef.current) return

      const container = mapRef.current as any
      if (container._leaflet_id) return

      // Carte sans fond - juste fond blanc
      const map = L.map(mapRef.current, {
        center: [48.8566, 2.3522],
        zoom: 15,
        zoomControl: true,
        attributionControl: false
      })

      mapInstanceRef.current = map

      // AUCUN fond de carte - juste les rues sur fond blanc

      await loadStreets(L, map)
    }

    initMap()

    return () => {
      isMounted = false
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Reload when arrondissement, action type or refresh changes
  useEffect(() => {
    const reloadStreets = async () => {
      if (mapInstanceRef.current) {
        const L = await import('leaflet')
        await loadStreets(L, mapInstanceRef.current)
      }
    }
    reloadStreets()
  }, [arrondissementId, actionType, refreshTrigger, loadStreets])

  return (
    <div className="relative w-full h-[650px] bg-white rounded-lg border border-gray-200">
      {isLoading && (
        <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
            <p className="text-gray-600">Chargement des rues...</p>
          </div>
        </div>
      )}

      {!isLoading && streetCount === 0 && (
        <div className="absolute inset-0 bg-white flex items-center justify-center z-10 rounded-lg">
          <div className="text-center p-4">
            <p className="text-gray-600 mb-2">Aucune rue pour cet arrondissement</p>
            <p className="text-sm text-gray-500">
              Les rues n'ont pas encore été importées
            </p>
          </div>
        </div>
      )}

      {!isLoading && streetCount > 0 && (
        <div className="absolute top-2 right-2 bg-white/90 px-3 py-1 rounded text-sm text-gray-600 z-20">
          {streetCount} rues
        </div>
      )}

      <div ref={mapRef} className="w-full h-full rounded-lg" style={{ background: '#fafafa' }} />
    </div>
  )
}
