'use client'

import type { User } from '@/types/database'
import { Avatar } from '@/components/shared/Avatar'
import { useI18n } from '@/hooks/useI18n'

// ---------------------------------------------------------------------------
// Types for the org structure
// ---------------------------------------------------------------------------

interface OrgDeptNode {
  type: 'dept'
  name: string
  head?: string      // user name (display only, may include ACT label)
  headColor?: string  // department color
  children?: OrgTreeNode[]
}

interface OrgPersonNode {
  type: 'person'
  name: string       // user name or '採用予定N'
  title: string
  isPlanned?: boolean // true for planned hires (採用予定)
}

type OrgTreeNode = OrgDeptNode | OrgPersonNode

// ---------------------------------------------------------------------------
// Department color scheme (matches the image)
// ---------------------------------------------------------------------------

const DEPT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  ceo:       { bg: 'bg-blue-900',       border: 'border-blue-800',   text: 'text-white' },
  coo:       { bg: 'bg-blue-800',       border: 'border-blue-700',   text: 'text-white' },
  sales:     { bg: 'bg-blue-600',       border: 'border-blue-500',   text: 'text-white' },
  cs:        { bg: 'bg-amber-700',      border: 'border-amber-600',  text: 'text-white' },
  solution:  { bg: 'bg-amber-800',      border: 'border-amber-700',  text: 'text-white' },
  consulting:{ bg: 'bg-yellow-700',     border: 'border-yellow-600', text: 'text-white' },
  sysdev:    { bg: 'bg-amber-600',      border: 'border-amber-500',  text: 'text-white' },
  biz:       { bg: 'bg-red-700',        border: 'border-red-600',    text: 'text-white' },
}

// ---------------------------------------------------------------------------
// Static org structure matching the provided image
// ---------------------------------------------------------------------------

