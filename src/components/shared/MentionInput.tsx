'use client'

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import { useMembers } from '@/hooks/useMembers'
import { Avatar } from '@/components/shared/Avatar'
import type { User } from '@/types/database'

interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
}

export function MentionInput({
  value,
  onChange,
  placeholder,
  rows = 3,
  className = '',
}: MentionInputProps) {
  const { data: members } = useMembers()
  const [showDropdown, setShowDropdown] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter members based on the query after "@"
  const filteredMembers: User[] = (members ?? []).filter((m) => {
    if (!query) return true
    const q = query.toLowerCase()
    return (
      m.name.toLowerCase().includes(q) ||
      m.name_short.toLowerCase().includes(q)
    )
  })

  // Reset selection index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const insertMention = useCallback(
    (member: User) => {
      if (mentionStartPos === null) return

      const before = value.slice(0, mentionStartPos)
      const after = value.slice(
        mentionStartPos + 1 + query.length // +1 for "@"
      )
      const newValue = `${before}@${member.name_short} ${after}`

      onChange(newValue)
      setShowDropdown(false)
      setQuery('')
      setMentionStartPos(null)

      // Restore focus and set cursor after inserted mention
      requestAnimationFrame(() => {
        const ta = textareaRef.current
        if (ta) {
          ta.focus()
          const cursorPos = before.length + 1 + member.name_short.length + 1
          ta.setSelectionRange(cursorPos, cursorPos)
        }
      })
    },
    [value, onChange, mentionStartPos, query]
  )

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const cursorPos = e.target.selectionStart ?? 0

    onChange(newValue)

    // Detect "@" for mention trigger
    // Look backwards from cursor for an "@" that starts a mention
    const textBeforeCursor = newValue.slice(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex >= 0) {
      // Check that "@" is at start of text or preceded by whitespace
      const charBefore = lastAtIndex > 0 ? newValue[lastAtIndex - 1] : ' '
      if (charBefore === ' ' || charBefore === '\n' || lastAtIndex === 0) {
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)
        // Only trigger if there's no space in the query part (still typing the mention)
        if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
          setShowDropdown(true)
          setQuery(textAfterAt)
          setMentionStartPos(lastAtIndex)
          return
        }
      }
    }

    setShowDropdown(false)
    setQuery('')
    setMentionStartPos(null)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown || filteredMembers.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) =>
        prev < filteredMembers.length - 1 ? prev + 1 : 0
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredMembers.length - 1
      )
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      insertMention(filteredMembers[selectedIndex])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setShowDropdown(false)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Scroll selected item into view
  useEffect(() => {
    if (!showDropdown || !dropdownRef.current) return
    const item = dropdownRef.current.children[selectedIndex] as HTMLElement
    item?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex, showDropdown])

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />

      {showDropdown && filteredMembers.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 bottom-full mb-1 w-64 max-h-48 overflow-y-auto bg-surface border border-wf-border rounded-md shadow-lg z-50"
        >
          {filteredMembers.slice(0, 10).map((member, idx) => (
            <button
              key={member.id}
              type="button"
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] text-text hover:bg-surf2 transition-colors ${
                idx === selectedIndex ? 'bg-surf2' : ''
              }`}
              onMouseDown={(e) => {
                e.preventDefault() // prevent textarea blur
                insertMention(member)
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <Avatar
                name_short={member.name_short}
                color={member.avatar_color}
                size="sm"
              />
              <span className="font-medium">{member.name}</span>
              <span className="text-text3 ml-auto">@{member.name_short}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
