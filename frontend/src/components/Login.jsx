export default function Login() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-brand-600 mb-5 shadow-lg shadow-brand-600/30">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">PCAP Bloodhound</h1>
          <p className="mt-2 text-gray-400 text-sm">
            Network threat-hunting for K‑12 practitioners
          </p>
        </div>

        {/* Sign-in card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-1">Sign in to continue</h2>
          <p className="text-sm text-gray-400 mb-8">
            Use your school Microsoft 365 or Google Workspace account.
          </p>

          {/* Microsoft button */}
          <a
            href="/auth/login/microsoft"
            className="flex items-center justify-center gap-3 w-full bg-white hover:bg-gray-100 text-gray-900 font-medium py-3 px-4 rounded-xl transition mb-4 shadow"
          >
            <MicrosoftIcon />
            Sign in with Microsoft 365
          </a>

          {/* Google button */}
          <a
            href="/auth/login/google"
            className="flex items-center justify-center gap-3 w-full bg-white hover:bg-gray-100 text-gray-900 font-medium py-3 px-4 rounded-xl transition shadow"
          >
            <GoogleIcon />
            Sign in with Google Workspace
          </a>

          <p className="mt-6 text-xs text-center text-gray-500">
            Access is restricted to authorized school accounts.<br />
            No credentials are stored on this server.
          </p>
        </div>

        {/* Feature bullets */}
        <div className="mt-8 grid grid-cols-2 gap-3">
          {FEATURES.map((f) => (
            <div key={f.label} className="flex items-start gap-2 bg-gray-900/50 rounded-xl p-3 border border-gray-800">
              <span className="text-lg mt-0.5">{f.icon}</span>
              <div>
                <p className="text-xs font-semibold text-gray-200">{f.label}</p>
                <p className="text-xs text-gray-500">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const FEATURES = [
  { icon: '📡', label: 'C2 Beaconing', desc: 'Detects implant heartbeats by timing regularity' },
  { icon: '🕳️', label: 'DNS Tunneling', desc: 'Entropy-scores every DNS query for exfil' },
  { icon: '🔑', label: 'NTLM Hashes', desc: 'Extracts Hashcat-ready NTLMv2 hashes' },
  { icon: '🚨', label: 'Cleartext Creds', desc: 'FTP, HTTP Basic Auth, SMTP passwords' },
  { icon: '📤', label: 'Exfil Profiling', desc: 'Flags high-volume asymmetric outbound flows' },
  { icon: '🔒', label: 'OAuth Only', desc: 'No local passwords — SSO via your IdP' },
]

function MicrosoftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 21 21" fill="none">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}
