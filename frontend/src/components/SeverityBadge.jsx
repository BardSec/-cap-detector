const STYLES = {
  CRITICAL: 'bg-red-900/60 text-red-300 border-red-700/60',
  HIGH:     'bg-orange-900/50 text-orange-300 border-orange-700/50',
  MEDIUM:   'bg-yellow-900/40 text-yellow-300 border-yellow-700/40',
  LOW:      'bg-blue-900/40 text-blue-300 border-blue-700/40',
}

export default function SeverityBadge({ severity, small }) {
  const style = STYLES[severity] || STYLES.LOW
  return (
    <span className={`inline-block border rounded font-semibold tracking-wide ${small ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs'} ${style}`}>
      {severity}
    </span>
  )
}
