-- =============================================================================
-- 001: Users table
-- =============================================================================

CREATE TYPE user_role AS ENUM ('admin', 'director', 'requester', 'creator');
CREATE TYPE avatar_color AS ENUM ('av-a', 'av-b', 'av-c', 'av-d', 'av-e');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_short TEXT,
  role user_role NOT NULL DEFAULT 'creator',
  avatar_color avatar_color DEFAULT 'av-a',
  weekly_capacity_hours NUMERIC(4,1) DEFAULT 16.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for active user lookups
CREATE INDEX idx_users_active ON users (is_active) WHERE is_active = true;
CREATE INDEX idx_users_role ON users (role);
