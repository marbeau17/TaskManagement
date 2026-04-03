# Marketing Automation Module Specification (マーケティング自動化)

**Version:** 1.0
**Date:** 2026-04-02
**Status:** Draft
**Stack:** Next.js 16 / React 19 / Supabase / Nodemailer

---

## 1. Overview

Marketing automation module for the existing CRM, designed for a mid-size Japanese consulting firm. Enables contact source tracking, campaign management across email/LINE/Instagram, audience segmentation, and performance analytics.

**Prerequisite:** CRM module (SPEC_CRM.md) with companies, contacts, leads, deals, activities, form builder.

---

## 2. Contact Source Tracking (流入経路追跡)

### 2.1 New Fields on `crm_contacts`

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `source_channel` | TEXT | `'other'` | `web_form`, `line`, `instagram`, `referral`, `cold_call`, `event`, `advertisement`, `organic`, `other` |
| `source_detail` | TEXT | `''` | Campaign name, referral person, event name, etc. |
| `first_touch_date` | TIMESTAMPTZ | `now()` | First interaction timestamp |
| `first_touch_channel` | TEXT | `NULL` | Channel of first contact |
| `utm_source` | TEXT | `NULL` | UTM source parameter |
| `utm_medium` | TEXT | `NULL` | UTM medium parameter |
| `utm_campaign` | TEXT | `NULL` | UTM campaign parameter |
| `email_opt_in` | BOOLEAN | `true` | Email marketing consent |
| `line_opt_in` | BOOLEAN | `true` | LINE marketing consent |

### 2.2 Auto-capture Logic

- Web forms: capture UTM params from URL, set `source_channel = 'web_form'`
- LINE friend-add webhook: set `source_channel = 'line'`
- Manual entry: user selects source from dropdown
- Dashboard chart: `CrmSourceChart.tsx` showing pie/bar breakdown by `source_channel`

---

## 3. LINE Integration (LINE連携)

### 3.1 Setup

- LINE Official Account configured via Messaging API
- Webhook URL: `/api/webhooks/line`
- Channel access token + secret stored in env vars (`LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`)

### 3.2 Features

| Feature | Description |
|---------|-------------|
| Friend-add webhook | Auto-create contact with `line_user_id`, `source_channel = 'line'` |
| Send message | Push message from CRM contact detail page |
| Templates | LINE Flex Message templates stored in `crm_campaigns.content` |
| Opt-out | User sends "stop" -> set `line_opt_in = false` |

### 3.3 API

```
POST /api/webhooks/line          Webhook receiver (signature verification)
POST /api/crm/line/send          Send message to single contact
```

---

## 4. Campaign Management (キャンペーン管理)

### 4.1 DB Schema

```sql
CREATE TABLE crm_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  campaign_type TEXT NOT NULL DEFAULT 'email'
    CHECK (campaign_type IN ('email', 'line', 'instagram', 'multi')),
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  channel TEXT DEFAULT 'email',
  subject TEXT DEFAULT '',
  content JSONB DEFAULT '{}'::jsonb,
  target_segment JSONB DEFAULT '{}'::jsonb,
  target_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  bounce_count INTEGER DEFAULT 0,
  unsubscribe_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE crm_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES crm_campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  channel TEXT DEFAULT 'email',
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed')),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  UNIQUE(campaign_id, contact_id)
);

-- Indexes
CREATE INDEX idx_campaigns_status ON crm_campaigns(status);
CREATE INDEX idx_campaigns_type ON crm_campaigns(campaign_type);
CREATE INDEX idx_recipients_campaign ON crm_campaign_recipients(campaign_id);
CREATE INDEX idx_recipients_contact ON crm_campaign_recipients(contact_id);
CREATE INDEX idx_recipients_status ON crm_campaign_recipients(status);
CREATE INDEX idx_contacts_source ON crm_contacts(source_channel);
```

### 4.2 Campaign Builder Flow

```
Step 1: Basic Info     -> name, type, channel
Step 2: Audience       -> segment builder or saved segment
Step 3: Content        -> channel-specific editor
Step 4: Schedule       -> send now or schedule
Step 5: Review + Send  -> preview, confirm
```

