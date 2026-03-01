import EmptyState from '../EmptyState'

const RCODE_STYLE = {
  NXDOMAIN: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/40',
  SERVFAIL:  'bg-red-900/40   text-red-300   border-red-700/40',
  REFUSED:   'bg-red-900/40   text-red-300   border-red-700/40',
  FORMERR:   'bg-gray-800     text-gray-400  border-gray-700',
  NOTIMP:    'bg-gray-800     text-gray-400  border-gray-700',
}

const RCODE_TIPS = {
  NXDOMAIN: 'Domain not found. In K-12 networks this often means the domain is blocked at the DNS level by a filter like Cisco Umbrella, Cloudflare Gateway, or OpenDNS.',
  SERVFAIL:  'DNS resolver or upstream server failed. Check that your DNS server is reachable and not overloaded.',
  REFUSED:   'DNS server refused the query — usually a policy block or resolver ACL.',
}

export default function DnsHealthPanel({ data }) {
  const failures = data?.failures             || []
  const timeouts = data?.timeouts             || []
  const slow     = data?.slow_queries         || []
  const top      = data?.top_failing_domains  || []
  const summary  = data?.summary              || {}

  const hasData = summary.total_failures || summary.timeouts || summary.slow

  if (!hasData) {
    return <EmptyState icon="✅" title="DNS Health Looks Good" desc="No NXDOMAIN, SERVFAIL, REFUSED, query timeouts, or slow responses were detected." />
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white">DNS Health</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          Failed and slow DNS resolutions that may indicate filtering, misconfiguration, or resolver problems.
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total failures" value={summary.total_failures || 0} danger />
        <StatCard label="NXDOMAIN" value={summary.nxdomain || 0}
          tip={RCODE_TIPS.NXDOMAIN} color="text-yellow-400" />
        <StatCard label="SERVFAIL" value={summary.servfail || 0}
          tip={RCODE_TIPS.SERVFAIL} color="text-red-400" />
        <StatCard label="REFUSED" value={summary.refused || 0}
          tip={RCODE_TIPS.REFUSED} color="text-red-400" />
        <StatCard label="Timeouts" value={summary.timeouts || 0} color="text-orange-400" />
        <StatCard label="Slow (>500ms)" value={summary.slow || 0} />
      </div>

      {/* Top failing domains */}
      {top.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Top Failing Domains</h3>
          <div className="space-y-2">
            {top.map((d, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-3 flex items-center gap-4">
                <span className="font-mono text-white text-sm flex-1 truncate">{d.domain}</span>
                <div className="flex gap-2 flex-wrap justify-end">
                  {Object.entries(d.failures).map(([code, count]) => (
                    <span key={code} className={`px-2 py-0.5 rounded border text-xs font-medium ${RCODE_STYLE[code] || 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                      {code}: {count}
                    </span>
                  ))}
                </div>
                <span className="text-gray-500 text-xs w-16 text-right">{d.total} total</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Failure detail table */}
      {failures.length > 0 && (
        <Section title="Failure Details" count={failures.length}>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-left bg-gray-950">
                <Th>Code</Th><Th>Domain</Th><Th>Type</Th><Th>Client</Th><Th>Resolver</Th><Th>RTT</Th>
              </tr>
            </thead>
            <tbody>
              {failures.slice(0, 100).map((f, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <Td>
                    <span className={`px-1.5 py-0.5 rounded border text-xs font-semibold ${RCODE_STYLE[f.rcode_name] || 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                      {f.rcode_name}
                    </span>
                  </Td>
                  <Td mono>{f.qname}</Td>
                  <Td>{f.qtype}</Td>
                  <Td mono>{f.client_ip}</Td>
                  <Td mono>{f.resolver_ip}</Td>
                  <Td>{f.rtt_ms != null ? `${f.rtt_ms}ms` : '—'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Slow queries */}
      {slow.length > 0 && (
        <Section title="Slow Queries (>500ms)" count={slow.length}>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-left bg-gray-950">
                <Th>Domain</Th><Th>Type</Th><Th>RTT</Th><Th>Client</Th><Th>Resolver</Th>
              </tr>
            </thead>
            <tbody>
              {slow.map((q, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <Td mono>{q.qname}</Td>
                  <Td>{q.qtype}</Td>
                  <Td>
                    <span className={q.rtt_ms > 2000 ? 'text-red-400 font-bold' : 'text-yellow-400'}>
                      {q.rtt_ms}ms
                    </span>
                  </Td>
                  <Td mono>{q.client_ip}</Td>
                  <Td mono>{q.resolver_ip}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Timeouts */}
      {timeouts.length > 0 && (
        <Section title="Query Timeouts (no response)" count={timeouts.length}>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-left bg-gray-950">
                <Th>Domain</Th><Th>Type</Th><Th>Client</Th><Th>Resolver</Th>
              </tr>
            </thead>
            <tbody>
              {timeouts.slice(0, 50).map((q, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <Td mono>{q.qname}</Td>
                  <Td>{q.qtype}</Td>
                  <Td mono>{q.client_ip}</Td>
                  <Td mono>{q.resolver_ip}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  )
}

function StatCard({ label, value, tip, color = 'text-white', danger }) {
  const val_color = danger && value > 0 ? 'text-red-400' : color
  return (
    <div className="group relative bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${val_color}`}>{value}</p>
      {tip && (
        <div className="hidden group-hover:block absolute left-0 top-full mt-1 w-64 bg-gray-800 border border-gray-700 rounded-xl p-3 text-xs text-gray-300 shadow-xl z-10 leading-relaxed">
          {tip}
        </div>
      )}
    </div>
  )
}

function Section({ title, count, children }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-sm font-semibold text-gray-300">{title}</h3>
        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{count}</span>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">{children}</div>
      </div>
    </section>
  )
}

function Th({ children }) {
  return <th className="px-4 py-3 text-gray-500 font-medium whitespace-nowrap text-left">{children}</th>
}
function Td({ children, mono }) {
  return <td className={`px-4 py-3 text-gray-300 ${mono ? 'font-mono' : ''}`}>{children}</td>
}
