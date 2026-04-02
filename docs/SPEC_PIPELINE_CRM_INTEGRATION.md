# Pipeline-CRM Integration Specification

**Version:** 1.0
**Date:** 2026-04-02
**Status:** Draft

---

## 1. Overview

Integrate the existing Pipeline feature (`pipeline_opportunities`) with the new CRM module (`crm_deals`) to provide bidirectional navigation, data synchronization, and unified visibility across sales pipeline and CRM workflows.

## 2. Current State

### Pipeline (`pipeline_opportunities`)
| Field | Type | Notes |
|---|---|---|
| seq_id | serial | PK |
| client_name | text | Free-text company name |
| referral_source | text | |
| opportunity_name | text | |
| sub_opportunity | text | |
| status | enum | Firm / Likely / Win / Lost |
| probability | numeric | |
| cm_percent | numeric | |
| pm_user_id | uuid | FK to users |
| consultant1_user_id | uuid | FK to users |
| consultant2_user_id | uuid | FK to users |
| client_type | enum | Customer / Prospect |

Monthly revenue stored in `pipeline_monthly_data` (one row per opportunity per month).

### CRM (`crm_deals`)
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| title | text | |
| company_id | uuid | FK to crm_companies |
| contact_id | uuid | FK to crm_contacts |
| lead_id | uuid | FK to crm_leads |
| pipeline_opportunity_id | integer | FK to pipeline_opportunities (exists) |
| project_id | uuid | |
| stage | text | |
| amount | numeric | |
| probability | numeric | |
| expected_close_date | date | |
| owner_id | uuid | FK to users |

Related tables: `crm_companies`, `crm_contacts`, `crm_leads`, `crm_activities`.

## 3. Integration Points

### 3.1 Database Changes

```sql
-- Add reverse FK on pipeline_opportunities
ALTER TABLE pipeline_opportunities
  ADD COLUMN crm_deal_id uuid REFERENCES crm_deals(id) ON DELETE SET NULL;

CREATE INDEX idx_pipeline_opp_crm_deal ON pipeline_opportunities(crm_deal_id);
```

The existing `crm_deals.pipeline_opportunity_id` column already provides the forward link. Adding `crm_deal_id` on `pipeline_opportunities` enables fast lookups from either side. Both columns are nullable; only one needs to be set (kept in sync by triggers).

### 3.2 Company Mapping

`pipeline_opportunities.client_name` is free-text. Linking to CRM requires resolving it to `crm_companies.id`.

- On link action: fuzzy-match `client_name` against `crm_companies.name` and present top candidates.
- If no match: offer to create a new `crm_companies` record.
- Store resolved mapping: `crm_deals.company_id` serves as the canonical link.

### 3.3 Auto-sync Rules

| Trigger | Action |
|---|---|
| Pipeline status -> "Win" | If linked CRM deal exists, set `crm_deals.stage = 'won'` and update `amount` from pipeline monthly totals. If no linked deal, prompt user to create one. |
| Pipeline status -> "Lost" | If linked CRM deal exists, set `crm_deals.stage = 'lost'`. |
| CRM deal stage -> "won" | If linked pipeline opp exists, set `pipeline_opportunities.status = 'Win'`. |
| CRM deal stage -> "lost" | If linked pipeline opp exists, set `pipeline_opportunities.status = 'Lost'`. |
| Pipeline probability changes | Sync to `crm_deals.probability` if linked. |

Sync is implemented via Supabase database functions (triggers) to keep it transactional. A `sync_log` table records each sync event for auditability.

### 3.4 API Changes

#### `POST /api/pipeline/[id]/link-crm`

Link a pipeline opportunity to a CRM deal.

```json
// Request
{ "crm_deal_id": "uuid" }

// Response 200
{ "pipeline_opportunity_id": 123, "crm_deal_id": "uuid", "linked_at": "ISO8601" }
```

If `crm_deal_id` is null, unlinks the current deal.

#### `POST /api/pipeline/[id]/create-crm-deal`

Auto-create a CRM deal from pipeline data.

```json
// Response 201
{ "crm_deal": { "id": "uuid", "title": "...", "company_id": "uuid", ... } }
```

Maps: `opportunity_name` -> `title`, `client_name` -> company lookup, `probability` -> `probability`, PM -> `owner_id`.

#### `GET /api/crm/deals/[id]`

Existing endpoint. Add `include=pipeline` query param to embed pipeline data:

```json
{
  "id": "uuid",
  "title": "...",
  "pipeline_opportunity": {
    "seq_id": 123,
    "status": "Firm",
    "monthly_data": [ { "month": "2026-04", "revenue": 500000 }, ... ]
  }
}
```

### 3.5 UI Changes

