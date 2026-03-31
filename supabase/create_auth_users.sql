-- =============================================================================
-- WorkFlow TaskManagement - Supabase Auth Users Setup
-- =============================================================================
-- Auth users must be created so that Supabase authentication works.
-- The public.users table (created by setup_complete.sql) stores profile data,
-- while auth.users stores credentials.
--
-- IMPORTANT: The UUIDs here MUST match the public.users IDs exactly.
-- Password for all users: workflow2026
-- =============================================================================

-- =============================================================================
-- OPTION A: Via Supabase Dashboard (Recommended for production)
-- =============================================================================
-- Go to: Supabase Dashboard > Authentication > Users > Add User
-- Create each user with:
--   - Email: (see list below)
--   - Password: workflow2026
--   - Auto Confirm: ON
--
-- After creating via dashboard, you will need to UPDATE the auth.users UUID
-- to match the public.users UUID, OR re-insert public.users with the
-- dashboard-generated UUIDs.
--
-- User list:
--   1.  y.ito@meetsc.co.jp       (伊藤 祐太 - admin/CEO)
--   2.  o.yasuda@meetsc.co.jp    (安田 修 - director/COO)
--   3.  y.akimoto@meetsc.co.jp   (秋元 由美子 - creator)
--   4.  r.watanabe@meetsc.co.jp  (渡邊 梨紗 - creator)
--   5.  m.takimiya@meetsc.co.jp  (瀧宮 誠 - admin/Manager)
--   6.  h.ota@meetsc.co.jp      (太田 晴瑠 - creator)
--   7.  l.trabuio@meetsc.co.jp   (Luca Trabuio - creator)
--   8.  h.kadota@meetsc.co.jp    (角田 春華 - creator)
--   9.  r.agcaoili@meetsc.co.jp  (Rafael Agcaoili - creator)
--   10. m.takeuchi@meetsc.co.jp  (竹内 美鈴 - creator)
--   11. y.putra@meetsc.co.jp     (Yudi Dharma Putra - creator)

-- =============================================================================
-- OPTION B: Direct SQL insert into auth.users (requires service_role or superuser)
-- =============================================================================
-- This can be run in the Supabase SQL Editor.
-- The encrypted_password is bcrypt hash of 'workflow2026'.
-- Generated with: SELECT crypt('workflow2026', gen_salt('bf'));
-- =============================================================================