const ORG_STRUCTURE: OrgTreeNode = {
  type: 'dept',
  name: '代表取締役社長 CEO',
  head: '伊藤 祐太',
  headColor: 'ceo',
  children: [
    {
      type: 'dept',
      name: '専務取締役 COO',
      head: '安田 修',
      headColor: 'coo',
      children: [
        {
          type: 'dept',
          name: 'セールス&マーケティング本部',
          head: '部長 伊藤 祐太 (ACT)',
          headColor: 'sales',
          children: [
            { type: 'person', name: '渡邊 梨紗', title: 'アライアンス&セールスマネージャー' },
            { type: 'person', name: '採用予定①', title: '', isPlanned: true },
            { type: 'person', name: '採用予定②', title: '', isPlanned: true },
            { type: 'person', name: '採用予定③', title: '', isPlanned: true },
          ],
        },
        {
          type: 'dept',
          name: 'カスタマーサクセス部',
          head: '部長 安田 修 (ACT)',
          headColor: 'cs',
          children: [
            { type: 'person', name: '採用予定①', title: '', isPlanned: true },
            { type: 'person', name: '採用予定②', title: '', isPlanned: true },
            { type: 'person', name: '採用予定③', title: '', isPlanned: true },
          ],
        },
        {
          type: 'dept',
          name: 'ソリューション本部',
          head: '本部長 安田 修 (ACT)',
          headColor: 'solution',
          children: [
            {
              type: 'dept',
              name: 'コンサルティング&\nオペレーション部',
              headColor: 'consulting',
              children: [
                { type: 'person', name: '伊藤 祐太', title: '経営コンサルタント' },
                { type: 'person', name: '安田 修', title: 'DX&Iコンサルタント' },
                {
                  type: 'dept',
                  name: 'ECマネージャー',
                  head: '瀧宮 誠',
                  headColor: 'consulting',
                  children: [
                    { type: 'person', name: '太田 晴瑠', title: 'スペシャリスト' },
                    { type: 'person', name: '竹内 美鈴', title: 'スペシャリスト' },
                    { type: 'person', name: '桑原 和海', title: 'スペシャリスト' },
                    { type: 'person', name: '採用予定①', title: 'ECコンサルタント', isPlanned: true },
                    { type: 'person', name: '採用予定②', title: 'スペシャリスト', isPlanned: true },
                  ],
                },
              ],
            },
            {
              type: 'dept',
              name: 'システム開発部',
              headColor: 'sysdev',
              children: [
                { type: 'person', name: '採用予定①', title: 'マネージャー', isPlanned: true },
                { type: 'person', name: 'Yudi Dharma Putra', title: 'シニアエンジニア' },
                { type: 'person', name: 'Luca Trabuio', title: 'エンジニア' },
                { type: 'person', name: 'Rafael Agcaoili', title: 'エンジニア' },
              ],
            },
          ],
        },
        {
          type: 'dept',
          name: 'ビジネスサポート本部',
          head: '部長 伊藤 祐太 (ACT)',
          headColor: 'biz',
          children: [
            { type: 'person', name: '秋元 由美子', title: 'スペシャリスト' },
            { type: 'person', name: '採用予定①', title: '', isPlanned: true },
          ],
        },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

function findUser(name: string, members: User[]): User | undefined {
  return members.find(m => m.name === name || m.name.replace(/\s/g, '') === name.replace(/\s/g, ''))
}

function DeptBox({ node, colorKey }: { node: OrgDeptNode; colorKey?: string }) {
  const colors = DEPT_COLORS[colorKey || node.headColor || 'ceo']
  return (
    <div className={`rounded-[8px] px-[14px] py-[8px] min-w-[140px] text-center border ${colors.bg} ${colors.border}`}>
      <div className={`text-[11px] font-bold ${colors.text} leading-tight whitespace-pre-line`}>
        {node.name}
      </div>
      {node.head && (
        <div className={`text-[10px] ${colors.text} opacity-80 mt-[2px]`}>
          {node.head}
        </div>
      )}
    </div>
  )
}

function PersonBox({ node, user }: { node: OrgPersonNode; user?: User }) {
  if (node.isPlanned) {
    return (
      <div className="rounded-[8px] px-[10px] py-[6px] min-w-[100px] text-center border-2 border-dashed border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/30">
        {node.title && (
          <div className="text-[9px] text-orange-600 dark:text-orange-400 mb-[1px]">{node.title}</div>
        )}
        <div className="text-[10px] font-medium text-orange-500 dark:text-orange-400">
          {node.name}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border2 rounded-[8px] px-[10px] py-[6px] min-w-[100px] text-center shadow-sm hover:border-mint/40 transition-colors">
      {user && (
        <div className="flex justify-center mb-[3px]">
          <Avatar
            name_short={user.name_short || user.name.charAt(0)}
            color={user.avatar_color}
            avatar_url={user.avatar_url}
            size="sm"
          />
        </div>
      )}
      {node.title && (
        <div className="text-[9px] text-text3 mb-[1px]">{node.title}</div>
      )}
      <div className="text-[11px] font-bold text-text leading-tight">
        {node.name}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Recursive OrgNode renderer
// ---------------------------------------------------------------------------

function OrgNode({ node, members }: { node: OrgTreeNode; members: User[] }) {
  if (node.type === 'person') {
    const user = findUser(node.name, members)
    return (
      <div className="flex flex-col items-center">
        <PersonBox node={node} user={user} />
      </div>
    )
  }

  // Department node
  const children = node.children ?? []

  return (
    <div className="flex flex-col items-center">
      <DeptBox node={node} />

      {children.length > 0 && (
        <div className="flex flex-col items-center mt-0">
          {/* Vertical connector from parent */}
          <div className="w-[1px] h-[20px] bg-border2" />

          {/* Horizontal bar connecting children */}
          {children.length > 1 && (
            <div className="relative w-full flex justify-center">
              <div
                className="h-[1px] bg-border2"
                style={{
                  width: `calc(100% - 100px)`,
                  minWidth: '80px',
                }}
              />
            </div>
          )}

          {/* Children nodes */}
          <div className="flex gap-[16px] items-start">
            {children.map((child, idx) => (
              <div key={`${child.type}-${child.type === 'dept' ? child.name : child.name}-${idx}`} className="flex flex-col items-center">
                {/* Vertical connector to child */}
                <div className="w-[1px] h-[16px] bg-border2" />
                <OrgNode node={child} members={members} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// OrgChart -- main component
// ---------------------------------------------------------------------------

export function OrgChart({ members }: { members: User[] }) {
  const { t } = useI18n()
  const activeMembers = members.filter((m) => m.is_active)

  if (activeMembers.length === 0) {
    return (
      <div className="flex items-center justify-center py-[40px] text-[12px] text-text3">
        {t('members.orgChartEmpty')}
      </div>
    )
  }

  return (
    <div className="overflow-auto p-[24px]">
      <div className="text-center mb-[8px]">
        <span className="text-[10px] text-text3">最新名簿 反映版</span>
      </div>
      <div className="flex justify-center items-start min-w-[1200px]">
        <OrgNode node={ORG_STRUCTURE} members={activeMembers} />
      </div>
    </div>
  )
}
