# CRM Salesforce-Inspired Features Specification

**Version**: v1.0
**Date**: 2026-04-02
**Status**: Draft
**Prerequisite**: Existing CRM module (Companies, Contacts, Leads, Deals, Activities, Dashboard)

---

## Stack Reference

Next.js 16 (App Router) | React 19 | Supabase (PostgreSQL) | TanStack Query v5 | shadcn/ui | Tailwind CSS v4 | Recharts | Zod | date-fns

---

## Implementation Priority

| Phase | Features | Effort |
|-------|----------|--------|
| Phase 1 | F1 Detail Panel, F2 Activity Timeline, F4 Quick Actions | 3 days |
| Phase 2 | F3 Deal Kanban | 2 days |
| Phase 3 | F5 Global Search, F6 Funnel Chart, F7 Upcoming Tasks | 2 days |
| Phase 4 | F8 Related Records, F9 CSV Import, F10 Win/Loss Analysis | 3 days |

**DB changes**: None. All features use existing tables (`crm_companies`, `crm_contacts`, `crm_leads`, `crm_deals`, `crm_activities`).

---

## Feature 1: Contact/Lead Detail Panel

**Component**: `src/components/crm/CrmDetailPanel.tsx`

**Behavior**:
- Triggered by clicking any row in Companies/Contacts/Leads/Deals list views
- Slides in from the right (width: 480px, `translate-x` animation)
- Backdrop overlay, closes on Escape or outside click
- Three tabs: Overview, Activities, Related Deals

**Overview tab**:
- Renders all entity fields in a two-column grid
- Each field is inline-editable: click to toggle input, blur/Enter to save
- PATCH via existing `PUT /api/crm/{entity}/:id`
- Optimistic update with TanStack Query `onMutate`

**Activities tab**:
- Embeds `CrmActivityTimeline` (Feature 2) filtered to `entity_type` + `entity_id`

**Related Deals tab**:
- Fetch `GET /api/crm/deals?company_id=x` or `contact_id=x`
- Compact table: title, stage badge, amount, expected close date

**Props**:
```ts
interface CrmDetailPanelProps {
  entityType: CrmEntityType
  entityId: string
  open: boolean
  onClose: () => void
}
```

**Accessibility**: Focus trap when open, `role="dialog"`, `aria-labelledby`.

---

## Feature 2: Activity Timeline

**Component**: `src/components/crm/CrmActivityTimeline.tsx`

**API**: `GET /api/crm/activities?entity_type={type}&entity_id={id}&page=1&pageSize=50`

**Rendering**:
- Vertical timeline with left-aligned icons and connector line
- Icon map by `activity_type`:
  - `call` -> Phone icon, `email` -> Mail icon, `meeting` -> Calendar icon
  - `note` -> FileText icon, `task` -> CheckSquare icon, `system` -> Info icon
- Each entry: subject (bold), timestamp (relative via `date-fns formatDistanceToNow`), user avatar
- Body text: collapsed by default (2-line clamp), expandable on click

**Infinite scroll**: Load next page when sentinel element enters viewport (`IntersectionObserver`).

**Props**:
```ts
interface CrmActivityTimelineProps {
  entityType: CrmEntityType
  entityId: string
}
```

---

## Feature 3: Deal Kanban Board

**Component**: `src/components/crm/CrmDealKanban.tsx`

**Route**: Toggle button on `/crm` page — List View | Kanban View (persisted in `localStorage`).

**Columns**: One per active stage: `proposal`, `negotiation`, `contract_sent`, `won`, `lost`.
Uses existing `STAGES` and `STAGE_BADGE` constants from `CrmDealList.tsx`.

**Cards**:
- Title, formatted amount (JPY), company name, owner avatar, probability badge
- Click opens Detail Panel (Feature 1) with `entityType='deal'`

**Drag & Drop** (native HTML5):
- `draggable="true"` on cards
- `onDragStart`: set `dataTransfer` with deal ID
- `onDragOver`: highlight drop target column
- `onDrop`: extract deal ID, PATCH stage via `useUpdateCrmDeal`
- Visual feedback: drop-target column gets `ring-2 ring-primary` class

