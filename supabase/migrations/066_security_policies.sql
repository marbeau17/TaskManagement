-- 066_security_policies.sql
-- パスワード月次更新ポリシーのためのスキーマ拡張。
--   1. users.password_changed_at: 最終パスワード変更日時 (バナー/強制モーダルの判定に使用)
--   2. security_policies: 管理者が UI から日数を変更できるシングルトンテーブル
--   3. RLS: 認証ユーザーは読取り、admin のみ更新

-- ---------------------------------------------------------------------------
-- 1. users.password_changed_at
-- ---------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz DEFAULT now();

-- 既存ユーザーは現時点を初期値とする (NULL のままだと無期限経過扱いになるため)。
UPDATE public.users
  SET password_changed_at = COALESCE(password_changed_at, created_at, now())
  WHERE password_changed_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. security_policies (シングルトン: id = 1 のみ)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.security_policies (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  password_max_age_days int NOT NULL DEFAULT 30 CHECK (password_max_age_days BETWEEN 1 AND 365),
  warn_before_days int NOT NULL DEFAULT 7 CHECK (warn_before_days BETWEEN 0 AND 90),
  enforcement_mode text NOT NULL DEFAULT 'graduated'
    CHECK (enforcement_mode IN ('graduated', 'warn_only', 'strict')),
  reminder_email_enabled boolean NOT NULL DEFAULT true,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);

-- 初期レコード (id=1)
INSERT INTO public.security_policies (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.security_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS security_policies_select_all ON public.security_policies;
CREATE POLICY security_policies_select_all
  ON public.security_policies FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS security_policies_admin_update ON public.security_policies;
CREATE POLICY security_policies_admin_update
  ON public.security_policies FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- 4. password_changed_at の自動更新トリガー (オプション: パスワード変更フラグ用)
--    must_change_password が true → false に切り替わったタイミングでも更新。
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_users_password_changed_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- must_change_password の true→false 遷移を「パスワード変更完了」と見なす
  IF OLD.must_change_password = true AND NEW.must_change_password = false THEN
    NEW.password_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_password_changed_at ON public.users;
CREATE TRIGGER users_password_changed_at
  BEFORE UPDATE OF must_change_password ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_users_password_changed_at();
