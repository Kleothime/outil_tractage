/**
 * Import COMPLET de toutes les rues de Paris depuis OpenStreetMap
 * SANS FILTRAGE - toutes les rues avec un nom sont importées
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vhajahilbimxjdwiyhwz.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoYWphaGlsYmlteGpkd2l5aHd6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTc0NDU3MiwiZXhwIjoyMDgxMzIwNTcyfQ.nHAndLtwNGP76cK9hDIF5pXFELXlIRYSkGvgo7tfZfU'
const OVERPASS_API = 'https://overpass-api.de/api/interpreter'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Bounding boxes précises pour chaque arrondissement
// Agrandies pour ne rien manquer
const BBOX: Record<number, string> = {
  1:  '48.8535,2.3200,48.8710,2.3520',
  2:  '48.8630,2.3280,48.8730,2.3560',
  3:  '48.8550,2.3500,48.8690,2.3700',
  4:  '48.8450,2.3440,48.8630,2.3700',
  5:  '48.8350,2.3350,48.8560,2.3680',
  6:  '48.8380,2.3150,48.8600,2.3460',
  7:  '48.8440,2.2880,48.8650,2.3350',
  8:  '48.8620,2.2930,48.8850,2.3300',
  9:  '48.8700,2.3240,48.8850,2.3560',
  10: '48.8660,2.3490,48.8850,2.3820',
  11: '48.8440,2.3650,48.8680,2.4000',
  12: '48.8180,2.3680,48.8530,2.4720',
  13: '48.8140,2.3440,48.8460,2.4020',
  14: '48.8140,2.3040,48.8420,2.3520',
  15: '48.8280,2.2640,48.8620,2.3220',
  16: '48.8380,2.2180,48.8820,2.2920',
  17: '48.8740,2.2780,48.9020,2.3420',
  18: '48.8790,2.3280,48.9030,2.3780',
  19: '48.8680,2.3640,48.9060,2.4120',
  20: '48.8440,2.3840,48.8780,2.4220'
}

function normalizeStreetName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}

async function clearAllStreets() {
  console.log('Suppression des anciennes données...')

  // Supprimer d'abord les actions
  await supabase.from('street_actions').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  // Puis les rues
  await supabase.from('streets').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  console.log('Données supprimées.\n')
}

async function fetchStreets(arr: number, retries = 3): Promise<any[]> {
  const bbox = BBOX[arr]

  // Requête qui récupère TOUTES les rues avec un nom
  const query = `
    [out:json][timeout:300];
    (
      way["highway"]["name"](${bbox});
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

      console.log(`  HTTP ${response.status} - attente 15s...`)
      await new Promise(r => setTimeout(r, 15000))

    } catch (error) {
      console.log(`  Erreur réseau - attente 15s...`)
      await new Promise(r => setTimeout(r, 15000))
    }
  }

  return []
}

async function importArrondissement(arr: number): Promise<number> {
  console.log(`\n[${arr}/20] Arrondissement ${arr === 1 ? '1er' : arr + 'ème'}`)

  const streets = await fetchStreets(arr)

  if (streets.length === 0) {
    console.log('  Aucune rue trouvée!')
    return 0
  }

  console.log(`  ${streets.length} éléments trouvés`)

  // Filtrer seulement celles qui ont un nom et une géométrie valide
  const validStreets = streets.filter((s: any) => {
    if (!s.tags?.name) return false
    if (!s.geometry || s.geometry.length < 2) return false
    return true
  })

  console.log(`  ${validStreets.length} rues valides`)

  // Dédupliquer par OSM ID
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

  // Insérer par batches
  let inserted = 0
  const batchSize = 100

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)
    const { error } = await supabase.from('streets').upsert(batch, { onConflict: 'osm_id' })

    if (error) {
      console.log(`  Erreur batch: ${error.message}`)
    } else {
      inserted += batch.length
    }
  }

  console.log(`  ${inserted} rues insérées`)
  return inserted
}

async function main() {
  console.log('=============================================')
  console.log('IMPORT COMPLET DES RUES DE PARIS')
  console.log('=============================================\n')

  // Vider les anciennes données
  await clearAllStreets()

  const startTime = Date.now()
  let total = 0

  // Importer chaque arrondissement
  for (let arr = 1; arr <= 20; arr++) {
    total += await importArrondissement(arr)

    // Pause entre chaque arrondissement
    if (arr < 20) {
      console.log('  Pause de 10 secondes...')
      await new Promise(r => setTimeout(r, 10000))
    }
  }

  const duration = Math.round((Date.now() - startTime) / 1000)

  console.log('\n=============================================')
  console.log(`IMPORT TERMINÉ`)
  console.log(`Total: ${total} rues`)
  console.log(`Durée: ${Math.floor(duration / 60)}m ${duration % 60}s`)
  console.log('=============================================')
}

main().catch(console.error)
