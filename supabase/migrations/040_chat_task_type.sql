-- Add 'task' to chat_channels channel_type check constraint
ALTER TABLE chat_channels DROP CONSTRAINT IF EXISTS chat_channels_channel_type_check;
ALTER TABLE chat_channels ADD CONSTRAINT chat_channels_channel_type_check
  CHECK (channel_type IN ('public', 'private', 'dm', 'task'));
