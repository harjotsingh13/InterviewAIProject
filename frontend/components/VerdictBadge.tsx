const STYLES = {
  ADVANCE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
  REVIEW:  'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
  DECLINE: 'bg-red-500/10 text-red-500 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]',
}

export default function VerdictBadge({ verdict }: { verdict: 'ADVANCE' | 'REVIEW' | 'DECLINE' }) {
  return (
    <span className={`text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border ${STYLES[verdict]}`}>
      {verdict}
    </span>
  )
}