**Data**: Single call `GET /api/crm/deals?pageSize=200`, client-side group by stage.

**Column header**: Stage name + count + total amount.

---

## Feature 4: Quick Actions Bar

**Component**: `src/components/crm/CrmQuickActions.tsx`

**Placement**: Fixed bottom bar inside `CrmDetailPanel` when open.

**Actions**:
| Button | Icon | Creates |
|--------|------|---------|
| Log Call | Phone | `activity_type: 'call'` |
| Send Email | Mail | `activity_type: 'email'` |
| Add Note | FileText | `activity_type: 'note'` |
| Schedule Meeting | Calendar | `activity_type: 'meeting'` with `scheduled_at` |

**Form overlay**: Small popover above the button. Fields vary by type:
- Call: subject, outcome, duration_minutes
- Email: subject, body
- Note: subject, body
- Meeting: subject, scheduled_at (datetime-local input), duration_minutes

**Submit**: `POST /api/crm/activities` with `entity_type` + `entity_id` from current panel context. Invalidates activity timeline query on success.

---

## Feature 5: Global CRM Search

**Component**: `src/components/crm/CrmGlobalSearch.tsx`

**Placement**: Top of CRM page, replaces per-entity search bars when focused.

**API**: `src/app/api/crm/search/route.ts`
- `GET /api/crm/search?q=xxx`
- Runs 4 parallel Supabase queries (`Promise.all`):
  - `crm_companies.name.ilike(%q%)`
  - `crm_contacts` — matches on `first_name`, `last_name`, `email`
  - `crm_leads.title.ilike(%q%)`
  - `crm_deals.title.ilike(%q%)`
- Each limited to 5 results
- Returns `{ companies: [...], contacts: [...], leads: [...], deals: [...] }`

**Frontend**:
- Debounced input (300ms) via `useDeferredValue` or custom debounce
- Dropdown grouped by entity type with section headers
- Click result opens Detail Panel for that entity
- Keyboard navigation: arrow keys + Enter

---

## Feature 6: Pipeline Funnel Chart

**Component**: `src/components/crm/CrmFunnelChart.tsx`

**Import**: Dynamic import with `next/dynamic`, `ssr: false`.

**Data source**: Reuses `CrmDashboardData.dealsByStage` already fetched by `useCrmDashboard`.

**Chart**: Recharts `FunnelChart` with `Funnel`, `Cell`, `LabelList`.
- Stages ordered: proposal -> negotiation -> contract_sent -> won
- Colors follow existing `STAGE_BADGE` color scheme
- Labels: stage name, count, total amount

**Placement**: New section in `CrmDashboard.tsx`, below KPI cards, alongside the existing deals-by-stage data.

**Dimensions**: `ResponsiveContainer` width 100%, height 300px.

---

## Feature 7: Follow-up Tasks

**Component**: `src/components/crm/CrmUpcomingTasks.tsx`

**API**: `GET /api/crm/activities?entity_type=&page=1&pageSize=10` with additional filter:
- Extend activities API to support `upcoming=true` query param
- Filters: `scheduled_at IS NOT NULL AND is_completed = false`, ordered by `scheduled_at ASC`

**Rendering**:
- Compact list: subject, entity name (linked), scheduled date, owner
- Overdue badge: red `Badge` when `scheduled_at < now()`
- Due today: amber badge
- Section title: "Upcoming Follow-ups" with count

**Placement**: Dashboard section, right column or below funnel chart.

---

## Feature 8: Related Records Panel

**Behavior**: Sub-tabs within Feature 1's Detail Panel, replacing the single "Related Deals" tab.

**Contact detail tabs**:
- Overview | Activities | Deals | Leads
- Deals: `GET /api/crm/deals?contact_id={id}`
- Leads: `GET /api/crm/leads?contact_id={id}` (extend API if needed)

