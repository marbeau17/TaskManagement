'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { StepIndicator, StatusChip } from '@/components/shared'
import { TaskForm } from '@/components/tasks/TaskForm'
import { AssignForm } from '@/components/tasks/AssignForm'
import { useCreateTask } from '@/hooks/useTasks'
import { useI18n } from '@/hooks/useI18n'
import type { TaskFormStep1, TaskFormStep2 } from '@/types/task'

// ---------------------------------------------------------------------------
// Step definitions for StepIndicator
// ---------------------------------------------------------------------------

function getSteps(currentStep: 1 | 2, t: (key: string) => string) {
  return [
    {
      label: t('tasks.step1Label'),
      status: currentStep === 1 ? 'active' : 'done',
    },
    {
      label: t('tasks.step2Label'),
      status: currentStep === 2 ? 'active' : 'pending',
    },
  ] as const
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function TaskNewPage() {
  const { t } = useI18n()
  const router = useRouter()
  const createTask = useCreateTask()

  const [currentStep, setCurrentStep] = useState<1 | 2>(1)
  const [step1Data, setStep1Data] = useState<TaskFormStep1 | null>(null)

  // Step 1 submit → save data, advance to step 2
  const handleStep1Submit = useCallback((data: TaskFormStep1) => {
    setStep1Data(data)
    setCurrentStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Step 2 submit → create task with assignment, navigate away
  const handleStep2Submit = useCallback(
    async (data: TaskFormStep2) => {
      if (!step1Data) return
      await createTask.mutateAsync({ step1: step1Data, step2: data })
      router.push('/tasks')
    },
    [step1Data, createTask, router]
  )

  // Skip assignment → create task without step2
  const handleSkip = useCallback(
    async (data: TaskFormStep1) => {
      await createTask.mutateAsync({ step1: data })
      router.push('/tasks')
    },
    [createTask, router]
  )

  // Back from step 2 → return to step 1
  const handleBack = useCallback(() => {
    setCurrentStep(1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Cancel → go back to task list
  const handleCancel = useCallback(() => {
    router.push('/tasks')
  }, [router])

  // Draft save (placeholder)
  const handleDraftSave = useCallback(async () => {
    if (step1Data) {
      await createTask.mutateAsync({ step1: step1Data })
      router.push('/tasks')
    }
  }, [step1Data, createTask, router])

  const steps = getSteps(currentStep, t)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="bg-surface border-b border-wf-border shrink-0">
        <div className="max-w-[780px] mx-auto px-3 md:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <h1 className="text-[16px] font-bold text-text1">
              {t('tasks.stepTitle').replace('{step}', String(currentStep))}
            </h1>
            <StatusChip status="waiting" size="sm" />
          </div>

          <div className="flex items-center gap-4">
            <StepIndicator steps={steps as any} />
            {step1Data && (
              <button
                type="button"
                onClick={handleDraftSave}
                disabled={createTask.isPending}
                className="
                  px-4 py-1.5 rounded-lg text-[12px] font-semibold
                  text-text2 bg-surf2 border border-wf-border
                  hover:bg-wf-border transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {t('tasks.draftSave')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-[780px] mx-auto px-3 md:px-6 py-6 md:py-8">
        {/* Notice bar */}
        <div className="mb-6 px-4 py-3 rounded-lg bg-info-bg border border-info-b text-[12.5px] text-info">
          {t('tasks.noticeBar')}
        </div>

        {/* Step content */}
        {currentStep === 1 && (
          <TaskForm
            defaultValues={step1Data ?? undefined}
            onSubmit={handleStep1Submit}
            onCancel={handleCancel}
          />
        )}

        {currentStep === 2 && step1Data && (
          <AssignForm
            step1Data={step1Data}
            onBack={handleBack}
            onSkip={handleSkip}
            onSubmit={handleStep2Submit}
          />
        )}

        {/* Loading overlay for mutation */}
        {createTask.isPending && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-surface rounded-xl px-8 py-5 shadow-lg text-[14px] font-semibold text-text1">
              {t('tasks.creating')}
            </div>
          </div>
        )}

        {/* Error message */}
        {createTask.isError && (
          <div className="mt-4 px-4 py-3 rounded-lg bg-danger-bg border border-danger-b text-[12.5px] text-danger">
            {t('tasks.createError')}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
