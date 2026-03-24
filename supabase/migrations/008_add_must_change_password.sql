ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT true;
-- Set existing users to false (they already have passwords)
UPDATE users SET must_change_password = false;
