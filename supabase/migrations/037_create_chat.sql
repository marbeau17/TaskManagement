-- Chat Feature — Teams/Slack-style messaging
-- Migration: 037_create_chat.sql

-- 1. Channels
CREATE TABLE IF NOT EXISTS chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  channel_type TEXT DEFAULT 'public' CHECK (channel_type IN ('public', 'private', 'dm')),
  project_id UUID,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_archived BOOLEAN DEFAULT false,
  avatar_emoji TEXT DEFAULT '💬',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_channels_type ON chat_channels(channel_type);

-- 2. Channel Members
CREATE TABLE IF NOT EXISTS chat_channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  last_read_at TIMESTAMPTZ DEFAULT now(),
  notifications_enabled BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_members_channel ON chat_channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_channel_members(user_id);

-- 3. Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system')),
  thread_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  reply_count INTEGER DEFAULT 0,
  file_url TEXT DEFAULT '',
  file_name TEXT DEFAULT '',
  file_size INTEGER DEFAULT 0,
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  mentions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_search ON chat_messages USING gin(to_tsvector('simple', content));

-- 4. Reactions
CREATE TABLE IF NOT EXISTS chat_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_chat_reactions_message ON chat_reactions(message_id);

-- RLS
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_channels_all" ON chat_channels FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "chat_members_all" ON chat_channel_members FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "chat_messages_all" ON chat_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "chat_reactions_all" ON chat_reactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable Realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Seed default #general channel
INSERT INTO chat_channels (name, description, channel_type, avatar_emoji)
VALUES ('general', '全体チャンネル — 全メンバーが参加しています', 'public', '🏠')
ON CONFLICT DO NOTHING;