-- First, ensure the pgcrypto extension is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert auth users with matching UUIDs
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'y.ito@meetsc.co.jp',
    crypt('workflow2026', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "伊藤 祐太"}'::jsonb,
    '2020-01-01T00:00:00+09:00',
    '2020-01-01T00:00:00+09:00',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'o.yasuda@meetsc.co.jp',
    crypt('workflow2026', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "安田 修"}'::jsonb,
    '2020-01-01T00:00:00+09:00',
    '2020-01-01T00:00:00+09:00',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'y.akimoto@meetsc.co.jp',
    crypt('workflow2026', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "秋元 由美子"}'::jsonb,
    '2022-04-01T00:00:00+09:00',
    '2022-04-01T00:00:00+09:00',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'r.watanabe@meetsc.co.jp',
    crypt('workflow2026', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "渡邊 梨紗"}'::jsonb,
    '2023-01-01T00:00:00+09:00',
    '2023-01-01T00:00:00+09:00',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'm.takimiya@meetsc.co.jp',
    crypt('workflow2026', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "瀧宮 誠"}'::jsonb,
    '2021-04-01T00:00:00+09:00',
    '2021-04-01T00:00:00+09:00',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'h.ota@meetsc.co.jp',
    crypt('workflow2026', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "太田 晴瑠"}'::jsonb,
    '2023-04-01T00:00:00+09:00',
    '2023-04-01T00:00:00+09:00',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'l.trabuio@meetsc.co.jp',
    crypt('workflow2026', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Luca Trabuio"}'::jsonb,
    '2023-07-01T00:00:00+09:00',
    '2023-07-01T00:00:00+09:00',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'h.kadota@meetsc.co.jp',
    crypt('workflow2026', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "角田 春華"}'::jsonb,
    '2024-04-01T00:00:00+09:00',
    '2024-04-01T00:00:00+09:00',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000009',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'r.agcaoili@meetsc.co.jp',
    crypt('workflow2026', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Rafael Agcaoili"}'::jsonb,
    '2024-10-01T00:00:00+09:00',
    '2024-10-01T00:00:00+09:00',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'm.takeuchi@meetsc.co.jp',
    crypt('workflow2026', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "竹内 美鈴"}'::jsonb,
    '2025-01-01T00:00:00+09:00',
    '2025-01-01T00:00:00+09:00',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'y.putra@meetsc.co.jp',
    crypt('workflow2026', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"name": "Yudi Dharma Putra"}'::jsonb,
    '2025-04-01T00:00:00+09:00',
    '2025-04-01T00:00:00+09:00',
    '',
    ''
  );

-- Also insert identity records so email login works
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '{"sub": "00000000-0000-0000-0000-000000000001", "email": "y.ito@meetsc.co.jp"}'::jsonb, 'email', '00000000-0000-0000-0000-000000000001', now(), '2020-01-01T00:00:00+09:00', '2020-01-01T00:00:00+09:00'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', '{"sub": "00000000-0000-0000-0000-000000000002", "email": "o.yasuda@meetsc.co.jp"}'::jsonb, 'email', '00000000-0000-0000-0000-000000000002', now(), '2020-01-01T00:00:00+09:00', '2020-01-01T00:00:00+09:00'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', '{"sub": "00000000-0000-0000-0000-000000000003", "email": "y.akimoto@meetsc.co.jp"}'::jsonb, 'email', '00000000-0000-0000-0000-000000000003', now(), '2022-04-01T00:00:00+09:00', '2022-04-01T00:00:00+09:00'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000004', '{"sub": "00000000-0000-0000-0000-000000000004", "email": "r.watanabe@meetsc.co.jp"}'::jsonb, 'email', '00000000-0000-0000-0000-000000000004', now(), '2023-01-01T00:00:00+09:00', '2023-01-01T00:00:00+09:00'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000005', '{"sub": "00000000-0000-0000-0000-000000000005", "email": "m.takimiya@meetsc.co.jp"}'::jsonb, 'email', '00000000-0000-0000-0000-000000000005', now(), '2021-04-01T00:00:00+09:00', '2021-04-01T00:00:00+09:00'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000006', '{"sub": "00000000-0000-0000-0000-000000000006", "email": "h.ota@meetsc.co.jp"}'::jsonb, 'email', '00000000-0000-0000-0000-000000000006', now(), '2023-04-01T00:00:00+09:00', '2023-04-01T00:00:00+09:00'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000007', '{"sub": "00000000-0000-0000-0000-000000000007", "email": "l.trabuio@meetsc.co.jp"}'::jsonb, 'email', '00000000-0000-0000-0000-000000000007', now(), '2023-07-01T00:00:00+09:00', '2023-07-01T00:00:00+09:00'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000008', '{"sub": "00000000-0000-0000-0000-000000000008", "email": "h.kadota@meetsc.co.jp"}'::jsonb, 'email', '00000000-0000-0000-0000-000000000008', now(), '2024-04-01T00:00:00+09:00', '2024-04-01T00:00:00+09:00'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000009', '{"sub": "00000000-0000-0000-0000-000000000009", "email": "r.agcaoili@meetsc.co.jp"}'::jsonb, 'email', '00000000-0000-0000-0000-000000000009', now(), '2024-10-01T00:00:00+09:00', '2024-10-01T00:00:00+09:00'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000010', '{"sub": "00000000-0000-0000-0000-000000000010", "email": "m.takeuchi@meetsc.co.jp"}'::jsonb, 'email', '00000000-0000-0000-0000-000000000010', now(), '2025-01-01T00:00:00+09:00', '2025-01-01T00:00:00+09:00'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000011', '{"sub": "00000000-0000-0000-0000-000000000011", "email": "y.putra@meetsc.co.jp"}'::jsonb, 'email', '00000000-0000-0000-0000-000000000011', now(), '2025-04-01T00:00:00+09:00', '2025-04-01T00:00:00+09:00');

-- =============================================================================
-- OPTION C: Via Supabase Admin API (programmatic)
-- =============================================================================
-- Use the supabase-js admin client with service_role key:
--
-- import { createClient } from '@supabase/supabase-js'
-- const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
--   auth: { autoRefreshToken: false, persistSession: false }
-- })
--
-- const users = [
--   { id: '00000000-0000-0000-0000-000000000001', email: 'y.ito@meetsc.co.jp' },
--   { id: '00000000-0000-0000-0000-000000000002', email: 'o.yasuda@meetsc.co.jp' },
--   { id: '00000000-0000-0000-0000-000000000003', email: 'y.akimoto@meetsc.co.jp' },
--   { id: '00000000-0000-0000-0000-000000000004', email: 'r.watanabe@meetsc.co.jp' },
--   { id: '00000000-0000-0000-0000-000000000005', email: 'm.takimiya@meetsc.co.jp' },
--   { id: '00000000-0000-0000-0000-000000000006', email: 'h.ota@meetsc.co.jp' },
--   { id: '00000000-0000-0000-0000-000000000007', email: 'l.trabuio@meetsc.co.jp' },
--   { id: '00000000-0000-0000-0000-000000000008', email: 'h.kadota@meetsc.co.jp' },
--   { id: '00000000-0000-0000-0000-000000000009', email: 'r.agcaoili@meetsc.co.jp' },
--   { id: '00000000-0000-0000-0000-000000000010', email: 'm.takeuchi@meetsc.co.jp' },
--   { id: '00000000-0000-0000-0000-000000000011', email: 'y.putra@meetsc.co.jp' },
-- ]
--
-- for (const u of users) {
--   await supabase.auth.admin.createUser({
--     uid: u.id,
--     email: u.email,
--     password: 'workflow2026',
--     email_confirm: true,
--   })
-- }

-- =============================================================================
-- EXECUTION ORDER:
-- 1. Run setup_complete.sql first (creates tables + public.users data)
-- 2. Run this file (create_auth_users.sql) to create auth credentials
-- 3. Users can now log in with email + password 'workflow2026'
-- =============================================================================
