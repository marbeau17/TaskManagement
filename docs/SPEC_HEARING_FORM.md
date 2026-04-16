# 事前ヒアリングシート — Form → CRM Lead Integration Spec

## Overview

Public hearing form for きらぼし銀行 経営相談会 (2026.5.20).
Submissions create CRM contacts and appear in CRM inbox.
Form can be embedded externally or accessed as a standalone page.

## Implementation

### 1. Create CRM Form Record
Insert a `crm_forms` record with all fields matching form.html:
- Section 1: 会社名, 業種, お名前, 役職, 従業員数, 年商, メールアドレス
- Section 2: 相談テーマ (checkboxes)
- Section 3: 課題, 試みた施策, 課題期間
- Section 4: 緊急度 (radio)
- Section 5: 予算感 (range)
- Section 6: 意思決定 (radio)
- Section 7: 相談後に期待すること (checkboxes), 自由記入

### 2. Public Form Page
Create `/form/[slug]/page.tsx` matching the org.html styling.
Submits to existing `/api/crm/forms/{id}/submit` endpoint.

### 3. CRM Integration (already built)
- Contact auto-created with email + company + name
- Submission appears in CRM inbox
- Can manually convert to CRM lead → deal → project

### 4. Lead Auto-Creation
After form submit, also auto-create a CRM lead with:
- title: "{company} - 経営相談会 2026.5.20"
- contact_id: from submission
- company_id: from contact
- status: 'new'
- source: 'hearing_form'
