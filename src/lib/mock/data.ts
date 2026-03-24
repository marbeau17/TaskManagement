// =============================================================================
// Mock data matching wireframe exactly
// =============================================================================

import type {
  User,
  Client,
  Task,
  TaskWithRelations,
  Comment,
  ActivityLog,
  Attachment,
} from '@/types/database'

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const mockUsers: User[] = [
  {
    id: 'u1',
    name: '田中 太郎',
    name_short: '田',
    role: 'director',
    avatar_color: 'av-c',
    email: 'tanaka@example.com',
    weekly_capacity_hours: 40,
    is_active: true,
    created_at: '2025-01-01T00:00:00',
    updated_at: '2025-01-01T00:00:00',
  },
  {
    id: 'u2',
    name: '山田 花子',
    name_short: '山',
    role: 'creator',
    avatar_color: 'av-a',
    email: 'yamada@example.com',
    weekly_capacity_hours: 16,
    is_active: true,
    created_at: '2025-01-01T00:00:00',
    updated_at: '2025-01-01T00:00:00',
  },
  {
    id: 'u3',
    name: '鈴木 一郎',
    name_short: '鈴',
    role: 'creator',
    avatar_color: 'av-b',
    email: 'suzuki@example.com',
    weekly_capacity_hours: 16,
    is_active: true,
    created_at: '2025-01-01T00:00:00',
    updated_at: '2025-01-01T00:00:00',
  },
  {
    id: 'u4',
    name: '佐藤 美咲',
    name_short: '佐',
    role: 'creator',
    avatar_color: 'av-c',
    email: 'sato@example.com',
    weekly_capacity_hours: 16,
    is_active: true,
    created_at: '2025-01-01T00:00:00',
    updated_at: '2025-01-01T00:00:00',
  },
  {
    id: 'u5',
    name: '中村 健太',
    name_short: '中',
    role: 'creator',
    avatar_color: 'av-d',
    email: 'nakamura@example.com',
    weekly_capacity_hours: 16,
    is_active: true,
    created_at: '2025-01-01T00:00:00',
    updated_at: '2025-01-01T00:00:00',
  },
]

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export const mockClients: Client[] = [
  { id: 'c1', name: '株式会社サンプル', created_at: '2025-01-01T00:00:00' },
  { id: 'c2', name: 'テスト工業株式会社', created_at: '2025-01-01T00:00:00' },
  { id: 'c3', name: 'グローバル商事', created_at: '2025-01-01T00:00:00' },
]

// ---------------------------------------------------------------------------
// Helper: find user / client by id
// ---------------------------------------------------------------------------

function findUser(id: string): User {
  const user = mockUsers.find((u) => u.id === id)
  if (!user) throw new Error(`User not found: ${id}`)
  return user
}

function findClient(id: string): Client {
  const client = mockClients.find((c) => c.id === id)
  if (!client) throw new Error(`Client not found: ${id}`)
  return client
}

// ---------------------------------------------------------------------------
// Raw tasks (plain Task objects)
// ---------------------------------------------------------------------------

