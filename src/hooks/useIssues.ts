'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { IssueStatus, IssueFilters, CreateIssueData, Issue } from '@/types/issue'
import {
  getIssues,
  getIssueById,
  createIssue,
  updateIssue,
  transitionIssueStatus,
  getIssueComments,
  addIssueComment,
} from '@/lib/data/issues'

export function useIssues(filters?: IssueFilters) {
  return useQuery({
    queryKey: ['issues', filters],
    queryFn: () => getIssues(filters),
  })
}

export function useIssue(id: string | undefined) {
  return useQuery({
    queryKey: ['issues', id],
    queryFn: () => getIssueById(id!),
    enabled: !!id,
  })
}

export function useCreateIssue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateIssueData) => createIssue(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useUpdateIssue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Partial<Omit<Issue, 'id' | 'created_at' | 'updated_at' | 'reporter' | 'assignee' | 'project' | 'task'>>
    }) => updateIssue(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
    },
  })
}

export function useTransitionIssueStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: IssueStatus }) =>
      transitionIssueStatus(id, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
    },
  })
}

export function useIssueComments(issueId: string | undefined) {
  return useQuery({
    queryKey: ['issue-comments', issueId],
    queryFn: () => getIssueComments(issueId!),
    enabled: !!issueId,
  })
}

export function useAddIssueComment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ issueId, body }: { issueId: string; body: string }) =>
      addIssueComment(issueId, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['issue-comments', variables.issueId],
      })
    },
  })
}
