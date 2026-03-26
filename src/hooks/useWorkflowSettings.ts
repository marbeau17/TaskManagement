'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { WorkflowSettings, WorkflowStatusDef } from '@/types/project'
import {
  getWorkflowSettings,
  updateWorkflowSettings,
  getDefaultStatuses,
} from '@/lib/data/workflow-settings'

// ---------------------------------------------------------------------------
// Query hook
// ---------------------------------------------------------------------------

export function useWorkflowSettings(projectId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-settings', projectId],
    queryFn: () => getWorkflowSettings(projectId!),
    enabled: !!projectId,
  })
}

// ---------------------------------------------------------------------------
// Mutation hook
// ---------------------------------------------------------------------------

export function useUpdateWorkflowSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      projectId,
      statuses,
      transitions,
    }: {
      projectId: string
      statuses: WorkflowStatusDef[]
      transitions?: WorkflowSettings['transitions']
    }) => updateWorkflowSettings(projectId, { statuses, transitions }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['workflow-settings', variables.projectId],
      })
    },
  })
}

// Re-export for convenience
export { getDefaultStatuses }
