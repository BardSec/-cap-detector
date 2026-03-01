import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

const ACCEPTED = { 'application/octet-stream': ['.pcap', '.pcapng', '.cap'] }
const MAX_MB = 200

export default function Upload() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const onDrop = useCallback(async (accepted) => {
    if (!accepted.length) return
    const file = accepted[0]
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_MB} MB.`)
      return
    }

    setUploading(true)
    setError(null)
    setProgress(0)

    const form = new FormData()
    form.append('file', file)

    try {
      // Do NOT set Content-Type manually — axios detects FormData and lets the
      // browser attach the correct multipart boundary automatically.
      const { data } = await api.post('/captures', form, {
        onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / (e.total || 1))),
      })
      navigate(`/capture/${data.id}`)
    } catch (err) {
      const detail = err.response?.data?.detail
      const message = !detail
        ? 'Upload failed — server did not respond. Is the backend running?'
        : Array.isArray(detail)
          ? detail.map(d => d.msg || JSON.stringify(d)).join('; ')
          : String(detail)
      setError(message)
      setUploading(false)
    }
  }, [navigate])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxFiles: 1,
    disabled: uploading,
  })

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-white mb-2">Upload PCAP</h1>
        <p className="text-gray-400 text-sm mb-8">
          Drop a Wireshark capture file to run automated threat analysis.
          Supports <code className="text-gray-300">.pcap</code>, <code className="text-gray-300">.pcapng</code>, and <code className="text-gray-300">.cap</code> formats up to {MAX_MB} MB.
        </p>

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition
            ${isDragActive && !isDragReject ? 'border-brand-500 bg-brand-600/10' : ''}
            ${isDragReject ? 'border-red-500 bg-red-900/10' : ''}
            ${!isDragActive ? 'border-gray-700 hover:border-gray-600 bg-gray-900 hover:bg-gray-900/80' : ''}
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />

          {uploading ? (
            <div className="space-y-4">
              <div className="w-12 h-12 mx-auto border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-white font-medium">Uploading… {progress}%</p>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-brand-500 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <p className="text-white font-medium mb-1">
                {isDragActive ? 'Drop it here' : 'Drag & drop your PCAP file'}
              </p>
              <p className="text-gray-500 text-sm">or click to browse</p>
            </>
          )}
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-900/30 border border-red-700 rounded-xl text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* What we detect */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DETECTIONS.map((d) => (
            <div key={d.title} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{d.icon}</span>
                <h3 className="text-sm font-semibold text-white">{d.title}</h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{d.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const DETECTIONS = [
  {
    icon: '📡',
    title: 'C2 Beaconing Detection',
    desc: 'Calculates the coefficient of variation on inter-arrival times. CV < 0.15 flags implant heartbeats from tools like Cobalt Strike and Sliver.',
  },
  {
    icon: '🕳️',
    title: 'DNS Tunneling Detection',
    desc: 'Entropy-scores every DNS query. Scores above 3.8 bits or subdomains longer than 50 chars indicate iodine/dnscat2 exfiltration.',
  },
  {
    icon: '🔑',
    title: 'NTLM Hash Extraction',
    desc: 'Parses NTLMSSP exchanges to extract server challenges and NTLMv2 hashes formatted for Hashcat (mode 5600).',
  },
  {
    icon: '🚨',
    title: 'Cleartext Credentials',
    desc: 'Detects HTTP Basic Auth, FTP USER/PASS, SMTP AUTH LOGIN, and HTTP form POSTs with password fields.',
  },
  {
    icon: '📤',
    title: 'Exfiltration Profiling',
    desc: 'Flags outbound flows exceeding 1 MB with >5:1 send/receive asymmetry with bandwidth and duration stats.',
  },
]
