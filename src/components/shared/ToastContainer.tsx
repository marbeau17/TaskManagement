'use client'

import { useToastStore } from '@/stores/toastStore'

const TOAST_STYLES = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-blue-600 text-white',
  warning: 'bg-amber-500 text-white',
}

const TOAST_ICONS = {
  success: '\u2713',
  error: '\u2715',
  info: '\u2139',
  warning: '\u26A0',
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-[20px] right-[20px] z-[9999] flex flex-col gap-[8px] max-w-[360px]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${TOAST_STYLES[t.type]} px-[14px] py-[10px] rounded-[8px] shadow-lg flex items-center gap-[8px] animate-in slide-in-from-right-5 text-[13px] font-medium`}
          role="alert"
        >
          <span className="text-[16px] shrink-0">{TOAST_ICONS[t.type]}</span>
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            className="text-white/70 hover:text-white ml-[4px] text-[14px] shrink-0"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  )
}
