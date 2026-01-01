/**
 * Script d'import des rues depuis OpenStreetMap
 *
 * Usage: npx ts-node scripts/import-streets.ts
 *
 * Prerequis:
 * 1. Avoir execute le SQL dans Supabase (supabase-streets-setup.sql)
 * 2. Avoir les variables d'environnement SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'

// Configuration
const SUPABASE_URL = 'https://vhajahilbimxjdwiyhwz.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoYWphaGlsYmlteGpkd2l5aHd6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTc0NDU3MiwiZXhwIjoyMDgxMzIwNTcyfQ.nHAndLtwNGP76cK9hDIF5pXFELXlIRYSkGvgo7tfZfU'
const OVERPASS_API = 'https://overpass-api.de/api/interpreter'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Coordonnees des arrondissements (simplifiees pour bounding box)
const arrondissementsBBox: Record<number, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
  1: { minLat: 48.854, maxLat: 48.870, minLng: 2.320, maxLng: 2.351 },
  2: { minLat: 48.863, maxLat: 48.872, minLng: 2.328, maxLng: 2.355 },
  3: { minLat: 48.855, maxLat: 48.868, minLng: 2.350, maxLng: 2.369 },
  4: { minLat: 48.845, maxLat: 48.862, minLng: 2.345, maxLng: 2.369 },
  5: { minLat: 48.836, maxLat: 48.854, minLng: 2.336, maxLng: 2.366 },
  6: { minLat: 48.839, maxLat: 48.859, minLng: 2.316, maxLng: 2.345 },
  7: { minLat: 48.845, maxLat: 48.864, minLng: 2.289, maxLng: 2.334 },
  8: { minLat: 48.863, maxLat: 48.884, minLng: 2.294, maxLng: 2.328 },
  9: { minLat: 48.871, maxLat: 48.884, minLng: 2.325, maxLng: 2.354 },
  10: { minLat: 48.867, maxLat: 48.884, minLng: 2.350, maxLng: 2.381 },
  11: { minLat: 48.845, maxLat: 48.867, minLng: 2.366, maxLng: 2.398 },
  12: { minLat: 48.820, maxLat: 48.852, minLng: 2.370, maxLng: 2.470 },
  13: { minLat: 48.815, maxLat: 48.845, minLng: 2.345, maxLng: 2.400 },
  14: { minLat: 48.815, maxLat: 48.840, minLng: 2.305, maxLng: 2.350 },
  15: { minLat: 48.830, maxLat: 48.860, minLng: 2.265, maxLng: 2.320 },
  16: { minLat: 48.840, maxLat: 48.880, minLng: 2.220, maxLng: 2.290 },
  17: { minLat: 48.875, maxLat: 48.900, minLng: 2.280, maxLng: 2.340 },
  18: { minLat: 48.880, maxLat: 48.902, minLng: 2.330, maxLng: 2.375 },
  19: { minLat: 48.870, maxLat: 48.905, minLng: 2.365, maxLng: 2.410 },
  20: { minLat: 48.845, maxLat: 48.877, minLng: 2.385, maxLng: 2.420 }
}

interface OverpassElement {
  type: 'way'
  id: number
  tags: { name?: string; highway?: string }
  geometry: Array<{ lat: number; lon: number }>
}

interface OverpassResponse {
  elements: OverpassElement[]
}

// Normaliser le nom de rue pour la recherche
function normalizeStreetName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}

// Construire la requete Overpass pour un arrondissement
function buildOverpassQuery(bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number }): string {
  return `
    [out:json][timeout:120];
    (
      way["highway"]["name"](${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng});
    );
    out geom;
  `.trim()
}

// Recuperer les rues depuis Overpass API
async function fetchStreetsFromOverpass(arrondissement: number): Promise<OverpassElement[]> {
  const bbox = arrondissementsBBox[arrondissement]
  if (!bbox) {
    console.error(`No bbox for arrondissement ${arrondissement}`)
    return []
  }

  const query = buildOverpassQuery(bbox)

  console.log(`  Fetching from Overpass API...`)

  const response = await fetch(OVERPASS_API, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status} ${response.statusText}`)
  }

  const data: OverpassResponse = await response.json()
  return data.elements || []
}

// Filtrer les rues valides (avec nom et geometrie)
function filterValidStreets(streets: OverpassElement[]): OverpassElement[] {
  return streets.filter(street => {
    if (!street.tags?.name) return false
    if (!street.geometry || street.geometry.length < 2) return false
    // Filtrer les types de voies non pertinents
    const excludedTypes = ['motorway', 'motorway_link', 'trunk', 'trunk_link', 'cycleway', 'footway', 'path']
    if (excludedTypes.includes(street.tags.highway || '')) return false
    return true
  })
}

// Inserer les rues dans Supabase
async function insertStreets(arrondissement: number, streets: OverpassElement[]): Promise<number> {
  const validStreets = filterValidStreets(streets)

  // Dedupliquer par OSM ID
  const uniqueStreets = new Map<number, OverpassElement>()
  validStreets.forEach(s => uniqueStreets.set(s.id, s))

  const streetRecords = Array.from(uniqueStreets.values()).map(street => ({
    osm_id: street.id,
    name: street.tags.name!,
    name_normalized: normalizeStreetName(street.tags.name!),
    arrondissement,
    geometry: {
      type: 'LineString',
      coordinates: street.geometry.map(p => [p.lon, p.lat])
    },
    street_type: street.tags.highway || null
  }))

  if (streetRecords.length === 0) {
    return 0
  }

  // Inserer par batches de 100
  let insertedCount = 0
  const batchSize = 100

  for (let i = 0; i < streetRecords.length; i += batchSize) {
    const batch = streetRecords.slice(i, i + batchSize)

    const { error } = await supabase
      .from('streets')
      .upsert(batch, { onConflict: 'osm_id' })

    if (error) {
      console.error(`  Error inserting batch: ${error.message}`)
    } else {
      insertedCount += batch.length
    }
  }

  return insertedCount
}

// Fonction principale
async function main() {
  console.log('===========================================')
  console.log('Import des rues depuis OpenStreetMap')
  console.log('===========================================\n')

  const startTime = Date.now()
  let totalStreets = 0

  for (let arr = 1; arr <= 20; arr++) {
    console.log(`\n[${arr}/20] Arrondissement ${arr}...`)

    try {
      const streets = await fetchStreetsFromOverpass(arr)
      console.log(`  ${streets.length} rues trouvees`)

      const inserted = await insertStreets(arr, streets)
      console.log(`  ${inserted} rues inserees/mises a jour`)
      totalStreets += inserted

      // Pause pour respecter les limites de l'API Overpass
      console.log(`  Pause de 2 secondes...`)
      await new Promise(resolve => setTimeout(resolve, 2000))

    } catch (error) {
      console.error(`  Erreur: ${error}`)
    }
  }

  const duration = Math.round((Date.now() - startTime) / 1000)

  console.log('\n===========================================')
  console.log(`Import termine!`)
  console.log(`Total: ${totalStreets} rues`)
  console.log(`Duree: ${duration} secondes`)
  console.log('===========================================')
}

main().catch(console.error)
