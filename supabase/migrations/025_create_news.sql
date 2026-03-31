CREATE TABLE IF NOT EXISTS news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  content_html TEXT NOT NULL DEFAULT '',
  author_id UUID REFERENCES users(id),
  published_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_news_published ON news_articles(published_at DESC);

ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to news_articles"
  ON news_articles FOR ALL TO authenticated USING (true) WITH CHECK (true);
