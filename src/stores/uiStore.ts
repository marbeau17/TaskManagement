import { create } from 'zustand'

interface UiState {
  sidebarOpen: boolean
  toggleSidebar: () => void

  activePage: string
  setActivePage: (page: string) => void

  period: 'week' | 'last_week' | 'month' | 'last_month' | 'all'
  setPeriod: (p: 'week' | 'last_week' | 'month' | 'last_month' | 'all') => void

  dashboardView: 'creator' | 'client'
  setDashboardView: (v: 'creator' | 'client') => void
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  activePage: 'dashboard',
  setActivePage: (page) => set({ activePage: page }),

  period: 'week',
  setPeriod: (p) => set({ period: p }),

  dashboardView: 'creator',
  setDashboardView: (v) => set({ dashboardView: v }),
}))
