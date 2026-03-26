'use client'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  let locale: 'ja' | 'en' = 'ja'
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('workflow-locale')
      if (stored === 'en') locale = 'en'
    }
  } catch {}

  const labels = locale === 'en'
    ? { title: 'Something went wrong', desc: 'An unexpected error occurred. Please retry or reload the page.', retry: 'Retry', reload: 'Reload Page' }
    : { title: 'エラーが発生しました', desc: '予期しないエラーが発生しました。再試行するか、ページを再読み込みしてください。', retry: '再試行', reload: '再読み込み' }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-wf-bg">
      <div className="flex flex-col items-center gap-[16px] max-w-[400px] text-center px-[20px]">
        <div className="text-[40px]">!</div>
        <h2 className="text-[16px] font-bold text-text">{labels.title}</h2>
        <p className="text-[13px] text-text2 leading-relaxed">{labels.desc}</p>
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
            {labels.retry}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="h-[36px] px-[20px] rounded-[7px] text-[13px] font-bold bg-surf2 text-text hover:bg-surf3 transition-colors"
          >
            {labels.reload}
          </button>
        </div>
      </div>
    </div>
  )
}
