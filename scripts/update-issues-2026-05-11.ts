// =============================================================================
// 2026-05-11 issue resolution batch
// Updates issues from docs/issues_2026-05-11.csv to status=resolved with RCA.
// Run with: SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/update-issues-2026-05-11.ts
// =============================================================================
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ewlxqiowzdebksykxvuv.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface IssueUpdate {
  issueKeys: string[]
  label: string
  status: string
  resolution_notes: string
  git_branch?: string
}

const BRANCH = 'main'

const updates: IssueUpdate[] = [
  {
    issueKeys: ['WEB-40', 'WEB,-40'],
    label: 'WEB-40 添付ファイルダウンロード不能',
    status: 'resolved',
    git_branch: BRANCH,
    resolution_notes:
      '【RCA】attachments バケットは private 構成だが、`getFileUrl` が `getPublicUrl` を呼んでおり、返却される未署名 URL がダウンロード時に 403 を返していた。日本語ファイル名は Storage 側で InvalidKey になり保存自体が失敗するケースも併発。' +
      '\n【対応】`createSignedUrl(path, 3600, { download: <原ファイル名> })` で 1 時間有効な署名 URL を返却。保存キーは UUID 化し、`attachments.file_name` に表示名を保持して Content-Disposition に渡す。MAX_FILE_SIZE は APP_CONFIG.upload.maxFileSizeBytes へ統一。' +
      '\n【変更ファイル】src/lib/data/storage.ts, supabase/migrations/052_resolve_bug_report_2026_04_20.sql (commit 4efe5a5)',
  },
  {
    issueKeys: ['WEB-39', 'WEB,-39'],
    label: 'WEB-39 納期入力カレンダー非表示',
    status: 'resolved',
    git_branch: BRANCH,
    resolution_notes:
      '【RCA】カスタム DateInput のカレンダー起動トリガが 22×22px の小さな 📅 ボタンのみで、ユーザーはフィールドをクリックして開けると期待していた。' +
      '\n【対応】wrapper span に onClick を追加し、フィールド背景クリックでもカレンダー Picker を開けるよう改修。input セグメントと button へのクリックは従来通り無視。' +
      '\n【変更ファイル】src/components/shared/DateInput.tsx (handleWrapperClick 追加)',
  },
  {
    issueKeys: ['BD-1'],
    label: 'BD-1 希望納期で数字が壊れる',
    status: 'resolved',
    git_branch: BRANCH,
    resolution_notes:
      '【RCA】DateInput の blur ハンドラが過剰な正規化を行っていた。`y.length >= 4` で年を 1900-2100 に clamp する分岐により "0420" 入力が "1900" にすり替わる、`parseInt(m) > 1` 等の中途半端な閾値で 1 桁月日が pad されてユーザーが入力中の数字が勝手に書き換わる、といった現象が発生していた。再オープン1回。' +
      '\n【対応】blur 時の年クランプを廃止。月/日は 2 桁入力かつ有効範囲外の場合のみ最小限のクランプを残し、それ以外はユーザー入力をそのまま保持。最終 emit はバリデーション (yValid && mValid && dValid) を満たす場合のみ。' +
      '\n【変更ファイル】src/components/shared/DateInput.tsx (handleSegmentBlur)',
  },
  {
    issueKeys: ['WEB-44', 'WEB,-44'],
    label: 'WEB-44 ECモール選択で画面真っ白',
    status: 'resolved',
    git_branch: BRANCH,
    resolution_notes:
      '【RCA】TemplateFieldRenderer の単一フィールドで投げられた例外がフォーム全体を白画面化させ、入力済み内容が全消失していた。DB 定義のテンプレートが未知の field.type / 想定外の value 形状 (例: button_group に array が紛れる) を返した場合に再現。' +
      '\n【対応】(1) TemplateFieldErrorBoundary を導入して 1 項目分の例外を局所化、(2) button_group の value 処理を Array / null / number に寛容化、(3) default ケースをテキスト入力フォールバックに変更、(4) TaskForm 側で `selectedTemplate.fields?.length ?? 0` の防御を追加。' +
      '\n【変更ファイル】src/components/tasks/TemplateFieldRenderer.tsx, src/components/tasks/TaskForm.tsx',
  },
  {
    issueKeys: ['WEB-42', 'WEB,-42'],
    label: 'WEB-42 プロフィール写真保存失敗',
    status: 'resolved',
    git_branch: BRANCH,
    resolution_notes:
      '【RCA】/api/members/[id] PATCH が admin/director ロール限定だったため、一般ユーザーが自分のプロフィールを更新しようとすると 403 で失敗していた。' +
      '\n【対応】`verifyCanUpdateMember(targetId)` ヘルパで「自分自身の更新は許可、他人は admin/director 限定」を実装。自己更新時は SELF_EDITABLE_FIELDS (name / name_short / avatar_color / avatar_url / email / phone / title / department / bio) のみ通過させ、role/is_active 等の権限フィールドは admin のみとした。さらにプロフィール保存失敗時はサーバー側エラー詳細を toast / console に表示するよう改善。' +
      '\n【変更ファイル】src/app/api/members/[id]/route.ts (commit 602c51b), src/app/(main)/profile/page.tsx (エラー詳細表示)',
  },
  {
    issueKeys: ['WEB-4', 'WEB,-4'],
    label: 'WEB-4 タスク一覧ステータスドロップ操作不可',
    status: 'resolved',
    git_branch: BRANCH,
    resolution_notes:
      '【RCA】<select> のインライン編集で blur が change より先発火するブラウザ挙動により、option クリック時にセルがアンマウントされて onChange が無視されていた (Safari / 古い Chrome 系)。さらに親行のクリックイベントが伝播して直ちにセルを閉じていた。' +
      '\n【対応】onBlur を `setTimeout(() => setEditingCell(null), 150)` で 150ms 遅延させ change を先に通す。`onClick` / `onMouseDown` で `stopPropagation` を呼び親行ハンドラへの伝播を遮断。`autoFocus` で初回フォーカスを保証。' +
      '\n【変更ファイル】src/components/tasks/TaskTable.tsx:914-919',
  },
  {
    issueKeys: ['KEEPER-1'],
    label: 'KEEPER-1 プロジェクト PM 追加不可',
    status: 'resolved',
    git_branch: BRANCH,
    resolution_notes:
      '【RCA】project_members テーブルがマイグレーション未作成で、UI 側の `addProjectMember` mutation が "relation does not exist" で失敗していた。' +
      '\n【対応】migration 051_create_project_members.sql で project_members テーブルを新設 (pm_id / member_id / allocated_hours / unique(project_name, pm_id, member_id))。RLS は authenticated に対し all 許可。プロジェクト詳細画面でメンバー追加・PM 切替が動作するよう接続。' +
      '\n【変更ファイル】supabase/migrations/051_create_project_members.sql, src/lib/data/project-members.ts, src/app/(main)/projects/[id]/page.tsx',
  },
  {
    issueKeys: ['WEB-45', 'WEB,-45'],
    label: 'WEB-45 タスク完了通知メール (依頼者向け)',
    status: 'resolved',
    git_branch: BRANCH,
    resolution_notes:
      '【RCA】要望: タスク完了時に依頼者へメール通知が欲しい。既存の SMTP / nodemailer インフラはあったが、`/api/tasks/[id]/complete` 経由のステータス変更が通知をスキップしていた。' +
      '\n【対応】`sendTaskCompletionEmail` を共通モジュール化し、`updateTask` / `updateTaskProgress` / `/api/tasks/[id]/complete` の 3 経路すべてで status="done" 遷移時に依頼者へメール送信。自己完了ケース (completerId === requesterId) は送信をスキップ。' +
      '\n【変更ファイル】src/lib/email/task-completion.ts, src/lib/email/templates.ts, src/app/api/email/notify-complete/route.ts, src/app/api/tasks/[id]/complete/route.ts, src/lib/data/tasks.ts',
  },
  {
    issueKeys: ['IMP_MC-1'],
    label: 'IMP_MC-1 アサイン履歴の可視化',
    status: 'resolved',
    git_branch: BRANCH,
    resolution_notes:
      '【RCA】要望: 誰が起票したか・誰に依頼されたかが画面上で分からなくなる。原因調査の結果、(1) タスク詳細画面に「依頼者 / ディレクター / 担当者」セクションが無い、(2) activity_logs への書き込みが column 名 mismatch (`details` → 正しくは `detail`) と enum 外の action 値 (`updated`) で silently fail しており履歴自体が空であった。' +
      '\n【対応】(1) TaskDetailInfo に「依頼者 (起票) / ディレクター / 担当者」サマリ行を追加。(2) logActivity ヘルパを修正し `detail` JSONB へ書き込む形に変更、有効な activity_action enum のみ許可するガードを追加。(3) updateTask 内で deadline_changed / status_changed / hours_updated / assigned を個別ログ化。(4) ActivityLog UI で detail JSON を整形して表示。' +
      '\n【変更ファイル】src/lib/data/tasks.ts (logActivity), src/components/tasks/TaskDetailInfo.tsx, src/components/tasks/ActivityLog.tsx',
  },
  {
    issueKeys: ['WEB-41', 'WEB,-41'],
    label: 'WEB-41 タスク依頼履歴 (期限変更等)',
    status: 'resolved',
    git_branch: BRANCH,
    resolution_notes:
      '【RCA】要望: 自分が依頼したタスクの期限変更履歴が見たい。IMP_MC-1 と同根: activity_logs 書き込み不全で履歴が記録されていなかった。' +
      '\n【対応】IMP_MC-1 の修正により deadline_changed / status_changed が正しく記録されるようになった。TaskDetailInfo の ActivityLog で誰が・いつ・何を変更したか (旧→新の値含む detail JSON) を表示。' +
      '\n【変更ファイル】src/lib/data/tasks.ts (deadline_changed ログ), src/components/tasks/ActivityLog.tsx (detail 整形表示)',
  },
]

