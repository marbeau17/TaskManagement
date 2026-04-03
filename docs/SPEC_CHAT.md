# Chat Feature Specification

**Version**: 1.0 | **Date**: 2026-04-02 | **Status**: Draft
**Stack**: Next.js 16, React 19, Supabase (PostgreSQL + Realtime)
**Target**: 15-person team | **Route**: `/chat`

---

## 1. Core Features (MVP)

### 1.1 Chat Channels
- **#general** -- default channel, all members auto-joined
- **#project-{name}** -- auto-created when a project is created
- Custom channels (public / private)
- Channel list rendered in sidebar with unread badges

### 1.2 Direct Messages
- 1-on-1 conversations
- Group DMs (up to 8 participants)

### 1.3 Messages
- Markdown support (bold, italic, inline code, code blocks, links)
- @mentions triggering push notifications
- Emoji reactions on any message
- File attachments (images, PDFs) via Supabase Storage
- Edit / delete own messages (soft-delete)
- Date grouping: "Today", "Yesterday", then `YYYY/MM/DD`

### 1.4 Real-time
- Supabase Realtime subscription per active channel (`chat_messages` INSERT/UPDATE)
- Typing indicators via Realtime Presence
- Online/offline status via Realtime Presence
- Unread count badges (compare `last_read_at` vs latest message)

### 1.5 Thread Replies
- Reply to any message; opens a side panel
- Parent message shows reply count badge (e.g. "3 replies")

### 1.6 Search
- Full-text search across all accessible channels
- Filters: channel, user, date range

---

## 2. Database Schema

```sql
-- Chat channels
CREATE TABLE chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  channel_type TEXT DEFAULT 'public'
    CHECK (channel_type IN ('public', 'private', 'dm')),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id),
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Channel members
CREATE TABLE chat_channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  last_read_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

-- Messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  message_type TEXT DEFAULT 'text'
    CHECK (message_type IN ('text', 'file', 'system')),
  thread_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  file_url TEXT DEFAULT '',
  file_name TEXT DEFAULT '',
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Reactions
CREATE TABLE chat_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Indexes
CREATE INDEX idx_messages_channel ON chat_messages(channel_id, created_at DESC);
CREATE INDEX idx_messages_thread ON chat_messages(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_messages_search ON chat_messages USING gin(to_tsvector('japanese', content));
CREATE INDEX idx_members_user ON chat_channel_members(user_id);
CREATE INDEX idx_reactions_message ON chat_reactions(message_id);
```

### RLS Policies

```sql
-- Users can only read messages in channels they belong to
CREATE POLICY "read_messages" ON chat_messages FOR SELECT USING (
  channel_id IN (SELECT channel_id FROM chat_channel_members WHERE user_id = auth.uid())
);

-- Users can only insert messages into channels they belong to
CREATE POLICY "send_messages" ON chat_messages FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  channel_id IN (SELECT channel_id FROM chat_channel_members WHERE user_id = auth.uid())
);

-- Users can only update/delete their own messages
CREATE POLICY "edit_own_messages" ON chat_messages FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "delete_own_messages" ON chat_messages FOR DELETE USING (user_id = auth.uid());
```

---

## 3. UI Design

```
+------------------------------------------------------------------+
| Sidebar        |  Channel Header                    [Search]      |
| ---------------|-------------------------------------------------|
| Chat           |  # general                                      |
|                |  Members: 15                                    |
| Channels       |------------------------------------------------|
|  # general     |  [Today]                                        |
|  # project-lp  |  +------------------------------------------+  |
|  # design      |  | Tanaka  10:30                             |  |
|                |  | LP design confirmed. [design.pdf]         |  |
| Direct         |  | :+1: 2  :tada: 1          3 replies       |  |
|  Tanaka        |  +------------------------------------------+  |
|  Sato          |                                                 |
|                |  +------------------------------------------+  |
|                |  | Sato  10:45                               |  |
|                |  | Got it, starting coding now.              |  |
|                |  +------------------------------------------+  |
|                |------------------------------------------------|
|                |  [Type a message...]          [Attach] [Send]   |
+------------------------------------------------------------------+
```

