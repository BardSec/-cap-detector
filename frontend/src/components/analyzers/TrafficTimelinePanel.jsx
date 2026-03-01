import { useRef, useState } from 'react'

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtBytes(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' GB'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + ' MB'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + ' KB'
  return n + ' B'
}

function fmtDuration(s) {
  if (s < 60)   return s.toFixed(1) + 's'
  const m = Math.floor(s / 60), sec = Math.round(s % 60)
  if (m < 60)   return `${m}m ${sec}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

function fmtTime(s) {
  if (s < 60)   return s.toFixed(1) + 's'
  const m = Math.floor(s / 60), sec = (s % 60).toFixed(0).padStart(2, '0')
  if (m < 60)   return `${m}:${sec}`
  const h = Math.floor(m / 60)
  return `${h}:${String(m % 60).padStart(2, '0')}:${sec}`
}

function fmtRate(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + ' k'
  return String(Math.round(n))
}

// ── IO Graph (SVG) ────────────────────────────────────────────────────────────

const W = 960, H = 190
const PAD = { t: 12, r: 16, b: 36, l: 52 }
const CW  = W - PAD.l - PAD.r
const CH  = H - PAD.t - PAD.b

function IoGraph({ timeline, binSeconds, spikes, gaps, captureDuration }) {
  const [hoverIdx, setHoverIdx] = useState(null)
  const svgRef = useRef(null)

  if (!timeline || timeline.length < 2) {
    return <div className="text-gray-500 text-sm py-10 text-center">Not enough data to render graph</div>
  }

  const maxPps = Math.max(...timeline.map(b => b.pps), 1)
  const maxBps = Math.max(...timeline.map(b => b.bps), 1)

  const xOf  = t   => PAD.l + (t  / captureDuration) * CW
  const yPps = pps => PAD.t + CH - (pps / maxPps) * CH
  const yBps = bps => PAD.t + CH - (bps / maxBps) * CH

  // centre each bin on its midpoint
  const pts = timeline.map(b => ({
    x:  xOf(b.t + binSeconds / 2),
    yp: yPps(b.pps),
    yb: yBps(b.bps),
    bin: b,
  }))

  // Paths
  const bottom = PAD.t + CH
  const areaD = [
    `M ${pts[0].x},${bottom}`,
    ...pts.map(p => `L ${p.x},${p.yp}`),
    `L ${pts[pts.length - 1].x},${bottom}`,
    'Z',
  ].join(' ')

  const ppsLineD = pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x},${p.yp}`).join(' ')
  const bpsLineD = pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x},${p.yb}`).join(' ')

  // Axes
  const X_TICKS = 8
  const Y_TICKS = 4
  const xTicks = Array.from({ length: X_TICKS + 1 }, (_, i) => (i / X_TICKS) * captureDuration)
  const yTicks = Array.from({ length: Y_TICKS + 1 }, (_, i) => (i / Y_TICKS) * maxPps)

  // Hover
  const handleMouseMove = e => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const svgX  = ((e.clientX - rect.left) / rect.width) * W
    const chartX = svgX - PAD.l
    const t = (chartX / CW) * captureDuration
    const idx = Math.round(t / binSeconds)
    setHoverIdx(Math.max(0, Math.min(timeline.length - 1, idx)))
  }

  const hov = hoverIdx !== null ? timeline[hoverIdx] : null
  const hovX = hov ? xOf(hov.t + binSeconds / 2) : null
  // position tooltip left or right of crosshair
  const tooltipOnLeft = hovX !== null && hovX > W * 0.6

  return (
    <div
      className="relative bg-gray-950 rounded-xl border border-gray-800 overflow-hidden"
      onMouseLeave={() => setHoverIdx(null)}
    >
      {/* Legend */}
      <div className="flex gap-5 px-4 pt-3 pb-1 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-8 h-2 rounded" style={{ background: 'rgba(99,102,241,0.35)' }} />
          Packets / sec
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-8 border-t-2 border-amber-400 opacity-70" />
          Bytes / sec <span className="text-gray-600">(indep. scale)</span>
        </span>
        {gaps.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-3 rounded" style={{ background: 'rgba(180,83,9,0.35)' }} />
            Gap
          </span>
        )}
        {spikes.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-0 border-l-2 border-dashed border-red-500 h-3 opacity-80" />
            Spike
          </span>
        )}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full cursor-crosshair"
        style={{ display: 'block', height: 210 }}
        onMouseMove={handleMouseMove}
      >
        <defs>
          <linearGradient id="ppsArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#6366f1" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {/* Horizontal grid */}
        {yTicks.map((y, i) => (
          <line key={i}
            x1={PAD.l} y1={yPps(y)} x2={PAD.l + CW} y2={yPps(y)}
            stroke="#1f2937" strokeWidth={i === 0 ? 1 : 0.5}
            strokeDasharray={i === 0 ? '' : '4,3'}
          />
        ))}

        {/* Gap shading */}
        {gaps.map((g, i) => {
          const x1 = xOf(g.start_t), x2 = xOf(g.end_t)
          return (
            <rect key={i} x={x1} y={PAD.t} width={Math.max(x2 - x1, 2)} height={CH}
              fill="#b45309" fillOpacity="0.25" />
          )
        })}

        {/* PPS area */}
        <path d={areaD} fill="url(#ppsArea)" />

        {/* Bytes/sec line (independently normalised) */}
        <path d={bpsLineD} fill="none" stroke="#f59e0b" strokeWidth="1.2" strokeOpacity="0.65" />

        {/* PPS line */}
        <path d={ppsLineD} fill="none" stroke="#818cf8" strokeWidth="1.5" />

        {/* Spike markers */}
        {spikes.map((s, i) => {
          const x = xOf(s.t)
          return (
            <line key={i}
              x1={x} y1={PAD.t} x2={x} y2={PAD.t + CH}
              stroke="#ef4444" strokeWidth="1.2"
              strokeDasharray="4,3" strokeOpacity="0.75"
            />
          )
        })}

        {/* Hover crosshair */}
        {hovX !== null && (
          <line x1={hovX} y1={PAD.t} x2={hovX} y2={PAD.t + CH}
            stroke="#ffffff" strokeWidth="0.75" strokeOpacity="0.4" />
        )}

        {/* X axis line */}
        <line x1={PAD.l} y1={PAD.t + CH} x2={PAD.l + CW} y2={PAD.t + CH}
          stroke="#374151" strokeWidth="1" />

        {/* X ticks + labels */}
        {xTicks.map((t, i) => (
          <g key={i}>
            <line x1={xOf(t)} y1={PAD.t + CH} x2={xOf(t)} y2={PAD.t + CH + 4}
              stroke="#374151" strokeWidth="1" />
            <text x={xOf(t)} y={PAD.t + CH + 15}
              textAnchor="middle" fontSize="10" fill="#6b7280">
              {fmtTime(t)}
            </text>
          </g>
        ))}

        {/* Y axis line */}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + CH}
          stroke="#374151" strokeWidth="1" />

        {/* Y ticks + labels */}
        {yTicks.map((y, i) => (
          <text key={i} x={PAD.l - 6} y={yPps(y) + 4}
            textAnchor="end" fontSize="10" fill="#6b7280">
            {fmtRate(y)}
          </text>
        ))}

        {/* Y axis label */}
        <text
          transform={`translate(11,${PAD.t + CH / 2}) rotate(-90)`}
          textAnchor="middle" fontSize="9" fill="#4b5563" letterSpacing="0.5">
          pkts/s
        </text>
      </svg>

      {/* Floating tooltip */}
      {hov && (
        <div
          className="absolute top-10 pointer-events-none bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs shadow-2xl z-10 min-w-[130px]"
          style={tooltipOnLeft
            ? { right: `${((W - hovX) / W * 100) + 1}%` }
            : { left:  `${(hovX / W * 100) + 1}%` }
          }
        >
          <p className="text-gray-400 mb-1 font-medium">t = {fmtTime(hov.t)}</p>
          <p className="text-indigo-300"><span className="text-gray-500">pps </span>{hov.pps.toFixed(1)}</p>
          <p className="text-amber-300"><span className="text-gray-500">bps </span>{fmtBytes(hov.bps)}/s</p>
          <p className="text-gray-400"><span className="text-gray-500">pkts </span>{hov.pkts}</p>
        </div>
      )}
    </div>
  )
}

// ── Conversations tab ─────────────────────────────────────────────────────────

const PROTO_STYLE = {
  TCP:  'bg-blue-900/40   text-blue-300   border-blue-700/40',
  UDP:  'bg-green-900/40  text-green-300  border-green-700/40',
  ICMP: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/40',
}

function ConversationsTable({ data }) {
  const [sortKey, setSortKey] = useState('bytes')

  const sorted = [...data].sort((a, b) => b[sortKey] - a[sortKey])

  const maxBytes = sorted[0]?.bytes || 1

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-950 text-left">
              <Th>Proto</Th>
              <Th>Endpoints</Th>
              <Th sortable active={sortKey === 'bytes'} onClick={() => setSortKey('bytes')}>Bytes</Th>
              <Th sortable active={sortKey === 'packets'} onClick={() => setSortKey('packets')}>Packets</Th>
              <Th sortable active={sortKey === 'duration_s'} onClick={() => setSortKey('duration_s')}>Duration</Th>
              <Th>Bandwidth bar</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => {
              const portSuffix = (p) => p > 0 ? `:${p}` : ''
              const pct = Math.max(2, (c.bytes / maxBytes) * 100)
              return (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-3 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded border text-xs font-semibold ${PROTO_STYLE[c.proto] || 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                      {c.proto}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-gray-300 whitespace-nowrap">
                    <span className="text-white">{c.ip_a}{portSuffix(c.port_a)}</span>
                    <span className="text-gray-600 mx-1">↔</span>
                    <span className="text-white">{c.ip_b}{portSuffix(c.port_b)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-gray-200 font-medium">{fmtBytes(c.bytes)}</td>
                  <td className="px-3 py-2.5 text-gray-300">{c.packets.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-gray-300">{fmtDuration(c.duration_s)}</td>
                  <td className="px-3 py-2.5 w-32">
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500/70" style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Endpoints tab ─────────────────────────────────────────────────────────────

function EndpointsTable({ data }) {
  const [sortKey, setSortKey] = useState('bytes_total')

  const sorted = [...data].sort((a, b) => b[sortKey] - a[sortKey])
  const maxBytes = sorted[0]?.bytes_total || 1

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-950 text-left">
              <Th>IP Address</Th>
              <Th sortable active={sortKey === 'bytes_total'} onClick={() => setSortKey('bytes_total')}>Total</Th>
              <Th sortable active={sortKey === 'bytes_sent'} onClick={() => setSortKey('bytes_sent')}>Sent ↑</Th>
              <Th sortable active={sortKey === 'bytes_recv'} onClick={() => setSortKey('bytes_recv')}>Recv ↓</Th>
              <Th sortable active={sortKey === 'pkts_total'} onClick={() => setSortKey('pkts_total')}>Packets</Th>
              <Th>Sent / Recv split</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((e, i) => {
              const total = e.bytes_sent + e.bytes_recv || 1
              const sentPct = (e.bytes_sent / total) * 100
              const pct     = Math.max(2, (e.bytes_total / maxBytes) * 100)
              return (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-3 py-2.5 font-mono text-white">{e.ip}</td>
                  <td className="px-3 py-2.5 text-gray-200 font-medium">{fmtBytes(e.bytes_total)}</td>
                  <td className="px-3 py-2.5 text-blue-300">{fmtBytes(e.bytes_sent)}</td>
                  <td className="px-3 py-2.5 text-green-300">{fmtBytes(e.bytes_recv)}</td>
                  <td className="px-3 py-2.5 text-gray-300">{e.pkts_total.toLocaleString()}</td>
                  <td className="px-3 py-2.5 w-36">
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden flex">
                      <div className="h-full bg-blue-500/70" style={{ width: `${sentPct}%` }} />
                      <div className="h-full bg-green-500/60 flex-1" />
                    </div>
                    <p className="text-gray-600 mt-0.5">{sentPct.toFixed(0)}% sent</p>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Shared table helpers ──────────────────────────────────────────────────────

function Th({ children, sortable, active, onClick }) {
  return (
    <th
      className={`px-3 py-3 text-gray-500 font-medium whitespace-nowrap text-left
        ${sortable ? 'cursor-pointer hover:text-gray-300 select-none' : ''}
        ${active ? 'text-gray-200' : ''}`}
      onClick={onClick}
    >
      {children}{active && sortable ? ' ↓' : ''}
    </th>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function TrafficTimelinePanel({ data }) {
  const [innerTab, setInnerTab] = useState('conversations')

  const timeline = data?.timeline          || []
  const spikes   = data?.spikes            || []
  const gaps     = data?.gaps              || []
  const convos   = data?.top_conversations || []
  const endpoints= data?.top_endpoints     || []
  const summary  = data?.summary           || {}
  const binS     = data?.bin_seconds       ?? 1

  if (!timeline.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-5xl mb-4">📊</span>
        <h3 className="text-lg font-semibold text-white mb-2">No Timeline Data</h3>
        <p className="text-sm text-gray-400">No packets were captured.</p>
      </div>
    )
  }

  const capDuration = summary.capture_duration_s || (timeline[timeline.length - 1]?.t + binS) || 1

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-white">Time Analysis</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          Traffic volume over time, top conversations, and endpoint statistics.
          Bin size: {binS >= 1 ? binS + 's' : (binS * 1000) + 'ms'}.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Duration"    value={fmtDuration(summary.capture_duration_s || 0)} />
        <StatCard label="Total bytes" value={fmtBytes(summary.total_bytes || 0)} />
        <StatCard label="Avg pkt/s"   value={(summary.avg_pps || 0).toFixed(1)} />
        <StatCard label="Peak pkt/s"  value={(summary.peak_pps || 0).toFixed(1)}
          sub={summary.peak_pps_at != null ? `at ${fmtTime(summary.peak_pps_at)}` : ''} />
        <StatCard label="Spikes"      value={summary.spike_count || 0}
          color={summary.spike_count > 0 ? 'text-red-400' : 'text-white'} />
        <StatCard label="Gaps"        value={summary.gap_count || 0}
          color={summary.gap_count > 0 ? 'text-orange-400' : 'text-white'} />
      </div>

      {/* IO Graph */}
      <IoGraph
        timeline={timeline}
        binSeconds={binS}
        spikes={spikes}
        gaps={gaps}
        captureDuration={capDuration}
      />

      {/* Spike / gap callouts */}
      {(spikes.length > 0 || gaps.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {spikes.slice(0, 5).map((s, i) => (
            <div key={i} className="flex items-start gap-3 bg-red-900/10 border border-red-800/40 rounded-xl px-4 py-3">
              <span className="text-red-400 text-lg mt-0.5">⚡</span>
              <div>
                <p className="text-sm font-semibold text-red-300">
                  Traffic spike at {fmtTime(s.t)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {s.pps.toFixed(1)} pkt/s — <strong className="text-red-300">{s.ratio}×</strong> the average rate
                </p>
              </div>
            </div>
          ))}
          {gaps.slice(0, 5).map((g, i) => (
            <div key={i} className="flex items-start gap-3 bg-orange-900/10 border border-orange-800/40 rounded-xl px-4 py-3">
              <span className="text-orange-400 text-lg mt-0.5">⏸</span>
              <div>
                <p className="text-sm font-semibold text-orange-300">
                  Traffic gap {fmtTime(g.start_t)} – {fmtTime(g.end_t)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {fmtDuration(g.duration_s)} with zero traffic — link drop or capture pause?
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inner tab bar: Conversations / Endpoints */}
      <div>
        <div className="flex gap-2 mb-4">
          {[
            { id: 'conversations', label: `Conversations (${convos.length})` },
            { id: 'endpoints',     label: `Endpoints (${endpoints.length})` },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setInnerTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition border
                ${innerTab === t.id
                  ? 'bg-brand-600 border-brand-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
          <p className="ml-auto text-xs text-gray-600 self-center">
            Click column headers to re-sort
          </p>
        </div>

        {innerTab === 'conversations' && <ConversationsTable data={convos} />}
        {innerTab === 'endpoints'     && <EndpointsTable     data={endpoints} />}
      </div>

    </div>
  )
}

function StatCard({ label, value, sub, color = 'text-white' }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
  )
}
