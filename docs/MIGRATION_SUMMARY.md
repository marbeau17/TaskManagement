# TaskList.csv Migration Summary

Source: `docs/TaskList.csv` (SharePoint export, 541 data rows after header, schema line skipped)
Generated: 2026-03-26

---

## 1. Total Task Count by Status

| Status | Count | % |
|---|---|---|
| Completed | 396 | 73.2% |
| Inprogress | 70 | 12.9% |
| Dropped | 40 | 7.4% |
| NotStarted | 10 | 1.8% |
| Not started | 9 | 1.7% |
| Done | 9 | 1.7% |
| (empty) | 7 | 1.3% |
| **Total** | **541** | **100%** |

> Note: "NotStarted" and "Not started" are the same logical status with inconsistent casing (19 combined). "Completed" and "Done" may also represent the same terminal state (405 combined).

---

## 2. Tasks per Owner

### Primary owners (single assignee)

| Owner | Count |
|---|---|
| r.watanabe@meetsc.co.jp | 179 |
| y.ito@meetsc.co.jp | 126 |
| m.takimiya@meetsc.co.jp | 86 |
| o.yasuda@meetsc.co.jp | 69 |
| y.okutsu@meetsc.co.jp | 4 |
| h.ota@meetsc.co.jp | 2 |
| (empty) | 8 |

### Multi-assignee tasks (semicolon-delimited)

| Owners | Count |
|---|---|
| o.yasuda; r.watanabe | 11 |
| o.yasuda; y.ito | 8 |
| r.watanabe; y.ito | 7 |
| r.watanabe; m.takimiya | 7 |
| o.yasuda; m.takimiya | 5 |
| o.yasuda; r.watanabe; y.ito; m.takimiya | 4 |
| y.ito; m.takimiya | 3 |
| m.takimiya; h.ota | 3 |
| o.yasuda; y.ito; m.takimiya | 3 |
| Other multi-owner combinations | 8 |

**6 unique individuals** identified across the dataset. 8 tasks have no owner assigned.

---

## 3. Tasks per Client

| Client | Count |
|---|---|
| (empty / internal) | 256 |
| Idemitsu Kosan (all variations) | 141 |
| SPINDLE (all variations) | 39 |
| Takei Shouten (all variations) | 31 |
| Pleb (all variations) | 28 |
| Hokkaido Nyugyo (all variations) | 6 |
| Interg (all variations) | 4 |
| A&A Material (all variations) | 3 |
| Majorcraft (all variations) | 5 |
| EN | 3 |
| Gordon Miller (all variations) | 2 |
| Aisin | 2 |
| Seiko Sangyo | 2 |
| Others (1 each) | 19 |

47.3% of tasks (256) have no client assigned, indicating internal/operational tasks.

---

## 4. Tasks per Function / Department

| Function | Count | % |
|---|---|---|
| (empty) | 312 | 57.7% |
| Delivery | 64 | 11.8% |
| Operations | 53 | 9.8% |
| Marketing | 38 | 7.0% |
| HR | 27 | 5.0% |
| Sales | 19 | 3.5% |
| Pre-sales | 10 | 1.8% |
| IT/System | 9 | 1.7% |
| Branding | 6 | 1.1% |
| General Affairs | 2 | 0.4% |
| Management | 1 | 0.2% |

> 312 tasks (57.7%) have no function assigned. This is a significant data gap.

---

## 5. Date Range of Tasks

| Metric | Value |
|---|---|
| Earliest DueDate | 2025-10-07 (UTC stored as 2025-10-06T15:00:00Z, JST +9) |
| Latest DueDate | 2026-06-30 (UTC stored as 2026-06-29T15:00:00Z) |
| Tasks with DueDate | 511 (94.5%) |
| Tasks without DueDate | 30 (5.5%) |

Date span: approximately 9 months of task data.

---

## 6. Priority Distribution

| Priority | Count | % |
|---|---|---|
| High (high) | 389 | 71.9% |
| Medium (mid) | 112 | 20.7% |
| Medium (English) | 25 | 4.6% |
| Low (low) | 9 | 1.7% |
| Low (English) | 5 | 0.9% |
| (empty) | 1 | 0.2% |

> Note: Mixed Japanese/English labels -- "中" and "Medium" both mean medium; "低" and "Low" both mean low. Normalize during import: Medium = 137 total, Low = 14 total.

---

## 7. Effort Level Distribution

| Effort Level | Count | % |
|---|---|---|
| (empty) | 381 | 70.4% |
| Medium | 101 | 18.7% |
| Small | 38 | 7.0% |
| Large | 21 | 3.9% |

> 70.4% of tasks have no effort level assigned. Only 160 tasks (29.6%) have effort data.

---

## Migration Recommendations

### A. Tasks to Import as "Done"

**445 tasks** should be imported with a terminal status:

| Source Status | Target Status | Count | Action |
|---|---|---|---|
| Completed | done | 396 | Import as closed/done |
| Done | done | 9 | Import as closed/done |
| Dropped | cancelled | 40 | Import as cancelled/dropped |

These tasks are historical records. They should be imported for audit trail and reporting purposes but require no further action.

### B. Active Tasks Requiring Follow-up

**89 tasks** are active and need attention:

| Source Status | Target Status | Count |
|---|---|---|
| Inprogress | in_progress | 70 |
| NotStarted + Not started | not_started | 19 |