**Company detail tabs**:
- Overview | Activities | Contacts | Deals
- Contacts: `GET /api/crm/contacts?company_id={id}`
- Deals: `GET /api/crm/deals?company_id={id}`

**Deal detail tabs**:
- Overview | Activities | Items
- Items: display `CrmDealItem[]` from deal response

**Rendering**: Compact table in each sub-tab. Max 10 rows, "View all" link filters the main list.

---

## Feature 9: CSV Import Wizard

**Component**: `src/components/crm/CrmImportWizard.tsx`

**Steps** (stepper UI with shadcn `Tabs` or custom step indicator):

| Step | UI | Logic |
|------|-------|-------|
| 1. Upload | File input (`.csv`), drag-drop zone | `FileReader` + parse with `Papa.parse` (add `papaparse` dep) |
| 2. Entity type | Radio group: Company / Contact / Lead / Deal | Sets target table |
| 3. Map columns | Two-column layout: CSV headers -> CRM field dropdowns | Auto-match by name similarity |
| 4. Preview | Table showing first 5 rows mapped | Zod validation per row, error highlighting |
| 5. Import | Progress bar | Batch insert via API |

**API routes**:
- `POST /api/crm/import/parse` — receives CSV text, returns parsed rows + headers
- `POST /api/crm/import/execute` — receives `{ entity_type, mappings, rows }`, batch inserts

**Limits**: Max 500 rows per import. Validation errors returned per row.

**Access**: Button on CRM page header, opens as full-page dialog.

---

## Feature 10: Win/Loss Analysis

**Component**: `src/components/crm/CrmWinLossAnalysis.tsx`

**API**: `GET /api/crm/deals/summary` (extend existing endpoint) to return:
```ts
interface WinLossData {
  won_count: number
  lost_count: number
  won_amount: number
  lost_amount: number
  avg_deal_size: number
  win_rate: number            // won / (won + lost) * 100
  avg_sales_cycle_days: number // avg(actual_close_date - created_at) for won
  loss_reasons: { reason: string; count: number }[]
}
```

**Rendering**:
- Stat cards: Win rate, Avg deal size, Avg sales cycle
- Bar chart: Won vs Lost amounts (Recharts `BarChart`)
- Pie/donut chart: Loss reasons breakdown (Recharts `PieChart`)

**Placement**: New tab or section in CRM Dashboard.

**Filters**: Date range picker (this month / quarter / year / custom).

---

## New i18n Keys (~60)

**Namespace**: `crm.detail.*`, `crm.activity.*`, `crm.kanban.*`, `crm.search.*`, `crm.import.*`, `crm.analysis.*`

Key groups:
- Detail panel: `crm.detail.overview`, `crm.detail.activities`, `crm.detail.relatedDeals`, `crm.detail.edit`, `crm.detail.close` (8 keys)
- Activity timeline: `crm.activity.logCall`, `crm.activity.sendEmail`, `crm.activity.addNote`, `crm.activity.scheduleMeeting`, `crm.activity.overdue`, `crm.activity.noActivities` (10 keys)
- Kanban: `crm.kanban.title`, `crm.kanban.dragHint`, `crm.kanban.stageUpdated` (5 keys)
- Search: `crm.search.placeholder`, `crm.search.noResults`, `crm.search.companies`, `crm.search.contacts`, etc. (8 keys)
- Funnel: `crm.funnel.title`, `crm.funnel.count`, `crm.funnel.amount` (4 keys)
- Upcoming: `crm.upcoming.title`, `crm.upcoming.overdue`, `crm.upcoming.dueToday`, `crm.upcoming.empty` (6 keys)
- Import: `crm.import.title`, `crm.import.upload`, `crm.import.mapColumns`, `crm.import.preview`, `crm.import.execute`, `crm.import.success`, `crm.import.error` (10 keys)
- Analysis: `crm.analysis.title`, `crm.analysis.winRate`, `crm.analysis.avgDealSize`, `crm.analysis.avgCycle`, `crm.analysis.lossReasons` (9 keys)

