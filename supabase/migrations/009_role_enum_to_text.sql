-- Migration: Change role column from ENUM to TEXT for dynamic role management
-- This allows adding custom roles from the UI without DB schema changes.

ALTER TABLE users ALTER COLUMN role TYPE TEXT USING role::TEXT;
DROP TYPE IF EXISTS user_role;
