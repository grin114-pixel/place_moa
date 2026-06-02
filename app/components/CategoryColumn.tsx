'use client'

import { useState } from 'react'
import { DEFAULT_CATEGORY_NAME, insertCategory, swapCategoryPositions, type Category } from '@/lib/supabase'
import { PlusIcon, FolderIcon, AllIcon, ChevronUpIcon, ChevronDownIcon } from './icons'

type Props = {
  categories: Category[]
  selectedId: string | null
  onSelectAll: () => void
  onSelect: (id: string) => void
  onRefresh: () => void
}

export default function CategoryColumn({ categories, selectedId, onSelectAll, onSelect, onRefresh }: Props) {
  const [newName, setNewName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [reorderLoading, setReorderLoading] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const reorderable = categories.filter((c) => c.name !== DEFAULT_CATEGORY_NAME)

  const handleAdd = async () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    setAddLoading(true)
    setErrorMsg('')
    const maxOrder = reorderable.reduce((max, c) => Math.max(max, c.sort_order ?? 0), -1)
    const { error } = await insertCategory(trimmed, maxOrder + 1)
    if (!error) {
      setNewName('')
      setIsAdding(false)
      onRefresh()
    } else {
      console.error('카테고리 추가 오류:', error)
      setErrorMsg(error || '추가 실패. 콘솔을 확인하세요.')
    }
    setAddLoading(false)
  }

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const index = reorderable.findIndex((c) => c.id === id)
    if (index === -1) return
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= reorderable.length) return

    const current = reorderable[index]
    const neighbor = reorderable[swapIndex]

    setReorderLoading(id)
    setErrorMsg('')
    const { error } = await swapCategoryPositions(current, neighbor)
    if (error) {
      setErrorMsg(error)
    } else {
      onRefresh()
    }
    setReorderLoading(null)
  }

  return (
    <aside className="inline-flex flex-col h-full min-h-0 max-w-full overflow-hidden bg-white border-r border-gray-200">
      <div className="flex items-center gap-1 px-2 py-2 border-b border-gray-100 whitespace-nowrap">
        <h2 className="font-semibold text-gray-700 text-sm">카테고리</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="p-1 rounded-md text-indigo-600 hover:bg-indigo-50 transition-colors"
          title="카테고리 추가"
        >
          <PlusIcon />
        </button>
      </div>

      {errorMsg && (
        <div className="mx-2 mt-1 px-2 py-1.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 whitespace-nowrap">
          ⚠️ {errorMsg}
        </div>
      )}

      {isAdding && (
        <div className="px-2 py-2 border-b border-gray-100 bg-indigo-50 whitespace-nowrap">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') { setIsAdding(false); setNewName('') }
            }}
            placeholder="이름"
            size={Math.max(newName.length, 4)}
            className="text-sm px-2 py-1 rounded border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white min-w-0"
          />
          <div className="flex gap-1 mt-1.5">
            <button
              onClick={handleAdd}
              disabled={addLoading || !newName.trim()}
              className="text-xs px-2 py-1 rounded bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {addLoading ? '...' : '추가'}
            </button>
            <button
              onClick={() => { setIsAdding(false); setNewName('') }}
              disabled={addLoading}
              className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-600 font-medium hover:bg-gray-300 disabled:opacity-50 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      <ul className="flex-1 overflow-y-auto overflow-x-hidden py-0.5 min-h-0">
        <li>
          <button
            onClick={onSelectAll}
            className={`flex items-center gap-1.5 px-2 py-1.5 text-left text-sm transition-colors whitespace-nowrap ${
              selectedId === null
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <AllIcon active={selectedId === null} />
            <span>전체보기</span>
          </button>
        </li>

        {categories.length === 0 && (
          <li className="px-2 py-4 text-gray-400 text-xs whitespace-nowrap">
            추가해보세요
          </li>
        )}
        {categories.map((cat) => {
          const reorderIndex = reorderable.findIndex((c) => c.id === cat.id)
          const canReorder = cat.name !== DEFAULT_CATEGORY_NAME

          return (
            <li
              key={cat.id}
              className={`group flex items-center ${
                selectedId === cat.id ? 'bg-indigo-50' : 'hover:bg-gray-50'
              }`}
            >
              <button
                onClick={() => onSelect(cat.id)}
                className={`flex-1 flex items-center gap-1.5 px-2 py-1.5 text-left text-sm transition-colors whitespace-nowrap min-w-0 ${
                  selectedId === cat.id
                    ? 'text-indigo-700 font-medium'
                    : 'text-gray-700'
                }`}
              >
                <FolderIcon active={selectedId === cat.id} />
                <span>{cat.name}</span>
              </button>
              {canReorder && (
                <div className="flex flex-col shrink-0 opacity-0 group-hover:opacity-100 pr-0.5 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMove(cat.id, 'up') }}
                    disabled={reorderIndex <= 0 || reorderLoading === cat.id}
                    className="p-0.5 rounded text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="위로"
                  >
                    <ChevronUpIcon size={11} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMove(cat.id, 'down') }}
                    disabled={reorderIndex >= reorderable.length - 1 || reorderLoading === cat.id}
                    className="p-0.5 rounded text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="아래로"
                  >
                    <ChevronDownIcon size={11} />
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
