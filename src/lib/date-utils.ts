// =============================================================================
// Date utility functions (uses date-fns)
// =============================================================================

import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
  differenceInCalendarDays,
  isToday,
  isBefore,
  startOfDay,
} from 'date-fns'
import { ja } from 'date-fns/locale'

export interface DateRange {
  start: Date
  end: Date
  label: string
}

/**
 * Get the ISO week range (Mon-Sun) containing the given date.
 * Defaults to the current date.
 */
export function getWeekRange(date: Date = new Date()): DateRange {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  const end = endOfWeek(date, { weekStartsOn: 1 })
  const label = `${format(start, 'M/d', { locale: ja })}\uFF5E${format(end, 'M/d', { locale: ja })}`
  return { start, end, label }
}

/**
 * Get the calendar month range containing the given date.
 * Defaults to the current date.
 */
export function getMonthRange(date: Date = new Date()): DateRange {
  const start = startOfMonth(date)
  const end = endOfMonth(date)
  const label = format(start, 'yyyy\u5E74M\u6708', { locale: ja })
  return { start, end, label }
}

/**
 * Check whether a deadline (ISO string) is in the past.
 */
export function isOverdue(deadline: string): boolean {
  const d = new Date(deadline)
  if (isNaN(d.getTime())) return false
  return isBefore(startOfDay(d), startOfDay(new Date()))
}

/**
 * Return the number of calendar days until the deadline.
 * Negative means overdue.
 */
export function daysUntilDeadline(deadline: string): number {
  const d = new Date(deadline)
  if (isNaN(d.getTime())) return 0
  return differenceInCalendarDays(startOfDay(d), startOfDay(new Date()))
}

/**
 * Human-readable relative deadline label.
 *  - overdue  -> "\u8D85\u904E"
 *  - today    -> "\u672C\u65E5"
 *  - 1-7 days -> "X\u65E5\u5F8C"
 *  - else     -> formatted date "M/d"
 */
export function formatRelativeDeadline(deadline: string): string {
  const d = new Date(deadline)
  if (isNaN(d.getTime())) return ''

  if (isToday(d)) return '\u672C\u65E5'

  const days = daysUntilDeadline(deadline)
  if (days < 0) return '\u8D85\u904E'
  if (days <= 7) return `${days}\u65E5\u5F8C`

  return format(d, 'M/d', { locale: ja })
}
