-- Microsoft 365 Calendar Integration
-- Migration: 039_ms365_calendar.sql

-- 1. OAuth tokens per user
CREATE TABLE IF NOT EXISTS ms365_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL DEFAULT '',
  refresh_token TEXT NOT NULL DEFAULT '',
  token_expires_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scopes TEXT DEFAULT 'Calendars.Read User.Read',
  ms_user_id TEXT DEFAULT '',
  connected_at TIMESTAMPTZ DEFAULT now(),
  last_sync_at TIMESTAMPTZ,
  UNIQUE(user_id)
);

-- 2. Synced calendar events
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ms_event_id TEXT NOT NULL DEFAULT '',
  subject TEXT DEFAULT '',
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  is_all_day BOOLEAN DEFAULT false,
  sensitivity TEXT DEFAULT 'normal',
  show_as TEXT DEFAULT 'busy',
  is_cancelled BOOLEAN DEFAULT false,
  is_recurring BOOLEAN DEFAULT false,
  organizer_name TEXT DEFAULT '',
  organizer_email TEXT DEFAULT '',
  location TEXT DEFAULT '',
  response_status TEXT DEFAULT '',
  synced_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, ms_event_id)
);

CREATE INDEX IF NOT EXISTS idx_cal_events_user_date ON calendar_events(user_id, start_at);
CREATE INDEX IF NOT EXISTS idx_cal_events_date ON calendar_events(start_at, end_at);

-- RLS
ALTER TABLE ms365_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ms365_tokens_all" ON ms365_tokens FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cal_events_all" ON calendar_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add meeting_hours to workload tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS ms365_connected BOOLEAN DEFAULT false;
