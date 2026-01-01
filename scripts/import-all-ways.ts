/**
 * Import TOUTES les voies - avec ou sans nom
 * Récupère absolument tout ce qui est taggé "highway" dans OSM
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vhajahilbimxjdwiyhwz.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoYWphaGlsYmlteGpkd2l5aHd6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTc0NDU3MiwiZXhwIjoyMDgxMzIwNTcyfQ.nHAndLtwNGP76cK9hDIF5pXFELXlIRYSkGvgo7tfZfU'
const OVERPASS_API = 'https://overpass-api.de/api/interpreter'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Noms officiels des arrondissements dans OSM
const ARR_NAMES: Record<number, string> = {
  1: 'Paris 1er Arrondissement',
  2: 'Paris 2e Arrondissement',
  3: 'Paris 3e Arrondissement',
  4: 'Paris 4e Arrondissement',
  5: 'Paris 5e Arrondissement',
  6: 'Paris 6e Arrondissement',
  7: 'Paris 7e Arrondissement',
  8: 'Paris 8e Arrondissement',
  9: 'Paris 9e Arrondissement',
  10: 'Paris 10e Arrondissement',
  11: 'Paris 11e Arrondissement',
  12: 'Paris 12e Arrondissement',
  13: 'Paris 13e Arrondissement',
  14: 'Paris 14e Arrondissement',
  15: 'Paris 15e Arrondissement',
  16: 'Paris 16e Arrondissement',
  17: 'Paris 17e Arrondissement',
  18: 'Paris 18e Arrondissement',
  19: 'Paris 19e Arrondissement',
  20: 'Paris 20e Arrondissement'
}

// Types de voies à importer (toutes les voies carrossables et piétonnes)
const HIGHWAY_TYPES = [
  'motorway', 'trunk', 'primary', 'secondary', 'tertiary',
  'unclassified', 'residential', 'living_street',
  'pedestrian', 'footway', 'path', 'steps', 'cycleway',
  'service', 'track'
]

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
  await supabase.from('street_actions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('streets').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('OK\n')
}

async function fetchAllWays(arr: number, retries = 5): Promise<any[]> {
  const areaName = ARR_NAMES[arr]

  // Requête pour TOUTES les voies (avec ou sans nom)
  const query = `
[out:json][timeout:300];
area["name"="${areaName}"]->.a;
(
  way["highway"](area.a);
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

      const status = response.status
      console.log(`  HTTP ${status} - attente 30s...`)
      await new Promise(r => setTimeout(r, 30000))

    } catch (error) {
      console.log(`  Erreur réseau - attente 30s...`)
      await new Promise(r => setTimeout(r, 30000))
    }
  }

  return []
}

async function importArrondissement(arr: number): Promise<number> {
  const label = arr === 1 ? '1er' : `${arr}e`
  console.log(`\n[${arr}/20] ${label} arrondissement`)

  const ways = await fetchAllWays(arr)

  if (ways.length === 0) {
    console.log('  ⚠ Aucune voie trouvée!')
    return 0
  }

  console.log(`  ${ways.length} voies brutes`)

  // Filtrer seulement les voies avec géométrie valide
  const validWays = ways.filter((w: any) => {
    if (!w.geometry || w.geometry.length < 2) return false
    // Accepter les types de voies qu'on veut
    const type = w.tags?.highway
    if (!type) return false
    return true
  })

  console.log(`  ${validWays.length} voies avec géométrie`)

  // Dédupliquer par OSM ID
  const uniqueWays = new Map()
  validWays.forEach((w: any) => uniqueWays.set(w.id, w))

  const records = Array.from(uniqueWays.values()).map((w: any) => {
    // Utiliser le nom si disponible, sinon générer un nom basé sur le type
    const name = w.tags.name || `${w.tags.highway} #${w.id}`

    return {
      osm_id: w.id,
      name: name,
      name_normalized: normalizeStreetName(name),
      arrondissement: arr,
      geometry: {
        type: 'LineString',
        coordinates: w.geometry.map((p: any) => [p.lon, p.lat])
      },
      street_type: w.tags.highway || null
    }
  })

  // Insérer par batches
  let inserted = 0
  const batchSize = 200

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)
    const { error } = await supabase.from('streets').upsert(batch, { onConflict: 'osm_id' })

    if (error) {
      console.log(`  Erreur: ${error.message}`)
    } else {
      inserted += batch.length
    }
  }

  console.log(`  ✓ ${inserted} voies insérées`)
  return inserted
}

async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('  IMPORT COMPLET - TOUTES LES VOIES')
  console.log('  (avec et sans nom)')
  console.log('═══════════════════════════════════════════\n')

  await clearAllStreets()

  const startTime = Date.now()
  let total = 0
  const results: Record<number, number> = {}

  for (let arr = 1; arr <= 20; arr++) {
    const count = await importArrondissement(arr)
    results[arr] = count
    total += count

    if (arr < 20) {
      console.log('  Pause 15s...')
      await new Promise(r => setTimeout(r, 15000))
    }
  }

  const duration = Math.round((Date.now() - startTime) / 1000)

  console.log('\n═══════════════════════════════════════════')
  console.log('  RÉSULTATS')
  console.log('═══════════════════════════════════════════')

  for (let arr = 1; arr <= 20; arr++) {
    const label = arr === 1 ? ' 1er' : `${arr.toString().padStart(2)}e `
    console.log(`  ${label}: ${results[arr]?.toLocaleString() || 0} voies`)
  }

  console.log('───────────────────────────────────────────')
  console.log(`  TOTAL: ${total.toLocaleString()} voies`)
  console.log(`  Durée: ${Math.floor(duration / 60)}m ${duration % 60}s`)
  console.log('═══════════════════════════════════════════')
}

main().catch(console.error)
