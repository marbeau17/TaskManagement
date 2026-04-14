'use client'

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  type ChangeEvent,
  type KeyboardEvent,
  type FocusEvent,
  type InputHTMLAttributes,
} from 'react'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DateInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  /** Current value in YYYY-MM-DD format (same as native date input) */
  value?: string
  /** Fires with a synthetic ChangeEvent whose target.value is YYYY-MM-DD */
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pad(n: number | string, len: number): string {
  return String(n).padStart(len, '0')
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function buildDateString(y: string, m: string, d: string): string {
  if (!y && !m && !d) return ''
  const yy = pad(y || '0', 4)
  const mm = pad(m || '0', 2)
  const dd = pad(d || '0', 2)
  return `${yy}-${mm}-${dd}`
}

function parseDateValue(value: string | undefined): [string, string, string] {
  if (!value) return ['', '', '']
  const parts = value.split(/[-/]/)
  if (parts.length !== 3) return ['', '', '']
  return [parts[0], parts[1], parts[2]]
}

function makeSyntheticEvent(
  name: string | undefined,
  value: string,
  hiddenRef: HTMLInputElement | null,
): ChangeEvent<HTMLInputElement> {
  if (hiddenRef) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set
    nativeInputValueSetter?.call(hiddenRef, value)
  }
  const target = hiddenRef ?? ({ value, name: name ?? '' } as HTMLInputElement)
  return {
    target,
    currentTarget: target,
    type: 'change',
    bubbles: true,
    cancelable: false,
    defaultPrevented: false,
    eventPhase: 0,
    isTrusted: false,
    nativeEvent: new Event('change'),
    preventDefault: () => {},
    stopPropagation: () => {},
    persist: () => {},
    isDefaultPrevented: () => false,
    isPropagationStopped: () => false,
    timeStamp: Date.now(),
  } as unknown as ChangeEvent<HTMLInputElement>
}

function getDaysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate()
}

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

// ---------------------------------------------------------------------------
// Calendar Picker
// ---------------------------------------------------------------------------