#### Pipeline Table

- Add "CRM" column (position: after status column).
- If linked: show link icon (clickable, navigates to `/crm/deals/[id]`).
- If not linked: show dim unlink icon (clickable, opens Link Dialog).
- Tooltip on hover shows CRM deal title and stage.

#### CRM Deal Detail

- Add "Pipeline Revenue" section below deal summary.
- Shows monthly revenue bar chart (from `pipeline_monthly_data`) when linked.
- Shows opportunity status, PM, consultants.
- "View in Pipeline" button navigates to pipeline view with row highlighted.

#### Link Dialog (shared component)

- Search input with autocomplete.
- When opened from Pipeline: searches CRM deals by title/company.
- When opened from CRM: searches pipeline opportunities by name/client.
- "Create New" button to auto-create the counterpart record.
- Confirmation step before linking.

## 4. Security

- RLS policies: users can only link records they have access to in both tables.
- Link/unlink actions require `pipeline.write` AND `crm.write` permissions.
- Sync log is append-only; no user can delete sync records.
- API endpoints validate FK existence before linking.

## 5. Performance

- `crm_deal_id` index on `pipeline_opportunities` keeps join cost O(1).
- Pipeline table query adds a LEFT JOIN to `crm_deals`; select only `id`, `title`, `stage` to minimize payload.
- Monthly data for CRM detail view: fetched on-demand (not preloaded in deal list).
- Company fuzzy-match uses `pg_trgm` extension with GIN index on `crm_companies.name`.

## 6. Internationalization

- All new UI strings added to `ja` and `en` locale files.
- Key additions: `pipeline.crm_column`, `pipeline.link_dialog_title`, `crm.pipeline_section_title`, `crm.view_in_pipeline`, sync status messages.

## 7. Testing

| Scope | Cases |
|---|---|
| Unit | Link/unlink API, company fuzzy-match, sync trigger logic |
| Integration | Pipeline Win -> CRM deal stage update, CRM won -> Pipeline status update |
| E2E | Link dialog flow, bidirectional navigation, auto-create deal |
| Edge cases | Link to already-linked deal, unlink then re-link, delete one side |
| Performance | Pipeline table load with 500+ rows and CRM joins |

## 8. Migration & Rollout

1. Deploy DB migration (add column + index + triggers).
2. Backfill: run script to match existing `crm_deals.pipeline_opportunity_id` values to populate `pipeline_opportunities.crm_deal_id`.
3. Deploy API changes behind feature flag `PIPELINE_CRM_INTEGRATION`.
4. Deploy UI changes (gated by same flag).
5. Enable flag for internal users, then all users after 1-week soak.

## 9. Agent Review

| # | Agent | Verdict | Key Concern |
|---|---|---|---|
| 1 | Product Owner | Approve | Scope is minimal; delivers core link/sync value |
| 2 | Sales Manager | Approve | Win/Lost auto-sync eliminates manual CRM updates |
| 3 | CRM Manager | Approve | Pipeline revenue visibility fills data gap |
| 4 | Pipeline Manager | Approve | CRM column is non-intrusive; link is optional |
| 5 | Frontend Engineer 1 | Approve | Link Dialog is a shared component; reusable pattern |
| 6 | Frontend Engineer 2 | Approve | Pipeline table change is one column addition |
| 7 | Backend Engineer 1 | Approve | Trigger-based sync keeps API layer thin |
| 8 | Backend Engineer 2 | Conditional | Ensure sync triggers handle recursive updates (guard needed) |
| 9 | Data Architect | Approve | Dual FK is denormalized but justified for query performance |
| 10 | UX Designer | Approve | Link flow is progressive; no forced actions |
| 11 | Security Engineer | Approve | RLS + dual permission check covers access control |
| 12 | QA Engineer | Conditional | Need explicit test for concurrent sync (race condition) |
| 13 | i18n Engineer | Approve | Limited new strings; standard pattern |
| 14 | Integration Architect | Approve | FK-based link is simpler and safer than event-based sync |
| 15 | DevOps | Approve | Feature flag rollout is low-risk |
| 16 | Performance Engineer | Approve | LEFT JOIN with indexed FK is negligible cost |
| 17 | Customer Success | Approve | Reduces context-switching between Pipeline and CRM views |
| 18 | Data Analyst | Approve | Linked data enables cross-module reporting |
| 19 | Tech Lead | Approve | Spec is minimal; no over-engineering |
| 20 | Compatibility Engineer | Approve | No breaking changes; new column is nullable, API is additive |

**Conditional items to resolve before implementation:**
- BE2: Add recursion guard on sync triggers (`pg_trigger_depth()` check).
- QA: Add concurrent update test with `FOR UPDATE` locking on link operations.
