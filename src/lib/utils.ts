import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { WORKLOAD_THRESHOLDS } from './constants'
import type { WorkloadStatus } from '@/types/workload'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Format an ISO date string to Japanese-style date.
 * e.g. "2026-03-24T00:00:00Z" -> "2026/03/24"
 */
export function formatDate(date: string): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}/${m}/${day}`
}

/**
 * Format hours as "X.Xh".
 * e.g. 3 -> "3.0h", 1.5 -> "1.5h"
 */
export function formatHours(hours: number): string {
  return `${hours.toFixed(1)}h`
}

// ---------------------------------------------------------------------------
// Progress / workload helpers
// ---------------------------------------------------------------------------

/**
 * Return a semantic colour band for a progress percentage (0-100).
 */
export function getProgressColor(
  progress: number,
): 'low' | 'mid' | 'high' | 'full' {
  if (progress >= 100) return 'full'
  if (progress >= 70) return 'high'
  if (progress >= 30) return 'mid'
  return 'low'
}

/**
 * Derive the workload status from a utilization rate (0-100+).
 */
export function getWorkloadStatus(rate: number): WorkloadStatus {
  if (rate >= WORKLOAD_THRESHOLDS.danger) return 'overloaded'
  if (rate >= WORKLOAD_THRESHOLDS.warning) return 'warning'
  if (rate > 0) return 'normal'
  return 'available'
}

/**
 * Return a Tailwind text-colour class based on utilization rate.
 */
export function getWorkloadColor(rate: number): string {
  if (rate >= WORKLOAD_THRESHOLDS.danger) return 'text-red-600'
  if (rate >= WORKLOAD_THRESHOLDS.warning) return 'text-amber-600'
  if (rate > 0) return 'text-emerald-600'
  return 'text-slate-400'
}
