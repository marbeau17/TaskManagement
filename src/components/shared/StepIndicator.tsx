'use client'

interface Step {
  label: string
  status: 'done' | 'active' | 'pending'
}

interface StepIndicatorProps {
  steps: Step[]
}

export function StepIndicator({ steps }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center">
          {/* Connecting line before (except first) */}
          {i > 0 && (
            <div
              className="h-[2px] w-[28px]"
              style={{
                backgroundColor:
                  steps[i - 1].status === 'done'
                    ? 'var(--color-mint)'
                    : 'var(--color-wf-border)',
              }}
            />
          )}
          {/* Step circle */}
          <div
            className={`
              flex items-center justify-center rounded-full shrink-0 font-semibold
              ${step.status === 'done' ? 'bg-mint border-mint text-white' : ''}
              ${step.status === 'active' ? 'bg-surface border-mint text-mint-d' : ''}
              ${step.status === 'pending' ? 'bg-surf2 border-wf-border text-text3' : ''}
              border-[2px]
            `}
            style={{ width: 27, height: 27, fontSize: 11 }}
            title={step.label}
          >
            {step.status === 'done' ? '✓' : i + 1}
          </div>
        </div>
      ))}
    </div>
  )
}