const rawTasks: Task[] = [
  // 1. TOPページ コーディング — overdue, in_progress
  {
    id: 't1',
    client_id: 'c1',
    title: 'TOPページ コーディング',
    description: 'TOPページのレスポンシブ対応コーディング。デザインカンプに基づいて実装。',
    status: 'in_progress',
    progress: 75,
    requested_by: 'u1',
    assigned_to: 'u3',
    director_id: 'u1',
    desired_deadline: null,
    confirmed_deadline: '2025-04-12',
    estimated_hours: 12.0,
    actual_hours: 9.5,
    reference_url: null,
    is_draft: false,
    created_at: '2025-04-09T09:00:00',
    updated_at: '2025-04-11T16:00:00',
  },
  // 2. 採用バナー制作 — waiting, unassigned
  {
    id: 't2',
    client_id: 'c2',
    title: '採用バナー制作',
    description: '採用サイト用のバナー画像制作。サイズ: 1200x628px。',
    status: 'waiting',
    progress: 0,
    requested_by: 'u1',
    assigned_to: null,
    director_id: null,
    desired_deadline: '2025-04-18',
    confirmed_deadline: null,
    estimated_hours: null,
    actual_hours: 0,
    reference_url: null,
    is_draft: false,
    created_at: '2025-04-10T10:00:00',
    updated_at: '2025-04-10T10:00:00',
  },
  // 3. LP 原稿執筆 — done
  {
    id: 't3',
    client_id: 'c3',
    title: 'LP 原稿執筆',
    description: 'ランディングページ用のコピーライティング。',
    status: 'done',
    progress: 100,
    requested_by: 'u1',
    assigned_to: 'u4',
    director_id: 'u1',
    desired_deadline: null,
    confirmed_deadline: '2025-04-10',
    estimated_hours: 8.0,
    actual_hours: 8.0,
    reference_url: null,
    is_draft: false,
    created_at: '2025-04-05T09:00:00',
    updated_at: '2025-04-10T17:00:00',
  },
  // 4. 会社案内 デザイン — in_progress
  {
    id: 't4',
    client_id: 'c1',
    title: '会社案内 デザイン',
    description: '会社案内パンフレットのデザイン。A4 三つ折り。',
    status: 'in_progress',
    progress: 50,
    requested_by: 'u1',
    assigned_to: 'u2',
    director_id: 'u1',
    desired_deadline: null,
    confirmed_deadline: '2025-04-13',
    estimated_hours: 16.0,
    actual_hours: 8.0,
    reference_url: null,
    is_draft: false,
    created_at: '2025-04-07T09:00:00',
    updated_at: '2025-04-11T12:00:00',
  },
  // 5. SNSバナー制作 5点 — in_progress
  {
    id: 't5',
    client_id: 'c3',
    title: 'SNSバナー制作 5点',
    description: 'Instagram / X 用のバナー画像5点セット。',
    status: 'in_progress',
    progress: 25,
    requested_by: 'u1',
    assigned_to: 'u4',
    director_id: 'u1',
    desired_deadline: null,
    confirmed_deadline: '2025-04-15',
    estimated_hours: 6.0,
    actual_hours: 2.0,
    reference_url: null,
    is_draft: false,
    created_at: '2025-04-08T09:00:00',
    updated_at: '2025-04-11T10:00:00',
  },
  // 6. ニュースレター原稿 — waiting, unassigned
  {
    id: 't6',
    client_id: 'c2',
    title: 'ニュースレター原稿',
    description: '月次ニュースレターの原稿作成。',
    status: 'waiting',
    progress: 0,
    requested_by: 'u1',
    assigned_to: null,
    director_id: null,
    desired_deadline: '2025-04-20',
    confirmed_deadline: null,
    estimated_hours: null,
    actual_hours: 0,
    reference_url: null,
    is_draft: false,
    created_at: '2025-04-10T14:00:00',
    updated_at: '2025-04-10T14:00:00',
  },
  // 7. LP ファーストビュー — in_progress
  {
    id: 't7',
    client_id: 'c3',
    title: 'LP ファーストビュー',
    description: 'ランディングページのファーストビューデザイン。',
    status: 'in_progress',
    progress: 40,
    requested_by: 'u1',
    assigned_to: 'u5',
    director_id: 'u1',
    desired_deadline: null,
    confirmed_deadline: '2025-04-17',
    estimated_hours: 10.0,
    actual_hours: 4.0,
    reference_url: null,
    is_draft: false,
    created_at: '2025-04-08T11:00:00',
    updated_at: '2025-04-11T09:00:00',
  },
  // 8. ECサイト 商品ページ更新 — todo
  {
    id: 't8',
    client_id: 'c1',
    title: 'ECサイト 商品ページ更新',
    description: '新商品追加に伴う商品ページの更新作業。',
    status: 'todo',
    progress: 0,
    requested_by: 'u1',
    assigned_to: 'u3',
    director_id: 'u1',
    desired_deadline: null,
    confirmed_deadline: '2025-04-20',
    estimated_hours: 8.0,
    actual_hours: 0,
    reference_url: null,
    is_draft: false,
    created_at: '2025-04-10T09:00:00',
    updated_at: '2025-04-10T09:00:00',
  },
  // 9. メルマガテンプレートデザイン — todo
  {
    id: 't9',
    client_id: 'c2',
    title: 'メルマガテンプレートデザイン',
    description: 'HTMLメルマガのテンプレートデザイン作成。',
    status: 'todo',
    progress: 0,
    requested_by: 'u1',
    assigned_to: 'u2',
    director_id: 'u1',
    desired_deadline: null,
    confirmed_deadline: '2025-04-22',
    estimated_hours: 6.0,
    actual_hours: 0,
    reference_url: null,
    is_draft: false,
    created_at: '2025-04-11T09:00:00',
    updated_at: '2025-04-11T09:00:00',
  },
  // 10. ロゴリニューアル提案 — done
  {
    id: 't10',
    client_id: 'c3',
    title: 'ロゴリニューアル提案',
    description: 'ロゴマークのリニューアル案を3パターン提案。',
    status: 'done',
    progress: 100,
    requested_by: 'u1',
    assigned_to: 'u2',
    director_id: 'u1',
    desired_deadline: null,
    confirmed_deadline: '2025-04-08',
    estimated_hours: 10.0,
    actual_hours: 12.0,
    reference_url: null,
    is_draft: false,
    created_at: '2025-04-01T09:00:00',
    updated_at: '2025-04-08T18:00:00',
  },
  // 11. 製品カタログ DTP — in_progress
  {
    id: 't11',
    client_id: 'c1',
    title: '製品カタログ DTP',
    description: '新製品カタログのDTP作業。A4 16ページ。',
    status: 'in_progress',
    progress: 60,
    requested_by: 'u1',
    assigned_to: 'u2',
    director_id: 'u1',
    desired_deadline: null,
    confirmed_deadline: '2025-04-18',
    estimated_hours: 20.0,
    actual_hours: 12.0,
    reference_url: null,
    is_draft: false,
    created_at: '2025-04-03T09:00:00',
    updated_at: '2025-04-11T14:00:00',
  },
  // 12. 名刺デザイン — done
  {
    id: 't12',
    client_id: 'c2',
    title: '名刺デザイン',
    description: '役員用名刺の新デザイン。両面カラー。',
    status: 'done',
    progress: 100,
    requested_by: 'u1',
    assigned_to: 'u5',
    director_id: 'u1',
    desired_deadline: null,
    confirmed_deadline: '2025-04-05',
    estimated_hours: 4.0,
    actual_hours: 3.5,
    reference_url: null,
    is_draft: false,
    created_at: '2025-03-28T09:00:00',
    updated_at: '2025-04-05T15:00:00',
  },
  // 13. ウェブ広告バナーセット — todo
  {
    id: 't13',
    client_id: 'c3',
    title: 'ウェブ広告バナーセット',
    description: 'Google / Yahoo ディスプレイ広告用バナー6サイズ。',
    status: 'todo',
    progress: 0,
    requested_by: 'u1',
    assigned_to: 'u5',
    director_id: 'u1',
    desired_deadline: null,
    confirmed_deadline: '2025-04-25',
    estimated_hours: 8.0,
    actual_hours: 0,
    reference_url: null,
    is_draft: false,
    created_at: '2025-04-11T10:00:00',
    updated_at: '2025-04-11T10:00:00',
  },
  // 14. プレスリリース用画像 — todo
  {
    id: 't14',
    client_id: 'c1',
    title: 'プレスリリース用画像',
    description: 'プレスリリース配信用のOGP画像とサムネイル画像。',
    status: 'todo',
    progress: 0,
    requested_by: 'u1',
    assigned_to: 'u4',
    director_id: 'u1',
    desired_deadline: null,
    confirmed_deadline: '2025-04-24',
    estimated_hours: 4.0,
    actual_hours: 0,
    reference_url: null,
    is_draft: false,
    created_at: '2025-04-11T11:00:00',
    updated_at: '2025-04-11T11:00:00',
  },
]

