'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useAddMember } from '@/hooks/useMembers'
import { ROLE_LABELS, getRoleLabel } from '@/lib/constants'
import { useAllRoles, useAddCustomRole } from '@/hooks/useRoles'
import { useI18n } from '@/hooks/useI18n'
import { translations } from '@/lib/i18n/translations'
import type { Locale } from '@/lib/i18n/translations'

// ---------------------------------------------------------------------------
// Zod schema – uses current locale for messages
// ---------------------------------------------------------------------------

function createInviteSchema(locale: Locale) {
  const t = translations[locale]
  return z.object({
    email: z.email(t['members.validation.emailRequired']),
    name: z.string().min(1, t['members.validation.nameRequired']),
    name_short: z
      .string()
      .min(1, t['members.validation.shortNameRequired'])
      .max(1, t['members.validation.shortNameMax']),
    role: z.string().min(1, t['members.validation.roleRequired']),
    weekly_capacity_hours: z.number().min(0).max(80),
  })
}

type InviteFormValues = z.infer<ReturnType<typeof createInviteSchema>>

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface InviteMemberModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function InviteMemberModal({
  open,
  onOpenChange,
  onSuccess,
}: InviteMemberModalProps) {
  const { t, locale } = useI18n()
  const addMember = useAddMember()
  const [newCustomRole, setNewCustomRole] = useState('')
  const { allRoles } = useAllRoles()
  const addCustomRoleMutation = useAddCustomRole()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(createInviteSchema(locale)),
    defaultValues: {
      email: '',
      name: '',
      name_short: '',
      role: 'creator',
      weekly_capacity_hours: 16.0,
    },
  })

  const currentRole = watch('role')

  const onSubmit = async (data: InviteFormValues) => {
    try {
      await addMember.mutateAsync(data)
      reset()
      onOpenChange(false)
      onSuccess?.()
    } catch {
      // Error is handled by mutation state
    }
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset()
      addMember.reset()
      setNewCustomRole('')
    }
    onOpenChange(nextOpen)
  }

  const handleAddCustomRole = async () => {
    const trimmed = newCustomRole.trim()
    if (!trimmed) return
    try {
      await addCustomRoleMutation.mutateAsync(trimmed)
      setValue('role', trimmed)
      setNewCustomRole('')
    } catch {
      // Error handled by mutation state
    }
  }

  const labelClass = 'text-[11px] text-text2 font-medium block mb-[4px]'
  const inputClass =
    'w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint'
  const errorClass = 'text-[10px] text-danger mt-[2px]'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-surface border border-border2 sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-bold text-text">
            {t('members.inviteTitle')}
          </DialogTitle>
          <DialogDescription className="text-[11px] text-text2">
            {t('members.inviteDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-[12px]">
          {/* Email */}
          <div>
            <label className={labelClass}>{t('members.emailAddress')}</label>
            <input
              type="email"
              placeholder="user@example.com"
              className={inputClass}
              {...register('email')}
            />
            {errors.email && (
              <p className={errorClass}>{errors.email.message}</p>
            )}
          </div>

          {/* Name */}
          <div>
            <label className={labelClass}>{t('members.name')}</label>
            <input
              type="text"
              placeholder={t('members.namePlaceholder')}
              className={inputClass}
              {...register('name')}
            />
            {errors.name && (
              <p className={errorClass}>{errors.name.message}</p>
            )}
          </div>

          {/* Short name */}
          <div>
            <label className={labelClass}>{t('members.shortName')}</label>
            <input
              type="text"
              placeholder={t('members.shortNamePlaceholder')}
              maxLength={1}
              className={inputClass}
              {...register('name_short')}
            />
            {errors.name_short && (
              <p className={errorClass}>{errors.name_short.message}</p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className={labelClass}>{t('members.role')}</label>
            <select
              className={inputClass}
              value={currentRole}
              onChange={(e) => setValue('role', e.target.value)}
            >
              {allRoles.map((r) => (
                <option key={r} value={r}>
                  {getRoleLabel(r)}
                </option>
              ))}
            </select>
            {/* Add new custom role inline */}
            <div className="flex gap-[6px] mt-[6px]">
              <input
                type="text"
                value={newCustomRole}
                onChange={(e) => setNewCustomRole(e.target.value)}
                placeholder={t('members.newCustomRolePlaceholder')}
                className={inputClass}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddCustomRole()
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddCustomRole}
                disabled={!newCustomRole.trim() || addCustomRoleMutation.isPending}
                className="shrink-0 px-[10px] py-[7px] text-[11px] text-mint font-medium bg-surface border border-border2 rounded-[6px] hover:bg-surf2 transition-colors whitespace-nowrap disabled:opacity-50"
              >
                {addCustomRoleMutation.isPending ? '...' : t('members.addRole')}
              </button>
            </div>
            {errors.role && (
              <p className={errorClass}>{errors.role.message}</p>
            )}
          </div>

          {/* Weekly capacity */}
          <div>
            <label className={labelClass}>{t('members.weeklyCapacityFull')}</label>
            <input
              type="number"
              min={0}
              max={80}
              step={0.5}
              className={inputClass}
              {...register('weekly_capacity_hours', { valueAsNumber: true })}
            />
            {errors.weekly_capacity_hours && (
              <p className={errorClass}>
                {errors.weekly_capacity_hours.message}
              </p>
            )}
          </div>

          {/* Notice */}
          <div className="bg-info-bg border border-info-b rounded-[6px] px-[10px] py-[8px] text-[11px] text-info leading-relaxed">
            {t('members.initialPasswordNotice')}
          </div>

          {/* Mutation error */}
          {addMember.isError && (
            <div className="bg-danger-bg border border-danger-b rounded-[6px] px-[10px] py-[8px] text-[11px] text-danger">
              {t('members.inviteFailed')}
            </div>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => handleClose(false)}
              className="px-[16px] py-[7px] text-[12px] text-text2 bg-surf2 rounded-[6px] hover:bg-border2 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || addMember.isPending}
              className="px-[16px] py-[7px] text-[12px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors disabled:opacity-50"
            >
              {addMember.isPending ? t('members.inviting') : t('members.inviteAction')}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