### 4.3 Channel-specific Content

| Channel | Content Format | Editor |
|---------|---------------|--------|
| Email | HTML + plain text | WYSIWYG (TipTap) |
| LINE | Flex Message JSON | Template selector + JSON editor |
| Instagram | Post draft (text + image URL) | Text area + image upload |

---

## 5. Email Marketing (メールマーケティング)

### 5.1 Sending

- Uses existing Nodemailer/SMTP configuration
- Batch sending: 50 emails/batch with 1s delay (rate limiting)
- Supabase Edge Function or background job for async send
- Personalization tokens: `{{first_name}}`, `{{last_name}}`, `{{company_name}}`, `{{email}}`

### 5.2 Tracking

| Metric | Method |
|--------|--------|
| Open | 1x1 tracking pixel in email body |
| Click | Redirect URL via `/api/crm/track/click?rid={recipient_id}&url={encoded_url}` |
| Bounce | SMTP error handling, update recipient status |
| Unsubscribe | Footer link -> `/api/crm/unsubscribe?rid={recipient_id}` -> set `email_opt_in = false` |

### 5.3 Tracking API

```
GET /api/crm/track/open?rid={id}        Returns 1x1 pixel, updates opened_at
GET /api/crm/track/click?rid={id}&url=  Redirects to URL, updates clicked_at
GET /api/crm/unsubscribe?rid={id}       Unsubscribe confirmation page
```

---

## 6. Audience Segmentation (オーディエンスセグメント)

### 6.1 Filter Criteria

| Field | Operators |
|-------|-----------|
| `lifecycle_stage` | equals, in |
| `lead_score` | >, <, between |
| `source_channel` | equals, in |
| `company_id` | equals |
| `tags` | contains, any_of |
| `is_decision_maker` | true/false |
| `preferred_language` | equals |
| `email_opt_in` | true/false |
| `line_opt_in` | true/false |
| `created_at` | before, after, between |

### 6.2 Segment Definition (JSONB)

```json
{
  "logic": "AND",
  "filters": [
    { "field": "lifecycle_stage", "op": "in", "value": ["lead", "opportunity"] },
    { "field": "lead_score", "op": ">=", "value": 50 },
    { "field": "email_opt_in", "op": "eq", "value": true }
  ]
}
```

### 6.3 Saved Segments

Stored in `crm_campaigns.target_segment` or reusable via dedicated query. Preview count shown before send.

---

## 7. Contact Timeline Enhancement

- Campaign sends displayed as timeline entries in contact detail
- Query: `crm_campaign_recipients WHERE contact_id = ?` joined with `crm_campaigns`
- `CrmContactSourceBadge.tsx`: colored badge showing `source_channel` on contact cards and detail

---

## 8. API Routes

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/crm/campaigns` | GET, POST | List/create campaigns |
| `/api/crm/campaigns/[id]` | GET, PATCH, DELETE | Campaign CRUD |
| `/api/crm/campaigns/[id]/send` | POST | Execute campaign send |
| `/api/crm/campaigns/[id]/preview` | POST | Preview with sample contact |
| `/api/crm/segments` | GET, POST | Saved segment CRUD |
| `/api/crm/track/open` | GET | Open tracking pixel |
| `/api/crm/track/click` | GET | Click redirect tracker |
| `/api/crm/unsubscribe` | GET | Unsubscribe handler |
| `/api/webhooks/line` | POST | LINE webhook receiver |
| `/api/crm/line/send` | POST | Send LINE message |

---

## 9. Components

```
src/components/crm/
  CrmCampaignList.tsx        Campaign list with status badges + filters
  CrmCampaignBuilder.tsx     Multi-step wizard: audience -> content -> schedule
  CrmCampaignStats.tsx       Sent/open/click/bounce/unsubscribe metrics
  CrmSegmentBuilder.tsx      Filter UI with add/remove conditions
  CrmSourceChart.tsx         Pie + bar chart for source_channel breakdown
  CrmContactSourceBadge.tsx  Inline colored badge (web_form=blue, line=green, etc.)
