import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import SeverityBadge from '../SeverityBadge'
import EmptyState from '../EmptyState'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

export default function C2BeaconPanel({ data }) {
  if (!data || data.length === 0) {
    return <EmptyState icon="📡" title="No C2 Beaconing Detected" desc="No outbound connections with suspiciously regular timing (CV < 0.15) were found." />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">C2 Beaconing</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {data.length} suspicious flow{data.length !== 1 ? 's' : ''} with regular inter-arrival timing (CV &lt; 0.15)
          </p>
        </div>
        <HelpTip text="The Coefficient of Variation (CV = σ/μ) measures timing regularity. A CV below 0.15 on outbound connection intervals suggests an implant phoning home on a timer." />
      </div>

      {data.map((flow, i) => (
        <FlowCard key={i} flow={flow} />
      ))}
    </div>
  )
}

function FlowCard({ flow }) {
  const chartData = {
    labels: flow.rel_timestamps?.slice(1).map(t => `${t.toFixed(0)}s`) || [],
    datasets: [{
      label: 'Inter-arrival time (s)',
      data: flow.interval_series || [],
      borderColor: flow.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b',
      backgroundColor: flow.severity === 'CRITICAL' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
      borderWidth: 1.5,
      pointRadius: 2,
      tension: 0.3,
      fill: true,
    }],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: {
      label: ctx => `${ctx.parsed.y.toFixed(2)}s`
    }}},
    scales: {
      x: { display: false },
      y: {
        ticks: { color: '#6b7280', font: { size: 10 } },
        grid: { color: '#1f2937' },
      },
    },
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header row */}
      <div className="px-5 py-4 flex flex-wrap items-center gap-4">
        <SeverityBadge severity={flow.severity} />
        <div className="font-mono text-sm text-gray-200">
          {flow.src_ip} → <span className="text-white font-semibold">{flow.dst_ip}</span>:{flow.dst_port}
          <span className="text-gray-500 ml-2">({flow.protocol})</span>
        </div>
        <div className="ml-auto flex gap-6 text-right text-xs">
          <Stat label="CV" value={flow.cv} className={flow.cv < 0.05 ? 'text-red-400' : 'text-yellow-400'} />
          <Stat label="Avg interval" value={flow.beacon_period_display} />
          <Stat label="Connections" value={flow.connection_count.toLocaleString()} />
        </div>
      </div>

      {/* Interval sparkline */}
      {flow.interval_series?.length > 2 && (
        <div className="px-5 pb-4">
          <p className="text-xs text-gray-500 mb-2">Inter-arrival time heartbeat</p>
          <div className="h-24 bg-gray-950 rounded-lg p-2">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, className = 'text-gray-200' }) {
  return (
    <div>
      <p className="text-gray-500">{label}</p>
      <p className={`font-semibold ${className}`}>{value}</p>
    </div>
  )
}

function HelpTip({ text }) {
  return (
    <div className="group relative">
      <button className="w-6 h-6 rounded-full bg-gray-800 text-gray-400 text-xs flex items-center justify-center hover:bg-gray-700">?</button>
      <div className="hidden group-hover:block absolute right-0 top-8 w-72 bg-gray-800 border border-gray-700 rounded-xl p-3 text-xs text-gray-300 shadow-xl z-10 leading-relaxed">
        {text}
      </div>
    </div>
  )
}
