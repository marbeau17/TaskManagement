export type RelationType = 'blocks' | 'is_blocked_by' | 'relates_to' | 'duplicates'

export interface IssueRelation {
  id: string
  source_issue_id: string
  target_issue_id: string
  relation_type: RelationType
  created_by: string | null
  created_at: string
  source_issue?: { id: string; issue_key: string; title: string; status: string }
  target_issue?: { id: string; issue_key: string; title: string; status: string }
}

export interface TaskDependency {
  id: string
  source_task_id: string
  target_task_id: string
  relation_type: RelationType
  created_at: string
  source_task?: { id: string; title: string; status: string }
  target_task?: { id: string; title: string; status: string }
}
