# CRM Full Sync Specification

## Data Flow: Form → CRM → Pipeline

```
Form Submit (/api/form/submit)
  │
  ├─→ clients table          (task management side)
  ├─→ crm_companies          (CRM side, linked via client_id)
  ├─→ crm_contacts           (find-or-UPDATE by email)
  ├─→ crm_leads              (with structured custom_fields)
  ├─→ crm_form_submissions   (for inbox display)
  ├─→ crm_activities         (on both contact AND lead)
  └─→ Thank you email

Lead Conversion (/api/crm/leads/[id]/convert)
  │
  ├─→ crm_deals              (inherits contact_id, company_id from lead)
  ├─→ projects               (auto-created, linked to client via company)
  └─→ Lead status → 'converted'
```

## Fixes Applied

### 1. Contact Deduplication (FIXED)
**Before**: If contact existed by email, reused but NOT updated
**After**: Existing contact updated with latest company_id, job_title, name

### 2. Clients Table Sync (FIXED)
**Before**: Form submission never created a clients record
**After**: Auto-creates/finds client, links crm_companies.client_id → clients.id

### 3. Deal ← Lead Data (FIXED)
**Before**: Deal created with lead_id only, no contact_id or company_id
**After**: Deal inherits contact_id and company_id from lead

### 4. Project ← Client (FIXED)
**Before**: Project created without client link
**After**: Project.client_id set from crm_companies.client_id

### 5. Structured Lead Data (FIXED)
**Before**: All form data crammed into description text
**After**: Key fields stored in custom_fields JSONB:
- themes, urgency, budget, decision_maker, expectations, duration, revenue, employees

### 6. Activity Logging (FIXED)
**Before**: Activity only on contact
**After**: Activity on both contact AND lead

### 7. Company Updates (FIXED)
**Before**: Existing company never updated
**After**: Industry and size updated on re-submission
