import MetricsSummary from './components/MetricsSummary'
function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-semibold tracking-tight">PayFlow Dashboard</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <div className="space-y-6">
          <MetricsSummary />

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-end justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Stuck Queue</h2>
              <div className="text-xs text-slate-500">Coming next</div>
            </div>

            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
              Placeholder for the StuckQueue component.
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default App
