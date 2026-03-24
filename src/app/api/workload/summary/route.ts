import { NextResponse } from 'next/server'

const useMock = () => process.env.NEXT_PUBLIC_USE_MOCK === 'true'

export async function GET() {
  try {
    if (useMock()) {
      const { getMockWorkloadSummaries, getMockWorkloadKpi } = await import(
        '@/lib/mock/handlers'
      )
      return NextResponse.json({
        summaries: getMockWorkloadSummaries(),
        kpi: getMockWorkloadKpi(),
      })
    }

    const { getWorkloadSummaries, getWorkloadKpi } = await import(
      '@/lib/data/workload'
    )
    const [summaries, kpi] = await Promise.all([
      getWorkloadSummaries(),
      getWorkloadKpi(),
    ])

    return NextResponse.json({ summaries, kpi })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch workload summary', detail: String(error) },
      { status: 500 }
    )
  }
}
