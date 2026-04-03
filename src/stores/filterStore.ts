import { create } from 'zustand'
import type { TaskStatus } from '@/types/database'
import type { TaskFilters } from '@/types/task'

interface FilterState extends TaskFilters {
  setSearch: (s: string) => void
  setClientId: (id?: string) => void
  setProjectId: (id?: string) => void
  setAssignedTo: (id?: string) => void
  setRequestedBy: (id?: string) => void
  setStatus: (s: TaskStatus | 'all') => void
  setPeriod: (p: 'week' | 'month' | 'all') => void
  resetFilters: () => void
}

const initialFilters: TaskFilters = {
  search: '',
  client_id: undefined,
  project_id: undefined,
  assigned_to: undefined,
  requested_by: undefined,
  status: 'in_progress' as TaskStatus | 'all',
  period: 'all',
}

export const useFilterStore = create<FilterState>((set) => ({
  ...initialFilters,

  setSearch: (search) => set({ search }),
  setClientId: (client_id) => set({ client_id }),
  setProjectId: (project_id) => set({ project_id }),
  setAssignedTo: (assigned_to) => set({ assigned_to }),
  setRequestedBy: (requested_by) => set({ requested_by }),
  setStatus: (status) => set({ status }),
  setPeriod: (period) => set({ period }),
  resetFilters: () => set(initialFilters),
}))