function CalendarPicker({
  value,
  onSelect,
  onClose,
}: {
  value: string
  onSelect: (date: string) => void
  onClose: () => void
}) {
  const today = new Date()
  const parsed = parseDateValue(value)
  const initYear = parsed[0] ? parseInt(parsed[0], 10) : today.getFullYear()
  const initMonth = parsed[1] ? parseInt(parsed[1], 10) : today.getMonth() + 1

  const [viewYear, setViewYear] = useState(initYear)
  const [viewMonth, setViewMonth] = useState(initMonth)
  const calRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDow = new Date(viewYear, viewMonth - 1, 1).getDay()

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear(viewYear - 1); setViewMonth(12) }
    else setViewMonth(viewMonth - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear(viewYear + 1); setViewMonth(1) }
    else setViewMonth(viewMonth + 1)
  }

  const selectedDate = value || ''
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1, 2)}-${pad(today.getDate(), 2)}`

  return (
    <div ref={calRef} className="absolute top-full left-0 mt-[4px] z-50 bg-surface border border-border2 rounded-[8px] shadow-lg p-[8px] min-w-[240px]" onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="flex items-center justify-between mb-[6px]">
        <button type="button" onClick={prevMonth} className="w-[24px] h-[24px] flex items-center justify-center text-text2 hover:text-mint hover:bg-surf2 rounded transition-colors text-[14px]">‹</button>
        <span className="text-[12px] font-bold text-text">{viewYear}年 {viewMonth}月</span>
        <button type="button" onClick={nextMonth} className="w-[24px] h-[24px] flex items-center justify-center text-text2 hover:text-mint hover:bg-surf2 rounded transition-colors text-[14px]">›</button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0 mb-[2px]">
        {WEEKDAY_LABELS.map((d, i) => (
          <div key={d} className={`text-[9px] text-center font-medium py-[2px] ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-text3'}`}>{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0">
        {/* Empty cells before first day */}
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`e-${i}`} className="w-[30px] h-[28px]" />
        ))}
        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1
          const dateStr = `${viewYear}-${pad(viewMonth, 2)}-${pad(dayNum, 2)}`
          const isSelected = dateStr === selectedDate
          const isToday = dateStr === todayStr
          const dow = (firstDow + i) % 7

          return (
            <button
              key={dayNum}
              type="button"
              onClick={() => { onSelect(dateStr); onClose() }}
              className={`w-[30px] h-[28px] text-[11px] rounded-[4px] flex items-center justify-center transition-colors
                ${isSelected ? 'bg-mint text-white font-bold' :
                  isToday ? 'bg-mint/10 text-mint font-semibold ring-1 ring-mint/30' :
                  dow === 0 ? 'text-red-400 hover:bg-surf2' :
                  dow === 6 ? 'text-blue-400 hover:bg-surf2' :
                  'text-text hover:bg-surf2'}
              `}
            >
              {dayNum}
            </button>
          )
        })}
      </div>

      {/* Today button */}
      <div className="mt-[6px] border-t border-border2 pt-[6px] flex justify-between">
        <button type="button" onClick={() => { onSelect(todayStr); onClose() }}
          className="text-[10px] text-mint hover:text-mint-d font-medium">
          今日
        </button>
        <button type="button" onClick={() => { onSelect(''); onClose() }}
          className="text-[10px] text-text3 hover:text-danger font-medium">
          クリア
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  { value, onChange, id, name, className, min, max, required, disabled, onBlur, ...rest },
  ref,
) {
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [showCalendar, setShowCalendar] = useState(false)

  const yearRef = useRef<HTMLInputElement>(null)
  const monthRef = useRef<HTMLInputElement>(null)
  const dayRef = useRef<HTMLInputElement>(null)
  const hiddenRef = useRef<HTMLInputElement>(null)

  // Sync external value → internal segments
  useEffect(() => {
    const [y, m, d] = parseDateValue(value)
    setYear(y)
    setMonth(m)
    setDay(d)
  }, [value])

  // Forward ref to hidden input
  useEffect(() => {
    if (!ref) return
    const el = hiddenRef.current
    if (typeof ref === 'function') {
      ref(el)
    } else {
      (ref as React.MutableRefObject<HTMLInputElement | null>).current = el
    }
  }, [ref])

  // Emit change
  const emitChange = useCallback(
    (y: string, m: string, d: string) => {
      if (!onChange) return
      const dateStr = buildDateString(y, m, d)
      const evt = makeSyntheticEvent(name, dateStr, hiddenRef.current)
      onChange(evt)
    },
    [onChange, name],
  )

  // Calendar selection handler
  const handleCalendarSelect = useCallback((dateStr: string) => {
    if (!dateStr) {
      setYear('')
      setMonth('')
      setDay('')
      emitChange('', '', '')
      return
    }
    const [y, m, d] = parseDateValue(dateStr)
    setYear(y)
    setMonth(m)
    setDay(d)
    emitChange(y, m, d)
  }, [emitChange])

  // Segment handlers
  const handleYearChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4)
    setYear(raw)
    if (raw.length === 4) {
      monthRef.current?.focus()
      monthRef.current?.select()
    }
  }

  const handleMonthChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2)
    if (raw.length === 2) {
      // Clamp before auto-advancing (blur won't see the new value due to React batching)
      const n = clamp(parseInt(raw, 10) || 0, 1, 12)
      const clamped = pad(n, 2)
      setMonth(clamped)
      dayRef.current?.focus()
      dayRef.current?.select()
    } else {
      setMonth(raw)
    }
  }

  const handleDayChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2)
    if (raw.length === 2) {
      const n = clamp(parseInt(raw, 10) || 0, 1, 31)
      setDay(pad(n, 2))
    } else {
      setDay(raw)
    }
  }

  // On blur of any segment, validate + emit
  const handleSegmentBlur = (
    e: FocusEvent<HTMLInputElement>,
    segment: 'year' | 'month' | 'day',
  ) => {
    let y = year
    let m = month
    let d = day

    if (segment === 'year' && y) {
      if (y.length >= 4) {
        const n = clamp(parseInt(y, 10) || 0, 1900, 2100)
        y = pad(n, 4)
        setYear(y)
      }
    }
    if (segment === 'month' && m) {
      if (m.length >= 2 || parseInt(m, 10) > 1) {
        const n = clamp(parseInt(m, 10) || 0, 1, 12)
        m = pad(n, 2)
        setMonth(m)
      }
    }
    if (segment === 'day' && d) {
      if (d.length >= 2 || parseInt(d, 10) > 3) {
        const n = clamp(parseInt(d, 10) || 0, 1, 31)
        d = pad(n, 2)
        setDay(d)
      }
    }

    const yValid = y.length === 4 && parseInt(y, 10) >= 1900
    const mValid = m.length >= 1 && parseInt(m, 10) >= 1 && parseInt(m, 10) <= 12
    const dValid = d.length >= 1 && parseInt(d, 10) >= 1 && parseInt(d, 10) <= 31

    if (yValid && mValid && dValid) {
      emitChange(pad(parseInt(y, 10), 4), pad(parseInt(m, 10), 2), pad(parseInt(d, 10), 2))
    } else if (!y && !m && !d) {
      emitChange('', '', '')
    }

    if (onBlur) {
      onBlur(e as unknown as FocusEvent<HTMLInputElement>)
    }
  }

  // Tab / Shift+Tab navigation between segments
  const handleKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    segment: 'year' | 'month' | 'day',
  ) => {
    if (e.key === 'Tab') {
      if (!e.shiftKey) {
        if (segment === 'year') {
          e.preventDefault()
          monthRef.current?.focus()
          monthRef.current?.select()
        } else if (segment === 'month') {
          e.preventDefault()
          dayRef.current?.focus()
          dayRef.current?.select()
        }
      } else {
        if (segment === 'day') {
          e.preventDefault()
          monthRef.current?.focus()
          monthRef.current?.select()
        } else if (segment === 'month') {
          e.preventDefault()
          yearRef.current?.focus()
          yearRef.current?.select()
        }
      }
    }
  }

  const segmentBase =
    'bg-transparent border-none outline-none text-center text-inherit font-inherit'

  const wrapperClass = [
    'relative inline-flex items-center gap-0',
    'border rounded-md px-2 py-1 text-[13px]',
    'bg-surface text-text',
    'focus-within:outline-none focus-within:ring-2 focus-within:ring-mint/40 focus-within:border-mint',
    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text',
    className ?? 'border-wf-border',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={wrapperClass}>
      {/* Hidden input for react-hook-form / form submission */}
      <input
        ref={hiddenRef}
        type="hidden"
        name={name}
        id={id}
        value={buildDateString(year, month, day)}
        required={required}
      />

      {/* Calendar button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); if (!disabled) setShowCalendar(!showCalendar) }}
        disabled={disabled}
        className="mr-[4px] text-[14px] text-text3 hover:text-mint transition-colors leading-none"
        aria-label="Open calendar"
        tabIndex={-1}
      >
        📅
      </button>

      <input
        ref={yearRef}
        type="text"
        inputMode="numeric"
        placeholder="YYYY"
        value={year}
        disabled={disabled}
        className={`${segmentBase} w-[3.2ch]`}
        onChange={handleYearChange}
        onBlur={(e) => handleSegmentBlur(e, 'year')}
        onKeyDown={(e) => handleKeyDown(e, 'year')}
        onFocus={(e) => e.target.select()}
        aria-label="Year"
      />
      <span className="text-text3 select-none">/</span>
      <input
        ref={monthRef}
        type="text"
        inputMode="numeric"
        placeholder="MM"
        value={month}
        disabled={disabled}
        className={`${segmentBase} w-[2.2ch]`}
        onChange={handleMonthChange}
        onBlur={(e) => handleSegmentBlur(e, 'month')}
        onKeyDown={(e) => handleKeyDown(e, 'month')}
        onFocus={(e) => e.target.select()}
        aria-label="Month"
      />
      <span className="text-text3 select-none">/</span>
      <input
        ref={dayRef}
        type="text"
        inputMode="numeric"
        placeholder="DD"
        value={day}
        disabled={disabled}
        className={`${segmentBase} w-[2.2ch]`}
        onChange={handleDayChange}
        onBlur={(e) => handleSegmentBlur(e, 'day')}
        onKeyDown={(e) => handleKeyDown(e, 'day')}
        onFocus={(e) => e.target.select()}
        aria-label="Day"
      />

      {/* Calendar dropdown */}
      {showCalendar && (
        <CalendarPicker
          value={buildDateString(year, month, day)}
          onSelect={handleCalendarSelect}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </span>
  )
})
