'use client'

import { useI18n } from '@/hooks/useI18n'

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useI18n()

  return (
    <div className="flex h-full w-full items-center justify-center py-[60px]">
      <div className="flex flex-col items-center gap-[16px] max-w-[400px] text-center px-[20px]">
        <div className="text-[40px]">!</div>
        <h2 className="text-[16px] font-bold text-text">
          {t('error.title')}
        </h2>
        <p className="text-[13px] text-text2 leading-relaxed">
          {t('error.description')}
        </p>
        {error?.message && (
          <p className="text-[11px] text-text3 bg-surf2 rounded-[6px] px-[12px] py-[8px] w-full break-all">
            {error.message}
          </p>
        )}
        <div className="flex gap-[8px]">
          <button
            onClick={reset}
            className="h-[36px] px-[20px] rounded-[7px] text-[13px] font-bold bg-mint text-white hover:bg-mint-d transition-colors"
          >
            {t('error.retry')}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="h-[36px] px-[20px] rounded-[7px] text-[13px] font-bold bg-surf2 text-text hover:bg-surf3 transition-colors"
          >
            {t('error.reload')}
          </button>
        </div>
        <a
          href="/dashboard"
          className="text-[12px] text-text3 hover:text-mint transition-colors underline mt-[8px]"
        >
          {t('error.backToDashboard')}
        </a>
      </div>
    </div>
  )
}
