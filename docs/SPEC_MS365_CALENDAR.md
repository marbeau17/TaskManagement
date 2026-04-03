# Microsoft 365 Calendar Integration Specification

**Version**: 1.0 | **Date**: 2026-04-02 | **Status**: Draft
**Stack**: Next.js 16, React 19, Supabase (PostgreSQL), Microsoft Graph API v1.0
**Target**: 15-person consulting team (Outlook / Teams) | **Route**: `/settings/calendar`, workload views

---

## 1. Authentication (OAuth 2.0 + PKCE)

### 1.1 Flow
- Authorization Code Flow with PKCE (SPA-safe, no client secret in browser)
- Redirect URI: `{APP_URL}/api/ms365/callback`
- Azure AD App Registration required (single-tenant or multi-tenant)

### 1.2 Scopes
| Scope | Purpose |
|---|---|
| `Calendars.Read` | Read user's own calendar events |
| `Calendars.Read.Shared` | Read shared/delegated calendars |
| `User.Read` | Read user profile (display name, email) |

### 1.3 Consent Model
- **Option A**: Admin consent (recommended for org-wide deployment)
- **Option B**: Per-user consent (each user authorizes individually)
- Admin consent pre-approves scopes; users skip consent prompt

### 1.4 Token Management
- Access token: short-lived (~1 hour), stored in memory/session only
- Refresh token: encrypted with AES-256-GCM before DB storage
- Encryption key: `MS365_TOKEN_ENCRYPTION_KEY` env var (32-byte random)
- Auto-refresh: middleware checks `token_expires_at` before each Graph call; refreshes if < 5 min remaining
- Rotation: Microsoft may rotate refresh tokens on use; always store the latest

---

## 2. Calendar Event Sync

### 2.1 Sync Strategy
| Trigger | Scope | Frequency |
|---|---|---|
| User clicks "Sync Now" | Current user, current week | On demand |
| Page load (workload view) | Current user, displayed range | If `last_sync_at` > 15 min ago |
| Cron / manual admin trigger | All connected users | Daily 06:00 JST or manual |

### 2.2 Graph API Call
```
GET /me/calendarView
  ?startDateTime={weekStart}
  &endDateTime={weekEnd}
  &$select=id,subject,start,end,isAllDay,sensitivity,showAs,
           isCancelled,recurrence,organizer,location,
           responseStatus
  &$top=250
  &$orderby=start/dateTime
```

### 2.3 Event Mapping Rules
| Condition | Action |
|---|---|
| `isCancelled: true` | Mark `is_cancelled`, exclude from workload |
| `showAs: 'free'` | Store but exclude from workload |
| `showAs: 'tentative'` | Include at 50% weight in workload |
| `showAs: 'busy' / 'oof'` | Include at 100% weight |
| `isAllDay: true` | Count as 8h (configurable) or use working hours only |
| `responseStatus.response: 'declined'` | Exclude from workload |
| `sensitivity: 'private' / 'confidential'` | Store subject as empty string; store other fields normally |

### 2.4 Recurring Events
- `calendarView` endpoint auto-expands recurrences into individual instances
- Each instance stored with its own `ms_event_id` (instance ID)
- No need for recurrence pattern parsing on our side

### 2.5 Delta Sync (Future Optimization)
- Use `delta` query on `/me/calendarView` to fetch only changes
- Store `deltaLink` in `ms365_tokens.last_delta_link`
- Reduces API calls for subsequent syncs

---

## 3. Database Schema

```sql
-- MS365 OAuth tokens (per user)
CREATE TABLE ms365_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,       -- encrypted (AES-256-GCM)
  refresh_token TEXT NOT NULL,      -- encrypted (AES-256-GCM)
  token_expires_at TIMESTAMPTZ NOT NULL,
  scopes TEXT DEFAULT 'Calendars.Read User.Read',
  ms_user_id TEXT DEFAULT '',       -- Microsoft user principal name
  connected_at TIMESTAMPTZ DEFAULT now(),
  last_sync_at TIMESTAMPTZ,
  UNIQUE(user_id)
);

-- Synced calendar events
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ms_event_id TEXT NOT NULL,
  subject TEXT DEFAULT '',
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  is_all_day BOOLEAN DEFAULT false,
  sensitivity TEXT DEFAULT 'normal'
    CHECK (sensitivity IN ('normal','personal','private','confidential')),
  show_as TEXT DEFAULT 'busy'
    CHECK (show_as IN ('free','tentative','busy','oof','workingElsewhere','unknown')),
  is_cancelled BOOLEAN DEFAULT false,
  is_recurring BOOLEAN DEFAULT false,
  organizer_name TEXT DEFAULT '',
  organizer_email TEXT DEFAULT '',
  location TEXT DEFAULT '',
  response_status TEXT DEFAULT ''
    CHECK (response_status IN ('','none','organizer','tentativelyAccepted','accepted','declined')),
  synced_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, ms_event_id)
);

CREATE INDEX idx_cal_events_user_date ON calendar_events(user_id, start_at);
CREATE INDEX idx_cal_events_date ON calendar_events(start_at, end_at);

-- RLS policies
ALTER TABLE ms365_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own tokens" ON ms365_tokens
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own tokens" ON ms365_tokens
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users read own events" ON calendar_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Members read non-private events" ON calendar_events
  FOR SELECT USING (sensitivity IN ('normal','personal'));
```

