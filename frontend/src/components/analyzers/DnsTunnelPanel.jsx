import SeverityBadge from '../SeverityBadge'
import EmptyState from '../EmptyState'

export default function DnsTunnelPanel({ data }) {
  const domains = data?.tunnel_domains || []
  const queries = data?.suspicious_queries || []
  const total = data?.total_suspicious || 0

  if (domains.length === 0 && queries.length === 0) {
    return <EmptyState icon="🕳️" title="No DNS Tunneling Detected" desc="No DNS queries with high entropy (>3.8 bits) or abnormal patterns were found." />
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">DNS Tunneling</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          {total} suspicious quer{total !== 1 ? 'ies' : 'y'} across {domains.length} domain{domains.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Domain rollup */}
      {domains.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Suspicious Domains</h3>
          <div className="space-y-3">
            {domains.map((d, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <SeverityBadge severity={d.severity} />
                    <span className="font-mono text-white font-semibold">{d.domain}</span>
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-gray-400">Est. exfil</p>
                    <p className="text-red-400 font-bold">{d.estimated_exfil_kb} KB</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-6 text-xs text-gray-400">
                  <Stat label="Total queries" value={d.query_count} />
                  <Stat label="High-entropy" value={d.high_entropy_queries} highlight />
                  <Stat label="Long labels" value={d.long_label_queries} />
                  <Stat label="Suspicious types" value={d.suspicious_qtype_queries} />
                </div>
                {Object.keys(d.record_types || {}).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(d.record_types).map(([type, count]) => (
                      <span key={type} className="px-2 py-0.5 rounded-md bg-gray-800 text-gray-300 text-xs font-mono">
                        {type}: {count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Individual query table */}
      {queries.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Flagged Queries (top {Math.min(queries.length, 100)})</h3>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-left">
                    <Th>Severity</Th>
                    <Th>Domain</Th>
                    <Th>Subdomain (truncated)</Th>
                    <Th>Entropy</Th>
                    <Th>Len</Th>
                    <Th>Type</Th>
                    <Th>Reason(s)</Th>
                  </tr>
                </thead>
                <tbody>
                  {queries.slice(0, 100).map((q, i) => (
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <Td><SeverityBadge severity={q.severity} small /></Td>
                      <Td><span className="font-mono text-gray-300">{q.base_domain}</span></Td>
                      <Td>
                        <span className="font-mono text-gray-400 break-all" title={q.subdomain}>
                          {q.subdomain.length > 40 ? q.subdomain.slice(0, 40) + '…' : q.subdomain}
                        </span>
                      </Td>
                      <Td><span className={q.entropy > 4.2 ? 'text-red-400 font-bold' : 'text-yellow-400'}>{q.entropy.toFixed(2)}</span></Td>
                      <Td>{q.subdomain_length}</Td>
                      <Td><span className="font-mono text-gray-300">{q.qtype}</span></Td>
                      <Td><span className="text-gray-400">{q.reasons.join('; ')}</span></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function Stat({ label, value, highlight }) {
  return (
    <div>
      <p className="text-gray-500">{label}</p>
      <p className={`font-semibold ${highlight && value > 0 ? 'text-red-400' : 'text-gray-200'}`}>{value}</p>
    </div>
  )
}

function Th({ children }) {
  return <th className="px-4 py-3 text-gray-500 font-medium">{children}</th>
}
function Td({ children }) {
  return <td className="px-4 py-3">{children}</td>
}
