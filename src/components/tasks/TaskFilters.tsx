'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FilterBar } from '@/components/shared'
import { useFilterStore } from '@/stores/filterStore'
import { useI18n } from '@/hooks/useI18n'
import { useMembers } from '@/hooks/useMembers'
import { getClients } from '@/lib/data/clients'

export function TaskFilters() {
  const { t } = useI18n()
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

  // Debounce search input by 300ms
  const [searchInput, setSearchInput] = useState(search ?? '')

  // Keep local input in sync if store search is reset externally
  useEffect(() => {
    setSearchInput(search ?? '')
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput, setSearch])

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
      searchValue={searchInput}
      onSearchChange={setSearchInput}
      filters={[
        {
          label: t('tasks.filter.client'),
          value: client_id ?? '',
          options: clientOptions,
          onChange: (v) => setClientId(v || undefined),
        },
        {
          label: t('tasks.filter.assignee'),
          value: assigned_to ?? '',
          options: memberOptions,
          onChange: (v) => setAssignedTo(v || undefined),
        },
        {
          label: t('tasks.filter.requester'),
          value: requested_by ?? '',
          options: memberOptions,
          onChange: (v) => setRequestedBy(v || undefined),
        },
      ]}
    />
  )
}