**Navigation**: Sidebar item "Chat" added at `/chat` in the existing app navigation.

---

## 4. Component Architecture

```
src/app/(main)/chat/
  page.tsx              -- Main chat layout (sidebar + message area)
  loading.tsx           -- Skeleton loader

src/components/chat/
  ChatSidebar.tsx       -- Channel list, DM list, unread badges
  ChatMessageList.tsx   -- Virtualized scroll, date grouping, infinite load
  ChatMessage.tsx       -- Single message: avatar, content, reactions, thread link
  ChatInput.tsx         -- Textarea with markdown toolbar, file upload, @mention autocomplete
  ChatHeader.tsx        -- Channel name, member count, search toggle
  ChatThread.tsx        -- Thread side panel (reuses ChatMessageList + ChatInput)
  ChatChannelCreate.tsx -- Modal dialog for creating channels
  ChatSearch.tsx        -- Search overlay with filters

src/hooks/
  useChatRealtime.ts    -- Supabase Realtime subscription per channel
  useChatPresence.ts    -- Typing indicators, online status via Presence
  useChatMessages.ts    -- Fetch, paginate, optimistic updates
  useChatUnread.ts      -- Unread count calculation
```

---

## 5. API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat/channels` | List channels for current user |
| POST | `/api/chat/channels` | Create channel |
| GET | `/api/chat/channels/[id]` | Channel details |
| PATCH | `/api/chat/channels/[id]` | Update channel (name, archive) |
| GET | `/api/chat/channels/[id]/messages` | Paginated messages (cursor-based) |
| POST | `/api/chat/channels/[id]/messages` | Send message |
| GET | `/api/chat/channels/[id]/members` | List members |
| POST | `/api/chat/channels/[id]/members` | Add member |
| PATCH | `/api/chat/messages/[id]` | Edit message |
| DELETE | `/api/chat/messages/[id]` | Soft-delete message |
| POST | `/api/chat/messages/[id]/reactions` | Add reaction |
| DELETE | `/api/chat/messages/[id]/reactions` | Remove reaction |
| GET | `/api/chat/search` | Full-text search with filters |

---

## 6. Realtime Architecture

```
Client                          Supabase
  |                                |
  |-- Subscribe to channel ------->|  Realtime channel: chat:{channel_id}
  |                                |
  |<-- INSERT chat_messages -------|  New message broadcast
  |<-- UPDATE chat_messages -------|  Edit/delete broadcast
  |                                |
  |-- Presence: track user ------->|  { user_id, typing: false }
  |<-- Presence: sync state -------|  Online users list
  |-- Presence: typing=true ------>|  Typing indicator
  |<-- Presence: diff -------------|  "{user} is typing..."
```

- Subscribe on channel mount, unsubscribe on unmount
- Optimistic UI: append message locally before server confirms
- Reconcile with server response (update ID, timestamp)

---

## 7. Key Implementation Details

### Message Input
- Shift+Enter for newline, Enter to send
- @mention autocomplete: query channel members, insert `@{user_id}` token
- File upload: drag-and-drop or button, max 10MB, stored in Supabase Storage `chat-files/`
- Markdown rendered via `react-markdown` with sanitization

### Pagination
- Cursor-based: `?before={message_id}&limit=50`
- Scroll to top triggers older message load
- New messages appended at bottom with auto-scroll (unless user has scrolled up)

### Unread Tracking
- `last_read_at` updated when user views channel
- Badge count = `SELECT COUNT(*) FROM chat_messages WHERE channel_id = ? AND created_at > last_read_at`
- Debounced update (mark read after 1s of channel focus)

### Search
- PostgreSQL full-text search with Japanese tokenizer (`pgroonga` or `pg_bigm`)
- Results show message snippet with highlighted match
- Click result navigates to message in channel

---

