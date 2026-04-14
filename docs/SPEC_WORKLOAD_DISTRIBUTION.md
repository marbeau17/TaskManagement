# Workload Fair Distribution Specification

## Problem

Currently, the workload system has inconsistencies:
1. **Resource Load Chart** shows total `estimated_hours` per user, not the weekly prorated amount
2. **planned_hours_per_week** is never auto-populated from estimated_hours + lead time
3. Workload KPIs show total estimated hours instead of period-specific weekly hours

## Solution: Fair Weekly Distribution

### Core Formula

```
weekly_hours = estimated_hours / total_weeks

where:
  start = task.start_date || task.created_at
  end = task.confirmed_deadline || task.desired_deadline
  total_days = max(7, ceil((end - start) / ms_per_day))
  total_weeks = max(1, ceil(total_days / 7))
```

Example: 10h task over 3 weeks = 3.3h/week

### Changes Required

#### 1. Auto-populate `planned_hours_per_week`

**When**: A task has `estimated_hours` AND (`start_date` + `confirmed_deadline` or `desired_deadline`)

**Trigger**: On task creation (Step 2) and on field update (estimated_hours, start_date, confirmed_deadline)

**Formula**: `planned_hours_per_week = round(estimated_hours / total_weeks, 1)`

**File**: `src/lib/data/tasks.ts` - updateTask function, createTask function

#### 2. Fix Resource Load Chart data

**Current**: `hours = task.estimated_hours / assigneeCount`
**Fixed**: `hours = getTaskWeeklyHours(task, periodStart) / assigneeCount`

**File**: `src/lib/data/workload.ts` - getResourceLoadData function

#### 3. Fix Workload KPIs

**Current**: `total_estimated_hours` = sum of all estimated_hours
**Fixed**: `total_estimated_hours` = sum of weekly prorated hours for the selected period

**File**: `src/lib/data/workload.ts` - getWorkloadKpi function (already uses summaries which are correct)

#### 4. Fix Resource Load to be period-aware

Pass `weekStart` to getResourceLoadData so it can use `getTaskWeeklyHours` for prorating.

### Data Flow

```
Task Created/Updated
  → estimated_hours + start_date + deadline set
  → Auto-calculate: planned_hours_per_week = estimated_hours / total_weeks
  → All views use getTaskWeeklyHours() for consistent weekly amount
```

### Views Affected

| View | Current | After |
|------|---------|-------|
| Resource Load Chart (bar) | Total estimated_hours | Weekly prorated hours |
| Capacity Matrix | Already prorated | No change |
| KPI Cards | Uses summaries (correct) | No change |
| Member Detail | Uses summaries (correct) | No change |
| Utilization Trend | Already prorated | No change |

### No Breaking Changes

- `getTaskWeeklyHours()` already implements the 3-tier priority system
- Auto-populating `planned_hours_per_week` leverages Tier 2 (existing behavior)
- Tasks without deadlines continue to be excluded from workload
