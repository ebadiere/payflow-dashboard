import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

type Transaction = {
  id: string
  rail: string
  amount: string | number
  currency: string
  sender: string
  recipient: string
  status: string
  createdAt: string
  updatedAt: string
}

type StuckTransactionsResponse = {
  data: Transaction[]
}

function formatAge(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return '—'

  const totalSeconds = Math.floor(ms / 1000)
  const seconds = totalSeconds % 60
  const totalMinutes = Math.floor(totalSeconds / 60)
  const minutes = totalMinutes % 60
  const totalHours = Math.floor(totalMinutes / 60)
  const hours = totalHours % 24
  const days = Math.floor(totalHours / 24)

  const parts: string[] = []
  if (days) parts.push(`${days}d`)
  if (hours) parts.push(`${hours}h`)
  if (minutes) parts.push(`${minutes}m`)
  if (!parts.length) parts.push(`${seconds}s`)
  return parts.join(' ')
}

function truncateId(id: string) {
  return id.length > 8 ? id.slice(0, 8) : id
}

export default function StuckQueue() {
  const queryClient = useQueryClient()

  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
  } = useQuery<StuckTransactionsResponse>({
    queryKey: ['stuck-transactions'],
    queryFn: api.getTransactionsStuck,
    refetchInterval: 30000,
  })

  const retryMutation = useMutation({
    mutationFn: (id: string) => api.retryTransaction(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stuck-transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['metrics'] }),
      ])
    },
  })

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-end justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Stuck Queue</h2>
          <div className="text-xs text-slate-500">Auto-refreshes every 30s</div>
        </div>
        <div className="mt-2 text-sm text-slate-600">Loading stuck transactions...</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 shadow-sm">
        <div className="mb-2 flex items-end justify-between">
          <h2 className="text-lg font-semibold">Stuck Queue</h2>
          <div className="text-xs text-red-800">Auto-refreshes every 30s</div>
        </div>
        <div className="text-sm">Failed to load stuck transactions.</div>
        {error instanceof Error && (
          <div className="mt-2 text-xs text-red-800">{error.message}</div>
        )}
      </div>
    )
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-end justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Stuck Queue</h2>
          <div className="text-xs text-slate-500">Auto-refreshes every 30s</div>
        </div>
        <div className="text-sm text-slate-600">No stuck transactions. All clear.</div>
      </div>
    )
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Stuck Queue</h2>
        <div className="text-xs text-slate-500">
          {isFetching ? 'Refreshing…' : 'Auto-refreshes every 30s'}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="w-[8rem] border-b border-slate-200 px-3 py-2">Transaction</th>
              <th className="w-[6rem] border-b border-slate-200 px-3 py-2">Rail</th>
              <th className="w-[10rem] border-b border-slate-200 px-3 py-2">Amount</th>
              <th className="border-b border-slate-200 px-3 py-2">Route</th>
              <th className="w-[8rem] border-b border-slate-200 px-3 py-2">Time stuck</th>
              <th className="w-[7rem] border-b border-slate-200 px-3 py-2">Status</th>
              <th className="w-[12rem] border-b border-slate-200 px-3 py-2">Retry</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((t, idx) => {
              const createdAtMs = new Date(t.createdAt).getTime()
              const timeStuckMs = Date.now() - createdAtMs
              const isRowRetrying = retryMutation.isPending && retryMutation.variables === t.id

              return (
                <tr
                  key={t.id}
                  className={
                    idx % 2 === 0
                      ? 'text-sm text-slate-800'
                      : 'bg-slate-50/60 text-sm text-slate-800'
                  }
                >
                  <td className="border-b border-slate-100 px-3 py-2 font-mono text-xs text-slate-700" title={t.id}>
                    {truncateId(t.id)}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2">{t.rail}</td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    {t.amount} {t.currency}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    {t.sender} {' -> '} {t.recipient}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2">{formatAge(timeStuckMs)}</td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    <span className="inline-flex rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                      {t.status}
                    </span>
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    <button
                      type="button"
                      className="inline-flex items-center rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => retryMutation.mutate(t.id)}
                      disabled={retryMutation.isPending}
                    >
                      {isRowRetrying ? 'Retrying...' : 'Retry'}
                    </button>

                    {retryMutation.isError && retryMutation.variables === t.id && (
                      <div className="mt-1 text-xs text-red-700">
                        {retryMutation.error instanceof Error
                          ? retryMutation.error.message
                          : 'Retry failed'}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