**Active tasks by owner:**

| Owner | Active Count |
|---|---|
| y.ito@meetsc.co.jp | 25 |
| m.takimiya@meetsc.co.jp | 15 |
| r.watanabe@meetsc.co.jp | 12 |
| o.yasuda@meetsc.co.jp | 12 |
| (no owner) | 7 |
| Multi-assignee | 18 |

**Overdue active tasks: 44 out of 89 are past due** (DueDate before 2026-03-26). These require immediate triage. Earliest overdue task dates back to 2025-11-07.

### C. Tasks with Empty Status (7 tasks)

These 7 tasks have no status and need manual classification before import:

| Task Name | Owner | DueDate |
|---|---|---|
| Apollo One Short Video | r.watanabe | 2026-03-30 |
| Amazon Gift Distribution (March) | r.watanabe | 2026-03-30 |
| Pochimo March Campaign | r.watanabe | (none) |
| (blank title) | (none) | (none) |
| Intern Recruitment | y.ito | (none) |
| Amazon Gift Purchase | r.watanabe | (none) |
| Pleb Amazon Coupon | r.watanabe | 2025-11-25 |

### D. Data Quality Issues

#### 1. Inconsistent Status Labels
- "NotStarted" vs "Not started" (10 + 9 = 19 tasks) -- normalize to single value
- "Completed" vs "Done" (396 + 9 = 405 tasks) -- confirm if semantically identical

#### 2. Inconsistent Priority Labels
- Japanese "中" (112) vs English "Medium" (25) -- merge to single value
- Japanese "低" (9) vs English "Low" (5) -- merge to single value

#### 3. Client Name Variations (deduplication needed)
The following client names refer to the same entity and must be normalized:

| Canonical Name | Variations Found |
|---|---|
| Idemitsu Kosan | "Idemitsu Kosan Kabushiki Kaisha" (116), "Idemitsu Kosan" (24), "Idemitsu Kosan (Pochimo)" (1) |
| Takei Shouten | "Kabushiki Kaisha Takei Shouten" (25), "Takei Shouten" (5), "Kabushiki Kaisha Takei **Sho**ten" (1, typo) |
| Pleb | "Kabushiki Kaisha Pleb" (22), "Pleb" (5), "Takei Shouten/Pleb" (1) |
| SPINDLE | "Kabushiki Kaisha SPINDLE" (38), "Spindle" (1) |
| Hokkaido Nyugyo | "Hokkaido Nyugyo Kabushiki Kaisha" (6), "Hokkaido Nyugyo" (1 in other data) |
| Majorcraft | "Majorcraft" (3), "Majorcraft Kabushiki Kaisha" (1), "Major Craft" (1) |
| A&A Material | "A&A Material" (3 with spelling variations) |
| Gordon Miller | "GordonMiller" (1), "Gordonmiller" (1), "Gordon Miller Kabushiki Kaisha" (1) |
| Interg | "Interg Kabushiki Kaisha" (4), "Interg" (appears separately) |

#### 4. Missing Fields (high-impact gaps)

| Field | Missing Count | % Missing | Impact |
|---|---|---|---|
| Function/Department | 312 | 57.7% | Cannot categorize by department |
| Effort Level | 381 | 70.4% | Cannot estimate workload |
| Client Name | 256 | 47.3% | Acceptable if internal tasks |
| DueDate | 30 | 5.5% | Low impact |
| Owner | 8 | 1.5% | Should be resolved for active tasks |
| Title | 1 | 0.2% | 1 blank row, likely garbage data |
| Status | 7 | 1.3% | Must be resolved before import |

#### 5. Duplicate Task Titles (5 groups, 11 tasks)

| Title | Occurrences |
|---|---|
| Monthly Aggregation (Getsuji Shukei) | 3 |
| Ad Improvement Okurayama | 2 |
| Case Study Creation | 2 |
| Apollo One Marketing Plan | 2 |
| Pleb Amazon Brand Registration | 2 |

These may be intentional (recurring tasks) or actual duplicates. Review before import.

#### 6. Multi-Assignee Owner Field
55 tasks have semicolon-delimited multiple owners. The target system should either:
- Split into individual assignments (one task per owner), or
- Support multi-assignee and parse the semicolons

#### 7. One Completely Blank Row
Row with empty title, empty owner, empty status, and empty due date. Skip during import.

---

## Import Strategy Summary

| Category | Count | Action |
|---|---|---|
| Import as Done | 405 | Bulk import, mark closed |
| Import as Cancelled | 40 | Bulk import, mark cancelled |
| Import as Active | 89 | Import and assign to owners |
| Triage Required | 7 | Manual status assignment |
| Skip (blank row) | 1 | Do not import |
| **Total** | **542** | (1 blank counted separately) |

### Pre-Import Checklist

- [ ] Normalize status values (NotStarted/Not started, Completed/Done)
- [ ] Normalize priority labels (Japanese/English merge)
- [ ] Deduplicate client names (see table above)
- [ ] Resolve 7 tasks with empty status
- [ ] Resolve 8 tasks with no owner (7 of which are active)
- [ ] Decide on multi-assignee handling (split vs. multi-assign)
- [ ] Review 5 duplicate title groups
- [ ] Convert DueDate from UTC ISO-8601 to JST
- [ ] Remove 1 blank/garbage row
