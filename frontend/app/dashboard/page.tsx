'use client'
import { useEffect, useState } from 'react'
import { fetchAllReports } from '@/lib/api'
import { CandidateRow } from '@/types'
import VerdictBadge from '@/components/VerdictBadge'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex-1 rounded-2xl overflow-hidden border border-white/[0.08] backdrop-blur-xl"
      style={{ background: 'rgba(255,255,255,0.04)' }}
    >
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }} />
      <div className="p-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35 mb-2">{label}</div>
        <div className={`text-3xl font-bold tracking-tight ${color || 'text-white'}`}>{value}</div>
      </div>
    </motion.div>
  )
}

export default function DashboardPage() {
  const [rows, setRows] = useState<CandidateRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'ADVANCE' | 'REVIEW' | 'DECLINE'>('ALL')

  useEffect(() => {
    fetchAllReports()
      .then(setRows)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filteredRows = rows
    .filter(r => r.candidate_name.toLowerCase().includes(search.toLowerCase()))
    .filter(r => filter === 'ALL' || r.verdict === filter)

  const stats = {
    total: rows.length,
    advanced: rows.filter(r => r.verdict === 'ADVANCE').length,
    reviewed: rows.filter(r => r.verdict === 'REVIEW').length,
    declined: rows.filter(r => r.verdict === 'DECLINE').length,
  }

  const filters: Array<'ALL' | 'ADVANCE' | 'REVIEW' | 'DECLINE'> = ['ALL', 'ADVANCE', 'REVIEW', 'DECLINE']

  return (
    <main className="min-h-screen bg-[#030305] text-white py-14 px-4 font-sans relative overflow-hidden">

      {/* Ambient background */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at top, rgba(139,92,246,0.08) 0%, transparent 70%)' }} />
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)' }} />

      <div className="max-w-5xl mx-auto relative z-10">

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="mb-10"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/80 border border-violet-500/20 mb-4"
                style={{ background: 'rgba(139,92,246,0.08)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.8)]" />
                Cuemath Recruiting Portal
              </div>
              <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #fff 40%, rgba(255,255,255,0.5))' }}>
                Candidate Interviews
              </h1>
            </div>
            <Link href="/welcome"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white transition-all duration-200 border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.05]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              New Interview
            </Link>
          </div>

          {/* Stats row */}
          <div className="flex gap-3">
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Advanced" value={stats.advanced} color="text-emerald-400" />
            <StatCard label="Review" value={stats.reviewed} color="text-amber-400" />
            <StatCard label="Declined" value={stats.declined} color="text-red-400" />
          </div>
        </motion.header>

        {/* Search + Filter bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-3 mb-6"
        >
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm text-white placeholder-white/25 focus:outline-none transition-all duration-200 border border-white/[0.08] focus:border-violet-500/40"
              style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)' }}
            />
          </div>
          <div className="flex gap-2">
            {filters.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                  filter === f
                    ? 'bg-violet-600 text-white border border-violet-500/50 shadow-[0_0_20px_rgba(139,92,246,0.3)]'
                    : 'text-white/40 hover:text-white/70 border border-white/[0.08] hover:border-white/20'
                }`}
                style={{ background: filter === f ? undefined : 'rgba(255,255,255,0.03)' }}
              >
                {f}
              </button>
            ))}
          </div>
        </motion.div>

        {/* List */}
        {loading ? (
          <div className="py-20 flex items-center justify-center gap-3 text-white/30 text-sm">
            <div className="w-4 h-4 rounded-full border-2 border-violet-500/50 border-t-violet-400 animate-spin" />
            Loading interviews...
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-2">
              {filteredRows.map((r, i) => (
                <motion.div
                  key={r.report_id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ delay: i * 0.04, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                  layout
                >
                  <Link href={`/report/${r.report_id}`}
                    className="group flex items-center justify-between p-5 rounded-2xl border border-white/[0.07] hover:border-white/[0.15] transition-all duration-300 relative overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.035)', backdropFilter: 'blur(16px)' }}
                  >
                    {/* hover glow */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 rounded-2xl"
                      style={{ background: 'radial-gradient(ellipse at left, rgba(139,92,246,0.06) 0%, transparent 70%)' }} />

                    <div className="relative z-10 flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white text-base flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                        {r.candidate_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-semibold text-base group-hover:text-violet-200 transition-colors duration-200">
                          {r.candidate_name}
                        </div>
                        <div className="text-white/30 text-xs mt-0.5 flex items-center gap-2">
                          <span>{new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          <span className="w-1 h-1 rounded-full bg-white/20" />
                          <span>{Math.floor((r as any).duration_seconds / 60)}m {(r as any).duration_seconds % 60}s</span>
                        </div>
                      </div>
                    </div>

                    <div className="relative z-10 flex items-center gap-5">
                      <div className="text-right">
                        <div className="text-white font-bold text-xl tracking-tight">{r.overall_score.toFixed(1)}</div>
                        <div className="text-white/25 text-[10px] uppercase tracking-wider">/ 10</div>
                      </div>
                      <VerdictBadge verdict={r.verdict} />
                      <svg className="text-white/20 group-hover:text-white/50 transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </Link>
                </motion.div>
              ))}

              {filteredRows.length === 0 && !loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-white/20 text-center py-20 rounded-3xl border border-dashed border-white/[0.08] text-sm"
                >
                  No candidates found.
                </motion.div>
              )}
            </div>
          </AnimatePresence>
        )}
      </div>
    </main>
  )
}
