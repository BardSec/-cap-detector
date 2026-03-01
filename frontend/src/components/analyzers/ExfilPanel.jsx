import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Title, Tooltip,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import SeverityBadge from '../SeverityBadge'
import EmptyState from '../EmptyState'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip)

function fmtBytes(bytes) {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(2)} GB`
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

export default function ExfilPanel({ data }) {
  if (!data || data.length === 0) {
    return <EmptyState icon="📤" title="No Exfiltration Detected" desc="No outbound flows exceeded 1 MB with a 5:1 send/receive asymmetry." />
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Data Exfiltration</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          {data.length} flow{data.length !== 1 ? 's' : ''} with &gt;1 MB outbound and &gt;5:1 send/receive ratio
        </p>
      </div>

      {data.map((flow, i) => (
        <FlowCard key={i} flow={flow} />
      ))}
    </div>
  )
}

function FlowCard({ flow }) {
  const total = flow.outbound_bytes + flow.inbound_bytes
  const outPct = total > 0 ? (flow.outbound_bytes / total) * 100 : 100

  const chartData = {
    labels: ['Outbound', 'Inbound'],
    datasets: [{
      data: [flow.outbound_bytes, flow.inbound_bytes],
      backgroundColor: ['#ef4444', '#3b82f6'],
      borderRadius: 4,
    }],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => fmtBytes(ctx.parsed.x) } },
    },
    scales: {
      x: {
        ticks: { color: '#6b7280', font: { size: 10 },
          callback: (v) => fmtBytes(v) },
        grid: { color: '#1f2937' },
      },
      y: { ticks: { color: '#9ca3af', font: { size: 11 } }, grid: { display: false } },
    },
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <SeverityBadge severity={flow.severity} />
          <div>
            <p className="font-mono text-white font-semibold">
              {flow.src_ip} → {flow.dst_ip}:{flow.dst_port}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {flow.duration_sec > 0 ? `${flow.duration_sec}s · ` : ''}{flow.bandwidth_kbps} KB/s · {flow.packet_count.toLocaleString()} packets
            </p>
          </div>
        </div>

        <div className="flex gap-6 text-right text-xs">
          <div>
            <p className="text-gray-500">Outbound</p>
            <p className="text-red-400 font-bold text-base">{fmtBytes(flow.outbound_bytes)}</p>
          </div>
          <div>
            <p className="text-gray-500">Inbound</p>
            <p className="text-blue-400 font-semibold">{fmtBytes(flow.inbound_bytes)}</p>
          </div>
          <div>
            <p className="text-gray-500">Ratio</p>
            <p className="text-red-400 font-bold">{flow.ratio}:1</p>
          </div>
        </div>
      </div>

      {/* Asymmetry bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Send/receive balance</span>
          <span>{outPct.toFixed(0)}% outbound</span>
        </div>
        <div className="w-full h-3 bg-blue-900/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 rounded-full transition-all"
            style={{ width: `${outPct}%` }}
          />
        </div>
      </div>

      {/* Byte comparison chart */}
      <div className="h-20">
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  )
}
