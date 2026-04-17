'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { useCrmLeads } from '@/hooks/useCrm'
import { toast } from '@/stores/toastStore'
import {
  Building2, TrendingUp, Target, Layers, AlertTriangle,
  Lightbulb, BarChart3, Copy, FileDown, Loader2, Sparkles,
  ChevronDown, ChevronRight, Shield, Zap, Package, DollarSign,
  MapPin, Megaphone,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DiagnosisResult {
  company_overview: string
  swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] }
  four_p: { product: string; price: string; place: string; promotion: string }
  mece_solutions: Array<{ category: string; solutions: string[] }>
  priority_actions: Array<{ action: string; timeline: string; impact: string }>
  risk_assessment: string
  recommended_approach: string
  estimated_roi: string
}

interface Lead {
  id: string
  title: string
  status: string
  source: string
  company?: { name: string }
  contact?: { first_name: string; last_name: string }
  description?: string
  custom_fields?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Status badge colors
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-purple-100 text-purple-700',
  qualified: 'bg-green-100 text-green-700',
  unqualified: 'bg-gray-100 text-gray-500',
  converted: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-red-100 text-red-700',
}

const IMPACT_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-green-100 text-green-700 border-green-200',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CrmAiDiagnosis() {
  const { t } = useI18n()
  const { data, isLoading: leadsLoading } = useCrmLeads({ page: 1, pageSize: 100 })
  const leads: Lead[] = (data?.data as Lead[] | undefined) ?? []

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [diagnosing, setDiagnosing] = useState(false)
  const [diagnosisMap, setDiagnosisMap] = useState<Record<string, DiagnosisResult>>({})
  const [expandedMece, setExpandedMece] = useState<Record<string, boolean>>({})

  const selectedLead = leads.find(l => l.id === selectedLeadId) ?? null
  const diagnosis = selectedLeadId ? diagnosisMap[selectedLeadId] ?? null : null

  // -----------------------------------------------------------------------
  // Run diagnosis
  // -----------------------------------------------------------------------

  const runDiagnosis = async (leadId: string) => {
    setSelectedLeadId(leadId)
    if (diagnosisMap[leadId]) return // already cached

    setDiagnosing(true)
    try {
      const res = await fetch('/api/crm/diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      })
      if (!res.ok) throw new Error('Diagnosis failed')
      const result: DiagnosisResult = await res.json()
      setDiagnosisMap(prev => ({ ...prev, [leadId]: result }))
      toast.success('AI診断が完了しました')
    } catch {
      toast.error('AI診断に失敗しました。もう一度お試しください。')
    } finally {
      setDiagnosing(false)
    }
  }

  // -----------------------------------------------------------------------
  // Copy results to clipboard
  // -----------------------------------------------------------------------

  const copyResults = () => {
    if (!diagnosis || !selectedLead) return
    const text = [
      `■ 企業概要\n${diagnosis.company_overview}`,
      `\n■ SWOT分析`,
      `  強み: ${diagnosis.swot.strengths.join(', ')}`,
      `  弱み: ${diagnosis.swot.weaknesses.join(', ')}`,
      `  機会: ${diagnosis.swot.opportunities.join(', ')}`,
      `  脅威: ${diagnosis.swot.threats.join(', ')}`,
      `\n■ 4P分析`,
      `  Product: ${diagnosis.four_p.product}`,
      `  Price: ${diagnosis.four_p.price}`,
      `  Place: ${diagnosis.four_p.place}`,
      `  Promotion: ${diagnosis.four_p.promotion}`,
      `\n■ MECE解決策`,
      ...diagnosis.mece_solutions.map(m => `  [${m.category}]\n${m.solutions.map(s => `    - ${s}`).join('\n')}`),
      `\n■ 優先アクション`,
      ...diagnosis.priority_actions.map(a => `  ${a.timeline} | ${a.action} (${a.impact})`),
      `\n■ リスクアセスメント\n${diagnosis.risk_assessment}`,
      `\n■ 推奨アプローチ\n${diagnosis.recommended_approach}`,
      `\n■ 想定ROI\n${diagnosis.estimated_roi}`,
    ].join('\n')
    navigator.clipboard.writeText(text)
    toast.success('クリップボードにコピーしました')
  }

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  const toggleMece = (cat: string) =>
    setExpandedMece(prev => ({ ...prev, [cat]: !prev[cat] }))

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <div className="flex gap-[16px] h-full min-h-[600px]">
      {/* ====== Left Panel: Lead List ====== */}
      <div className="w-[340px] shrink-0 flex flex-col bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
        <div className="px-[16px] py-[12px] border-b border-border2 bg-surf2">
          <div className="flex items-center gap-[8px]">
            <Sparkles className="w-[16px] h-[16px] text-mint-dd" />
            <h3 className="text-[14px] font-bold text-text">AI経営診断</h3>
          </div>
          <p className="text-[11px] text-text2 mt-[4px]">リードを選択してAI診断を実行</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {leadsLoading ? (
            <div className="flex items-center justify-center py-[40px]">
              <Loader2 className="w-[20px] h-[20px] text-mint-dd animate-spin" />
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-[40px] text-[12px] text-text2">
              リードがありません
            </div>
          ) : (
            leads.map(lead => {
              const isSelected = lead.id === selectedLeadId
              const hasDiagnosis = !!diagnosisMap[lead.id]
              return (
                <div
                  key={lead.id}
                  className={`px-[14px] py-[10px] border-b border-border2 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-mint/10 border-l-[3px] border-l-mint-dd'
                      : 'hover:bg-surf2'
                  }`}
                  onClick={() => setSelectedLeadId(lead.id)}
                >
                  <div className="flex items-start justify-between gap-[8px]">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-text truncate">
                        {lead.title}
                      </p>
                      {lead.company?.name && (
                        <p className="text-[11px] text-text2 flex items-center gap-[4px] mt-[2px]">
                          <Building2 className="w-[10px] h-[10px]" />
                          {lead.company.name}
                        </p>
                      )}
                      <div className="flex items-center gap-[6px] mt-[4px]">
                        <span className={`text-[10px] px-[6px] py-[1px] rounded-full font-semibold ${STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {lead.status}
                        </span>
                        <span className="text-[10px] text-text2">{lead.source}</span>
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-[4px]">
                      {hasDiagnosis && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-700 px-[6px] py-[1px] rounded-full font-bold">
                          診断済
                        </span>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); runDiagnosis(lead.id) }}
                        disabled={diagnosing && selectedLeadId === lead.id}
                        className="text-[11px] font-bold px-[10px] py-[4px] rounded-[6px] bg-gradient-to-r from-mint-dd to-emerald-500 text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-[4px]"
                      >
                        {diagnosing && selectedLeadId === lead.id ? (
                          <>
                            <Loader2 className="w-[12px] h-[12px] animate-spin" />
                            AI分析中...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-[12px] h-[12px]" />
                            診断
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ====== Right Panel: Diagnosis Results ====== */}
      <div className="flex-1 bg-surface border border-border2 rounded-[10px] shadow overflow-hidden flex flex-col">
        {!selectedLead ? (
          <div className="flex-1 flex flex-col items-center justify-center text-text2 gap-[12px]">
            <Sparkles className="w-[40px] h-[40px] text-border2" />
            <p className="text-[13px]">リードを選択してAI診断を実行してください</p>
          </div>
        ) : !diagnosis ? (
          <div className="flex-1 flex flex-col items-center justify-center text-text2 gap-[16px]">
            {diagnosing ? (
              <>
                <Loader2 className="w-[36px] h-[36px] text-mint-dd animate-spin" />
                <div className="text-center">
                  <p className="text-[14px] font-semibold text-text">AI分析中...</p>
                  <p className="text-[12px] text-text2 mt-[4px]">
                    {selectedLead.title} の経営診断を生成しています
                  </p>
                </div>
              </>
            ) : (
              <>
                <Target className="w-[40px] h-[40px] text-border2" />
                <p className="text-[13px]">「診断」ボタンをクリックしてAI分析を開始</p>
                <button
                  onClick={() => runDiagnosis(selectedLead.id)}
                  className="px-[20px] py-[8px] text-[13px] font-bold rounded-[8px] bg-gradient-to-r from-mint-dd to-emerald-500 text-white hover:opacity-90 transition-opacity flex items-center gap-[6px]"
                >
                  <Sparkles className="w-[14px] h-[14px]" />
                  AI経営診断を実行
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Results header */}
            <div className="px-[20px] py-[12px] border-b border-border2 bg-surf2 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-[15px] font-bold text-text">{selectedLead.title}</h3>
                {selectedLead.company?.name && (
                  <p className="text-[11px] text-text2">{selectedLead.company.name} - AI経営診断レポート</p>
                )}
              </div>
              <div className="flex items-center gap-[6px]">
                <button
                  onClick={copyResults}
                  className="flex items-center gap-[4px] px-[10px] py-[5px] text-[11px] font-semibold bg-surface border border-border2 rounded-[6px] hover:bg-surf2 transition-colors text-text2"
                >
                  <Copy className="w-[12px] h-[12px]" />
                  コピー
                </button>
                <button
                  disabled
                  className="flex items-center gap-[4px] px-[10px] py-[5px] text-[11px] font-semibold bg-surface border border-border2 rounded-[6px] text-text2 opacity-50 cursor-not-allowed"
                  title="近日公開予定"
                >
                  <FileDown className="w-[12px] h-[12px]" />
                  PDFエクスポート
                </button>
              </div>
            </div>

            {/* Results body */}
            <div className="flex-1 overflow-y-auto p-[20px] space-y-[20px]">

              {/* === 企業概要 === */}
              <section>
                <div className="flex items-center gap-[8px] mb-[8px]">
                  <Building2 className="w-[16px] h-[16px] text-mint-dd" />
                  <h4 className="text-[14px] font-bold text-text">企業概要</h4>
                </div>
                <div className="bg-surf2 border border-border2 rounded-[10px] p-[14px]">
                  <p className="text-[13px] text-text leading-[1.7] whitespace-pre-wrap">
                    {diagnosis.company_overview}
                  </p>
                </div>
              </section>

              {/* === SWOT分析 === */}
              <section>
                <div className="flex items-center gap-[8px] mb-[8px]">
                  <BarChart3 className="w-[16px] h-[16px] text-mint-dd" />
                  <h4 className="text-[14px] font-bold text-text">SWOT分析</h4>
                </div>
                <div className="grid grid-cols-2 gap-[2px] bg-border2 rounded-[10px] overflow-hidden">
                  {/* Strengths */}
                  <div className="bg-blue-50 p-[14px]">
                    <div className="flex items-center gap-[6px] mb-[8px]">
                      <Shield className="w-[14px] h-[14px] text-blue-600" />
                      <span className="text-[12px] font-bold text-blue-700">強み</span>
                    </div>
                    <ul className="space-y-[4px]">
                      {diagnosis.swot.strengths.map((item, i) => (
                        <li key={i} className="text-[12px] text-blue-900 flex items-start gap-[6px]">
                          <span className="text-blue-400 mt-[2px]">&#8226;</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* Weaknesses */}
                  <div className="bg-amber-50 p-[14px]">
                    <div className="flex items-center gap-[6px] mb-[8px]">
                      <AlertTriangle className="w-[14px] h-[14px] text-amber-600" />
                      <span className="text-[12px] font-bold text-amber-700">弱み</span>
                    </div>
                    <ul className="space-y-[4px]">
                      {diagnosis.swot.weaknesses.map((item, i) => (
                        <li key={i} className="text-[12px] text-amber-900 flex items-start gap-[6px]">
                          <span className="text-amber-400 mt-[2px]">&#8226;</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* Opportunities */}
                  <div className="bg-emerald-50 p-[14px]">
                    <div className="flex items-center gap-[6px] mb-[8px]">
                      <TrendingUp className="w-[14px] h-[14px] text-emerald-600" />
                      <span className="text-[12px] font-bold text-emerald-700">機会</span>
                    </div>
                    <ul className="space-y-[4px]">
                      {diagnosis.swot.opportunities.map((item, i) => (
                        <li key={i} className="text-[12px] text-emerald-900 flex items-start gap-[6px]">
                          <span className="text-emerald-400 mt-[2px]">&#8226;</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* Threats */}
                  <div className="bg-red-50 p-[14px]">
                    <div className="flex items-center gap-[6px] mb-[8px]">
                      <Zap className="w-[14px] h-[14px] text-red-600" />
                      <span className="text-[12px] font-bold text-red-700">脅威</span>
                    </div>
                    <ul className="space-y-[4px]">
                      {diagnosis.swot.threats.map((item, i) => (
                        <li key={i} className="text-[12px] text-red-900 flex items-start gap-[6px]">
                          <span className="text-red-400 mt-[2px]">&#8226;</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {/* === 4P分析 === */}
              <section>
                <div className="flex items-center gap-[8px] mb-[8px]">
                  <Package className="w-[16px] h-[16px] text-mint-dd" />
                  <h4 className="text-[14px] font-bold text-text">4P分析</h4>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-[8px]">
                  {([
                    { key: 'product' as const, label: 'Product', icon: Package, color: 'text-violet-600 bg-violet-50 border-violet-200' },
                    { key: 'price' as const, label: 'Price', icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
                    { key: 'place' as const, label: 'Place', icon: MapPin, color: 'text-blue-600 bg-blue-50 border-blue-200' },
                    { key: 'promotion' as const, label: 'Promotion', icon: Megaphone, color: 'text-orange-600 bg-orange-50 border-orange-200' },
                  ]).map(({ key, label, icon: Icon, color }) => (
                    <div key={key} className={`rounded-[10px] border p-[12px] ${color}`}>
                      <div className="flex items-center gap-[6px] mb-[6px]">
                        <Icon className="w-[14px] h-[14px]" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
                      </div>
                      <p className="text-[12px] leading-[1.6] text-text">
                        {diagnosis.four_p[key]}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* === MECE解決策 === */}
              <section>
                <div className="flex items-center gap-[8px] mb-[8px]">
                  <Layers className="w-[16px] h-[16px] text-mint-dd" />
                  <h4 className="text-[14px] font-bold text-text">MECE解決策</h4>
                </div>
                <div className="space-y-[6px]">
                  {diagnosis.mece_solutions.map((mece, i) => {
                    const isOpen = expandedMece[mece.category] ?? (i === 0)
                    return (
                      <div key={mece.category} className="border border-border2 rounded-[8px] overflow-hidden">
                        <button
                          onClick={() => toggleMece(mece.category)}
                          className="w-full flex items-center justify-between px-[14px] py-[10px] bg-surf2 hover:bg-border2/30 transition-colors text-left"
                        >
                          <span className="text-[13px] font-semibold text-text">{mece.category}</span>
                          {isOpen
                            ? <ChevronDown className="w-[14px] h-[14px] text-text2" />
                            : <ChevronRight className="w-[14px] h-[14px] text-text2" />
                          }
                        </button>
                        {isOpen && (
                          <div className="px-[14px] py-[10px] bg-surface">
                            <ul className="space-y-[4px]">
                              {mece.solutions.map((sol, j) => (
                                <li key={j} className="text-[12px] text-text flex items-start gap-[6px]">
                                  <span className="text-mint-dd mt-[2px]">&#8226;</span>
                                  {sol}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>

              {/* === 優先アクション === */}
              <section>
                <div className="flex items-center gap-[8px] mb-[8px]">
                  <Target className="w-[16px] h-[16px] text-mint-dd" />
                  <h4 className="text-[14px] font-bold text-text">優先アクション</h4>
                </div>
                <div className="border border-border2 rounded-[10px] overflow-hidden">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="bg-surf2 border-b border-border2">
                        <th className="text-left px-[12px] py-[8px] text-text2 font-semibold">アクション</th>
                        <th className="text-left px-[12px] py-[8px] text-text2 font-semibold w-[100px]">タイムライン</th>
                        <th className="text-center px-[12px] py-[8px] text-text2 font-semibold w-[80px]">インパクト</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diagnosis.priority_actions.map((action, i) => (
                        <tr key={i} className="border-b border-border2 last:border-b-0 hover:bg-surf2/50 transition-colors">
                          <td className="px-[12px] py-[8px] text-text">{action.action}</td>
                          <td className="px-[12px] py-[8px] text-text2">{action.timeline}</td>
                          <td className="px-[12px] py-[8px] text-center">
                            <span className={`inline-block text-[10px] font-bold px-[8px] py-[2px] rounded-full border ${IMPACT_COLORS[action.impact] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                              {action.impact}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* === リスクアセスメント === */}
              <section>
                <div className="flex items-center gap-[8px] mb-[8px]">
                  <AlertTriangle className="w-[16px] h-[16px] text-mint-dd" />
                  <h4 className="text-[14px] font-bold text-text">リスクアセスメント</h4>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-[10px] p-[14px]">
                  <p className="text-[13px] text-red-900 leading-[1.7] whitespace-pre-wrap">
                    {diagnosis.risk_assessment}
                  </p>
                </div>
              </section>

              {/* === 推奨アプローチ === */}
              <section>
                <div className="flex items-center gap-[8px] mb-[8px]">
                  <Lightbulb className="w-[16px] h-[16px] text-mint-dd" />
                  <h4 className="text-[14px] font-bold text-text">推奨アプローチ</h4>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-[10px] p-[14px]">
                  <p className="text-[13px] text-amber-900 leading-[1.7] whitespace-pre-wrap">
                    {diagnosis.recommended_approach}
                  </p>
                </div>
              </section>

              {/* === 想定ROI === */}
              <section>
                <div className="flex items-center gap-[8px] mb-[8px]">
                  <TrendingUp className="w-[16px] h-[16px] text-mint-dd" />
                  <h4 className="text-[14px] font-bold text-text">想定ROI</h4>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-[10px] p-[14px]">
                  <p className="text-[13px] text-emerald-900 leading-[1.7] whitespace-pre-wrap">
                    {diagnosis.estimated_roi}
                  </p>
                </div>
              </section>

            </div>
          </>
        )}
      </div>
    </div>
  )
}
