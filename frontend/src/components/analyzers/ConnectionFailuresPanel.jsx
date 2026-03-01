import SeverityBadge from '../SeverityBadge'
import EmptyState from '../EmptyState'

export default function ConnectionFailuresPanel({ data }) {
  const icmp     = data?.icmp_unreachables || []
  const resets   = data?.tcp_resets        || []
  const dropped  = data?.silently_dropped  || []
  const summary  = data?.summary           || {}

  const hasData = icmp.length || resets.length || dropped.length

  if (!hasData) {
    return <EmptyState icon="🚧" title="No Blocked Connections Found" desc="No TCP resets, ICMP unreachables, or silently dropped connections were detected." />
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white">Connection Failures</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          Evidence of network filtering: firewall blocks, ACL hits, and silently dropped traffic.
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Firewall ICMP blocks" value={summary.firewall_icmp_count || 0} danger />
        <StatCard label="Total ICMP unreachable" value={summary.icmp_count || 0} />
        <StatCard label="Destinations resetting" value={summary.rst_destination_count || 0} danger />
        <StatCard label="Silently dropped dests" value={summary.dropped_destination_count || 0} danger />
      </div>

      {/* ICMP Unreachable */}
      {icmp.length > 0 && (
        <Section title="ICMP Destination Unreachable" count={icmp.length}
          tip="Code 9/10/13 means a firewall ACL rule explicitly rejected the traffic. Code 1/3 means the host or port wasn't reachable."
        >
          <Table headers={['Severity', 'From', 'Blocked traffic', 'Port', 'Reason']}>
            {icmp.slice(0, 100).map((r, i) => (
              <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <Td><SeverityBadge severity={r.severity} small /></Td>
                <Td mono>{r.reporter_ip}</Td>
                <Td mono>{r.orig_src_ip} → {r.orig_dst_ip}</Td>
                <Td mono>{r.orig_dst_port}</Td>
                <Td>
                  <span className={r.is_firewall_block ? 'text-red-300' : 'text-gray-300'}>
                    {r.is_firewall_block && '🔒 '}{r.reason}
                  </span>
                </Td>
              </tr>
            ))}
          </Table>
        </Section>
      )}

      {/* TCP RSTs */}
      {resets.length > 0 && (
        <Section title="TCP RST (Active Rejection)" count={resets.length}
          tip="The destination host or an inline firewall sent a RST packet, actively refusing the connection. High counts on a single port suggest a firewall rule or a service that's down."
        >
          <Table headers={['Severity', 'Destination', 'Port', 'RST count', 'Affected clients']}>
            {resets.map((r, i) => (
              <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <Td><SeverityBadge severity={r.severity} small /></Td>
                <Td mono>{r.dst_ip}</Td>
                <Td mono>{r.dst_port}</Td>
                <Td><span className="text-red-400 font-bold">{r.reset_count}</span></Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {r.affected_clients.slice(0, 5).map(ip => (
                      <span key={ip} className="px-1.5 py-0.5 bg-gray-800 rounded text-xs font-mono text-gray-300">{ip}</span>
                    ))}
                    {r.affected_clients.length > 5 && <span className="text-gray-500 text-xs">+{r.affected_clients.length - 5}</span>}
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        </Section>
      )}

      {/* Silently dropped */}
      {dropped.length > 0 && (
        <Section title="Silently Dropped (No Response to SYN)" count={dropped.length}
          tip="SYN packets were sent but no SYN-ACK or RST was received. This is the classic 'stealth drop' firewall policy — the firewall discards the packet without notifying the sender, causing connection timeouts."
        >
          <Table headers={['Destination', 'Port', 'Drop count', 'Affected clients', 'Note']}>
            {dropped.map((r, i) => (
              <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <Td mono>{r.dst_ip}</Td>
                <Td mono>{r.dst_port}</Td>
                <Td><span className="text-yellow-400 font-bold">{r.drop_count}</span></Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {r.affected_clients.slice(0, 5).map(ip => (
                      <span key={ip} className="px-1.5 py-0.5 bg-gray-800 rounded text-xs font-mono text-gray-300">{ip}</span>
                    ))}
                    {r.affected_clients.length > 5 && <span className="text-gray-500 text-xs">+{r.affected_clients.length - 5}</span>}
                  </div>
                </Td>
                <Td><span className="text-gray-500 text-xs">{r.note}</span></Td>
              </tr>
            ))}
          </Table>
        </Section>
      )}
    </div>
  )
}

function StatCard({ label, value, danger }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${danger && value > 0 ? 'text-red-400' : 'text-white'}`}>{value}</p>
    </div>
  )
}

function Section({ title, count, tip, children }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{count}</span>
        {tip && (
          <div className="group relative ml-auto">
            <button className="w-5 h-5 rounded-full bg-gray-800 text-gray-500 text-xs flex items-center justify-center hover:bg-gray-700">?</button>
            <div className="hidden group-hover:block absolute right-0 top-7 w-72 bg-gray-800 border border-gray-700 rounded-xl p-3 text-xs text-gray-300 shadow-xl z-10 leading-relaxed">
              {tip}
            </div>
          </div>
        )}
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">{children}</div>
      </div>
    </section>
  )
}

function Table({ headers, children }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-gray-800 text-left bg-gray-950">
          {headers.map(h => <th key={h} className="px-4 py-3 text-gray-500 font-medium whitespace-nowrap">{h}</th>)}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}

function Td({ children, mono }) {
  return <td className={`px-4 py-3 text-gray-300 ${mono ? 'font-mono' : ''}`}>{children}</td>
}
