# Email Notification Specification

## Current State

| Trigger | Recipient | Status |
|---------|-----------|--------|
| Task assigned | Assignee | Implemented |
| Task reassigned | New assignee | Implemented |
| Overdue task (daily cron) | Assignee + manager | Implemented |
| Comment mention | Mentioned user | Implemented |
| Issue resolved | Reporter | Implemented |
| **Task completed** | **Requester** | **MISSING** |

## New Feature: Task Completion Notification

### Trigger
When a task's status changes to `done` (via `updateTaskProgress()` or `updateTask()`)

### Recipient
The task requester (`tasks.requested_by` -> `users.email`)

### Skip Conditions
- Self-completion: requester === person who completed (no self-notification)
- Requester has no email
- Mock mode enabled

### Email Content
- Subject: `[WorkFlow] タスクが完了しました: {taskTitle}`
- Body:
  - Task title
  - Client name
  - Completed by (assignee/director name)
  - Actual hours vs estimated hours
  - Link to task detail page
  - Color scheme: Green header (#22c55e) for completion

### Implementation Plan

1. **Create email template**: `src/lib/email/templates.ts` - add `getCompletionEmailHtml()`
2. **Create API route**: `src/app/api/email/notify-complete/route.ts`
3. **Create service function**: `src/lib/email/task-completion.ts`
4. **Trigger from updateTaskProgress**: `src/lib/data/tasks.ts` - when status becomes 'done'
5. **Trigger from updateTask**: `src/lib/data/tasks.ts` - when status field changes to 'done'

### Existing Assignment Email (Verification)
- Triggered correctly from `createTask()`, `updateTask()`, `assignTask()`
- Skips self-assignment
- Includes: task title, client, deadline, estimated hours, director name, description
- Uses fire-and-forget pattern (doesn't block task operations)
