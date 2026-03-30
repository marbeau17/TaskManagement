// =============================================================================
// Application Configuration
// Centralized configurable parameters - edit here to customize behavior
// =============================================================================

export const APP_CONFIG = {
  // ---------------------------------------------------------------------------
  // Task Management
  // ---------------------------------------------------------------------------
  task: {
    /** Default priority for new tasks (1=highest, 5=lowest) */
    defaultPriority: 3,
    /** Priority range */
    priorityMin: 1,
    priorityMax: 5,
    /** Minimum task duration in days for workload proration */
    minDurationDays: 7,
    /** Valid status transitions (from → allowed targets) */
    statusTransitions: {
      waiting: ['todo', 'rejected'],
      todo: ['in_progress', 'waiting', 'rejected'],
      in_progress: ['done', 'todo', 'rejected'],
      done: ['in_progress', 'todo'],
      rejected: ['todo', 'waiting'],
    } as Record<string, string[]>,
  },

  // ---------------------------------------------------------------------------
  // Workload & Capacity
  // ---------------------------------------------------------------------------
  workload: {
    /** Utilization % thresholds */
    warningThreshold: 80,
    dangerThreshold: 100,
    availableThreshold: 30,
    /** Default weekly capacity hours for new members */
    defaultCapacityHours: {
      admin: 40,
      director: 40,
      requester: 16,
      creator: 16,
    } as Record<string, number>,
    /** Default fallback capacity */
    defaultCapacity: 40,
  },

  // ---------------------------------------------------------------------------
  // UI & Pagination
  // ---------------------------------------------------------------------------
  ui: {
    /** Default page size for list views */
    defaultPageSize: 20,
    /** Available page size options */
    pageSizeOptions: [10, 20, 100, 0] as number[], // 0 = All
    /** Debounce delay for search inputs (ms) */
    searchDebounceMs: 300,
    /** Toast notification auto-dismiss (ms) */
    toastDismissMs: 4000,
    /** Max height for scrollable panels (px) */
    panelMaxHeight: 320,
  },

  // ---------------------------------------------------------------------------
  // Alerts & Notifications
  // ---------------------------------------------------------------------------
  alerts: {
    /** Days before deadline to show "soon" warning */
    deadlineSoonDays: 3,
    /** Days to look back for velocity calculation */
    velocityWindowDays: 7,
    /** Notification refetch interval (ms) */
    notificationRefetchMs: 60_000,
    /** Rejection rate warning threshold (%) */
    rejectionRateWarning: 5,
  },

  // ---------------------------------------------------------------------------
  // File Upload
  // ---------------------------------------------------------------------------
  upload: {
    /** Maximum file size in bytes (10MB) */
    maxFileSizeBytes: 10 * 1024 * 1024,
    /** Maximum file size label for display */
    maxFileSizeLabel: '10MB',
    /** Accepted file types for comment attachments */
    commentFileTypes: 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip',
  },

  // ---------------------------------------------------------------------------
  // Cache & Retry
  // ---------------------------------------------------------------------------
  cache: {
    /** Default stale time for queries (ms) */
    queryStaleTimeMs: 60_000,
    /** Permission cache stale time (ms) */
    permissionStaleTimeMs: 5 * 60 * 1000,
    /** Max retry count for queries */
    queryMaxRetries: 2,
    /** Max retry delay (ms) */
    queryMaxRetryDelayMs: 10_000,
  },

  // ---------------------------------------------------------------------------
  // Gantt Chart
  // ---------------------------------------------------------------------------
  gantt: {
    /** Default task bar duration when no deadline set (days) */
    defaultBarDurationDays: 14,
    /** Column width per day at each zoom level */
    columnWidth: { day: 36, week: 28, month: 12 } as Record<string, number>,
    /** Padding before/after timeline (days) */
    paddingBefore: 7,
    paddingAfter: 14,
  },

  // ---------------------------------------------------------------------------
  // Date Format
  // ---------------------------------------------------------------------------
  dateFormat: {
    /** Display format for dates */
    display: 'yyyy/MM/dd',
    /** Short format (month/day) */
    short: 'M/d',
    /** ISO format for storage */
    storage: 'yyyy-MM-dd',
  },
} as const

/** Type for the app config */
export type AppConfig = typeof APP_CONFIG
