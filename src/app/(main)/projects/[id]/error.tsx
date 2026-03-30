'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/hooks/useI18n'

export default function ProjectDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const { t } = useI18n()

  useEffect(() => {
    console.error('Project detail error:', error)
  }, [error])

  return (
    <div className="flex items-center justify-center h-full p-[20px]">
      <div className="text-center max-w-[400px]">
        <div className="text-[40px] mb-[12px]">⚠️</div>
        <h2 className="text-[16px] font-bold text-text mb-[8px]">
          {t('error.projectLoadFailed')}
        </h2>
        <p className="text-[12px] text-text2 mb-[16px]">
          {error.message}
        </p>
        <div className="flex justify-center gap-[8px]">
          <button
            onClick={reset}
            className="px-[16px] py-[7px] text-[12px] font-semibold text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors"
          >
            {t('error.retry')}
          </button>
          <button
            onClick={() => router.push('/projects')}
            className="px-[16px] py-[7px] text-[12px] font-semibold text-text2 bg-surf2 rounded-[6px] hover:bg-border2 transition-colors"
          >
            {t('error.backToList')}
          </button>
        </div>
      </div>
    </div>
  )
}
