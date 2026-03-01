import EmptyState from '../EmptyState'
import SeverityBadge from '../SeverityBadge'

const ALERT_TIPS = {
  handshake_failure:              'TLS negotiation failed — often caused by a content filter with an untrusted CA certificate, or a cipher-suite mismatch.',
  unknown_ca:                     'Client rejected the certificate because the issuing CA is not trusted. Common when SSL-inspection appliances use a self-signed CA that hasn\'t been deployed to client devices.',
  certificate_expired:            'The server\'s certificate has passed its expiry date. Update the certificate.',
  certificate_unknown:            'Client could not validate the certificate chain.',
  unrecognized_name:              'SNI hostname not recognised by server — may indicate misconfiguration or a device connecting to the wrong host.',
  bad_certificate:                'Certificate format or signature is invalid.',
}

export default function TlsInspectPanel({ data }) {
  const intercepted = data?.intercepted_connections   || []
  const mismatches  = data?.sni_cert_mismatches       || []
  const alerts      = data?.tls_alerts                || []
  const products    = data?.detected_filter_products  || []
  const summary     = data?.summary                   || {}

  const hasData = intercepted.length || mismatches.length || alerts.length

  if (!hasData) {
    return (
      <EmptyState
        icon="🔐"
        title="No TLS Issues Detected"
        desc="No SSL inspection, certificate mismatches, or TLS handshake failures were found."
      />
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white">TLS / SSL Inspection</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          Detected content-filter SSL interception, certificate mismatches, and handshake failures.
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Filter products detected" value={summary.filter_products || 0} />
        <StatCard label="Intercepted connections" value={summary.intercepted_count || 0} info />
        <StatCard label="Cert / SNI mismatches" value={summary.mismatch_count || 0} danger />
        <StatCard label="TLS alert failures" value={summary.alert_count || 0} danger />
      </div>

      {/* Detected filter products banner */}
      {products.length > 0 && (
        <div className="bg-blue-900/20 border border-blue-700/40 rounded-xl p-4">
          <p className="text-sm font-semibold text-blue-300 mb-2">SSL-inspection products identified</p>
          <div className="flex flex-wrap gap-2">
            {products.map(p => (
              <span key={p} className="px-3 py-1 bg-blue-900/40 border border-blue-700/50 rounded-full text-xs text-blue-200 font-medium">
                {p}
              </span>
            ))}
          </div>
          <p className="text-xs text-blue-300/60 mt-3">
            These products perform SSL/TLS interception (man-in-the-middle). Clients need to trust the filter's CA certificate, otherwise they will show certificate errors.
          </p>
        </div>
      )}

      {/* Intercepted connections table */}
      {intercepted.length > 0 && (
        <Section
          title="SSL-Inspected Connections"
          count={intercepted.length}
          tip="The certificate shown to the client was issued by a content-filter product, not the real server. This is expected if SSL inspection is intentionally deployed, but clients must trust the filter's CA."
        >
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-left bg-gray-950">
                <Th>Client</Th><Th>SNI (intended dest)</Th><Th>Cert CN</Th><Th>Issuer</Th><Th>Product</Th><Th>Cert status</Th>
              </tr>
            </thead>
            <tbody>
              {intercepted.slice(0, 100).map((r, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <Td mono>{r.src_ip}</Td>
                  <Td mono>{r.sni}</Td>
                  <Td mono>{r.cert_cn || '—'}</Td>
                  <Td><span className="text-gray-400">{r.issuer_o || r.issuer_cn || '—'}</span></Td>
                  <Td>
                    <span className="px-2 py-0.5 bg-blue-900/40 border border-blue-700/50 rounded text-blue-300 font-medium">
                      {r.filter_product}
                    </span>
                  </Td>
                  <Td>
                    {r.cert_expired
                      ? <span className="text-red-400 font-semibold">EXPIRED</span>
                      : <span className="text-green-400">valid</span>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Unknown mismatches */}
      {mismatches.length > 0 && (
        <Section
          title="Unknown Certificate Mismatches"
          count={mismatches.length}
          tip="The SNI hostname doesn't match the certificate CN, and the issuer doesn't match any known filter product. This could be an unknown inspection appliance, a misconfigured server, or a potentially malicious MITM."
        >
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-left bg-gray-950">
                <Th>Severity</Th><Th>Client</Th><Th>SNI</Th><Th>Cert CN</Th><Th>Issuer</Th><Th>Cert status</Th>
              </tr>
            </thead>
            <tbody>
              {mismatches.map((r, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <Td><SeverityBadge severity={r.severity} small /></Td>
                  <Td mono>{r.src_ip}</Td>
                  <Td mono>{r.sni}</Td>
                  <Td mono>{r.cert_cn || '—'}</Td>
                  <Td><span className="text-gray-400">{r.issuer_o || r.issuer_cn || '—'}</span></Td>
                  <Td>
                    {r.cert_expired
                      ? <span className="text-red-400 font-semibold">EXPIRED</span>
                      : <span className="text-green-400">valid</span>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* TLS Alert failures */}
      {alerts.length > 0 && (
        <Section title="TLS Handshake Failures" count={alerts.length}
          tip="Fatal TLS alert messages indicate a connection was rejected during the handshake. 'unknown_ca' typically means the SSL inspection CA certificate hasn't been deployed to this device."
        >
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-left bg-gray-950">
                <Th>Severity</Th><Th>Alert</Th><Th>Source</Th><Th>Destination</Th><Th>Port</Th><Th>What this means</Th>
              </tr>
            </thead>
            <tbody>
              {alerts.slice(0, 100).map((a, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <Td><SeverityBadge severity={a.severity} small /></Td>
                  <Td>
                    <span className="font-mono text-orange-300">{a.description}</span>
                  </Td>
                  <Td mono>{a.src_ip}</Td>
                  <Td mono>{a.dst_ip}</Td>
                  <Td mono>{a.dst_port}</Td>
                  <Td>
                    <span className="text-gray-400">
                      {ALERT_TIPS[a.description] || '—'}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  )
}

function StatCard({ label, value, danger, info }) {
  const color = danger && value > 0 ? 'text-red-400'
    : info && value > 0 ? 'text-blue-400'
    : 'text-white'
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  )
}

function Section({ title, count, tip, children }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-sm font-semibold text-gray-300">{title}</h3>
        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{count}</span>
        {tip && (
          <div className="group relative ml-auto">
            <button className="w-5 h-5 rounded-full bg-gray-800 text-gray-500 text-xs flex items-center justify-center hover:bg-gray-700">?</button>
            <div className="hidden group-hover:block absolute right-0 top-7 w-80 bg-gray-800 border border-gray-700 rounded-xl p-3 text-xs text-gray-300 shadow-xl z-10 leading-relaxed">
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

function Th({ children }) {
  return <th className="px-4 py-3 text-gray-500 font-medium whitespace-nowrap text-left">{children}</th>
}
function Td({ children, mono }) {
  return <td className={`px-4 py-3 text-gray-300 ${mono ? 'font-mono' : ''}`}>{children}</td>
}
