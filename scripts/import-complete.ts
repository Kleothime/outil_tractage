/**
 * Import COMPLET avec zones administratives exactes
 * Utilise les limites officielles des arrondissements de Paris
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

async function fetchStreets(arr: number, retries = 5): Promise<any[]> {
  const areaName = ARR_NAMES[arr]

  // Requête avec zone administrative exacte
  // Récupère TOUS les types de voies avec un nom
  const query = `
[out:json][timeout:300];
area["name"="${areaName}"]->.a;
(
  way["highway"]["name"](area.a);
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
      console.log(`  HTTP ${status} - attente 20s...`)
      await new Promise(r => setTimeout(r, 20000))

    } catch (error) {
      console.log(`  Erreur réseau - attente 20s...`)
      await new Promise(r => setTimeout(r, 20000))
    }
  }

  return []
}

async function importArrondissement(arr: number): Promise<number> {
  const label = arr === 1 ? '1er' : `${arr}e`
  console.log(`\n[${arr}/20] ${label} arrondissement`)

  const streets = await fetchStreets(arr)

  if (streets.length === 0) {
    console.log('  ⚠ Aucune rue trouvée!')
    return 0
  }

  console.log(`  ${streets.length} éléments trouvés`)

  // Garder seulement celles avec nom et géométrie
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
      console.log(`  Erreur: ${error.message}`)
    } else {
      inserted += batch.length
    }
  }

  console.log(`  ✓ ${inserted} rues insérées`)
  return inserted
}

async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('  IMPORT COMPLET - ZONES ADMINISTRATIVES')
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
      console.log('  Pause 12s...')
      await new Promise(r => setTimeout(r, 12000))
    }
  }

  const duration = Math.round((Date.now() - startTime) / 1000)

  console.log('\n═══════════════════════════════════════════')
  console.log('  RÉSULTATS')
  console.log('═══════════════════════════════════════════')

  for (let arr = 1; arr <= 20; arr++) {
    const label = arr === 1 ? ' 1er' : `${arr.toString().padStart(2)}e `
    console.log(`  ${label}: ${results[arr]?.toLocaleString() || 0} rues`)
  }

  console.log('───────────────────────────────────────────')
  console.log(`  TOTAL: ${total.toLocaleString()} rues`)
  console.log(`  Durée: ${Math.floor(duration / 60)}m ${duration % 60}s`)
  console.log('═══════════════════════════════════════════')
}

main().catch(console.error)
