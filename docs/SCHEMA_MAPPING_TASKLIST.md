# Schema Mapping: SharePoint TaskList.csv to WorkFlow TaskManagement

This document defines the column-by-column mapping from the SharePoint `TaskList.csv` export (13 columns) to the Supabase-backed WorkFlow TaskManagement schema. It covers value transformations, lookup/creation logic, and the migration procedure.

---

## Source Data Summary

| Metric | Value |
|---|---|
| Total rows | 541 |
| Unique clients | 42 |
| Unique owner combinations | 29 |
| CSV columns | 13 |

---

## Column Mapping Table

| # | CSV Column (JP) | CSV Column Purpose | Target Table.Column | Transformation Rules |
|---|---|---|---|---|
| 0 | タスク名 | Task title | `tasks.title` | Direct copy. Trim whitespace. Required field -- skip row if empty. |
| 1 | ファンクション | Function / department | `tasks.description` (prefix) | Prepend as `[ファンクション: {value}]` to description. Values: 営業, IT/システム, 総務, 人事, ブランディング, デリバリー, etc. No dedicated column in schema; preserved in description metadata. |
| 2 | タスクの種類 | Task type / category | `tasks.description` (prefix) | Prepend as `[種類: {value}]` to description after function line. No dedicated column in schema; preserved in description metadata. |
| 3 | 詳細タスク・アクション項目 | Detailed description | `tasks.description` | Main description body. Combined with columns 1, 2, and 10. |
| 4 | Status | Task status | `tasks.status` | See Status Mapping below. |
| 5 | Owner | Assignee(s) | `tasks.assigned_to` + `task_assignees` | See Owner Mapping below. |
| 6 | DueDate | Due date | `tasks.desired_deadline` + `tasks.confirmed_deadline` | Parse date string. Set both `desired_deadline` and `confirmed_deadline` to the same value. Use ISO 8601 format (`YYYY-MM-DD`). Null if empty. |
| 7 | 優先度 | Priority | `tasks.description` (prefix) | Prepend as `[優先度: {mapped}]`. See Priority Mapping below. No dedicated priority column in schema. |
| 8 | 顧客名 | Client name | `tasks.client_id` | Lookup `clients` table by `name`. If not found, create new client record. See Client Resolution below. |
| 9 | 工数レベル | Effort estimate | `tasks.estimated_hours` | See Effort Mapping below. |
| 10 | Note | Notes | `tasks.description` (append) | Append to description as `\n\n--- Note ---\n{value}`. Skip if empty. |
| 11 | 関連ファイル | Related files / URLs | `tasks.reference_url` | Direct copy. Trim whitespace. Null if empty. |
| 12 | 更新日時 | Last modified datetime | `tasks.updated_at` | Parse to ISO 8601 timestamp. Also set `tasks.created_at` to this value when the original creation date is unavailable. |

---

## Value Mapping Details

### Status Mapping (Column 4 -> `tasks.status`)

| CSV Value | Normalized | Target `status` |
|---|---|---|
| `Completed` | completed | `done` |
| `Done` | done | `done` |
| `Inprogress` | inprogress | `in_progress` |
| `NotStarted` | notstarted | `todo` |
| `Not started` | notstarted | `todo` |
| `Dropped` | dropped | `rejected` |
| *(empty)* | -- | `waiting` |

Case-insensitive matching. Trim whitespace before comparison.

When status is `done`, set `tasks.progress` to `100`.
When status is `in_progress`, set `tasks.progress` to `50` (default estimate).
Otherwise set `tasks.progress` to `0`.

### Priority Mapping (Column 7)

| CSV Value | Mapped Value |
|---|---|
| `高` | `high` |
| `中` / `Medium` | `medium` |
| `低` / `Low` | `low` |
| *(empty)* | `medium` (default) |

Since the `tasks` table has no dedicated `priority` column, the mapped value is embedded in the description prefix: `[優先度: high]`.

### Effort/Estimated Hours Mapping (Column 9 -> `tasks.estimated_hours`)