---

## 4. API Routes

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/ms365/auth` | User | Redirect to Microsoft login (generates PKCE challenge) |
| GET | `/api/ms365/callback` | Public | OAuth callback; exchanges code for tokens, stores encrypted |
| POST | `/api/ms365/disconnect` | User | Delete tokens + all synced events for current user |
| POST | `/api/ms365/sync` | User | Sync current user's events for displayed week |
| POST | `/api/ms365/sync-all` | Admin | Sync all connected users (rate-limited) |
| GET | `/api/ms365/events` | User | List events for date range (`?from=&to=&user_id=`) |
| POST | `/api/ms365/find-time` | User | Find optimal meeting time for given members |

### 4.1 Rate Limiting
- Microsoft Graph: 10,000 requests per 10 min per app
- `/api/ms365/sync-all`: process users sequentially with 200ms delay
- Client-side: debounce sync button (30s cooldown)

---

## 5. Components

```
src/components/calendar/
  CalendarConnect.tsx        Connect/disconnect button + status
  CalendarWeekView.tsx       Weekly overlay on workload chart
  CalendarMeetingList.tsx    Meeting list for selected week
  CalendarFindTime.tsx       Optimal time finder UI
  CalendarPrivacyBadge.tsx   Privacy indicator for event display
```

### 5.1 CalendarConnect
- Shows "Microsoft 365 に接続" button when disconnected
- Shows connected status, last sync time, "Sync Now" / "切断" when connected
- Disconnect triggers confirmation dialog, then deletes all data

### 5.2 CalendarWeekView
- Renders meeting blocks as colored overlay on existing workload bar chart
- Color coding: busy (blue), tentative (blue striped), OOF (purple)
- Stacked bar: task hours (existing green) + meeting hours (blue)

### 5.3 CalendarFindTime
- Multi-select members from team list
- Date range picker (defaults to next 5 business days)
- Duration selector (30min, 60min, 90min, 120min)
- Results: ranked time slots showing availability count

### 5.4 CalendarPrivacyBadge
- Private/confidential events display lock icon + "ブロック済み"
- Normal events show subject and organizer

---

## 6. Workload Integration

### 6.1 Updated Calculation
```typescript
interface WorkloadSummary {
  user_id: string;
  task_hours: number;
  meeting_hours: number;        // NEW
  total_workload: number;       // task_hours + meeting_hours
  capacity: number;             // weekly capacity from user settings
  available_hours: number;      // capacity - total_workload
  utilization_percent: number;  // (total_workload / capacity) * 100
}
```

### 6.2 Meeting Hours Calculation
```typescript
function calcMeetingHours(events: CalendarEvent[]): number {
  return events
    .filter(e => !e.is_cancelled && e.response_status !== 'declined')
    .filter(e => e.show_as !== 'free')
    .reduce((sum, e) => {
      const weight = e.show_as === 'tentative' ? 0.5 : 1.0;
      const hours = e.is_all_day ? 8 : e.duration_minutes / 60;
      return sum + hours * weight;
    }, 0);
}
```

### 6.3 Modified Functions
- `getWorkloadSummaries()` -- join `calendar_events` for meeting hours
- `WorkloadKpi` component -- show meeting/task breakdown with stacked indicator
- `MemberDetail` view -- show calendar events alongside task list

---

## 7. Privacy & Security Model

### 7.1 Event Visibility Rules
```
Viewer            | normal/personal events | private/confidential events
------------------|------------------------|----------------------------
Event owner       | Full details           | Full details
Other members     | Subject + time + org.  | "ブロック済み" + time only
Admin             | Subject + time + org.  | "ブロック済み" + time only (no override)
```

### 7.2 Data at Rest
- Refresh tokens: AES-256-GCM encrypted, IV stored alongside ciphertext
- Access tokens: AES-256-GCM encrypted (same key)
- Encryption key rotation: re-encrypt all tokens with new key via admin script
- Calendar event subjects for private events: stored as empty string (never persisted)

### 7.3 Data in Transit
- All Graph API calls over HTTPS/TLS 1.2+
- All Supabase connections over TLS

### 7.4 Data Retention & GDPR
- User clicks "切断 (Disconnect)": delete `ms365_tokens` + all `calendar_events` rows
- Account deletion: cascade delete via foreign key
- No calendar data shared with third parties
- Export: include calendar events in GDPR data export if implemented

### 7.5 Threat Mitigations
| Threat | Mitigation |
|---|---|
| Token theft from DB | AES-256-GCM encryption; key in env var, not in DB |
| CSRF on OAuth callback | PKCE + `state` parameter validated on callback |
| Token replay | Short-lived access tokens; refresh token rotation |
| Over-scoping | Read-only scopes only; no write access to calendars |
| Data leakage (private events) | Subject stripped before storage; RLS enforces visibility |
| Excessive API calls | Rate limiting + sync cooldown + delta sync |

---

## 8. Optimal Time Finder Algorithm

```
Input:  member_ids[], date_range, duration_minutes
Output: ranked TimeSlot[]

