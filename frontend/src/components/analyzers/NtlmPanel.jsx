import { useState } from 'react'
import EmptyState from '../EmptyState'

export default function NtlmPanel({ data }) {
  const auths = (data || []).filter(m => m.type === 'AUTHENTICATE')
  const challenges = (data || []).filter(m => m.type === 'CHALLENGE')
  const [copied, setCopied] = useState(null)

  if (data.length === 0) {
    return <EmptyState icon="🔑" title="No NTLM Hashes Extracted" desc="No NTLMSSP authentication exchanges were found in this capture." />
  }

  const copyHash = (hash, i) => {
    navigator.clipboard.writeText(hash)
    setCopied(i)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">NTLM Hash Extraction</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          {auths.length} authenticate message{auths.length !== 1 ? 's' : ''} · {challenges.length} challenge{challenges.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Warning banner */}
      <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4 flex gap-3">
        <span className="text-xl">⚠️</span>
        <div className="text-sm">
          <p className="text-amber-300 font-semibold">Sensitive material</p>
          <p className="text-amber-200/70 mt-0.5">
            These NTLMv2 hashes can be cracked offline. Handle as credentials. The Hashcat format below is for incident-response validation only.
          </p>
        </div>
      </div>

      {/* Hash cards */}
      {auths.filter(m => m.hashcat_hash).map((m, i) => (
        <div key={i} className="bg-gray-900 border border-red-900/40 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="inline-block px-2 py-0.5 bg-red-900/50 border border-red-700/50 rounded text-xs text-red-300 font-medium mb-2">
                CRITICAL · NTLMv2
              </span>
              <p className="text-white font-semibold font-mono">
                {m.domain && <span className="text-gray-400">{m.domain}\</span>}{m.username}
              </p>
              {m.workstation && (
                <p className="text-xs text-gray-500 mt-0.5">Workstation: {m.workstation}</p>
              )}
            </div>
            <div className="text-right text-xs text-gray-500">
              <p>{m.src_ip}</p>
              <p>→ {m.dst_ip}</p>
            </div>
          </div>

          {/* Hashcat hash */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Hashcat hash (mode 5600):</p>
            <div className="relative">
              <pre className="bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap break-all">
                {m.hashcat_hash}
              </pre>
              <button
                onClick={() => copyHash(m.hashcat_hash, i)}
                className="absolute top-2 right-2 px-2 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs text-gray-300 transition"
              >
                {copied === i ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Exchanges without complete hashes */}
      {auths.filter(m => !m.hashcat_hash).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Incomplete exchanges (challenge not captured)</h3>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <Th>Domain\User</Th>
                  <Th>Workstation</Th>
                  <Th>Source IP</Th>
                  <Th>Dest IP</Th>
                </tr>
              </thead>
              <tbody>
                {auths.filter(m => !m.hashcat_hash).map((m, i) => (
                  <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <Td><span className="font-mono">{m.domain && `${m.domain}\\`}{m.username}</span></Td>
                    <Td>{m.workstation || '—'}</Td>
                    <Td><span className="font-mono">{m.src_ip}</span></Td>
                    <Td><span className="font-mono">{m.dst_ip}</span></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Th({ children }) {
  return <th className="px-4 py-3 text-gray-500 font-medium text-left">{children}</th>
}
function Td({ children }) {
  return <td className="px-4 py-3 text-gray-300">{children}</td>
}
