// =============================================================================
// Shared CSV import helpers (quote-aware parser + header mapping)
// =============================================================================

export interface ParsedCsv {
  headers: string[]
  rows: string[][]
}

/**
 * Parse a CSV string into headers + rows. Handles quoted fields,
 * escaped double-quotes ("" → "), and CRLF or LF line endings.
 * Strips a UTF-8 BOM if present.
 */
export function parseCsv(text: string): ParsedCsv {
  const stripped = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const lines = stripped.split(/\r?\n/).filter((line) => line.trim() !== '')
  if (lines.length === 0) return { headers: [], rows: [] }

  const parseLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"'
          i++
        } else if (ch === '"') {
          inQuotes = false
        } else {
          current += ch
        }
      } else {
        if (ch === '"') {
          inQuotes = true
        } else if (ch === ',') {
          result.push(current.trim())
          current = ''
        } else {
          current += ch
        }
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseLine(lines[0])
  const rows = lines.slice(1).map(parseLine)
  return { headers, rows }
}

/**
 * Build a map from header string → row index, using a normalizer so that
 * equivalent headers (trimmed, case-insensitive) collapse to one entry.
 * Later duplicate headers override earlier ones.
 */
export function indexHeaders(headers: string[]): Map<string, number> {
  const map = new Map<string, number>()
  headers.forEach((h, i) => {
    const key = normalizeHeader(h)
    if (key) map.set(key, i)
  })
  return map
}

export function normalizeHeader(h: string): string {
  return h.trim().toLowerCase()
}

/**
 * Find the column index for a field given a list of acceptable header names
 * (Japanese + English). Returns -1 when no candidate matches.
 */
export function pickColumn(
  headerIndex: Map<string, number>,
  candidates: string[],
): number {
  for (const c of candidates) {
    const idx = headerIndex.get(normalizeHeader(c))
    if (idx !== undefined) return idx
  }
  return -1
}

/** Read a cell by column index, returning '' for out-of-range or undefined. */
export function cell(row: string[], index: number): string {
  if (index < 0 || index >= row.length) return ''
  return (row[index] ?? '').trim()
}

/**
 * Parse a date-like value into YYYY-MM-DD. Accepts:
 *   - 2021-02-23, 2021/02/23, 2021.02.23
 *   - Excel ISO with time (2021-02-23T00:00:00)
 *   - 2021年2月23日 (Japanese long form)
 * Returns null for empty or unparseable input.
 */
export function parseDateCell(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  const jp = v.match(/^(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/)
  if (jp) {
    const [, y, m, d] = jp
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const match = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (!match) return null
  const [, y, m, d] = match
  const mm = m.padStart(2, '0')
  const dd = d.padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

/**
 * Parse a numeric cell. Strips common currency/thousands formatting.
 * Returns null for empty input, NaN for explicitly invalid.
 */
export function parseNumberCell(value: string): number | null {
  const v = value.trim().replace(/[,¥$\s]/g, '')
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
