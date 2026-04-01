'use client'

import { useQuery } from '@tanstack/react-query'
import { getWorkloadSummaries, getWorkloadKpi, getResourceLoadData } from '@/lib/data/workload'

export function useWorkloadSummaries(periodStart?: string) {
  return useQuery({
    queryKey: ['workloadSummaries', periodStart ?? 'all'],
    queryFn: () => getWorkloadSummaries(periodStart),
  })
}

export function useWorkloadKpi(periodStart?: string) {
  return useQuery({
    queryKey: ['workload', 'kpi', periodStart ?? 'all'],
    queryFn: () => getWorkloadKpi(periodStart),
  })
}

export function useResourceLoadData(periodStart?: string) {
  return useQuery({
    queryKey: ['workload', 'resourceLoad', periodStart ?? 'all'],
    queryFn: () => getResourceLoadData(periodStart),
  })
}
