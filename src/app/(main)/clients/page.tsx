'use client'

import { useState, useMemo } from 'react'
import { Topbar } from '@/components/layout'
import { Pagination } from '@/components/shared'
import {
  useClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
} from '@/hooks/useClients'
import { useI18n } from '@/hooks/useI18n'
import { usePermission } from '@/hooks/usePermission'
import type { Client } from '@/types/database'

// ---------------------------------------------------------------------------
// Add / Edit client modal
// ---------------------------------------------------------------------------

function ClientModal({
  client,
  onClose,
  onSave,
  saving,
  t,
}: {
  client: Client | null // null = create mode
  onClose: () => void
  onSave: (name: string) => void
  saving: boolean
  t: (key: string) => string
}) {
  const [name, setName] = useState(client?.name ?? '')

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3 md:p-0">
      <div className="bg-surface rounded-[12px] shadow-xl border border-border2 p-[16px] md:p-[24px] w-full max-w-[380px]">
        <h2 className="text-[15px] font-bold text-text mb-[16px]">
          {client ? t('clients.editTitle') : t('clients.addTitle')}
        </h2>

        <div>
          <label className="text-[11px] text-text2 font-medium block mb-[4px]">
            {t('clients.name')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
            placeholder={t('clients.namePlaceholder')}
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-[8px] mt-[20px]">
          <button
            onClick={onClose}
            className="px-[16px] py-[7px] text-[12px] text-text2 bg-surf2 rounded-[6px] hover:bg-border2 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => onSave(name.trim())}
            disabled={saving || !name.trim()}
            className="px-[16px] py-[7px] text-[12px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors disabled:opacity-50"
          >
            {saving ? t('clients.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Delete confirmation dialog
// ---------------------------------------------------------------------------

function DeleteConfirmDialog({
  client,
  onClose,
  onConfirm,
  deleting,
  error,
  t,
}: {
  client: Client
  onClose: () => void
  onConfirm: () => void
  deleting: boolean
  error?: string
  t: (key: string) => string
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3 md:p-0">
      <div className="bg-surface rounded-[12px] shadow-xl border border-border2 p-[16px] md:p-[24px] w-full max-w-[380px]">
        <h2 className="text-[15px] font-bold text-text mb-[8px]">
          {t('clients.deleteTitle')}
        </h2>
        <p className="text-[12px] text-text2 mb-[20px]">
          {t('clients.deleteConfirm').replace('{{name}}', client.name)}
        </p>

        {error && (
          <div className="text-[12px] text-danger bg-danger-bg border border-danger-b rounded-[6px] px-[10px] py-[6px] mb-[12px]">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-[8px]">
          <button
            onClick={onClose}
            className="px-[16px] py-[7px] text-[12px] text-text2 bg-surf2 rounded-[6px] hover:bg-border2 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-[16px] py-[7px] text-[12px] text-white bg-danger rounded-[6px] hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {deleting ? t('clients.deleting') : t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ClientsPage() {
  const { t } = useI18n()
  const { can } = usePermission()
  const { data: clients, isLoading } = useClients()
  const createMutation = useCreateClient()
  const updateMutation = useUpdateClient()
  const deleteMutation = useDeleteClient()

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deletingClient, setDeletingClient] = useState<Client | null>(null)

  const handleCreate = () => {
    setEditingClient(null)
    setModalMode('create')
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setModalMode('edit')
  }

  const handleModalSave = async (name: string) => {
    if (!name) return
    if (modalMode === 'create') {
      await createMutation.mutateAsync(name)
    } else if (modalMode === 'edit' && editingClient) {
      await updateMutation.mutateAsync({ id: editingClient.id, name })
    }
    setModalMode(null)
    setEditingClient(null)
  }

  const paginatedClients = useMemo(() => {
    if (!clients) return []
    if (pageSize === 0) return clients
    const start = (currentPage - 1) * pageSize
    return clients.slice(start, start + pageSize)
  }, [clients, currentPage, pageSize])

  const [deleteError, setDeleteError] = useState('')

  const handleDeleteConfirm = async () => {
    if (!deletingClient) return
    setDeleteError('')
    try {
      await deleteMutation.mutateAsync(deletingClient.id)
      setDeletingClient(null)
    } catch (e: any) {
      const msg = e?.message || String(e)
      if (msg.includes('deleteFkError') || msg.includes('foreign key') || msg.includes('violates') || msg.includes('referenced')) {
        setDeleteError(t('clients.deleteFkError'))
      } else {
        setDeleteError(t('clients.deleteFailedPrefix') + msg)
      }
    }
  }

  return (
    <>
      <Topbar title={t('clients.title')}>
        {can('clients', 'create') && (
          <button
            onClick={handleCreate}
            className="px-[14px] py-[6px] text-[12px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors font-medium"
          >
            {t('clients.add')}
          </button>
        )}
      </Topbar>

      <div className="flex-1 overflow-auto p-[12px] md:p-[20px]">
        {/* Count */}
        <div className="flex items-center justify-between mb-[12px]">
          <p className="text-[12px] text-text2">
            {t('clients.count').replace('{{count}}', String(clients?.length ?? 0))}
          </p>
        </div>

        <div className="mb-[12px]">
          <Pagination
            page={currentPage}
            pageSize={pageSize}
            totalCount={clients?.length ?? 0}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>

        <div className="bg-surface border border-border2 rounded-[10px] overflow-hidden shadow overflow-x-auto">
          {/* Header */}
          <div className="min-w-[400px] grid grid-cols-[1fr_100px_120px] gap-[8px] px-[16px] py-[10px] bg-surf2 border-b border-border2 text-[10.5px] font-bold text-text2">
            <div>{t('clients.headerName')}</div>
            <div className="text-center">{t('clients.headerCreatedAt')}</div>
            <div className="text-center">{t('clients.headerActions')}</div>
          </div>

          {/* Rows */}
          {isLoading ? (
            <div className="px-[16px] py-[32px] text-center text-[12px] text-text3">
              {t('common.loading')}
            </div>
          ) : (
            paginatedClients?.map((client) => (
              <div
                key={client.id}
                className="min-w-[400px] grid grid-cols-[1fr_100px_120px] gap-[8px] px-[16px] py-[10px] border-b border-border2 last:border-b-0 items-center text-[12px] text-text hover:bg-surf2/50 transition-colors"
              >
                {/* Name */}
                <div className="flex items-center gap-[8px]">
                  <span className="text-[14px]">🏢</span>
                  <span className="font-medium truncate">{client.name}</span>
                </div>

                {/* Created at */}
                <div className="text-center text-[11px] text-text3">
                  {new Date(client.created_at).toLocaleDateString('ja-JP')}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-[8px]">
                  {can('clients', 'update') && (
                    <button
                      onClick={() => handleEdit(client)}
                      className="text-[11px] text-mint hover:text-mint-d font-medium transition-colors"
                    >
                      {t('common.edit')}
                    </button>
                  )}
                  {can('clients', 'delete') && (
                    <button
                      onClick={() => setDeletingClient(client)}
                      className="text-[11px] text-danger hover:opacity-80 font-medium transition-colors"
                    >
                      {t('common.delete')}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}

          {!isLoading && clients?.length === 0 && (
            <div className="px-[16px] py-[32px] text-center text-[12px] text-text3">
              {t('clients.empty')}
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit modal */}
      {modalMode && (
        <ClientModal
          client={modalMode === 'edit' ? editingClient : null}
          onClose={() => {
            setModalMode(null)
            setEditingClient(null)
          }}
          onSave={handleModalSave}
          saving={createMutation.isPending || updateMutation.isPending}
          t={t}
        />
      )}

      {/* Delete confirmation */}
      {deletingClient && (
        <DeleteConfirmDialog
          client={deletingClient}
          onClose={() => { setDeletingClient(null); setDeleteError(''); }}
          onConfirm={handleDeleteConfirm}
          deleting={deleteMutation.isPending}
          error={deleteError}
          t={t}
        />
      )}
    </>
  )
}
