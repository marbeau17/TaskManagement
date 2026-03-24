'use client'

import { useState } from 'react'
import { Topbar } from '@/components/layout'
import {
  useClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
} from '@/hooks/useClients'
import type { Client } from '@/types/database'

// ---------------------------------------------------------------------------
// Add / Edit client modal
// ---------------------------------------------------------------------------

function ClientModal({
  client,
  onClose,
  onSave,
  saving,
}: {
  client: Client | null // null = create mode
  onClose: () => void
  onSave: (name: string) => void
  saving: boolean
}) {
  const [name, setName] = useState(client?.name ?? '')

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-surface rounded-[12px] shadow-xl border border-border2 p-[24px] w-[380px]">
        <h2 className="text-[15px] font-bold text-text mb-[16px]">
          {client ? 'クライアント編集' : 'クライアント追加'}
        </h2>

        <div>
          <label className="text-[11px] text-text2 font-medium block mb-[4px]">
            クライアント名
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
            placeholder="例: 株式会社サンプル"
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-[8px] mt-[20px]">
          <button
            onClick={onClose}
            className="px-[16px] py-[7px] text-[12px] text-text2 bg-surf2 rounded-[6px] hover:bg-border2 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={() => onSave(name.trim())}
            disabled={saving || !name.trim()}
            className="px-[16px] py-[7px] text-[12px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
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
}: {
  client: Client
  onClose: () => void
  onConfirm: () => void
  deleting: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-surface rounded-[12px] shadow-xl border border-border2 p-[24px] w-[380px]">
        <h2 className="text-[15px] font-bold text-text mb-[8px]">
          クライアント削除
        </h2>
        <p className="text-[12px] text-text2 mb-[20px]">
          「{client.name}」を削除しますか？この操作は元に戻せません。
        </p>

        <div className="flex justify-end gap-[8px]">
          <button
            onClick={onClose}
            className="px-[16px] py-[7px] text-[12px] text-text2 bg-surf2 rounded-[6px] hover:bg-border2 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-[16px] py-[7px] text-[12px] text-white bg-danger rounded-[6px] hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {deleting ? '削除中...' : '削除'}
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
  const { data: clients, isLoading } = useClients()
  const createMutation = useCreateClient()
  const updateMutation = useUpdateClient()
  const deleteMutation = useDeleteClient()

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

  const handleDeleteConfirm = async () => {
    if (!deletingClient) return
    await deleteMutation.mutateAsync(deletingClient.id)
    setDeletingClient(null)
  }

  return (
    <>
      <Topbar title="クライアント管理">
        <button
          onClick={handleCreate}
          className="px-[14px] py-[6px] text-[12px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors font-medium"
        >
          + クライアント追加
        </button>
      </Topbar>

      <div className="flex-1 overflow-auto p-[20px]">
        {/* Count */}
        <div className="flex items-center justify-between mb-[12px]">
          <p className="text-[12px] text-text2">
            クライアント数: {clients?.length ?? 0}件
          </p>
        </div>

        <div className="bg-surface border border-border2 rounded-[10px] overflow-hidden shadow">
          {/* Header */}
          <div className="grid grid-cols-[1fr_100px_120px] gap-[8px] px-[16px] py-[10px] bg-surf2 border-b border-border2 text-[10.5px] font-bold text-text2">
            <div>名前</div>
            <div className="text-center">作成日</div>
            <div className="text-center">操作</div>
          </div>

          {/* Rows */}
          {isLoading ? (
            <div className="px-[16px] py-[32px] text-center text-[12px] text-text3">
              読み込み中...
            </div>
          ) : (
            clients?.map((client) => (
              <div
                key={client.id}
                className="grid grid-cols-[1fr_100px_120px] gap-[8px] px-[16px] py-[10px] border-b border-border2 last:border-b-0 items-center text-[12px] text-text hover:bg-surf2/50 transition-colors"
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
                  <button
                    onClick={() => handleEdit(client)}
                    className="text-[11px] text-mint hover:text-mint-d font-medium transition-colors"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => setDeletingClient(client)}
                    className="text-[11px] text-danger hover:opacity-80 font-medium transition-colors"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))
          )}

          {!isLoading && clients?.length === 0 && (
            <div className="px-[16px] py-[32px] text-center text-[12px] text-text3">
              クライアントがありません
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
        />
      )}

      {/* Delete confirmation */}
      {deletingClient && (
        <DeleteConfirmDialog
          client={deletingClient}
          onClose={() => setDeletingClient(null)}
          onConfirm={handleDeleteConfirm}
          deleting={deleteMutation.isPending}
        />
      )}
    </>
  )
}
