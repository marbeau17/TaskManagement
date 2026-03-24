'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FilterBar } from '@/components/shared'
import { useFilterStore } from '@/stores/filterStore'
import { useMembers } from '@/hooks/useMembers'
import { getClients } from '@/lib/data/clients'

export function TaskFilters() {
  const {
    search,
    client_id,
    assigned_to,
    requested_by,
    setSearch,
    setClientId,
    setAssignedTo,
    setRequestedBy,
  } = useFilterStore()

  const { data: members } = useMembers()
  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => getClients(),
  })

  const memberOptions = (members ?? []).map((m) => ({
    label: m.name,
    value: m.id,
  }))

  const clientOptions = (clients ?? []).map((c) => ({
    label: c.name,
    value: c.id,
  }))

  return (
    <FilterBar
      searchValue={search ?? ''}
      onSearchChange={setSearch}
      filters={[
        {
          label: 'クライアント: すべて',
          value: client_id ?? '',
          options: clientOptions,
          onChange: (v) => setClientId(v || undefined),
        },
        {
          label: '担当: すべて',
          value: assigned_to ?? '',
          options: memberOptions,
          onChange: (v) => setAssignedTo(v || undefined),
        },
        {
          label: '依頼者: すべて',
          value: requested_by ?? '',
          options: memberOptions,
          onChange: (v) => setRequestedBy(v || undefined),
        },
      ]}
    />
  )
}
