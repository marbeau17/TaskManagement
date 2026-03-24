import { create } from 'zustand'
import type { User } from '@/types/database'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  setUser: (u: User | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (u) => set({ user: u, isAuthenticated: u !== null }),
}))
