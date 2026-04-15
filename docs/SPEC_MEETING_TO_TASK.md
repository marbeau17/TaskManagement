# Calendar Meeting → Task Auto-Generation Specification

## Overview

Accepted calendar meetings (from MS365) within the next 2 weeks are
automatically created as tasks for the meeting attendee. When the
meeting time passes, the corresponding task is auto-completed with
actual hours = meeting duration and progress = 100%.

## Trigger

During MS365 sync (`POST /api/ms365/sync`), which runs:
- On MyPage load
- Every 2 minutes while MyPage is open
- On window focus

## Rules

### Meeting → Task Creation

**Include** meetings where:
- `response_status` ∈ ('accepted', 'organizer')
- `show_as` ≠ 'free'
- `is_cancelled` = false
- `end` is within now + 14 days
- The meeting end has NOT passed yet (future meetings only for creation)

**Skip** if:
- A task with `template_data.ms_event_id = event.id` already exists
- Meeting is cancelled or declined

### Task Fields (on creation)
| Field | Value |
|-------|-------|
| `title` | meeting subject (or "(会議)" if empty) |
| `client_id` | Special "内部会議" client (auto-created if missing) |
| `requested_by` | user_id (same as attendee) |
| `assigned_to` | user_id |
| `start_date` | meeting start date (YYYY-MM-DD, JST) |
| `confirmed_deadline` | meeting end date (YYYY-MM-DD, JST) |
| `estimated_hours` | `duration_minutes / 60` rounded to 1 decimal |
| `planned_hours_per_week` | same as estimated_hours (since ≤ 1 week) |
| `status` | 'todo' |
| `is_draft` | false |
| `priority` | 3 |
| `template_data` | `{ ms_event_id: event.id, source: 'calendar' }` |

### Past Meeting → Auto-Completion

During each sync, for every task with `template_data.source = 'calendar'`:
- Fetch the linked meeting via `ms_event_id`
- If `meeting.end_at < now` AND task.status ≠ 'done':
  - `status` = 'done'
  - `progress` = 100
  - `actual_hours` = meeting duration hours
  - Append to weekly_actual

### Cancelled Meetings

If a linked meeting becomes `is_cancelled = true`:
- Set task `status` = 'dropped'

## Implementation

### 1. Auto-create internal meeting client

In sync route, ensure a client with name `内部会議` exists before
creating meeting-tasks. Use it as `client_id`.

### 2. Extend MS365 sync handler

After upserting calendar_events, loop through the events again:
- For each accepted future meeting, check if a task exists linked
  via `template_data.ms_event_id`
- If not, create it

For all existing calendar-source tasks:
- If linked meeting has passed, mark done + populate weekly_actual
- If linked meeting is cancelled, mark dropped

### 3. Implementation file locations

- `src/app/api/ms365/sync/route.ts` — main sync route (add meeting-to-task logic after event upsert)

## Notes

- The 2-week window keeps the task list from being flooded with
  far-future meetings that may change
- Self-organized meetings count (response_status = 'organizer')
- Uses a dedicated "内部会議" client to clearly separate from real
  client tasks in the task list
