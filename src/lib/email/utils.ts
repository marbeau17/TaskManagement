/**
 * Escape HTML entities to prevent XSS in email content.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Format a date string for email display.
 */
export function formatEmailDate(dateStr: string | null): string {
  if (!dateStr) return '未設定'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '未設定'
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Truncate text for email body.
 */
export function truncateText(text: string | null, maxLength = 200): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}
