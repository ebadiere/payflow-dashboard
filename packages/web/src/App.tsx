import MetricsSummary from './components/MetricsSummary'
import StuckQueue from './components/StuckQueue'
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
          <StuckQueue />
        </div>
      </main>
    </div>
  )
}

export default App
