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
      <section className="rounded-xl border border-white/10 bg-gray-800 p-4 shadow-sm">
        <div className="mb-2 flex items-end justify-between">
          <h2 className="text-xl font-semibold text-white">Stuck Queue</h2>
          <div className="text-xs text-slate-300">Auto-refreshes every 30s</div>
        </div>
        <div className="mt-2 text-sm text-slate-200">Loading stuck transactions...</div>
      </section>
    )
  }

  if (isError) {
    return (
      <section className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-100 shadow-sm">
        <div className="mb-2 flex items-end justify-between">
          <h2 className="text-xl font-semibold text-white">Stuck Queue</h2>
          <div className="text-xs text-slate-300">Auto-refreshes every 30s</div>
        </div>
        <div className="text-sm">Failed to load stuck transactions.</div>
        {error instanceof Error && (
          <div className="mt-2 text-xs text-red-100">{error.message}</div>
        )}
      </section>
    )
  }

  if (!data || data.data.length === 0) {
    return (
      <section className="rounded-xl border border-white/10 bg-gray-800 p-4 shadow-sm">
        <div className="mb-2 flex items-end justify-between">
          <h2 className="text-xl font-semibold text-white">Stuck Queue</h2>
          <div className="text-xs text-slate-300">Auto-refreshes every 30s</div>
        </div>
        <div className="text-sm text-slate-200">No stuck transactions. All clear.</div>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-white/10 bg-gray-800 p-4 shadow-sm">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-xl font-semibold text-white">Stuck Queue</h2>
        <div className="text-xs text-slate-300">
          {isFetching ? 'Refreshing…' : 'Auto-refreshes every 30s'}
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto">
        <table className="w-full table-fixed border-separate border-spacing-0">
          <thead>
            <tr className="bg-gray-900/40 text-left text-xs font-semibold uppercase tracking-wide text-slate-200">
              <th className="w-[8rem] border-b border-white/10 px-4 py-3">Transaction</th>
              <th className="w-[6rem] border-b border-white/10 px-4 py-3">Rail</th>
              <th className="w-[10rem] border-b border-white/10 px-4 py-3">Amount</th>
              <th className="hidden border-b border-white/10 px-4 py-3 sm:table-cell">Route</th>
              <th className="w-[8rem] border-b border-white/10 px-4 py-3">Time stuck</th>
              <th className="hidden w-[7rem] border-b border-white/10 px-4 py-3 sm:table-cell">Status</th>
              <th className="w-[10rem] border-b border-white/10 px-4 py-3 sm:w-[12rem]">Retry</th>
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
                      ? 'text-sm text-slate-100 hover:bg-white/5'
                      : 'bg-white/5 text-sm text-slate-100 hover:bg-white/5'
                  }
                >
                  <td className="border-b border-white/10 px-4 py-3 font-mono text-xs text-slate-300" title={t.id}>
                    {truncateId(t.id)}
                  </td>
                  <td className="border-b border-white/10 px-4 py-3">{t.rail}</td>
                  <td className="border-b border-white/10 px-4 py-3">
                    {t.amount} {t.currency}
                  </td>
                  <td className="hidden border-b border-white/10 px-4 py-3 sm:table-cell">
                    {t.sender} {' -> '} {t.recipient}
                  </td>
                  <td className="border-b border-white/10 px-4 py-3 whitespace-nowrap">{formatAge(timeStuckMs)}</td>
                  <td className="hidden border-b border-white/10 px-4 py-3 sm:table-cell">
                    <span
                      className={
                        t.status === 'PROCESSING'
                          ? 'inline-flex rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-1 text-xs font-medium text-amber-200'
                          : 'inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium text-slate-200'
                      }
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="border-b border-white/10 px-4 py-3">
                    <button
                      type="button"
                      className="inline-flex items-center rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 active:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => retryMutation.mutate(t.id)}
                      disabled={retryMutation.isPending}
                    >
                      {isRowRetrying ? 'Retrying...' : 'Retry'}
                    </button>

                    {retryMutation.isError && retryMutation.variables === t.id && (
                      <div className="mt-1 text-xs text-red-200">
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
