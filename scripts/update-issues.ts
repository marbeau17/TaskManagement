import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ewlxqiowzdebksykxvuv.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface IssueUpdate {
  issueKeys: string[]  // try multiple key formats
  label: string
  status: string
  resolution_notes: string
}

const updates: IssueUpdate[] = [
  {
    issueKeys: ['WEB-36', 'WEB,-36'],
    label: 'WEB-36 (先方の確認待ちステータス)',
    status: 'resolved',
    resolution_notes: `【RCA】タスクの進捗状況が4段階（待ち/未着手/進行中/完了）のみで、先方の確認待ちでストップしている状態を表現できなかった。\n【対応】新しいタスクステータス「確認中(reviewing)」を追加。DB migration、型定義、UI（タブ/カンバン/レポート）、ステータス遷移ロジックを一括対応。進行中→確認中→完了/差し戻しの遷移フローを実装。\n【変更ファイル】042_add_reviewing_status.sql, database.ts, constants.ts, translations.ts, TaskStatusTabs.tsx, KanbanBoard.tsx, StatusDistributionChart.tsx, tasks.ts, ProgressInput.tsx, GanttRow.tsx, import/tasks/route.ts`,
  },
  {
    issueKeys: ['MEETS-1', 'MEETS,-1'],
    label: 'MEETS-1 (パイプラインの合計値)',
    status: 'resolved',
    resolution_notes: `【RCA】パイプラインの合計行が全データ(opportunities)から計算されており、フィルター適用時もフィルター前の合計値が表示されていた。filteredOpportunitiesではなくopportunitiesを参照していたことが原因。\n【対応】合計行の計算をfilteredOpportunitiesに変更し、フィルター適用中は「(フィルター適用中)」ラベルを表示するよう修正。\n【変更ファイル】pipeline/page.tsx`,
  },
  {
    issueKeys: ['WEB-3', 'WEB,-3'],
    label: 'WEB-3 (日付入力のTab動作)',
    status: 'resolved',
    resolution_notes: `【RCA】ブラウザ標準の<input type="date">を使用しており、Tab押下時にYYYY→MM→DDの各セグメント間を移動できず、次のフォーム要素にフォーカスが移動してしまっていた。\n【対応】カスタムDateInputコンポーネントを新規作成。3つのテキスト入力(YYYY/MM/DD)で構成し、Tab/Shift+Tabでセグメント間移動、数字入力完了時の自動advance機能を実装。TaskForm、TaskDetailInfo、AssignFormの日付入力を置換。\n【変更ファイル】DateInput.tsx(新規), shared/index.ts, TaskDetailInfo.tsx, TaskForm.tsx, AssignForm.tsx`,
  },
]

async function main() {
  console.log('=== Issue Update Script ===\n')

  for (const update of updates) {
    console.log(`--- Processing: ${update.label} ---`)

    // Try each possible key format
    let found = false
    for (const key of update.issueKeys) {
      const { data: issues, error: findError } = await supabase
        .from('issues')
        .select('id, issue_key, status, title')
        .eq('issue_key', key)

      if (findError) {
        console.error(`  Error searching for ${key}:`, findError.message)
        continue
      }

      if (!issues || issues.length === 0) {
        console.log(`  Not found with key: ${key}`)
        continue
      }

      const issue = issues[0]
      console.log(`  Found: id=${issue.id}, key=${issue.issue_key}, status=${issue.status}, title=${issue.title}`)

      // Update the issue
      const { data: updated, error: updateError } = await supabase
        .from('issues')
        .update({
          status: update.status,
          resolution_notes: update.resolution_notes,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', issue.id)
        .select('id, issue_key, status, resolved_at')
        .single()

      if (updateError) {
        console.error(`  Update error:`, updateError.message)
      } else {
        console.log(`  Updated successfully:`, updated)
      }

      found = true
      break
    }

    if (!found) {
      console.log(`  WARNING: Issue not found with any key format: ${update.issueKeys.join(', ')}`)

      // Try a broader search with ilike
      const baseKey = update.issueKeys[0]
      const parts = baseKey.split('-')
      const { data: similar } = await supabase
        .from('issues')
        .select('id, issue_key, status, title')
        .ilike('issue_key', `%${parts[0]}%${parts[1]}%`)
        .limit(5)

      if (similar && similar.length > 0) {
        console.log(`  Similar issues found:`)
        similar.forEach(s => console.log(`    - ${s.issue_key}: ${s.title} (${s.status})`))
      }
    }

    console.log('')
  }

  console.log('=== Done ===')
}

main().catch(console.error)
