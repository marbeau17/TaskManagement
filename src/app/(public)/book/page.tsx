'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Category {
  id: string
  slug: string
  title: string
  description: string
  duration_min: number
  icon: string
  color: string
}

export default function BookLandingPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/book/categories')
        if (!res.ok) throw new Error('failed')
        const data = await res.json()
        if (!cancelled && Array.isArray(data)) {
          setCategories(data)
        }
      } catch {
        if (!cancelled) setError('カテゴリの読み込みに失敗しました')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f4ec' }}>
      {/* Header */}
      <header
        className="text-center py-10 md:py-14"
        style={{ background: 'linear-gradient(135deg, #0d1f3c 0%, #1a3a6b 100%)' }}
      >
        <p
          className="text-xs md:text-sm tracking-widest mb-2"
          style={{ color: '#b8922a' }}
        >
          株式会社MEETS
        </p>
        <h1 className="text-2xl md:text-4xl font-bold text-white px-4">
          無料診断のご予約
        </h1>
        <p className="text-xs md:text-sm text-white/70 mt-2">
          Book your free diagnosis
        </p>
        <div
          className="mx-auto mt-4 w-16 h-0.5"
          style={{ backgroundColor: '#b8922a' }}
        />
      </header>

      {/* Intro */}
      <div className="max-w-5xl mx-auto px-4 pt-10 text-center">
        <p className="text-sm md:text-base" style={{ color: '#4a4a5a' }}>
          ご相談内容に合わせて、最適な診断カテゴリをお選びください。
          <br className="hidden md:block" />
          ご予約完了後、担当コンサルタントより確認メールをお送りいたします。
        </p>
      </div>

      {/* Cards */}
      <main className="max-w-5xl mx-auto px-4 py-10 md:py-14">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div
              className="animate-spin h-8 w-8 border-4 rounded-full"
              style={{ borderColor: '#0d1f3c', borderTopColor: 'transparent' }}
            />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-sm" style={{ color: '#c0392b' }}>
            {error}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12 text-sm" style={{ color: '#8a8a9a' }}>
            現在ご予約可能なカテゴリはありません。
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        className="text-center py-6 text-xs"
        style={{ color: '#8a8a9a' }}
      >
        &copy; {new Date().getFullYear()} 株式会社MEETS
      </footer>
    </div>
  )
}

function CategoryCard({ category }: { category: Category }) {
  const color = category.color || '#0d1f3c'
  return (
    <div
      className="bg-white rounded-2xl shadow-sm p-6 flex flex-col h-full transition-shadow hover:shadow-lg"
      style={{ borderTop: `4px solid ${color}` }}
    >
      <div className="text-5xl mb-4" aria-hidden>
        {category.icon || '📅'}
      </div>
      <h3
        className="text-lg font-bold mb-2"
        style={{ color: '#0d1f3c' }}
      >
        {category.title}
      </h3>
      <p
        className="text-sm flex-1 mb-4"
        style={{
          color: '#4a4a5a',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {category.description}
      </p>
      <div className="flex items-center justify-between mt-auto">
        <span
          className="text-xs px-3 py-1 rounded-full font-medium"
          style={{
            backgroundColor: `${color}15`,
            color: color,
          }}
        >
          約{category.duration_min}分
        </span>
        <Link
          href={`/book/${category.slug}`}
          className="px-4 py-2 rounded-lg text-sm font-bold text-white transition hover:opacity-90"
          style={{ backgroundColor: color }}
        >
          予約する →
        </Link>
      </div>
    </div>
  )
}