| CSV Value | `estimated_hours` |
|---|---|
| `大` | `16` |
| `中` | `8` |
| `小` | `4` |
| *(empty)* | `NULL` |

### Owner Mapping (Column 5 -> `tasks.assigned_to` + `task_assignees`)

The Owner field may contain multiple email addresses separated by commas or semicolons.

1. Split the value by `,` or `;`.
2. Trim each entry. Look up each email in the `users` table.
3. If a user does not exist, create a new user record with:
   - `email`: the extracted email
   - `name`: local part of email (before `@`)
   - `name_short`: first 2 characters of name
   - `role`: `member`
   - `is_active`: `true`
4. The **first** email becomes `tasks.assigned_to` (FK to `users.id`).
5. All **subsequent** emails are inserted into `task_assignees` (junction table: `task_id`, `user_id`).
6. If the field is empty, set `assigned_to` to `NULL`.

### Client Resolution (Column 8 -> `tasks.client_id`)

1. Trim whitespace from `顧客名`.
2. Search `clients` table for exact `name` match.
3. If not found, insert a new `clients` row with `name` = trimmed value.
4. Use the resolved `clients.id` as `tasks.client_id`.
5. If the field is empty, use a fallback client named `未分類` (create if needed).

`client_id` is a required FK, so every task must reference a valid client.

---

## Description Assembly

The `tasks.description` field is composed from multiple CSV columns in the following order:

```
[ファンクション: {col1}]
[種類: {col2}]
[優先度: {priority_mapped}]

{col3 - detailed description}

--- Note ---
{col10 - note}
```

Empty sections are omitted. If all source columns (1, 2, 3, 7, 10) are empty, `description` is set to `NULL`.

---

## Fields with No CSV Source (Defaults)

| Target Column | Default Value | Notes |
|---|---|---|
| `tasks.id` | Auto-generated UUID | `gen_random_uuid()` |
| `tasks.requested_by` | System/admin user ID | Set to the admin user performing the migration |
| `tasks.director_id` | `NULL` | Not available in CSV |
| `tasks.actual_hours` | `0` | No source data |
| `tasks.is_draft` | `false` | Imported tasks are not drafts |
| `tasks.template_id` | `NULL` | Not template-based |
| `tasks.template_data` | `NULL` | Not template-based |
| `tasks.created_at` | Value of column 12 (`更新日時`) | Fallback; original creation date is not in CSV |

---

## Target Tables Affected

| Table | Operation | Expected Row Count |
|---|---|---|
| `clients` | INSERT (new only) | Up to 42 new rows |
| `users` | INSERT (new only) | Up to 29 new rows (from owner emails) |
| `tasks` | INSERT | 541 rows |
| `task_assignees` | INSERT | Variable (multi-owner tasks only) |

---

## Migration Steps

### Pre-Migration

1. **Backup the database.**
   ```bash
   pg_dump -Fc -d $DATABASE_URL -f backup_pre_tasklist_migration_$(date +%Y%m%d_%H%M%S).dump
   ```

2. **Validate the CSV file.**
   - Confirm 541 data rows (excluding header/schema rows).
   - Verify UTF-8 encoding (the file starts with a BOM `\xEF\xBB\xBF`).
   - Strip the SharePoint `ListSchema=` header line if present (line 1 of the raw export contains JSON metadata, not task data).

3. **Dry-run the import script.**
   - Parse all rows and validate mappings without writing to the database.
   - Log any rows that fail validation (missing title, unrecognized status, etc.).
   - Report summary: clients to create, users to create, status distribution.

### Migration Execution

4. **Create missing clients.**
   - Deduplicate the 42 unique `顧客名` values.
   - Insert any that do not already exist in `clients`.
   - Build a `Map<string, string>` of client name to client ID.

5. **Create missing users.**
   - Extract and deduplicate all email addresses from the Owner column.
   - Insert any that do not already exist in `users`.
   - Build a `Map<string, string>` of email to user ID.

