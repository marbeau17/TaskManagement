'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FilterBar } from '@/components/shared'
import { useFilterStore } from '@/stores/filterStore'
import { useDebounce } from '@/hooks/useDebounce'
import { useI18n } from '@/hooks/useI18n'
import { useMembers } from '@/hooks/useMembers'
import { useProjects } from '@/hooks/useProjects'
import { getClients } from '@/lib/data/clients'

export function TaskFilters() {
  const { t } = useI18n()
  const {
    search,
    client_id,
    project_id,
    assigned_to,
    requested_by,
    setSearch,
    setClientId,
    setProjectId,
    setAssignedTo,
    setRequestedBy,
  } = useFilterStore()

  // Debounce search input by 300ms
  const [searchInput, setSearchInput] = useState(search ?? '')
  const debouncedSearch = useDebounce(searchInput, 300)

  // Keep local input in sync if store search is reset externally
  useEffect(() => {
    setSearchInput(search ?? '')
  }, [search])

  // Push debounced value into the filter store
  useEffect(() => {
    setSearch(debouncedSearch)
  }, [debouncedSearch, setSearch])

  const { data: members } = useMembers()
  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => getClients(),
  })

  // Uses the data-layer hook directly (there is no GET /api/projects route —
  // the previous fetch silently 404'd, leaving the project dropdown empty).
  const { data: projects } = useProjects()

  const memberOptions = (members ?? []).map((m) => ({
    label: m.name,
    value: m.id,
  }))

  const clientOptions = (clients ?? []).map((c) => ({
    label: c.name,
    value: c.id,
  }))

  const projectOptions = (Array.isArray(projects) ? projects : []).map((p: any) => ({
    label: p.name,
    value: p.id,
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
          label: t('tasks.filter.project'),
          value: project_id ?? '',
          options: projectOptions,
          onChange: (v) => setProjectId(v || undefined),
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
