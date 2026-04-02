-- Add category column to news_articles for release notes support
ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general'
  CHECK (category IN ('general', 'release', 'maintenance', 'important'));
CREATE INDEX IF NOT EXISTS idx_news_category ON news_articles(category);
