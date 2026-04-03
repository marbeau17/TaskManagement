'use client'

import { useState } from 'react'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import type { CrmForm } from '@/types/crm-form'

interface Props {
  form: CrmForm
  onBack: () => void
}

export function CrmFormEmbed({ form, onBack }: Props) {
  const { t } = useI18n()
  const [copied, setCopied] = useState<string | null>(null)

  const appUrl = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://task-management-nine-iota.vercel.app'

  const submitUrl = `${appUrl}/api/crm/forms/${form.id}/submit`

  // Generate standalone HTML form
  const htmlEmbed = `<!-- WorkFlow CRM Form: ${form.name} -->
<form id="wf-form-${form.id}" onsubmit="return wfSubmit(event)">
${(form.fields ?? []).filter(f => f.type !== 'hidden').map(f => {
    const req = f.required ? ' required' : ''
    const ph = f.placeholder ? ` placeholder="${f.placeholder}"` : ''
    switch (f.type) {
      case 'textarea':
        return `  <div style="margin-bottom:12px">
    <label style="display:block;font-size:14px;margin-bottom:4px">${f.label}${f.required ? ' *' : ''}</label>
    <textarea name="${f.name}" rows="3"${req}${ph} style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:14px"></textarea>
  </div>`
      case 'select':
        return `  <div style="margin-bottom:12px">
    <label style="display:block;font-size:14px;margin-bottom:4px">${f.label}${f.required ? ' *' : ''}</label>
    <select name="${f.name}"${req} style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:14px">
      <option value="">選択してください</option>
${(f.options ?? []).map(o => `      <option value="${o}">${o}</option>`).join('\n')}
    </select>
  </div>`
      case 'checkbox':
        return `  <div style="margin-bottom:12px">
    <label style="display:flex;align-items:center;gap:6px;font-size:14px">
      <input type="checkbox" name="${f.name}"${req}> ${f.label}
    </label>
  </div>`
      default:
        return `  <div style="margin-bottom:12px${f.width === 'half' ? ';display:inline-block;width:48%;margin-right:2%' : ''}">
    <label style="display:block;font-size:14px;margin-bottom:4px">${f.label}${f.required ? ' *' : ''}</label>
    <input type="${f.type}" name="${f.name}"${req}${ph} style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:14px">
  </div>`
    }
  }).join('\n')}
  <button type="submit" style="background:${form.settings?.formColor ?? '#1a2d51'};color:#fff;padding:10px 24px;border:none;border-radius:6px;font-size:14px;font-weight:bold;cursor:pointer">
    ${form.settings?.submitButtonText ?? '送信'}
  </button>
  <div id="wf-form-msg-${form.id}" style="display:none;padding:12px;margin-top:12px;background:#e8f5e9;border-radius:6px;color:#2e7d32;font-size:14px"></div>
</form>
<script>
function wfSubmit(e) {
  e.preventDefault();
  var form = e.target;
  var data = {};
  new FormData(form).forEach(function(v, k) { data[k] = v; });
  data._source_url = window.location.href;
  data._utm_source = new URLSearchParams(window.location.search).get('utm_source') || '';
  data._utm_medium = new URLSearchParams(window.location.search).get('utm_medium') || '';
  data._utm_campaign = new URLSearchParams(window.location.search).get('utm_campaign') || '';
  fetch('${submitUrl}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: data })
  }).then(function(r) { return r.json(); }).then(function(res) {
    if (res.redirectUrl) { window.location.href = res.redirectUrl; return; }
    var msg = document.getElementById('wf-form-msg-${form.id}');
    msg.textContent = res.thankYouMessage || 'ありがとうございます';
    msg.style.display = 'block';
    form.reset();
  }).catch(function() {
    alert('送信に失敗しました。もう一度お試しください。');
  });
  return false;
}
</script>`

  const iframeEmbed = `<iframe src="${appUrl}/api/crm/forms/${form.id}/preview" style="width:100%;min-height:400px;border:none" title="${form.name}"></iframe>`

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="flex flex-col gap-[16px]">
      <button onClick={onBack} className="flex items-center gap-[4px] text-[12px] text-mint-dd hover:underline self-start">
        <ArrowLeft className="w-[14px] h-[14px]" /> {t('common.back')}
      </button>

      <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
        <div className="px-[16px] py-[12px] border-b border-border2 bg-surf2">
          <h3 className="text-[14px] font-bold text-text">{t('crm.forms.embedCode')}: {form.name}</h3>
          <p className="text-[11px] text-text3 mt-[2px]">{t('crm.forms.embedDescription')}</p>
        </div>

        <div className="p-[16px] space-y-[16px]">
          {/* HTML Embed */}
          <div>
            <div className="flex items-center justify-between mb-[6px]">
              <label className="text-[12px] font-semibold text-text2">HTML {t('crm.forms.embedSnippet')}</label>
              <button onClick={() => handleCopy(htmlEmbed, 'html')} className="flex items-center gap-[4px] text-[11px] text-mint-dd hover:underline">
                {copied === 'html' ? <Check className="w-[12px] h-[12px]" /> : <Copy className="w-[12px] h-[12px]" />}
                {copied === 'html' ? t('common.copied') : t('common.copy')}
              </button>
            </div>
            <pre className="bg-[#1e1e1e] text-[#d4d4d4] text-[11px] p-[12px] rounded-[8px] overflow-x-auto max-h-[300px] overflow-y-auto font-mono leading-relaxed">
              {htmlEmbed}
            </pre>
          </div>

          {/* API Endpoint */}
          <div>
            <label className="text-[12px] font-semibold text-text2 block mb-[4px]">API Endpoint</label>
            <div className="flex items-center gap-[6px]">
              <code className="flex-1 bg-surf2 px-[10px] py-[6px] rounded-[6px] text-[11px] font-mono text-text truncate">{submitUrl}</code>
              <button onClick={() => handleCopy(submitUrl, 'api')} className="shrink-0 text-[11px] text-mint-dd hover:underline">
                {copied === 'api' ? '✓' : t('common.copy')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
