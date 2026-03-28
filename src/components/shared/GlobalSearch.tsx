'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import {
  SearchIcon,
  CheckSquareIcon,
  AlertCircleIcon,
  FolderIcon,
  BuildingIcon,
  UsersIcon,
} from 'lucide-react'
import { useTasks } from '@/hooks/useTasks'
import { useIssues } from '@/hooks/useIssues'
import { useProjects } from '@/hooks/useProjects'
import { useMembers } from '@/hooks/useMembers'
import { useClients } from '@/hooks/useClients'
import { useI18n } from '@/hooks/useI18n'

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const router = useRouter()
  const { t } = useI18n()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Debounce the query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query)
    }, 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery('')
      setDebouncedQuery('')
    }
  }, [open])

  // Fetch all data
  const { data: tasks } = useTasks()
  const { data: issues } = useIssues()
  const { data: projects } = useProjects()
  const { data: members } = useMembers()
  const { data: clients } = useClients()

  const lowerQuery = debouncedQuery.toLowerCase().trim()

  const filteredTasks = useMemo(() => {
    if (!lowerQuery || !tasks) return []
    return tasks
      .filter((t) => t.title.toLowerCase().includes(lowerQuery))
      .slice(0, 8)
  }, [tasks, lowerQuery])

  const filteredIssues = useMemo(() => {
    if (!lowerQuery || !issues) return []
    return issues
      .filter(
        (i) =>
          i.title.toLowerCase().includes(lowerQuery) ||
          i.issue_key.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 8)
  }, [issues, lowerQuery])

  const filteredProjects = useMemo(() => {
    if (!lowerQuery || !projects) return []
    return projects
      .filter((p) => p.name.toLowerCase().includes(lowerQuery))
      .slice(0, 8)
  }, [projects, lowerQuery])

  const filteredClients = useMemo(() => {
    if (!lowerQuery || !clients) return []
    return clients
      .filter((c) => c.name.toLowerCase().includes(lowerQuery))
      .slice(0, 8)
  }, [clients, lowerQuery])

  const filteredMembers = useMemo(() => {
    if (!lowerQuery || !members) return []
    return members
      .filter((m) => m.name.toLowerCase().includes(lowerQuery))
      .slice(0, 8)
  }, [members, lowerQuery])

  const hasResults =
    filteredTasks.length > 0 ||
    filteredIssues.length > 0 ||
    filteredProjects.length > 0 ||
    filteredClients.length > 0 ||
    filteredMembers.length > 0

  const handleSelect = useCallback(
    (path: string) => {
      setOpen(false)
      router.push(path)
    },
    [router]
  )

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-text3 hover:text-text2 hover:bg-surf2 transition-colors text-xs"
        aria-label={t('search.placeholder')}
      >
        <SearchIcon className="size-4" />
        <span className="hidden sm:inline">{t('search.placeholder')}</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border2 bg-surf2 px-1.5 py-0.5 text-[10px] font-mono text-text3">
          <span className="text-[11px]">&#8984;</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} title={t('search.placeholder')}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('search.placeholder')}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {lowerQuery && !hasResults && (
              <CommandEmpty>{t('search.noResults')}</CommandEmpty>
            )}

            {filteredTasks.length > 0 && (
              <CommandGroup heading={t('search.tasks')}>
                {filteredTasks.map((task) => (
                  <CommandItem
                    key={task.id}
                    value={`task-${task.id}`}
                    onSelect={() => handleSelect(`/tasks/${task.id}`)}
                  >
                    <CheckSquareIcon className="size-4 text-muted-foreground" />
                    <span className="truncate">{task.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredIssues.length > 0 && (
              <CommandGroup heading={t('search.issues')}>
                {filteredIssues.map((issue) => (
                  <CommandItem
                    key={issue.id}
                    value={`issue-${issue.id}`}
                    onSelect={() => handleSelect(`/issues/${issue.id}`)}
                  >
                    <AlertCircleIcon className="size-4 text-muted-foreground" />
                    <span className="text-muted-foreground text-xs font-mono mr-1">
                      {issue.issue_key}
                    </span>
                    <span className="truncate">{issue.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredProjects.length > 0 && (
              <CommandGroup heading={t('search.projects')}>
                {filteredProjects.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={`project-${project.id}`}
                    onSelect={() => handleSelect(`/projects/${project.id}`)}
                  >
                    <FolderIcon className="size-4 text-muted-foreground" />
                    <span className="truncate">{project.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredClients.length > 0 && (
              <CommandGroup heading={t('search.clients')}>
                {filteredClients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={`client-${client.id}`}
                    onSelect={() => handleSelect(`/clients`)}
                  >
                    <BuildingIcon className="size-4 text-muted-foreground" />
                    <span className="truncate">{client.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredMembers.length > 0 && (
              <CommandGroup heading={t('search.members')}>
                {filteredMembers.map((member) => (
                  <CommandItem
                    key={member.id}
                    value={`member-${member.id}`}
                    onSelect={() => handleSelect(`/members`)}
                  >
                    <UsersIcon className="size-4 text-muted-foreground" />
                    <span className="truncate">{member.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
