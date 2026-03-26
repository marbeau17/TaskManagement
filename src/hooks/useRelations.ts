'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { RelationType } from '@/types/relation'
import {
  getIssueRelations,
  addIssueRelation,
  removeIssueRelation,
  getTaskDependencies,
  addTaskDependency,
  removeTaskDependency,
} from '@/lib/data/relations'

// ---------------------------------------------------------------------------
// Issue Relations
// ---------------------------------------------------------------------------

export function useIssueRelations(issueId: string | undefined) {
  return useQuery({
    queryKey: ['issue-relations', issueId],
    queryFn: () => getIssueRelations(issueId!),
    enabled: !!issueId,
  })
}

export function useAddIssueRelation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      sourceId,
      targetId,
      type,
    }: {
      sourceId: string
      targetId: string
      type: RelationType
    }) => addIssueRelation(sourceId, targetId, type),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['issue-relations', variables.sourceId] })
      qc.invalidateQueries({ queryKey: ['issue-relations', variables.targetId] })
    },
  })
}

export function useRemoveIssueRelation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, issueId }: { id: string; issueId: string }) =>
      removeIssueRelation(id),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['issue-relations', variables.issueId] })
    },
  })
}

// ---------------------------------------------------------------------------
// Task Dependencies
// ---------------------------------------------------------------------------

export function useTaskDependencies(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task-dependencies', taskId],
    queryFn: () => getTaskDependencies(taskId!),
    enabled: !!taskId,
  })
}

export function useAddTaskDependency() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      sourceId,
      targetId,
      type,
    }: {
      sourceId: string
      targetId: string
      type: RelationType
    }) => addTaskDependency(sourceId, targetId, type),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['task-dependencies', variables.sourceId] })
      qc.invalidateQueries({ queryKey: ['task-dependencies', variables.targetId] })
    },
  })
}

export function useRemoveTaskDependency() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, taskId }: { id: string; taskId: string }) =>
      removeTaskDependency(id),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['task-dependencies', variables.taskId] })
    },
  })
}
