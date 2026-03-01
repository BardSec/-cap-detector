import SeverityBadge from '../SeverityBadge'
import EmptyState from '../EmptyState'

const PROTOCOL_COLORS = {
  HTTP: 'bg-blue-900/40 text-blue-300 border-blue-800/50',
  FTP: 'bg-red-900/40 text-red-300 border-red-800/50',
  SMTP: 'bg-purple-900/40 text-purple-300 border-purple-800/50',
}

const TYPE_LABELS = {
  HTTP_BASIC_AUTH: 'HTTP Basic Auth',
  HTTP_FORM_POST: 'HTTP Form POST',
  FTP_CREDENTIALS: 'FTP Credentials',
  SMTP_AUTH_LOGIN: 'SMTP AUTH LOGIN',
}

export default function CredentialsPanel({ data }) {
  if (!data || data.length === 0) {
    return <EmptyState icon="🚨" title="No Cleartext Credentials Found" desc="No HTTP Basic Auth, FTP, SMTP AUTH LOGIN, or form POST passwords were detected." />
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Cleartext Credentials</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          {data.length} credential{data.length !== 1 ? 's' : ''} transmitted without encryption.
          Passwords are masked — export JSON for full values.
        </p>
      </div>

      <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4 flex gap-3">
        <span className="text-xl">🔒</span>
        <p className="text-sm text-amber-200/70">
          Passwords are masked below for safe screen-sharing. Download the JSON export for plaintext values needed in an incident response.
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-left bg-gray-950">
                <Th>Severity</Th>
                <Th>Protocol</Th>
                <Th>Type</Th>
                <Th>Username</Th>
                <Th>Password</Th>
                <Th>Source IP</Th>
                <Th>Dest IP:Port</Th>
              </tr>
            </thead>
            <tbody>
              {data.map((c, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <Td><SeverityBadge severity={c.severity} small /></Td>
                  <Td>
                    <span className={`px-2 py-0.5 rounded border text-xs font-medium ${PROTOCOL_COLORS[c.protocol] || 'bg-gray-800 text-gray-300 border-gray-700'}`}>
                      {c.protocol}
                    </span>
                  </Td>
                  <Td className="text-gray-400">{TYPE_LABELS[c.type] || c.type}</Td>
                  <Td><span className="font-mono text-gray-200">{c.username || '—'}</span></Td>
                  <Td>
                    <span className="font-mono text-yellow-400 tracking-widest">{c.password_masked}</span>
                  </Td>
                  <Td><span className="font-mono text-gray-400">{c.src_ip}</span></Td>
                  <Td><span className="font-mono text-gray-400">{c.dst_ip}:{c.dst_port}</span></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Th({ children }) {
  return <th className="px-4 py-3 text-gray-500 font-medium whitespace-nowrap">{children}</th>
}
function Td({ children, className = '' }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>
}
