'use client'

import { useQuery } from '@tanstack/react-query'
import { getWorkloadSummaries, getWorkloadKpi } from '@/lib/data/workload'

export function useWorkloadSummaries() {
  return useQuery({
    queryKey: ['workload', 'summaries'],
    queryFn: () => getWorkloadSummaries(),
  })
}

export function useWorkloadKpi() {
  return useQuery({
    queryKey: ['workload', 'kpi'],
    queryFn: () => getWorkloadKpi(),
  })
}