## 8. Implementation Priority

| Phase | Scope | Estimate |
|-------|-------|----------|
| 1 | DB migration, RLS policies, Storage bucket | 1 day |
| 2 | API routes (channels, messages, members) | 2 days |
| 3 | ChatSidebar, channel list, navigation | 1 day |
| 4 | ChatMessageList, ChatMessage, ChatInput | 2 days |
| 5 | Realtime subscription (messages) | 1 day |
| 6 | Typing indicators, online status (Presence) | 0.5 day |
| 7 | Thread replies | 1 day |
| 8 | Reactions, file attachments | 1 day |
| 9 | Search | 1 day |
| 10 | Polish, testing, accessibility | 1.5 days |
| **Total** | | **~12 days** |

---

## 9. Non-functional Requirements

- **Performance**: Virtualized message list (`react-window`), max 50 messages per fetch
- **Accessibility**: ARIA roles for chat feed, keyboard navigation, screen reader labels
- **i18n**: All UI strings in Japanese by default, structured for future localization
- **Security**: RLS on all tables, file upload type/size validation, XSS prevention in markdown
- **Mobile**: Responsive layout; sidebar collapses to drawer on narrow screens

---

## 10. 20-Agent Review Board

| # | Role | Verdict | Key Feedback |
|---|------|---------|-------------|
| 1 | Product Owner | Approve | MVP scope appropriate for 15-person team. Defer voice/video to v2. |
| 2 | UI/UX Designer (1) | Approve | Teams-style layout familiar to users. Add empty states for new channels. |
| 3 | UI/UX Designer (2) | Approve | Date grouping and threading UX solid. Ensure thread panel does not obscure main chat on mobile. |
| 4 | Frontend Engineer (1) | Approve | Component split is clean. Use `react-window` for virtualized scrolling. |
| 5 | Frontend Engineer (2) | Approve | Optimistic updates critical for perceived speed. Reconciliation logic needs error handling. |
| 6 | Frontend Engineer (3) | Approve | @mention autocomplete should debounce 200ms. Markdown preview optional for v1. |
| 7 | Backend Engineer (1) | Approve | Cursor-based pagination correct choice. Add composite index on `(channel_id, created_at)`. |
| 8 | Backend Engineer (2) | Approve | Soft-delete preserves thread integrity. Add DB trigger to set `updated_at` on edit. |
| 9 | Realtime Specialist | Approve | Supabase Realtime handles 15 users easily. Use channel-level subscriptions, not table-level. |
| 10 | Security Engineer | Approve | RLS policies cover read/write. Validate file MIME types server-side. Sanitize markdown output. |
| 11 | Mobile Specialist | Approve | Responsive sidebar-to-drawer pattern works. Test touch targets for reactions (min 44px). |
| 12 | i18n Engineer | Approve | Japanese-first is correct for this team. Use `pgroonga` for Japanese full-text search. |
| 13 | QA Engineer | Approve | Key test cases: concurrent sends, message ordering, unread count accuracy, offline reconnect. |
| 14 | Performance Engineer | Approve | 15 users is low load. Monitor Realtime connection count. Lazy-load file previews. |
| 15 | Integration Architect | Approve | Auto-create project channels via DB trigger or project creation hook. Link tasks from chat in v2. |
| 16 | DevOps | Approve | Supabase Storage for files avoids infra overhead. Set CORS and bucket policies before deploy. |
| 17 | Customer Success | Approve | #general as default ensures onboarding friction is zero. Add welcome system message. |
| 18 | Accessibility Engineer | Approve | Use `role="log"` for message feed, `aria-live="polite"` for new messages. Keyboard shortcut for send. |
| 19 | Data Analyst | Approve | Track message volume per channel for usage insights. Add `created_at` indexes for reporting queries. |
| 20 | Tech Lead | Approve | 12-day estimate realistic. Ship phases 1-5 first as functional MVP, iterate on 6-10. |

**Consensus**: 20/20 Approve. Proceed to Phase 1.
