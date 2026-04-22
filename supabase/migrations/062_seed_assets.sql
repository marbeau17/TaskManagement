-- 062_seed_assets.sql
-- Seed the assets table from docs/資産管理表.csv (Meets Consulting 資産一覧).
--
-- Idempotent: rows with a management_id use ON CONFLICT DO NOTHING.
-- Rows without a management_id (16–18) use WHERE NOT EXISTS by (name, acquired_date).
-- owner_user_id is resolved from users.name; when no match, owner_name is kept free-text.

-- Rows with management_id (1–15) ---------------------------------------------

INSERT INTO assets (seq_no, name, acquired_date, acquired_price, management_id, owner_name, owner_user_id, category, status)
SELECT v.seq_no, v.name, v.acquired_date::date, v.acquired_price, v.management_id, v.owner_name,
       u.id, v.category, 'in_use'
FROM (VALUES
  (1,  'レッツノート',                                          '2021-02-23', 295700::numeric, 'MEETSモニター01', '伊藤',  'pc'),
  (2,  'iMac',                                                  '2021-08-10', 181800::numeric, 'MEETSモニター02', '安田',  'pc'),
  (3,  'PC',                                                    '2022-09-25', 140687::numeric, 'MEETSモニター03', '安田',  'pc'),
  (4,  'レッツノートSR4',                                       '2023-09-14', 401973::numeric, 'MEETSモニター04', '渡邉',  'pc'),
  (5,  '11インチiPad Pro シルバー',                             '2025-08-06', 206000::numeric, 'MEETSモニター05', '渡邉',  'tablet'),
  (6,  'VAIO S13 (安田)',                                       '2025-09-19', 183300::numeric, 'MEETSモニター06', '瀧宮',  'pc'),
  (7,  'VAIO S13 (渡邊)',                                       '2025-09-19', 183300::numeric, 'MEETSモニター07', '太田',  'pc'),
  (8,  '27インチ PHILIPS モニター',                             '2025-09-29', NULL::numeric,   'MEETSモニター08', '太田',  'monitor'),
  (9,  'VAIO S13 (瀧宮)',                                       '2025-10-20', 181520::numeric, 'MEETSモニター09', NULL,    'pc'),
  (10, 'VAIO S13 (太田)',                                       '2025-12-08', 181520::numeric, 'MEETSモニター10', NULL,    'pc'),
  (11, '27インチ IODATA モニター',                              '2026-01-07', 19780::numeric,  'MEETSモニター11', NULL,    'monitor'),
  (12, 'VAIO S13',                                              NULL,         NULL::numeric,   'MEETSモニター12', NULL,    'pc'),
  (13, 'Lenovo IdeaPad Pro 5 Gen 10 (16型 AMD) ルナグレー',     '2026-03-17', 208193::numeric, 'MEETSモニター13', NULL,    'pc'),
  (14, 'Lenovo IdeaPad Pro 5 Gen 10 (16型 AMD) ルナグレー',     '2026-03-17', 208193::numeric, 'MEETSモニター14', NULL,    'pc'),
  (15, 'Lenovo IdeaPad Pro 5 Gen 10 (16型 AMD) ルナグレー',     '2026-03-17', 208193::numeric, 'MEETSモニター15', NULL,    'pc')
) AS v(seq_no, name, acquired_date, acquired_price, management_id, owner_name, category)
LEFT JOIN users u ON v.owner_name IS NOT NULL AND u.name = v.owner_name
ON CONFLICT (management_id) DO NOTHING;

-- Rows without management_id (16–18) ------------------------------------------
-- Rely on (name, acquired_date) uniqueness via NOT EXISTS check.

INSERT INTO assets (seq_no, name, acquired_date, acquired_price, owner_name, category, status)
SELECT v.seq_no, v.name, v.acquired_date::date, v.acquired_price, v.owner_name, v.category, 'in_use'
FROM (VALUES
  (16, 'M5チップ搭載15インチ MacBook Air シルバー (太田)',      '2026-03-17', 279800::numeric, NULL::text, 'pc'),
  (17, '15インチ MacBook Air ミッドナイト (Luca)',              '2026-03-17', 309800::numeric, NULL::text, 'pc'),
  (18, 'M5チップ搭載15インチ MacBook Air シルバー (ラファエル)','2026-03-17', 279800::numeric, NULL::text, 'pc')
) AS v(seq_no, name, acquired_date, acquired_price, owner_name, category)
WHERE NOT EXISTS (
  SELECT 1 FROM assets a
  WHERE a.name = v.name
    AND a.acquired_date = v.acquired_date::date
    AND a.seq_no = v.seq_no
);