6. **Insert tasks.**
   - Process rows sequentially (or in batches of 50).
   - For each row:
     a. Resolve `client_id` from client map.
     b. Resolve `assigned_to` from user map.
     c. Assemble `description` from columns 1, 2, 3, 7, 10.
     d. Map `status`, `estimated_hours`, deadlines.
     e. Insert into `tasks`.
     f. Insert additional assignees into `task_assignees`.

7. **Verify counts.**
   ```sql
   SELECT COUNT(*) FROM tasks;          -- Should increase by 541
   SELECT COUNT(*) FROM task_assignees;  -- Should match multi-owner count
   SELECT status, COUNT(*) FROM tasks GROUP BY status;
   ```

### Post-Migration

8. **Smoke test.**
   - Open the application and verify tasks appear on the dashboard.
   - Spot-check 5-10 tasks against the original CSV for data accuracy.
   - Verify client filter shows newly imported clients.

9. **Record the migration.**
   - Log the backup file path, timestamp, and row counts.
   - Tag the migration in version control if applicable.

---

## Rollback Plan

### Scenario A: Rollback Before Any Other Changes

If no other data has been written after the migration:

```bash
pg_restore -c -d $DATABASE_URL backup_pre_tasklist_migration_YYYYMMDD_HHMMSS.dump
```

This restores the entire database to the pre-migration state.

### Scenario B: Selective Rollback (Other Changes Exist)

If new data has been created after the migration and must be preserved:

1. **Tag imported tasks at insert time** by setting a recognizable marker. Options:
   - Use a dedicated `template_data` JSON value: `{"source": "sharepoint_tasklist_migration", "migrated_at": "2026-03-26"}`.
   - Or record all imported task IDs in a separate migration log table.

2. **Delete in reverse dependency order:**
   ```sql
   -- 1. Remove assignee links for imported tasks
   DELETE FROM task_assignees
   WHERE task_id IN (
     SELECT id FROM tasks
     WHERE template_data->>'source' = 'sharepoint_tasklist_migration'
   );

   -- 2. Remove activity logs (if any were auto-created)
   DELETE FROM activity_logs
   WHERE task_id IN (
     SELECT id FROM tasks
     WHERE template_data->>'source' = 'sharepoint_tasklist_migration'
   );

   -- 3. Remove comments (if any were auto-created)
   DELETE FROM comments
   WHERE task_id IN (
     SELECT id FROM tasks
     WHERE template_data->>'source' = 'sharepoint_tasklist_migration'
   );

   -- 4. Remove the imported tasks
   DELETE FROM tasks
   WHERE template_data->>'source' = 'sharepoint_tasklist_migration';

   -- 5. Optionally remove clients/users created during migration
   -- Only if they have no other references
   DELETE FROM clients
   WHERE id NOT IN (SELECT DISTINCT client_id FROM tasks)
     AND created_at >= '2026-03-26';
   ```

3. **Verify:**
   ```sql
   SELECT COUNT(*) FROM tasks
   WHERE template_data->>'source' = 'sharepoint_tasklist_migration';
   -- Should return 0
   ```

---

## Edge Cases and Known Issues

| Issue | Handling |
|---|---|
| SharePoint ListSchema JSON in line 1 | Strip the first line before CSV parsing. The actual CSV header starts after the schema metadata. |
| BOM character (`\xEF\xBB\xBF`) | Strip BOM during file read. Most CSV parsers handle this automatically. |
| `Status` has variant spellings (`NotStarted` vs `Not started`) | Case-insensitive comparison after removing spaces. |
| Owner field contains display names instead of emails | Fall back to fuzzy matching against `users.name`, or log as unresolved. |
| Empty `顧客名` (client name) | Assign to fallback client `未分類`. |
| Duplicate task titles | Allow duplicates -- titles are not unique keys. |
| `DueDate` in inconsistent formats | Attempt parsing with multiple date formats: `YYYY-MM-DD`, `MM/DD/YYYY`, `YYYY/MM/DD`. Log failures. |
| `関連ファイル` contains SharePoint internal URLs | Import as-is. URLs may become stale after SharePoint decommission. |
| `更新日時` missing | Set `updated_at` and `created_at` to current migration timestamp. |