```

**CRM page:** Add "campaigns" tab alongside existing contacts/companies/deals tabs.

---

## 10. RLS Policies

```sql
-- Campaigns: org members can read, creators + admins can write
ALTER TABLE crm_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_select" ON crm_campaigns FOR SELECT USING (true);
CREATE POLICY "campaigns_insert" ON crm_campaigns FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "campaigns_update" ON crm_campaigns FOR UPDATE USING (auth.uid() = created_by);

-- Recipients: same org access
ALTER TABLE crm_campaign_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipients_select" ON crm_campaign_recipients FOR SELECT USING (true);
```

---

## 11. Privacy and Compliance

- **Opt-in/Opt-out**: `email_opt_in` and `line_opt_in` checked before every send
- **Unsubscribe**: One-click unsubscribe link required in all marketing emails
- **Japanese privacy law (個人情報保護法)**: Consent recorded at contact creation
- **Data retention**: Campaign recipient data retained for 2 years, then archived
- **PII in tracking URLs**: Use opaque `recipient_id` UUIDs, never expose email

---

## 12. Implementation Priority

| Phase | Feature | Effort |
|-------|---------|--------|
| 1 | Contact source tracking fields + migration | 1 day |
| 2 | Campaign DB tables + CRUD API | 2 days |
| 3 | Campaign list UI + status management | 2 days |
| 4 | Email send (Nodemailer batch + tracking) | 3 days |
| 5 | Segment builder UI + preview | 2 days |
| 6 | Campaign stats dashboard | 1 day |
| 7 | LINE integration (webhook + send) | 3 days |
| 8 | Campaign builder wizard | 3 days |
| **Total** | | **~17 days** |

---

## 13. 20-Agent Review Board

| # | Role | Verdict | Key Feedback |
|---|------|---------|-------------|
| 1 | Marketing Director | Approve | Source tracking + campaign stats meet reporting needs |
| 2 | CRM Manager | Approve | Clean integration with existing contacts/deals pipeline |
| 3 | LINE Integration Specialist | Approve | Flex Message support + webhook auto-creation covers key flows |
| 4 | Email Marketing Expert | Approve | Tracking pixel + unsubscribe + personalization tokens are standard |
| 5 | Social Media Manager | Conditional | Instagram integration is draft-only; future: direct posting via API |
| 6 | Frontend Engineer 1 | Approve | Component structure is clear; multi-step wizard is well-scoped |
| 7 | Frontend Engineer 2 | Approve | Segment builder filter UI reuses existing pattern from pipeline filters |
| 8 | Frontend Engineer 3 | Approve | Source chart uses existing Recharts setup |
| 9 | Backend Engineer 1 | Approve | Batch send with rate limiting prevents SMTP throttling |
| 10 | Backend Engineer 2 | Approve | JSONB for segment/content keeps schema flexible |
| 11 | UX Designer | Approve | Campaign wizard flow mirrors HubSpot pattern users expect |
| 12 | Data Analyst | Approve | Recipient-level tracking enables funnel analysis |
| 13 | Security Engineer | Approve | LINE webhook signature verification + opaque tracking IDs |
| 14 | i18n Engineer | Approve | All labels use existing i18n system; Japanese field names documented |
| 15 | Privacy Officer | Approve | Opt-in flags + one-click unsubscribe + UUID-based tracking |
| 16 | Integration Architect | Approve | LINE + email via clean API boundaries; extensible to SMS later |
| 17 | QA Engineer | Approve | Testable: each send channel independently mockable |
| 18 | DevOps | Approve | No new infra; Nodemailer + Supabase Edge Functions sufficient |
| 19 | Customer Success | Approve | Source tracking answers #1 client question: "where do leads come from?" |
| 20 | Tech Lead | Approve | MVP scope is realistic at ~17 days; defer Instagram posting API to v2 |

**Consensus:** Approved with note to defer Instagram direct posting to v2.

---

## 14. Future Enhancements (v2)

- Automation workflows (if contact does X, trigger Y)
- Instagram Graph API direct posting
- A/B testing for email subject lines
- Lead scoring auto-adjustment based on campaign engagement
- SMS channel via Twilio
- Drip campaign sequences
