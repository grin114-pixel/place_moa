'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase, TABLES, ensureDefaultCategory, ensureCategorySortOrders, detectCategorySortOrderSupport, sortCategories, DEFAULT_CATEGORY_NAME, type Category, type Card } from '@/lib/supabase'
import CategoryColumn from './components/CategoryColumn'
import CardColumn from './components/CardColumn'
import { SearchIcon, XIcon } from './components/icons'

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [homeResetToken, setHomeResetToken] = useState(0)

  const selectedCategory = categories.find((c) => c.id === selectedId) ?? null
  const defaultCategory = categories.find((c) => c.name === DEFAULT_CATEGORY_NAME) ?? null

  const fetchCategories = useCallback(async () => {
    const sortOrderSupported = await detectCategorySortOrderSupport()
    const orderColumn = sortOrderSupported ? 'sort_order' : 'created_at'
    const { data, error } = await supabase
      .from(TABLES.categories)
      .select('*')
      .order(orderColumn, { ascending: true })
    if (error) console.error('categories fetch error:', error)
    if (data) {
      if (sortOrderSupported) {
        await ensureCategorySortOrders(data)
        const { data: refreshed } = await supabase
          .from(TABLES.categories)
          .select('*')
          .order('sort_order', { ascending: true })
        setCategories(sortCategories(refreshed ?? data))
      } else {
        setCategories(sortCategories(data))
      }
    }
  }, [])

  const fetchCards = useCallback(async () => {
    const query = supabase.from(TABLES.cards).select('*').order('created_at', { ascending: false })
    if (selectedId && !searchQuery) {
      query.eq('category_id', selectedId)
    }
    const { data } = await query
    if (data) setCards(data)
  }, [selectedId, searchQuery])

  // 최초 로드 시 딱 한 번만 미지정 카테고리 보장
  useEffect(() => {
    ensureDefaultCategory().then(() => fetchCategories())
  }, [fetchCategories])
  useEffect(() => { fetchCards() }, [fetchCards])

  const handleSelectCategory = (id: string) => {
    setSelectedId(id)
    setSearchQuery('')
  }

  const handleSelectAll = () => {
    setSelectedId(null)
    setSearchQuery('')
  }

  const handleGoHome = () => {
    setSelectedId(null)
    setSearchQuery('')
    setHomeResetToken((t) => t + 1)
  }

  const displayedCards = searchQuery
    ? cards.filter((c) => {
        const q = searchQuery.toLowerCase()
        return c.content.toLowerCase().includes(q) || (c.link ?? '').toLowerCase().includes(q)
      })
    : cards

  return (
    <div className="app-shell flex flex-col h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shadow-sm z-10">
        {/* 앱 로고/타이틀 */}
        <button
          type="button"
          onClick={handleGoHome}
          className="flex items-center gap-2 shrink-0 rounded-lg px-1 py-0.5 hover:bg-indigo-50 transition-colors"
          aria-label="홈으로"
          title="홈으로"
        >
          <span className="text-2xl select-none">🗺️</span>
          <h1 className="text-lg font-bold text-indigo-700 tracking-tight hidden sm:block">놀러가자</h1>
        </button>

        {/* 검색창 */}
        <div className="flex-1 max-w-xl mx-auto relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
            <SearchIcon />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              if (e.target.value) setSelectedId(null)
            }}
            placeholder="카드 검색..."
            className="w-full pl-10 pr-9 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <XIcon />
            </button>
          )}
        </div>
      </header>

      {/* 바디: 2열 레이아웃 */}
      <div className="app-body flex flex-1 min-h-0 overflow-hidden">
        {/* 1열: 카테고리 */}
        <div className="app-sidebar shrink-0 h-full overflow-hidden w-fit">
          <CategoryColumn
            categories={categories}
            selectedId={selectedId}
            onSelectAll={handleSelectAll}
            onSelect={handleSelectCategory}
            onRefresh={() => { fetchCategories(); fetchCards() }}
          />
        </div>

        {/* 2열: 카드 */}
        <div className="app-main flex-1 min-w-0 min-h-0 overflow-hidden">
          <CardColumn
            cards={displayedCards}
            categories={categories}
            selectedCategory={selectedCategory}
            defaultCategory={defaultCategory}
            searchQuery={searchQuery}
            homeResetToken={homeResetToken}
            onRefresh={fetchCards}
            onCategoryRefresh={() => { fetchCategories(); fetchCards() }}
            onCategoryDeleted={() => { setSelectedId(null); fetchCategories(); fetchCards() }}
          />
        </div>
      </div>
    </div>
  )
}
