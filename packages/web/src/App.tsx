// PayFlow Dashboard: shows a live metrics summary and a stuck transaction queue with retry actions.
import MetricsSummary from './components/MetricsSummary'
import StuckQueue from './components/StuckQueue'
function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-slate-100">
      <div className="mx-auto w-full max-w-[1200px] p-4 sm:p-6">
        <header className="mb-6 border-b border-white/10 pb-4">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            PayFlow Dashboard
          </h1>
        </header>

        <main>
          <div className="space-y-10">
            <MetricsSummary />
            <StuckQueue />
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