1. For each member:
   a. Fetch calendar_events in date_range (busy/tentative/oof, not cancelled/declined)
   b. Fetch assigned tasks with estimated hours (spread across working hours)
2. Define working hours: 09:00-18:00 JST, exclude 12:00-13:00 lunch
3. For each business day in range:
   a. Generate candidate slots at 30-min intervals
   b. For each slot of requested duration:
      - Count available members (no conflict)
      - Score = available_count * 10 + time_preference_bonus
      - time_preference_bonus: 10:00-11:30 = +3, 14:00-16:00 = +2, else +0
4. Return top 10 slots sorted by score DESC
```

---

## 9. Environment Variables

```env
MS365_CLIENT_ID=<Azure AD App client ID>
MS365_CLIENT_SECRET=<Azure AD App client secret>
MS365_TENANT_ID=<Azure AD tenant ID or "common">
MS365_REDIRECT_URI=<APP_URL>/api/ms365/callback
MS365_TOKEN_ENCRYPTION_KEY=<32-byte base64-encoded key>
```

---

## 10. Implementation Phases

| Phase | Scope | Estimate |
|---|---|---|
| **Phase 1** | Azure AD registration, OAuth flow, token storage (encrypted), basic sync, event list display | 3 days |
| **Phase 2** | Workload integration (meeting_hours in calculations), privacy model, CalendarWeekView overlay | 3 days |
| **Phase 3** | Optimal time finder, CalendarFindTime UI, delta sync optimization | 2 days |

---

## 11. 25-Agent Review

| # | Role | Verdict | Key Feedback |
|---|---|---|---|
| 1 | Product Owner | Approve | Phases aligned with team priorities; Phase 1 delivers immediate value |
| 2 | Security Engineer (1) | Approve | AES-256-GCM for tokens is correct; ensure key rotation procedure is documented |
| 3 | Security Engineer (2) | Approve | PKCE + state param mitigates CSRF/replay; verify `nonce` in ID token if added later |
| 4 | Integration Architect | Approve | calendarView endpoint handles recurrence expansion; delta sync in Phase 3 is pragmatic |
| 5 | MS Graph API Specialist | Approve | Correct use of `$select` to minimize payload; note `$top=250` may need pagination for heavy users |
| 6 | OAuth Specialist | Approve | PKCE is mandatory for public clients; store PKCE verifier server-side only |
| 7 | Frontend Engineer (1) | Approve | Stacked bar chart approach integrates cleanly with existing workload UI |
| 8 | Frontend Engineer (2) | Approve | 30s sync cooldown prevents UI spam; show loading state during sync |
| 9 | Frontend Engineer (3) | Approve | FindTime multi-select UX clear; add "no available slots" empty state |
| 10 | Backend Engineer (1) | Approve | Sequential sync-all with 200ms delay respects Graph rate limits |
| 11 | Backend Engineer (2) | Approve | Upsert on `(user_id, ms_event_id)` prevents duplicates on re-sync |
| 12 | Backend Engineer (3) | Approve | RLS policies correct; add service_role bypass for sync-all endpoint |
| 13 | Data Architect | Approve | Indexes on `(user_id, start_at)` cover primary query patterns |
| 14 | UX Designer | Approve | "ブロック済み" label is clear; use lock icon consistently for private events |
| 15 | Privacy Officer | Approve | Private event subjects never stored; disconnect deletes all data; GDPR compliant |
| 16 | QA Engineer | Approve | Test: token expiry, private event masking, declined event exclusion, all-day handling |
| 17 | Performance Engineer | Approve | 15 users x 250 events = manageable; add caching for repeated workload page loads |
| 18 | DevOps | Approve | Add `MS365_*` env vars to deployment config; monitor Graph API quota in dashboard |
| 19 | i18n Engineer | Approve | "ブロック済み" is hardcoded JP; add to i18n keys for future EN support |
| 20 | Mobile Specialist | Approve | Responsive calendar overlay needed; test on 375px width |
| 21 | Workload Specialist | Approve | 50% weight for tentative is reasonable; make configurable per team if needed |
| 22 | Calendar Expert | Approve | calendarView handles timezone conversion; store all times as TIMESTAMPTZ |
| 23 | Customer Success | Approve | One-click connect is low friction; add onboarding tooltip for first-time setup |
| 24 | Accessibility Engineer | Approve | Ensure color-coded blocks have text labels; ARIA roles on calendar overlay |
| 25 | Tech Lead | Approve | Architecture is clean; 3-phase rollout de-risks delivery; total ~8 days estimate realistic |
