'use client'
import { useEffect, useState } from 'react'
import { fetchAllReports } from '@/lib/api'
import { CandidateRow } from '@/types'
import VerdictBadge from '@/components/VerdictBadge'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function DashboardPage() {
  const [rows, setRows] = useState<CandidateRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { 
    fetchAllReports()
      .then(setRows)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filteredRows = rows.filter(r => r.candidate_name.toLowerCase().includes(search.toLowerCase()))
  
  const stats = {
    total: rows.length,
    advanced: rows.filter(r => r.verdict === 'ADVANCE').length,
    reviewed: rows.filter(r => r.verdict === 'REVIEW').length,
  }

  return (
    <main className="min-h-screen bg-[#050508] text-white py-12 px-4 font-sans relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-violet-300 uppercase tracking-wider mb-4">
              <span className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
              Recruiting Portal
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Interviews</h1>
          </div>

          <div className="flex gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 backdrop-blur-md">
              <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 backdrop-blur-md">
              <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Advanced</div>
              <div className="text-2xl font-bold text-emerald-400">{stats.advanced}</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 backdrop-blur-md">
              <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Reviewed</div>
              <div className="text-2xl font-bold text-amber-400">{stats.reviewed}</div>
            </div>
          </div>
        </header>

        <div className="mb-8">
          <input
            type="text"
            placeholder="Search candidates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full md:w-96 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/10 transition backdrop-blur-sm shadow-xl"
          />
        </div>

        {loading ? (
          <div className="text-gray-500 py-12 text-center animate-pulse">Loading reports...</div>
        ) : (
          <div className="space-y-3">
            {filteredRows.map((r, i) => (
              <motion.div key={r.report_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link href={`/report/${r.report_id}`}
                  className="group flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 hover:border-white/20 transition duration-300 backdrop-blur-sm relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500/0 via-violet-500/5 to-violet-500/0 opacity-0 group-hover:opacity-100 transition duration-500" />
                  <div className="relative z-10 flex gap-5 items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg">
                      {r.candidate_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-white font-semibold text-lg">{r.candidate_name}</div>
                      <div className="text-gray-500 text-sm">
                        {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} 
                        <span className="mx-2">•</span> 
                        {Math.floor(r.duration_seconds / 60)}m {r.duration_seconds % 60}s
                      </div>
                    </div>
                  </div>
                  <div className="relative z-10 flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-white font-bold text-xl">{r.overall_score.toFixed(1)}</div>
                      <div className="text-gray-500 text-xs uppercase tracking-wider">Score</div>
                    </div>
                    <VerdictBadge verdict={r.verdict} />
                  </div>
                </Link>
              </motion.div>
            ))}
            {filteredRows.length === 0 && !loading && (
              <div className="text-gray-600 text-center py-16 bg-white/5 border border-white/10 rounded-3xl border-dashed">
                No candidates found.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
