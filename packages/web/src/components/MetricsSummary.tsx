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

function StatCard({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string | number
  valueClassName?: string
}) {
  return (
    <div className="rounded-xl bg-gray-800 px-4 py-4 shadow-sm">
      <div className="text-sm font-medium text-white">{label}</div>
      <div className={valueClassName ?? 'mt-2 text-3xl font-bold text-white'}>{value}</div>
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
      <section className="w-full">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-xl font-semibold text-white">Metrics Summary</h2>
          <div className="text-xs text-slate-300">Auto-refreshes every 30s</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-gray-800/40 px-4 py-3 text-sm text-slate-200">
          Loading…
        </div>
      </section>
    )
  }

  if (isError) {
    return (
      <section className="w-full">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-xl font-semibold text-white">Metrics Summary</h2>
          <div className="text-xs text-slate-300">Auto-refreshes every 30s</div>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error instanceof Error ? error.message : 'Failed to fetch metrics'}
        </div>
      </section>
    )
  }

  if (!data) {
    return (
      <section className="w-full">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-xl font-semibold text-white">Metrics Summary</h2>
          <div className="text-xs text-slate-300">Auto-refreshes every 30s</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-gray-800/40 px-4 py-3 text-sm text-slate-200">
          No data available.
        </div>
      </section>
    )
  }

  const summary = data.data

  return (
    <section className="w-full">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-xl font-semibold text-white">Metrics Summary</h2>
        <div className="text-xs text-slate-300">Auto-refreshes every 30s</div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={summary.totalCount} />
        <StatCard
          label="Completed"
          value={summary.completedCount}
          valueClassName="mt-2 text-3xl font-bold text-emerald-300"
        />
        <StatCard
          label="Failed"
          value={summary.failedCount}
          valueClassName="mt-2 text-3xl font-bold text-red-300"
        />
        <StatCard
          label="Stuck"
          value={summary.stuckCount}
          valueClassName="mt-2 text-3xl font-bold text-amber-300"
        />
        <StatCard label="Pending" value={summary.pendingCount} />
        <StatCard label="Processing" value={summary.processingCount} />
        <StatCard
          label="Success Rate"
          value={`${summary.successRate.toFixed(2)}%`}
          valueClassName="mt-2 text-3xl font-bold text-emerald-300"
        />
      </div>
    </section>
  )
}