// ---------------------------------------------------------------------------
// Build TaskWithRelations from raw tasks
// ---------------------------------------------------------------------------

function buildTaskWithRelations(task: Task): TaskWithRelations {
  return {
    ...task,
    client: findClient(task.client_id),
    assigned_user: task.assigned_to ? findUser(task.assigned_to) : null,
    requester: findUser(task.requested_by),
    director: task.director_id ? findUser(task.director_id) : null,
  }
}

export const mockTasks: TaskWithRelations[] = rawTasks.map(buildTaskWithRelations)

// ---------------------------------------------------------------------------
// Comments (for task t1)
// ---------------------------------------------------------------------------

export const mockComments: Comment[] = [
  {
    id: 'cm1',
    task_id: 't1',
    user_id: 'u3',
    body: 'レスポンシブ対応のSPブレークポイントは 375px と 390px どちらを基準にしますか？',
    created_at: '2025-04-11T14:32:00',
    user: findUser('u3'),
  },
  {
    id: 'cm2',
    task_id: 't1',
    user_id: 'u1',
    body: '375px で対応してください。クライアント指定です。',
    created_at: '2025-04-11T15:10:00',
    user: findUser('u1'),
  },
]

// ---------------------------------------------------------------------------
// Activity logs (for task t1)
// ---------------------------------------------------------------------------

export const mockActivityLogs: ActivityLog[] = [
  {
    id: 'al1',
    task_id: 't1',
    user_id: 'u1',
    action: 'created',
    detail: null,
    created_at: '2025-04-09T09:00:00',
    user: findUser('u1'),
  },
  {
    id: 'al2',
    task_id: 't1',
    user_id: 'u1',
    action: 'assigned',
    detail: { assigned_to: '鈴木 一郎' },
    created_at: '2025-04-09T09:05:00',
    user: findUser('u1'),
  },
  {
    id: 'al3',
    task_id: 't1',
    user_id: 'u3',
    action: 'progress_updated',
    detail: { old: 50, new: 75 },
    created_at: '2025-04-11T15:30:00',
    user: findUser('u3'),
  },
  {
    id: 'al4',
    task_id: 't1',
    user_id: 'u3',
    action: 'hours_updated',
    detail: { old: 6.0, new: 9.5 },
    created_at: '2025-04-11T16:00:00',
    user: findUser('u3'),
  },
]

// ---------------------------------------------------------------------------
// Attachments (for task t1)
// ---------------------------------------------------------------------------

export const mockAttachments: Attachment[] = [
  {
    id: 'at1',
    task_id: 't1',
    uploaded_by: 'u1',
    file_name: 'wireframe_v2.fig',
    file_size: 2516582,
    mime_type: 'application/fig',
    storage_path: '/attachments/wireframe_v2.fig',
    created_at: '2025-04-09T09:10:00',
    uploader: findUser('u1'),
  },
  {
    id: 'at2',
    task_id: 't1',
    uploaded_by: 'u1',
    file_name: 'brandguide_2024.pdf',
    file_size: 1153434,
    mime_type: 'application/pdf',
    storage_path: '/attachments/brandguide_2024.pdf',
    created_at: '2025-04-09T09:15:00',
    uploader: findUser('u1'),
  },
]
