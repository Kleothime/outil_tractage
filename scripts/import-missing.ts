/**
 * Import des arrondissements manquants avec retry
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vhajahilbimxjdwiyhwz.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoYWphaGlsYmlteGpkd2l5aHd6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTc0NDU3MiwiZXhwIjoyMDgxMzIwNTcyfQ.nHAndLtwNGP76cK9hDIF5pXFELXlIRYSkGvgo7tfZfU'
const OVERPASS_API = 'https://overpass-api.de/api/interpreter'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Arrondissements manquants
const MISSING = [1, 8, 9, 10, 12, 13, 18]

const arrondissementsBBox: Record<number, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
  1: { minLat: 48.854, maxLat: 48.870, minLng: 2.320, maxLng: 2.351 },
  8: { minLat: 48.863, maxLat: 48.884, minLng: 2.294, maxLng: 2.328 },
  9: { minLat: 48.871, maxLat: 48.884, minLng: 2.325, maxLng: 2.354 },
  10: { minLat: 48.867, maxLat: 48.884, minLng: 2.350, maxLng: 2.381 },
  12: { minLat: 48.820, maxLat: 48.852, minLng: 2.370, maxLng: 2.470 },
  13: { minLat: 48.815, maxLat: 48.845, minLng: 2.345, maxLng: 2.400 },
  18: { minLat: 48.880, maxLat: 48.902, minLng: 2.330, maxLng: 2.375 }
}

function normalizeStreetName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}

async function fetchWithRetry(arr: number, retries = 3): Promise<any[]> {
  const bbox = arrondissementsBBox[arr]
  const query = `
    [out:json][timeout:180];
    (
      way["highway"]["name"](${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng});
    );
    out geom;
  `.trim()

  for (let attempt = 1; attempt <= retries; attempt++) {
    console.log(`  Tentative ${attempt}/${retries}...`)

    try {
      const response = await fetch(OVERPASS_API, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })

      if (response.ok) {
        const data = await response.json()
        return data.elements || []
      }

      console.log(`  HTTP ${response.status} - attente 10s avant retry...`)
      await new Promise(r => setTimeout(r, 10000))

    } catch (error) {
      console.log(`  Erreur: ${error} - attente 10s...`)
      await new Promise(r => setTimeout(r, 10000))
    }
  }

  return []
}

async function importArrondissement(arr: number) {
  console.log(`\n[Arrondissement ${arr}]`)

  const streets = await fetchWithRetry(arr)
  console.log(`  ${streets.length} rues trouvees`)

  if (streets.length === 0) return 0

  const validStreets = streets.filter((s: any) => {
    if (!s.tags?.name) return false
    if (!s.geometry || s.geometry.length < 2) return false
    const excluded = ['motorway', 'motorway_link', 'trunk', 'trunk_link', 'cycleway', 'footway', 'path']
    if (excluded.includes(s.tags.highway || '')) return false
    return true
  })

  const uniqueStreets = new Map()
  validStreets.forEach((s: any) => uniqueStreets.set(s.id, s))

  const records = Array.from(uniqueStreets.values()).map((s: any) => ({
    osm_id: s.id,
    name: s.tags.name,
    name_normalized: normalizeStreetName(s.tags.name),
    arrondissement: arr,
    geometry: {
      type: 'LineString',
      coordinates: s.geometry.map((p: any) => [p.lon, p.lat])
    },
    street_type: s.tags.highway || null
  }))

  let inserted = 0
  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100)
    const { error } = await supabase.from('streets').upsert(batch, { onConflict: 'osm_id' })
    if (!error) inserted += batch.length
  }

  console.log(`  ${inserted} rues inserees`)
  return inserted
}

async function main() {
  console.log('Import des arrondissements manquants')
  console.log('====================================')

  let total = 0
  for (const arr of MISSING) {
    total += await importArrondissement(arr)
    console.log('  Pause de 8 secondes...')
    await new Promise(r => setTimeout(r, 8000))
  }

  console.log(`\n====================================`)
  console.log(`Total: ${total} rues importees`)
}

main().catch(console.error)