async function main() {
  console.log('=== Issue Update Batch (2026-05-11) ===\n')
  let updated = 0
  let notFound = 0

  for (const update of updates) {
    console.log(`--- ${update.label} ---`)
    let found = false
    for (const key of update.issueKeys) {
      const { data: issues, error: findError } = await supabase
        .from('issues')
        .select('id, issue_key, status, title')
        .eq('issue_key', key)
      if (findError) {
        console.error(`  Find error for ${key}:`, findError.message)
        continue
      }
      if (!issues || issues.length === 0) {
        continue
      }
      const issue = issues[0]
      console.log(`  Found id=${issue.id} key=${issue.issue_key} (current status=${issue.status})`)
      const { error: upErr } = await supabase
        .from('issues')
        .update({
          status: update.status,
          resolution_notes: update.resolution_notes,
          git_branch: update.git_branch ?? null,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', issue.id)
      if (upErr) {
        console.error(`  Update error:`, upErr.message)
      } else {
        console.log(`  ✓ Updated to status=${update.status}`)
        updated++
      }
      found = true
      break
    }
    if (!found) {
      console.log(`  ✗ Not found: ${update.issueKeys.join(', ')}`)
      notFound++
    }
    console.log('')
  }

  console.log(`=== Done — updated=${updated}, not_found=${notFound} ===`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
