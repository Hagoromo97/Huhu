import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '../lib/db'

type FoodItemPayload = {
  id: string
  name: string
  category: string
  expiryDate: string
  notes?: string
  createdAt: string
  deletedAt?: string
}

function toIso(value: unknown): string {
  if (!value) return ''
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}

function toDateOnly(value: unknown): string {
  if (!value) return ''
  const raw = String(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function normalizeInput(item: FoodItemPayload, deletedAtOverride?: string | null): FoodItemPayload {
  const createdAt = toIso(item.createdAt) || new Date().toISOString()
  const deletedAt = deletedAtOverride !== undefined
    ? (deletedAtOverride ?? undefined)
    : (toIso(item.deletedAt) || undefined)

  return {
    id: String(item.id || '').trim(),
    name: String(item.name || '').trim(),
    category: String(item.category || 'None').trim() || 'None',
    expiryDate: toDateOnly(item.expiryDate),
    notes: String(item.notes || '').trim(),
    createdAt,
    deletedAt,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS food_tracker_items (
        id TEXT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(80) NOT NULL DEFAULT 'None',
        expiry_date DATE NOT NULL,
        notes TEXT DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP NULL
      )
    `

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, name, category, expiry_date, notes, created_at, deleted_at
        FROM food_tracker_items
        ORDER BY created_at DESC
      `

      const active: FoodItemPayload[] = []
      const trash: FoodItemPayload[] = []

      rows.forEach((row: Record<string, unknown>) => {
        const mapped: FoodItemPayload = {
          id: String(row.id),
          name: String(row.name),
          category: String(row.category ?? 'None'),
          expiryDate: toDateOnly(row.expiry_date),
          notes: String(row.notes ?? ''),
          createdAt: toIso(row.created_at),
          deletedAt: toIso(row.deleted_at) || undefined,
        }
        if (mapped.deletedAt) trash.push(mapped)
        else active.push(mapped)
      })

      return res.status(200).json({ success: true, active, trash })
    }

    if (req.method === 'POST') {
      const { active, trash } = req.body as { active?: FoodItemPayload[]; trash?: FoodItemPayload[] }

      if (!Array.isArray(active) || !Array.isArray(trash)) {
        return res.status(400).json({ success: false, error: 'active and trash arrays are required' })
      }

      const normalizedActive = active.map((item) => normalizeInput(item, null))
      const normalizedTrash = trash.map((item) => normalizeInput(item))
      const merged = [...normalizedActive, ...normalizedTrash]

      if (merged.some((item) => !item.id || !item.name || !item.expiryDate)) {
        return res.status(400).json({ success: false, error: 'Invalid item payload' })
      }

      const ids = merged.map((item) => item.id)
      if (ids.length > 0) {
        await sql`DELETE FROM food_tracker_items WHERE id != ALL(${ids}::text[])`
      } else {
        await sql`DELETE FROM food_tracker_items`
      }

      for (const item of merged) {
        await sql`
          INSERT INTO food_tracker_items (id, name, category, expiry_date, notes, created_at, deleted_at)
          VALUES (
            ${item.id},
            ${item.name},
            ${item.category},
            ${item.expiryDate},
            ${item.notes ?? ''},
            ${item.createdAt},
            ${item.deletedAt ?? null}
          )
          ON CONFLICT (id) DO UPDATE
            SET name = EXCLUDED.name,
                category = EXCLUDED.category,
                expiry_date = EXCLUDED.expiry_date,
                notes = EXCLUDED.notes,
                created_at = EXCLUDED.created_at,
                deleted_at = EXCLUDED.deleted_at
        `
      }

      return res.status(200).json({ success: true })
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ success: false, error: `Method ${req.method} not allowed` })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ success: false, error: message })
  }
}
