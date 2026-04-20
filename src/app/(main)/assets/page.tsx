'use client'

import { Topbar } from '@/components/layout'
import { AssetPanel } from '@/components/assets/AssetPanel'
import { useI18n } from '@/hooks/useI18n'

export default function AssetsPage() {
  const { t } = useI18n()
  return (
    <>
      <Topbar title={'📦 ' + t('asset.pageTitle')} subtitle={t('asset.description')} />
      <div className="flex-1 overflow-y-auto bg-bg">
        <AssetPanel />
      </div>
    </>
  )
}
