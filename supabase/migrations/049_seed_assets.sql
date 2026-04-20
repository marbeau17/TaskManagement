-- Seed Meets Consulting asset inventory from docs/資産管理表.csv (18 rows)
-- Rows 1-15 have a unique management_id and use ON CONFLICT DO NOTHING for idempotency.
-- Rows 16-18 have NULL management_id, so they are inserted separately with a
-- WHERE NOT EXISTS guard on (seq_no, name prefix) to keep this migration idempotent.

INSERT INTO assets (seq_no, name, acquired_date, acquired_price, management_id, owner_name, category, status) VALUES
  (1, 'レッツノート', '2021-02-23', 295700, 'MEETSモニター01', '伊藤', 'pc', 'in_use'),
  (2, 'iMac', '2021-08-10', 181800, 'MEETSモニター02', '安田', 'pc', 'in_use'),
  (3, 'PC', '2022-09-25', 140687, 'MEETSモニター03', '安田', 'pc', 'in_use'),
  (4, 'レッツノートSR4', '2023-09-14', 401973, 'MEETSモニター04', '渡邉', 'pc', 'in_use'),
  (5, '11インチIpad Proシルバー', '2025-08-06', 206000, 'MEETSモニター05', '渡邉', 'tablet', 'in_use'),
  (6, 'VAIO S13(安田)', '2025-09-19', 183300, 'MEETSモニター06', '瀧宮', 'pc', 'in_use'),
  (7, 'VAIO S13(渡邊)', '2025-09-19', 183300, 'MEETSモニター07', '太田', 'pc', 'in_use'),
  (8, '27インチPHILIPSモニター', '2025-09-29', NULL, 'MEETSモニター08', '太田', 'monitor', 'in_use'),
  (9, 'VAIO S13(瀧宮)', '2025-10-20', 181520, 'MEETSモニター09', NULL, 'pc', 'in_use'),
  (10, 'VAIO S13(太田)', '2025-12-08', 181520, 'MEETSモニター10', NULL, 'pc', 'in_use'),
  (11, '27インチIODATAモニター', '2026-01-07', 19780, 'MEETSモニター11', NULL, 'monitor', 'in_use'),
  (12, 'VAIO S13', NULL, NULL, 'MEETSモニター12', NULL, 'pc', 'in_use'),
  (13, 'Lenovo IdeaPad Pro 5 Gen 10 (16型 AMD)_ルナグレー', '2026-03-17', 208193, 'MEETSモニター13', NULL, 'pc', 'in_use'),
  (14, 'Lenovo IdeaPad Pro 5 Gen 10 (16型 AMD)_ルナグレー', '2026-03-17', 208193, 'MEETSモニター14', NULL, 'pc', 'in_use'),
  (15, 'Lenovo IdeaPad Pro 5 Gen 10 (16型 AMD)_ルナグレー', '2026-03-17', 208193, 'MEETSモニター15', NULL, 'pc', 'in_use')
ON CONFLICT (management_id) DO NOTHING;

-- Rows 16-18: NULL management_id, guard against re-insertion with WHERE NOT EXISTS.
INSERT INTO assets (seq_no, name, acquired_date, acquired_price, category, status)
SELECT 16, 'M5チップ搭載15インチ MacBook Air - シルバー(太田)', '2026-03-17', 279800, 'pc', 'in_use'
WHERE NOT EXISTS (SELECT 1 FROM assets WHERE seq_no = 16 AND name LIKE 'M5チップ%太田%');

INSERT INTO assets (seq_no, name, acquired_date, acquired_price, category, status)
SELECT 17, '15インチMacBook Air- ミッドナイト(Luca)', '2026-03-17', 309800, 'pc', 'in_use'
WHERE NOT EXISTS (SELECT 1 FROM assets WHERE seq_no = 17 AND name LIKE '15インチMacBook Air%Luca%');

INSERT INTO assets (seq_no, name, acquired_date, acquired_price, category, status)
SELECT 18, 'M5チップ搭載15インチ MacBook Air - シルバー (ラファエル)', '2026-03-17', 279800, 'pc', 'in_use'
WHERE NOT EXISTS (SELECT 1 FROM assets WHERE seq_no = 18 AND name LIKE 'M5チップ%ラファエル%');
