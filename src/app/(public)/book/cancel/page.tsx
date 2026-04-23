'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface BookingDetails {
  category_title: string
  slot_start_at: string
  slot_end_at: string
  name: string
  email: string
  company?: string
  cancelled?: boolean
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDateJP(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function CancelInner() {
  const searchParams = useSearchParams()
  const token = searchParams?.get('token') || ''

  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelled, setCancelled] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('トークンが指定されていません')
      setLoading(false)
      return
    }
    let cancelledEffect = false
    async function load() {
      try {
        const res = await fetch(`/api/book/cancel?token=${encodeURIComponent(token)}`)
        if (!res.ok) throw new Error('failed')
        const data = await res.json()
        if (!cancelledEffect) {
          setBooking(data)
          if (data?.cancelled) setCancelled(true)
        }
      } catch {
        if (!cancelledEffect) setError('ご予約の情報を取得できませんでした')
      } finally {
        if (!cancelledEffect) setLoading(false)
      }
    }
    load()
    return () => {
      cancelledEffect = true
    }
  }, [token])

  const handleCancel = useCallback(async () => {
    if (!token) return
    setCancelling(true)
    try {
      const res = await fetch('/api/book/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!res.ok) {
        setError('キャンセルに失敗しました。時間を置いて再度お試しください。')
        return
      }
      setCancelled(true)
    } catch {
      setError('キャンセルに失敗しました。時間を置いて再度お試しください。')
    } finally {
      setCancelling(false)
    }
  }, [token])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f4ec' }}>
      <header
        className="text-center py-8"
        style={{ background: 'linear-gradient(135deg, #0d1f3c 0%, #1a3a6b 100%)' }}
      >
        <p
          className="text-xs tracking-widest mb-2"
          style={{ color: '#b8922a' }}
        >
          株式会社MEETS
        </p>
        <h1 className="text-xl md:text-2xl font-bold text-white">
          ご予約のキャンセル
        </h1>
      </header>

      <main className="max-w-xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div
              className="animate-spin h-8 w-8 border-4 rounded-full"
              style={{ borderColor: '#0d1f3c', borderTopColor: 'transparent' }}
            />
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="text-4xl mb-3">!</div>
            <p className="text-sm" style={{ color: '#c0392b' }}>
              {error}
            </p>
            <Link
              href="/book"
              className="inline-block mt-6 px-5 py-2 rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: '#0d1f3c' }}
            >
              予約トップへ戻る
            </Link>
          </div>
        ) : cancelled ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="text-5xl mb-4">&#10003;</div>
            <h2 className="text-lg font-bold mb-2" style={{ color: '#0d1f3c' }}>
              ご予約をキャンセルしました
            </h2>
            <p className="text-sm" style={{ color: '#4a4a5a' }}>
              またのご利用をお待ちしております。
            </p>
            <Link
              href="/book"
              className="inline-block mt-6 px-5 py-2 rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: '#0d1f3c' }}
            >
              予約トップへ戻る
            </Link>
          </div>
        ) : booking ? (
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#0d1f3c' }}>
              ご予約内容
            </h2>
            <div className="border-t border-b py-4 my-4 space-y-2 text-sm">
              <Row label="カテゴリ" value={booking.category_title} />
              <Row
                label="日時"
                value={`${formatDateJP(booking.slot_start_at)} ${formatTime(
                  booking.slot_start_at,
                )} – ${formatTime(booking.slot_end_at)}`}
              />
              <Row label="お名前" value={booking.name} />
              <Row label="メールアドレス" value={booking.email} />
              {booking.company && <Row label="会社名" value={booking.company} />}
            </div>

            <p className="text-sm mb-6" style={{ color: '#4a4a5a' }}>
              このご予約をキャンセルしてもよろしいですか？
            </p>

            <div className="flex gap-3">
              <Link
                href="/book"
                className="px-5 py-3 rounded-lg border text-sm font-bold text-center flex-1"
                style={{ borderColor: '#d0c9b8', color: '#0d1f3c' }}
              >
                戻る
              </Link>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-3 rounded-lg text-white font-bold text-sm transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#c0392b' }}
              >
                {cancelling ? '処理中...' : 'キャンセルする'}
              </button>
            </div>
          </div>
        ) : null}
      </main>

      <footer
        className="text-center py-6 text-xs"
        style={{ color: '#8a8a9a' }}
      >
        &copy; {new Date().getFullYear()} 株式会社MEETS
      </footer>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span style={{ color: '#8a8a9a' }}>{label}</span>
      <span style={{ color: '#0d1f3c' }} className="font-medium text-right">
        {value}
      </span>
    </div>
  )
}

export default function BookCancelPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: '#f8f4ec' }}
        >
          <div
            className="animate-spin h-8 w-8 border-4 rounded-full"
            style={{ borderColor: '#0d1f3c', borderTopColor: 'transparent' }}
          />
        </div>
      }
    >
      <CancelInner />
    </Suspense>
  )
}
