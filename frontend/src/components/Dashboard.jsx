import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'
import C2BeaconPanel from './analyzers/C2BeaconPanel'
import DnsTunnelPanel from './analyzers/DnsTunnelPanel'
import NtlmPanel from './analyzers/NtlmPanel'
import CredentialsPanel from './analyzers/CredentialsPanel'
import ExfilPanel from './analyzers/ExfilPanel'
import ConnectionFailuresPanel from './analyzers/ConnectionFailuresPanel'
import DnsHealthPanel from './analyzers/DnsHealthPanel'
import TlsInspectPanel from './analyzers/TlsInspectPanel'
import TrafficTimelinePanel from './analyzers/TrafficTimelinePanel'

const TAB_GROUPS = [
  {
    label: 'Threat Hunting',
    tabs: [
      { id: 'c2',    label: 'C2 Beaconing',    icon: '📡', key: 'c2_beacon_count' },
      { id: 'dns',   label: 'DNS Tunneling',    icon: '🕳️', key: 'dns_tunnel_domain_count' },
      { id: 'ntlm',  label: 'NTLM Hashes',     icon: '🔑', key: 'ntlm_hash_count' },
      { id: 'creds', label: 'Cleartext Creds',  icon: '🚨', key: 'cleartext_cred_count' },
      { id: 'exfil', label: 'Exfiltration',    icon: '📤', key: 'exfil_flow_count' },
    ],
  },
  {
    label: 'Network Troubleshooting',
    tabs: [
      { id: 'conn',       label: 'Blocked Connections', icon: '🚧', key: 'blocked_dest_count' },
      { id: 'dns_health', label: 'DNS Health',           icon: '🔍', key: 'dns_failure_count' },
      { id: 'tls',        label: 'TLS / SSL',            icon: '🔐', key: 'tls_issue_count',   infoStyle: true },
      { id: 'timeline',   label: 'Time Analysis',        icon: '📊', key: 'conversation_count', infoStyle: true },
    ],
  },
]

const ALL_TABS = TAB_GROUPS.flatMap(g => g.tabs)

export default function Dashboard() {
  const { id } = useParams()
  const [capture, setCapture] = useState(null)
  const [activeTab, setActiveTab] = useState('c2')
  const [error, setError] = useState(null)

  useEffect(() => {
    let interval
    const load = async () => {
      try {
        const { data } = await api.get(`/captures/${id}`)
        setCapture(data)
        if (data.status === 'complete' || data.status === 'failed') {
          clearInterval(interval)
        }
      } catch {
        setError('Could not load capture results.')
        clearInterval(interval)
      }
    }

    load()
    interval = setInterval(load, 3000)
    return () => clearInterval(interval)
  }, [id])

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link to="/" className="text-brand-400 hover:underline text-sm">← Back to upload</Link>
        </div>
      </div>
    )
  }

  if (!capture || (capture.status !== 'complete' && capture.status !== 'failed')) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 gap-6">
        <div className="w-14 h-14 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-white font-medium text-lg">Analyzing capture…</p>
          <p className="text-gray-400 text-sm mt-1">
            {capture?.filename}
            {capture?.packet_count ? ` · ${capture.packet_count.toLocaleString()} packets loaded` : ''}
          </p>
          <p className="text-gray-600 text-xs mt-3">
            Running threat hunting + network troubleshooting checks
          </p>
        </div>
      </div>
    )
  }

  if (capture.status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 gap-4">
        <div className="text-5xl">⚠️</div>
        <p className="text-red-400 font-medium">Analysis failed</p>
        <p className="text-gray-500 text-sm">{capture.error || 'Unknown error'}</p>
        <Link to="/" className="text-brand-400 hover:underline text-sm mt-2">← Try another file</Link>
      </div>
    )
  }

  const summary = capture.results?.summary || {}
  const results = capture.results || {}

  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const { data } = await api.get(`/captures/${id}/export`)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `pcap-analysis-${id}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // error is handled globally by the axios interceptor (401 → redirect)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-white truncate">{capture.filename}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {capture.packet_count?.toLocaleString()} packets
              {capture.completed_at && ` · ${new Date(capture.completed_at).toLocaleString()}`}
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 text-sm bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-200 px-4 py-2 rounded-lg transition border border-gray-700"
          >
            {exporting
              ? <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            }
            {exporting ? 'Exporting…' : 'Export JSON'}
          </button>
        </div>

        {/* Tab groups */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {TAB_GROUPS.map((group, gi) => (
            <div key={group.label} className="flex items-center gap-2">
              {gi > 0 && <div className="w-px h-5 bg-gray-700 mx-1" />}
              <span className="text-xs text-gray-600 font-medium uppercase tracking-wider whitespace-nowrap">
                {group.label}
              </span>
              {group.tabs.map(t => {
                const count = summary[t.key] || 0
                const isActive = activeTab === t.id
                const hasFindings = count > 0

                let btnClass = 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                if (isActive) {
                  btnClass = 'bg-brand-600 border-brand-500 text-white'
                } else if (hasFindings) {
                  btnClass = t.infoStyle
                    ? 'bg-blue-900/30 border-blue-700/50 text-blue-300 hover:bg-blue-900/50'
                    : 'bg-red-900/30 border-red-700/50 text-red-300 hover:bg-red-900/50'
                }

                const badgeClass = hasFindings
                  ? (t.infoStyle ? 'bg-blue-600 text-white' : 'bg-red-600 text-white')
                  : 'bg-gray-700 text-gray-400'

                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition border ${btnClass}`}
                  >
                    <span>{t.icon}</span>
                    <span className="hidden sm:inline">{t.label}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${badgeClass}`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'c2'         && <C2BeaconPanel    data={results.c2_beaconing || []} />}
        {activeTab === 'dns'        && <DnsTunnelPanel   data={results.dns_tunneling || {}} />}
        {activeTab === 'ntlm'       && <NtlmPanel        data={results.ntlm_hashes || []} />}
        {activeTab === 'creds'      && <CredentialsPanel data={results.cleartext_credentials || []} />}
        {activeTab === 'exfil'      && <ExfilPanel       data={results.exfiltration || []} />}
        {activeTab === 'conn'       && <ConnectionFailuresPanel data={results.connection_failures || {}} />}
        {activeTab === 'dns_health' && <DnsHealthPanel         data={results.dns_health || {}} />}
        {activeTab === 'tls'        && <TlsInspectPanel        data={results.tls_inspection || {}} />}
        {activeTab === 'timeline'   && <TrafficTimelinePanel   data={results.traffic_timeline || {}} />}
      </div>
    </div>
  )
}
