'use client'
import { motion } from 'framer-motion'

export default function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100
  const color = score >= 7 ? '#10b981' : score >= 5 ? '#f59e0b' : '#ef4444'
  return (
    <div className="h-2 bg-white/10 rounded-full overflow-hidden shadow-inner">
      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
        style={{ height: '100%', background: color, borderRadius: 9999, boxShadow: `0 0 10px ${color}` }} />
    </div>
  )
}
