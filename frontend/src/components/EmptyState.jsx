export default function EmptyState({ icon, title, desc }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 max-w-md">{desc}</p>
      <div className="mt-4 px-3 py-1.5 bg-green-900/30 border border-green-700/40 rounded-full">
        <span className="text-xs text-green-400 font-medium">✓ Clean</span>
      </div>
    </div>
  )
}
