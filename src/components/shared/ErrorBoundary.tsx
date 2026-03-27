'use client'

import React from 'react'
import { useI18n } from '@/hooks/useI18n'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

function ErrorFallback({ error, onReload }: { error: Error | null; onReload: () => void }) {
  const { t } = useI18n()

  return (
    <div className="flex h-screen w-full items-center justify-center bg-wf-bg">
      <div className="flex flex-col items-center gap-[16px] max-w-[400px] text-center px-[20px]">
        <div className="text-[40px]">!</div>
        <h2 className="text-[16px] font-bold text-text">
          {t('error.title')}
        </h2>
        <p className="text-[13px] text-text2 leading-relaxed">
          {t('error.description')}
        </p>
        {error && (
          <p className="text-[11px] text-text3 bg-surf2 rounded-[6px] px-[12px] py-[8px] w-full break-all">
            {error.message}
          </p>
        )}
        <button
          onClick={onReload}
          className="
            h-[36px] px-[20px] rounded-[7px] text-[13px] font-bold
            bg-mint text-white hover:bg-mint-d transition-colors
          "
        >
          {t('error.reload')}
        </button>
      </div>
    </div>
  )
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught rendering error:', error, errorInfo)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback error={this.state.error} onReload={this.handleReload} />
      )
    }

    return this.props.children
  }
}
