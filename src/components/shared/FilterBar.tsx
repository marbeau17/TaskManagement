'use client'

interface FilterOption {
  label: string
  value: string
}

interface FilterConfig {
  label: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
}

interface FilterBarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  filters: FilterConfig[]
}

export function FilterBar({ searchValue, onSearchChange, filters }: FilterBarProps) {
  return (
    <div className="flex items-center gap-[10px] flex-wrap">
      {/* Search input */}
      <div className="relative">
        <span className="absolute left-[8px] top-1/2 -translate-y-1/2 text-text3 text-[13px]">
          🔍
        </span>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="検索..."
          className="
            h-[32px] pl-[28px] pr-[10px] rounded-[6px]
            bg-surface border border-wf-border text-text text-[12px]
            placeholder:text-text3 focus:outline-none focus:border-mint
            w-[180px]
          "
        />
      </div>

      {/* Filter dropdowns */}
      {filters.map((filter, i) => (
        <select
          key={i}
          value={filter.value}
          onChange={(e) => filter.onChange(e.target.value)}
          className="
            h-[32px] px-[8px] rounded-[6px]
            bg-surface border border-wf-border text-text text-[12px]
            focus:outline-none focus:border-mint cursor-pointer
          "
        >
          <option value="">{filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}
    </div>
  )
}
