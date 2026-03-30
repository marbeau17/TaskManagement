/**
 * Calculate prorated weekly hours for a task.
 * Priority: weekly_plan > planned_hours_per_week > prorated estimated_hours
 */
export function getTaskWeeklyHours(
  task: {
    estimated_hours?: number | null
    start_date?: string | null
    created_at?: string
    confirmed_deadline?: string | null
    desired_deadline?: string | null
    planned_hours_per_week?: number | null
    template_data?: Record<string, any> | null
  },
  weekStartStr?: string
): number {
  // Tier 1: Explicit weekly plan for this specific week
  const weeklyPlan = task.template_data?.weekly_plan as Record<string, number> | undefined
  if (weeklyPlan && weekStartStr && weeklyPlan[weekStartStr] > 0) {
    return weeklyPlan[weekStartStr]
  }

  // Tier 2: Fixed planned hours per week
  const phw = task.planned_hours_per_week
  if (phw && phw > 0) return phw

  // Tier 3: Prorate estimated_hours across task duration
  const estimated = task.estimated_hours ?? 0
  if (estimated <= 0) return 0

  const deadline = task.confirmed_deadline ?? task.desired_deadline
  if (!deadline) return estimated // no deadline = full amount

  const startDate = task.start_date
    ? new Date(task.start_date)
    : task.created_at
      ? new Date(task.created_at)
      : new Date()
  const endDate = new Date(deadline)

  const totalMs = endDate.getTime() - startDate.getTime()
  const totalDays = Math.max(7, Math.ceil(totalMs / (1000 * 60 * 60 * 24)))
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7))

  return Math.round((estimated / totalWeeks) * 10) / 10
}

/**
 * Check if a task's deadline overlaps with a given week.
 */
export function taskOverlapsWeek(
  task: {
    start_date?: string | null
    created_at?: string
    confirmed_deadline?: string | null
    desired_deadline?: string | null
  },
  weekMonday: Date,
  weekSunday: Date
): boolean {
  const startDate = task.start_date
    ? new Date(task.start_date)
    : task.created_at
      ? new Date(task.created_at)
      : new Date()
  const deadline = task.confirmed_deadline ?? task.desired_deadline
  if (!deadline) return true // no deadline = always included
  const endDate = new Date(deadline)

  return weekMonday <= endDate && weekSunday >= startDate
}

/**
 * Get Monday of the week for a given date.
 */
export function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get Sunday of the week for a given date.
 */
export function getSunday(date: Date): Date {
  const monday = getMonday(date)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return sunday
}
