-- Store admin-editable org chart structure as a singleton JSONB row
CREATE TABLE IF NOT EXISTS org_chart_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES users(id)
);

-- Seed the initial org structure matching docs/org.html
INSERT INTO org_chart_config (data) VALUES ('
{
  "role": "代表取締役社長 CEO",
  "name": "伊藤 祐太",
  "theme": "navy",
  "children": [
    {
      "role": "専務取締役 COO",
      "name": "安田 修",
      "theme": "slate",
      "children": [
        {
          "role": "セールス＆マーケティング本部",
          "name": "部長 安田 修 (ACT)",
          "theme": "blue",
          "children": [
            { "role": "アライアンス＆セールスマネージャー", "name": "渡邊 梨紗", "theme": "blue-light" },
            { "role": "DX/AI営業マネージャー", "name": "採用予定①", "theme": "orange-light" }
          ]
        },
        {
          "role": "カスタマーサクセス部",
          "name": "部長 安田 修 (ACT)",
          "theme": "green",
          "children": [
            { "role": "採用予定①", "theme": "orange-light" },
            { "role": "採用予定②", "theme": "orange-light" },
            { "role": "採用予定③", "theme": "orange-light" }
          ]
        },
        {
          "role": "ソリューション本部",
          "name": "本部長 安田 修 (ACT)",
          "theme": "gold",
          "children": [
            {
              "role": "コンサルティング＆\nオペレーション部",
              "theme": "gold",
              "children": [
                { "role": "経営コンサルタント", "name": "伊藤 祐太", "theme": "gold-light" },
                { "role": "DXAIコンサルタント", "name": "安田 修", "theme": "gold-light" },
                {
                  "role": "ECマネージャー",
                  "name": "瀧宮 誠",
                  "theme": "gold-light",
                  "children": [
                    { "role": "スペシャリスト", "name": "太田 晴瑠", "theme": "gold-light" },
                    { "role": "スペシャリスト", "name": "竹内 美鈴", "theme": "gold-light" },
                    { "role": "スペシャリスト", "name": "桑原 和海", "theme": "gold-light" },
                    { "role": "ECコンサルタント", "name": "採用予定①", "theme": "orange-light" },
                    { "role": "スペシャリスト", "name": "採用予定②", "theme": "orange-light" }
                  ]
                }
              ]
            },
            {
              "role": "システム開発部",
              "theme": "gold",
              "children": [
                {
                  "role": "マネージャー",
                  "name": "採用予定①",
                  "theme": "orange-light",
                  "children": [
                    { "role": "シニアエンジニア", "name": "Yudi Dharma Putra", "theme": "gold-light" },
                    { "role": "エンジニア", "name": "Trabuio Luca", "theme": "gold-light" },
                    { "role": "エンジニア", "name": "Agcaoili Rafael", "theme": "gold-light" }
                  ]
                }
              ]
            }
          ]
        },
        {
          "role": "ビジネスサポート本部",
          "name": "部長 伊藤 祐太 (ACT)",
          "theme": "red",
          "children": [
            { "role": "スペシャリスト", "name": "秋元 由美子", "theme": "red-light" },
            { "role": "採用予定①", "theme": "orange-light" }
          ]
        }
      ]
    }
  ]
}
'::jsonb);

ALTER TABLE org_chart_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to org_chart_config"
  ON org_chart_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
