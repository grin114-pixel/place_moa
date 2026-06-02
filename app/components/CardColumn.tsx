'use client'

import { useState, useEffect } from 'react'
import { supabase, TABLES, ensureDefaultCategory, DEFAULT_CATEGORY_NAME, type Card, type Category } from '@/lib/supabase'
import { PlusIcon, TrashIcon, LinkIcon, EditIcon } from './icons'

type Props = {
  cards: Card[]
  categories: Category[]
  selectedCategory: Category | null
  defaultCategory: Category | null
  searchQuery: string
  homeResetToken: number
  onRefresh: () => void
  onCategoryRefresh: () => void
  onCategoryDeleted: () => void
}

type EditState = {
  id: string
  categoryId: string
  title: string
  content: string
  link: string
}

export default function CardColumn({ cards, categories, selectedCategory, defaultCategory, searchQuery, homeResetToken, onRefresh, onCategoryRefresh, onCategoryDeleted }: Props) {
  const [isAdding, setIsAdding] = useState(false)
  const [addCategoryId, setAddCategoryId] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [link, setLink] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [editError, setEditError] = useState('')
  const [editState, setEditState] = useState<EditState | null>(null)
  const [isEditingCategory, setIsEditingCategory] = useState(false)
  const [categoryEditName, setCategoryEditName] = useState('')
  const [categoryEditLoading, setCategoryEditLoading] = useState(false)
  const [categoryDeleteLoading, setCategoryDeleteLoading] = useState(false)

  const filtered = cards.filter((c) => {
    const q = searchQuery.toLowerCase()
    return (
      c.content.toLowerCase().includes(q) ||
      (c.title ?? '').toLowerCase().includes(q) ||
      (c.link ?? '').toLowerCase().includes(q)
    )
  })

  const openAddForm = () => {
    setEditState(null)
    setAddCategoryId(selectedCategory?.id ?? defaultCategory?.id ?? '')
    setIsAdding(true)
  }

  const resetAddForm = () => {
    setIsAdding(false)
    setAddCategoryId('')
    setTitle('')
    setContent('')
    setLink('')
  }

  const handleAdd = async () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return
    setAddLoading(true)

    let categoryId = addCategoryId
    if (!categoryId) {
      const defaultCat = await ensureDefaultCategory()
      categoryId = defaultCat?.id ?? ''
    }
    if (!categoryId) {
      setAddLoading(false)
      return
    }

    const { error } = await supabase.from(TABLES.cards).insert({
      category_id: categoryId,
      title: trimmedTitle,
      content: content.trim(),
      link: link.trim() || null,
    })
    if (!error) {
      resetAddForm()
      onRefresh()
    }
    setAddLoading(false)
  }

  const startEdit = (card: Card) => {
    setEditState({
      id: card.id,
      categoryId: card.category_id,
      title: card.title ?? '',
      content: card.content,
      link: card.link ?? '',
    })
  }

  const handleEdit = async () => {
    if (!editState) return
    const trimmedContent = editState.content.trim()
    if (!trimmedContent) return
    setEditError('')
    setEditLoading(true)

    let categoryId = editState.categoryId
    if (!categoryId) {
      const defaultCat = await ensureDefaultCategory()
      categoryId = defaultCat?.id ?? ''
    }
    if (!categoryId) {
      setEditError('카테고리를 선택해주세요.')
      setEditLoading(false)
      return
    }

    const { error } = await supabase
      .from(TABLES.cards)
      .update({
        category_id: categoryId,
        title: editState.title.trim() || null,
        content: trimmedContent,
        link: editState.link.trim() || null,
      })
      .eq('id', editState.id)
      .select()

    if (error) {
      console.error('카드 수정 오류:', error)
      setEditError('저장 실패: ' + (error.message ?? '알 수 없는 오류'))
    } else {
      setEditState(null)
      setEditError('')
      onRefresh()
    }
    setEditLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 카드를 삭제할까요?')) return
    setDeleteLoading(id)
    const { error } = await supabase.from(TABLES.cards).delete().eq('id', id)
    if (!error) onRefresh()
    setDeleteLoading(null)
  }

  const canEditCategory = selectedCategory && selectedCategory.name !== DEFAULT_CATEGORY_NAME

  useEffect(() => {
    setIsEditingCategory(false)
  }, [selectedCategory?.id])

  useEffect(() => {
    if (homeResetToken === 0) return
    setIsAdding(false)
    setAddCategoryId('')
    setTitle('')
    setContent('')
    setLink('')
    setEditState(null)
    setEditError('')
    setIsEditingCategory(false)
    setCategoryEditName('')
  }, [homeResetToken])

  const startCategoryEdit = () => {
    if (!selectedCategory) return
    setIsAdding(false)
    setEditState(null)
    setCategoryEditName(selectedCategory.name)
    setIsEditingCategory(true)
  }

  const handleCategoryEdit = async () => {
    if (!selectedCategory) return
    const trimmed = categoryEditName.trim()
    if (!trimmed) return
    setCategoryEditLoading(true)
    const { error } = await supabase
      .from(TABLES.categories)
      .update({ name: trimmed })
      .eq('id', selectedCategory.id)
      .select()
    if (!error) {
      setIsEditingCategory(false)
      onCategoryRefresh()
    }
    setCategoryEditLoading(false)
  }

  const handleCategoryDelete = async () => {
    if (!selectedCategory) return
    if (!confirm('이 카테고리를 삭제하면 하위 카드도 모두 삭제됩니다. 계속할까요?')) return
    setCategoryDeleteLoading(true)
    const { error } = await supabase.from(TABLES.categories).delete().eq('id', selectedCategory.id)
    if (!error) onCategoryDeleted()
    setCategoryDeleteLoading(false)
  }

  return (
    <main className="flex flex-col h-full min-h-0 bg-gray-50">
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isEditingCategory && selectedCategory ? (
            <span className="text-sm font-medium text-indigo-600">카테고리 이름 수정</span>
          ) : (
            <>
              <h2 className="font-semibold text-gray-700 text-sm tracking-wide uppercase truncate">
                {selectedCategory ? selectedCategory.name : '전체보기'}
                <span className="ml-2 text-xs font-normal text-gray-400">({filtered.length})</span>
              </h2>
              {canEditCategory && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={startCategoryEdit}
                    className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-500 transition-colors"
                    title="카테고리 수정"
                  >
                    <EditIcon size={14} />
                  </button>
                  <button
                    onClick={handleCategoryDelete}
                    disabled={categoryDeleteLoading}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors"
                    title="카테고리 삭제"
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        <button
          onClick={openAddForm}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shrink-0"
        >
          <PlusIcon />
          <span>카드 추가</span>
        </button>
      </div>

      {isEditingCategory && selectedCategory && (
        <div className="px-5 py-3 bg-indigo-50 border-b border-indigo-100 shrink-0">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={categoryEditName}
              onChange={(e) => setCategoryEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCategoryEdit()
                if (e.key === 'Escape') setIsEditingCategory(false)
              }}
              className="flex-1 min-w-0 text-sm px-3 py-2 rounded-lg border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            />
            <button
              onClick={handleCategoryEdit}
              disabled={categoryEditLoading || !categoryEditName.trim()}
              className="shrink-0 px-4 py-2 rounded-lg text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 font-medium"
            >
              {categoryEditLoading ? '저장 중...' : '확인'}
            </button>
            <button
              onClick={() => setIsEditingCategory(false)}
              disabled={categoryEditLoading}
              className="shrink-0 px-4 py-2 rounded-lg text-sm text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 font-medium"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 추가 폼 */}
      {isAdding && (
        <div className="mx-4 mt-4 p-4 rounded-xl bg-white border border-indigo-200 shadow-sm">
          <p className="text-xs font-medium text-indigo-600 mb-3">새 카드 추가</p>
          <select
            value={addCategoryId}
            onChange={(e) => setAddCategoryId(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-2 bg-white"
          >
            {categories.length === 0 ? (
              <option value="">{DEFAULT_CATEGORY_NAME}</option>
            ) : (
              categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))
            )}
          </select>
          <input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
            className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-2"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용 (선택사항)"
            rows={3}
            className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
          />
          <div className="relative mt-2">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
              <LinkIcon />
            </div>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="링크 (선택사항)"
              className="w-full text-sm pl-9 pr-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAdd}
              disabled={addLoading || !title.trim()}
              className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {addLoading ? '저장 중...' : '저장'}
            </button>
            <button
              onClick={resetAddForm}
              disabled={addLoading}
              className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg width="48" height="48" className="mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">카드가 없습니다</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((card) =>
              editState?.id === card.id ? (
                /* 수정 폼 (카드 자리에 인라인으로 표시) */
                <div key={card.id} className="bg-white rounded-xl border border-indigo-300 p-4 shadow-sm col-span-1">
                  <p className="text-xs font-medium text-indigo-600 mb-3">카드 수정</p>
                  <select
                    value={editState.categoryId}
                    onChange={(e) => setEditState({ ...editState, categoryId: e.target.value })}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-2 bg-white"
                  >
                    {categories.length === 0 ? (
                      <option value="">{DEFAULT_CATEGORY_NAME}</option>
                    ) : (
                      categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))
                    )}
                  </select>
                  <input
                    autoFocus
                    type="text"
                    value={editState.title}
                    onChange={(e) => setEditState({ ...editState, title: e.target.value })}
                    placeholder="제목 (선택사항)"
                    className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-2"
                  />
                  <textarea
                    value={editState.content}
                    onChange={(e) => setEditState({ ...editState, content: e.target.value })}
                    placeholder="내용을 입력하세요"
                    rows={3}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                  />
                  <div className="relative mt-2">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                      <LinkIcon />
                    </div>
                    <input
                      type="url"
                      value={editState.link}
                      onChange={(e) => setEditState({ ...editState, link: e.target.value })}
                      placeholder="링크 (선택사항)"
                      className="w-full text-sm pl-9 pr-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  {editError && (
                    <p className="mt-2 text-xs text-red-500">{editError}</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleEdit}
                      disabled={editLoading || !editState.content.trim()}
                      className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {editLoading ? '저장 중...' : '저장'}
                    </button>
                    <button
                      onClick={() => { setEditState(null); setEditError('') }}
                      disabled={editLoading}
                      className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                /* 카드 보기 */
                <div
                  key={card.id}
                  className="group relative bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all overflow-hidden"
                >
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                    <button
                      onClick={() => { startEdit(card); setIsAdding(false) }}
                      className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-300 hover:text-indigo-500 transition-all"
                      title="수정"
                    >
                      <EditIcon size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(card.id)}
                      disabled={deleteLoading === card.id}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 disabled:opacity-50 transition-all"
                      title="삭제"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                  {card.title && (
                    <div className="-mx-4 -mt-4 mb-3 px-4 py-2.5 bg-indigo-50 border-b border-indigo-100">
                      <p className="text-sm font-semibold text-gray-900 pr-14 truncate">{card.title}</p>
                    </div>
                  )}
                  {card.content && (
                    <p className="text-sm text-gray-600 leading-relaxed pr-14 whitespace-pre-wrap">{card.content}</p>
                  )}
                  {card.link && (
                    <a
                      href={card.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-700 hover:underline truncate"
                    >
                      <LinkIcon />
                      <span className="truncate">{card.link}</span>
                    </a>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </main>
  )
}
