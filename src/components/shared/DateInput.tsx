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
  // Accept both YYYY-MM-DD and YYYY/MM/DD
  const parts = value.split(/[-/]/)
  if (parts.length !== 3) return ['', '', '']
  return [parts[0], parts[1], parts[2]]
}

// Create a synthetic event that mimics ChangeEvent<HTMLInputElement>
function makeSyntheticEvent(
  name: string | undefined,
  value: string,
  hiddenRef: HTMLInputElement | null,
): ChangeEvent<HTMLInputElement> {
  // Use the hidden input as the target so react-hook-form can read .value
  if (hiddenRef) {
    // Set value via native setter to ensure react sees it
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

  // Forward ref to hidden input (for react-hook-form register)
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

  // ---------------------------------------------------------------------------
  // Segment handlers
  // ---------------------------------------------------------------------------

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
    setMonth(raw)
    if (raw.length === 2) {
      dayRef.current?.focus()
      dayRef.current?.select()
    }
  }

  const handleDayChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2)
    setDay(raw)
  }

  // On blur of any segment, validate + emit
  const handleSegmentBlur = (
    e: FocusEvent<HTMLInputElement>,
    segment: 'year' | 'month' | 'day',
  ) => {
    let y = year
    let m = month
    let d = day

    // Only clamp if the segment has a complete value (avoid clamping partial input like "20" → 1900)
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

    // Only emit change when all segments are complete
    const yValid = y.length === 4 && parseInt(y, 10) >= 1900
    const mValid = m.length >= 1 && parseInt(m, 10) >= 1 && parseInt(m, 10) <= 12
    const dValid = d.length >= 1 && parseInt(d, 10) >= 1 && parseInt(d, 10) <= 31

    if (yValid && mValid && dValid) {
      emitChange(pad(parseInt(y, 10), 4), pad(parseInt(m, 10), 2), pad(parseInt(d, 10), 2))
    } else if (!y && !m && !d) {
      // Allow clearing the date
      emitChange('', '', '')
    }

    // Also call original onBlur (from react-hook-form register)
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
        // Forward tab
        if (segment === 'year') {
          e.preventDefault()
          monthRef.current?.focus()
          monthRef.current?.select()
        } else if (segment === 'month') {
          e.preventDefault()
          dayRef.current?.focus()
          dayRef.current?.select()
        }
        // segment === 'day': let default tab behavior move to next element
      } else {
        // Shift+Tab (backward)
        if (segment === 'day') {
          e.preventDefault()
          monthRef.current?.focus()
          monthRef.current?.select()
        } else if (segment === 'month') {
          e.preventDefault()
          yearRef.current?.focus()
          yearRef.current?.select()
        }
        // segment === 'year': let default shift+tab move to previous element
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Styling
  // ---------------------------------------------------------------------------

  const segmentBase =
    'bg-transparent border-none outline-none text-center text-inherit font-inherit'

  // Merge provided className with wrapper defaults
  const wrapperClass = [
    'inline-flex items-center gap-0',
    'border rounded-md px-2 py-1 text-[13px]',
    'bg-surface text-text',
    'focus-within:outline-none focus-within:ring-2 focus-within:ring-mint/40 focus-within:border-mint',
    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text',
    className ?? 'border-wf-border',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={wrapperClass} onClick={() => !disabled && yearRef.current?.focus()}>
      {/* Hidden input for react-hook-form / form submission */}
      <input
        ref={hiddenRef}
        type="hidden"
        name={name}
        id={id}
        value={buildDateString(year, month, day)}
        required={required}
      />
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
    </span>
  )
})
