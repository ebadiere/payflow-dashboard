import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

type MetricsSummaryResponse = {
  data: {
    totalCount: number
    completedCount: number
    failedCount: number
    stuckCount: number
    pendingCount: number
    processingCount: number
    successRate: number
  }
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  )
}

export default function MetricsSummary() {
  const { data, isLoading, isError, error } = useQuery<MetricsSummaryResponse>({
    queryKey: ['metrics', 'summary'],
    queryFn: api.getMetricsSummary,
    refetchInterval: 30000,
  })

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-medium text-slate-500">Metrics Summary</div>
        <div className="mt-2 text-slate-700">Loading…</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 shadow-sm">
        <div className="text-sm font-medium">Metrics Summary</div>
        <div className="mt-2 text-sm">
          {error instanceof Error ? error.message : 'Failed to fetch metrics'}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-medium text-slate-500">Metrics Summary</div>
        <div className="mt-2 text-slate-700">No data available.</div>
      </div>
    )
  }

  const summary = data.data

  return (
    <section className="w-full">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Metrics Summary</h2>
        <div className="text-xs text-slate-500">Auto-refreshes every 30s</div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={summary.totalCount} />
        <StatCard label="Completed" value={summary.completedCount} />
        <StatCard label="Failed" value={summary.failedCount} />
        <StatCard label="Stuck" value={summary.stuckCount} />
        <StatCard label="Pending" value={summary.pendingCount} />
        <StatCard label="Processing" value={summary.processingCount} />
        <StatCard label="Success Rate" value={`${summary.successRate.toFixed(2)}%`} />
      </div>
    </section>
  )
}
