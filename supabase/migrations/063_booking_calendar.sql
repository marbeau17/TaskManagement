-- 063_booking_calendar.sql — Multi-category booking with MS365-calendar-driven availability
-- Extends existing booking_slots (046) with:
--   * booking_categories         — public-facing consultation categories
--   * booking_category_consultants — which users handle which categories
--   * booking_working_hours      — per-user weekly availability windows
--   * booking_slots columns      — category/consultant linkage, richer status, cancel tokens
-- MS365 sync target (calendar_events, ms365_tokens in migration 039) is consumed by the
-- application layer to compute free/busy against booking_working_hours; no FK needed here.

-- ---------------------------------------------------------------------------
-- Table: booking_categories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS booking_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  duration_min INTEGER NOT NULL DEFAULT 30,
  buffer_min INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT DEFAULT '',
  color TEXT DEFAULT '#6FB5A3',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed the 5 public categories (idempotent via slug uniqueness).
INSERT INTO booking_categories (slug, title, description, duration_min, buffer_min, is_public, display_order, icon, color) VALUES
  ('ec-comprehensive', 'EC事業 総合診断', 'EC事業全体の売上・運営・組織を俯瞰し、成長のボトルネックを特定します。自社ECとモール双方の現状を整理したい方におすすめです。', 60, 0, true, 1, '🛒', '#6FB5A3'),
  ('logistics-backyard', '物流・バックヤード効率化診断', '在庫・出荷・返品など物流工程の無駄をあぶり出し、工数とコストの最適化プランを提示します。繁忙期前の棚卸しにも最適です。', 60, 0, true, 2, '📦', '#E09B5A'),
  ('ec-mall-strategy', 'ECモール別 攻略度診断', '楽天・Amazon・Yahoo!・Qoo10などモール別のKPIと施策状況を点検し、勝てるモール戦略を提案します。', 60, 0, true, 3, '🏪', '#7B9BD4'),
  ('ai-dx-adoption', 'AI/DX浸透度診断', '社内のAI/DXツール活用状況をヒアリングし、業務自動化と意思決定高速化の打ち手を整理します。', 60, 0, true, 4, '🤖', '#9B7BC4'),
  ('repeater-ltv', 'リピーター育成・LTV診断', 'CRM施策・メール/LINE運用・会員ランク設計を点検し、LTV最大化に向けた優先アクションを提示します。', 60, 0, true, 5, '💎', '#D47B9B')
ON CONFLICT (slug) DO NOTHING;

-- Legacy category for backfilling existing booking_slots rows (created by migration 046).
INSERT INTO booking_categories (slug, title, description, is_public, display_order)
VALUES ('legacy-advisory', '経営相談会（旧）', '旧システムからの移行データ', false, 99)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Table: booking_category_consultants
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS booking_category_consultants (
  category_id UUID NOT NULL REFERENCES booking_categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (category_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_cat_consultants_cat ON booking_category_consultants(category_id);
CREATE INDEX IF NOT EXISTS idx_booking_cat_consultants_user ON booking_category_consultants(user_id);

-- ---------------------------------------------------------------------------
-- Table: booking_working_hours
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS booking_working_hours (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL DEFAULT '10:00',
  end_time TIME NOT NULL DEFAULT '17:00',
  is_active BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (user_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_booking_working_hours_user ON booking_working_hours(user_id);

-- ---------------------------------------------------------------------------
-- Extend booking_slots (created in migration 046)
-- ---------------------------------------------------------------------------
ALTER TABLE booking_slots
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES booking_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS consultant_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available','pending','confirmed','cancelled')),
  ADD COLUMN IF NOT EXISTS booked_by_phone TEXT,
  ADD COLUMN IF NOT EXISTS booked_by_message TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_token UUID UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_reason TEXT;

-- Backfill: link legacy rows to the legacy category.
UPDATE booking_slots
SET category_id = (SELECT id FROM booking_categories WHERE slug = 'legacy-advisory')
WHERE category_id IS NULL;

-- Backfill: migrate old is_available boolean into new status enum.
-- Rows default to 'available'; flip to 'confirmed' where the legacy boolean says booked.
UPDATE booking_slots
SET status = CASE WHEN is_available THEN 'available' ELSE 'confirmed' END
WHERE status = 'available' AND is_available = false;

-- New indexes on the extended columns.
CREATE INDEX IF NOT EXISTS idx_booking_slots_category ON booking_slots(category_id);
CREATE INDEX IF NOT EXISTS idx_booking_slots_consultant ON booking_slots(consultant_user_id);
CREATE INDEX IF NOT EXISTS idx_booking_slots_status ON booking_slots(status);
CREATE INDEX IF NOT EXISTS idx_booking_slots_cancel_token ON booking_slots(cancellation_token);

-- ---------------------------------------------------------------------------
-- RLS: booking_categories
-- ---------------------------------------------------------------------------
ALTER TABLE booking_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated select booking_categories" ON booking_categories;
CREATE POLICY "Allow authenticated select booking_categories"
  ON booking_categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated full access to booking_categories" ON booking_categories;
CREATE POLICY "Allow authenticated full access to booking_categories"
  ON booking_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read booking_categories" ON booking_categories;
CREATE POLICY "Allow public read booking_categories"
  ON booking_categories FOR SELECT TO anon USING (is_public = true);

-- ---------------------------------------------------------------------------
-- RLS: booking_category_consultants
-- ---------------------------------------------------------------------------
ALTER TABLE booking_category_consultants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to booking_category_consultants" ON booking_category_consultants;
CREATE POLICY "Allow authenticated full access to booking_category_consultants"
  ON booking_category_consultants FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read booking_category_consultants" ON booking_category_consultants;
CREATE POLICY "Allow public read booking_category_consultants"
  ON booking_category_consultants FOR SELECT TO anon USING (
    EXISTS (
      SELECT 1 FROM booking_categories c
      WHERE c.id = category_id AND c.is_public
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: booking_working_hours
-- ---------------------------------------------------------------------------
ALTER TABLE booking_working_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to booking_working_hours" ON booking_working_hours;
CREATE POLICY "Allow authenticated full access to booking_working_hours"
  ON booking_working_hours FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- No anon access to booking_working_hours.

-- ---------------------------------------------------------------------------
-- Trigger: auto-update updated_at on booking_categories
-- Reuses trigger_set_updated_at() defined in migration 007.
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_booking_categories_updated_at ON booking_categories;
CREATE TRIGGER set_booking_categories_updated_at
  BEFORE UPDATE ON booking_categories
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();
