'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  CrmCompany, CrmContact, CrmLead, CrmDeal, CrmActivity,
  CrmCompanyFilters, CrmContactFilters, CrmLeadFilters, CrmDealFilters,
  CrmDashboardData,
} from '@/types/crm'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  return res.json()
}

async function mutateJson<T>(url: string, method: string, body?: any): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${method} failed: ${res.status}`)
  return res.json()
}

function buildQuery(base: string, filters: Record<string, any>): string {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
  }
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

export function useCrmCompanies(filters?: CrmCompanyFilters) {
  return useQuery({
    queryKey: ['crm', 'companies', filters],
    queryFn: () => fetchJson<{ data: CrmCompany[]; total: number }>(
      buildQuery('/api/crm/companies', filters ?? {})
    ),
  })
}

export function useCreateCrmCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<CrmCompany>) => mutateJson<CrmCompany>('/api/crm/companies', 'POST', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm', 'companies'] }) },
  })
}

export function useUpdateCrmCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CrmCompany> }) =>
      mutateJson<CrmCompany>(`/api/crm/companies/${id}`, 'PATCH', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm', 'companies'] }) },
  })
}

export function useDeleteCrmCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => mutateJson<void>(`/api/crm/companies/${id}`, 'DELETE'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm', 'companies'] }) },
  })
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export function useCrmContacts(filters?: CrmContactFilters) {
  return useQuery({
    queryKey: ['crm', 'contacts', filters],
    queryFn: () => fetchJson<{ data: CrmContact[]; total: number }>(
      buildQuery('/api/crm/contacts', filters ?? {})
    ),
  })
}

export function useCreateCrmContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<CrmContact>) => mutateJson<CrmContact>('/api/crm/contacts', 'POST', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm', 'contacts'] }) },
  })
}

export function useUpdateCrmContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CrmContact> }) =>
      mutateJson<CrmContact>(`/api/crm/contacts/${id}`, 'PATCH', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm', 'contacts'] }) },
  })
}

export function useDeleteCrmContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => mutateJson<void>(`/api/crm/contacts/${id}`, 'DELETE'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm', 'contacts'] }) },
  })
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export function useCrmLeads(filters?: CrmLeadFilters) {
  return useQuery({
    queryKey: ['crm', 'leads', filters],
    queryFn: () => fetchJson<{ data: CrmLead[]; total: number }>(
      buildQuery('/api/crm/leads', filters ?? {})
    ),
  })
}

export function useCreateCrmLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<CrmLead>) => mutateJson<CrmLead>('/api/crm/leads', 'POST', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm', 'leads'] }) },
  })
}

export function useUpdateCrmLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CrmLead> }) =>
      mutateJson<CrmLead>(`/api/crm/leads/${id}`, 'PATCH', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm', 'leads'] }) },
  })
}

export function useConvertLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { dealTitle: string; stage?: string; amount?: number; owner_id?: string; sales_contribution?: number } }) =>
      mutateJson<{ deal: CrmDeal; lead: CrmLead }>(`/api/crm/leads/${id}/convert`, 'POST', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm', 'leads'] })
      qc.invalidateQueries({ queryKey: ['crm', 'deals'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Deals
// ---------------------------------------------------------------------------

export function useCrmDeals(filters?: CrmDealFilters) {
  return useQuery({
    queryKey: ['crm', 'deals', filters],
    queryFn: () => fetchJson<{ data: CrmDeal[]; total: number }>(
      buildQuery('/api/crm/deals', filters ?? {})
    ),
  })
}

export function useCreateCrmDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<CrmDeal>) => mutateJson<CrmDeal>('/api/crm/deals', 'POST', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm', 'deals'] }) },
  })
}

export function useUpdateCrmDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CrmDeal> }) =>
      mutateJson<CrmDeal>(`/api/crm/deals/${id}`, 'PATCH', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm', 'deals'] }) },
  })
}

export function useDeleteCrmDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => mutateJson<void>(`/api/crm/deals/${id}`, 'DELETE'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm', 'deals'] }) },
  })
}

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

export function useCrmActivities(entityType?: string, entityId?: string) {
  return useQuery({
    queryKey: ['crm', 'activities', entityType, entityId],
    queryFn: () => fetchJson<{ data: CrmActivity[]; total: number }>(
      buildQuery('/api/crm/activities', { entity_type: entityType, entity_id: entityId })
    ),
    enabled: !!entityType && !!entityId,
  })
}

export function useCreateCrmActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<CrmActivity>) => mutateJson<CrmActivity>('/api/crm/activities', 'POST', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm', 'activities'] }) },
  })
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export function useCrmDashboard() {
  return useQuery({
    queryKey: ['crm', 'dashboard'],
    queryFn: () => fetchJson<CrmDashboardData>('/api/crm/deals/summary'),
    staleTime: 5 * 60 * 1000,
  })
}

// ---------------------------------------------------------------------------
// Push to Pipeline
// ---------------------------------------------------------------------------

export function usePushToPipeline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dealId: string) =>
      mutateJson<{ success: boolean; pipeline_id: string }>(`/api/crm/deals/${dealId}/push-to-pipeline`, 'POST'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm', 'deals'] })
    },
  })
}
