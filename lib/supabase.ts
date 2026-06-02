import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const TABLES = {
  categories: 'nolleogaja_categories',
  cards: 'nolleogaja_cards',
} as const

export const DEFAULT_CATEGORY_NAME = '미지정'

let categorySortOrderSupported: boolean | null = null

export async function detectCategorySortOrderSupport(): Promise<boolean> {
  if (categorySortOrderSupported !== null) return categorySortOrderSupported
  const { error } = await supabase.from(TABLES.categories).select('sort_order').limit(1)
  categorySortOrderSupported = !error
  return categorySortOrderSupported
}

export function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => {
    const aDefault = a.name === DEFAULT_CATEGORY_NAME
    const bDefault = b.name === DEFAULT_CATEGORY_NAME
    if (aDefault !== bDefault) return aDefault ? 1 : -1
    const aOrder = a.sort_order ?? 0
    const bOrder = b.sort_order ?? 0
    if (aOrder !== bOrder) return aOrder - bOrder
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

export async function ensureCategorySortOrders(categories: Category[]): Promise<void> {
  if (categories.length === 0) return
  if (!(await detectCategorySortOrderSupport())) return

  const regular = categories.filter((c) => c.name !== DEFAULT_CATEGORY_NAME)
  const defaultCat = categories.find((c) => c.name === DEFAULT_CATEGORY_NAME)
  const orders = regular.map((c) => c.sort_order ?? 0)
  const uniqueOrders = new Set(orders)
  const needsInit = orders.every((o) => o === 0) || uniqueOrders.size !== orders.length

  if (!needsInit) return

  const sorted = [...regular].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  await Promise.all([
    ...sorted.map((cat, index) =>
      supabase.from(TABLES.categories).update({ sort_order: index }).eq('id', cat.id)
    ),
    ...(defaultCat
      ? [supabase.from(TABLES.categories).update({ sort_order: 999999 }).eq('id', defaultCat.id)]
      : []),
  ])
}

export async function swapCategoryPositions(
  current: Category,
  neighbor: Category
): Promise<{ error?: string }> {
  const sortOrderSupported = await detectCategorySortOrderSupport()

  if (sortOrderSupported) {
    const currentOrder = current.sort_order ?? 0
    const neighborOrder = neighbor.sort_order ?? 0
    const [res1, res2] = await Promise.all([
      supabase.from(TABLES.categories).update({ sort_order: neighborOrder }).eq('id', current.id),
      supabase.from(TABLES.categories).update({ sort_order: currentOrder }).eq('id', neighbor.id),
    ])
    if (res1.error || res2.error) {
      return { error: res1.error?.message || res2.error?.message || '순서 변경 실패' }
    }
    return {}
  }

  const currentTime = new Date(current.created_at).getTime()
  const neighborTime = new Date(neighbor.created_at).getTime()
  const swappedNeighborTime =
    currentTime === neighborTime
      ? new Date(neighborTime - 1).toISOString()
      : neighbor.created_at

  const [res1, res2] = await Promise.all([
    supabase.from(TABLES.categories).update({ created_at: swappedNeighborTime }).eq('id', current.id),
    supabase.from(TABLES.categories).update({ created_at: current.created_at }).eq('id', neighbor.id),
  ])
  if (res1.error || res2.error) {
    return { error: res1.error?.message || res2.error?.message || '순서 변경 실패' }
  }
  return {}
}

export async function insertCategory(name: string, sortOrder?: number): Promise<{ error?: string }> {
  const sortOrderSupported = await detectCategorySortOrderSupport()
  const payload = sortOrderSupported && sortOrder !== undefined ? { name, sort_order: sortOrder } : { name }
  const { error } = await supabase.from(TABLES.categories).insert(payload)
  if (error) return { error: error.message }
  return {}
}

export async function ensureDefaultCategory(): Promise<Category | null> {
  const { data: existing } = await supabase
    .from(TABLES.categories)
    .select('*')
    .eq('name', DEFAULT_CATEGORY_NAME)
    .maybeSingle()
  if (existing) return existing

  const { data: created } = await supabase
    .from(TABLES.categories)
    .insert({ name: DEFAULT_CATEGORY_NAME })
    .select()
    .single()
  return created
}

export type Category = {
  id: string
  name: string
  sort_order: number | null
  created_at: string
}

export type Card = {
  id: string
  category_id: string
  title: string | null
  content: string
  link: string | null
  created_at: string
}