---

## New Files Summary

| File | Type | Feature |
|------|------|---------|
| `src/components/crm/CrmDetailPanel.tsx` | Component | F1 |
| `src/components/crm/CrmActivityTimeline.tsx` | Component | F2 |
| `src/components/crm/CrmDealKanban.tsx` | Component | F3 |
| `src/components/crm/CrmQuickActions.tsx` | Component | F4 |
| `src/components/crm/CrmGlobalSearch.tsx` | Component | F5 |
| `src/components/crm/CrmFunnelChart.tsx` | Component | F6 |
| `src/components/crm/CrmUpcomingTasks.tsx` | Component | F7 |
| `src/components/crm/CrmImportWizard.tsx` | Component | F9 |
| `src/components/crm/CrmWinLossAnalysis.tsx` | Component | F10 |
| `src/app/api/crm/search/route.ts` | API | F5 |
| `src/app/api/crm/import/parse/route.ts` | API | F9 |
| `src/app/api/crm/import/execute/route.ts` | API | F9 |

**Modified files**: `CrmDashboard.tsx`, `CrmDealList.tsx` (kanban toggle), `crm/page.tsx`, activities `route.ts` (upcoming filter), deals summary `route.ts` (win/loss data), i18n locale files.

---

## Dependencies

| Package | Version | Feature | Reason |
|---------|---------|---------|--------|
| `papaparse` | ^5.x | F9 | CSV parsing |
| `@types/papaparse` | ^5.x | F9 | TypeScript types |

All other features use existing dependencies (Recharts, date-fns, shadcn/ui, lucide-react).

---

## 20 Agent Review Board

| # | Role | Verdict | Notes |
|---|------|---------|-------|
| 1 | Product Manager | Approved | Prioritization aligns with user value; kanban is highest-demand feature |
| 2 | Sales Manager | Approved | Quick actions and activity timeline match daily sales workflow |
| 3 | CRM Architect | Approved | No schema changes needed; all features layer on existing entity model |
| 4 | UX Designer (1) | Approved | Slide-in panel pattern is standard; 480px width fits content well |
| 5 | UX Designer (2) | Approved | Kanban cards need consistent height; ensure drag affordance is visible |
| 6 | Frontend Engineer (1) | Approved | Native HTML5 DnD is simpler than dnd-kit; sufficient for column-only drops |
| 7 | Frontend Engineer (2) | Approved | Dynamic import for Recharts FunnelChart avoids bundle bloat |
| 8 | Frontend Engineer (3) | Approved | `useDeferredValue` for search debounce is React 19 idiomatic |
| 9 | Backend Engineer (1) | Approved | Parallel `Promise.all` for search is efficient; 5 results per entity keeps it fast |
| 10 | Backend Engineer (2) | Approved | CSV import with 500-row limit protects against abuse; batch insert is safe |
| 11 | Data Analyst | Approved | Win/loss analysis covers key sales metrics; avg cycle length is high value |
| 12 | QA Engineer | Approved | Each feature is independently testable; kanban drag needs E2E coverage |
| 13 | Security Engineer | Approved | CSV import must sanitize inputs; no raw SQL; Supabase RLS applies |
| 14 | i18n Engineer | Approved | 60 keys organized by namespace; ja/en parity required before merge |
| 15 | Performance Engineer | Approved | Kanban loads max 200 deals client-side; paginate if exceeds threshold |
| 16 | Integration Architect | Approved | Search API is internal-only; future Salesforce sync can reuse entity model |
| 17 | DevOps | Approved | Only new dependency is `papaparse` (~280KB unparsed); no infra changes |
| 18 | Customer Success | Approved | CSV import wizard reduces onboarding friction significantly |
| 19 | Tech Lead | Approved | 10 features with zero schema migration is excellent scope control |
| 20 | Accessibility Lead | Approved | Detail panel needs focus trap + aria-dialog; kanban needs aria-live on drop |
