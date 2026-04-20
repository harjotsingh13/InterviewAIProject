'use client'
import { use, useEffect, useState } from 'react'
import { fetchReport } from '@/lib/api'
import { Report } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'
import ScoreBar from '@/components/ScoreBar'
import VerdictBadge from '@/components/VerdictBadge'

const DIMENSION_LABELS: Record<string, string> = {
  communication_clarity: 'Communication Clarity',
  patience_empathy: 'Patience & Empathy',
  simplification_ability: 'Simplification Ability',
  english_fluency: 'English Fluency',
  warmth_enthusiasm: 'Warmth & Enthusiasm',
}

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [report, setReport] = useState<Report | null>(null)
  const [showTranscript, setShowTranscript] = useState(false)

  useEffect(() => {
    fetchReport(id).then(setReport).catch(console.error)
  }, [id])

  if (!report) return (
    <main className="min-h-screen bg-[#050508] flex items-center justify-center font-sans relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-violet-600/20 rounded-full blur-2xl animate-pulse" />
      <div className="text-gray-400 font-medium tracking-widest uppercase text-sm animate-pulse z-10">Loading Report...</div>
    </main>
  )

  return (
    <main className="min-h-screen bg-[#050508] !text-white py-12 px-4 font-sans relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-600/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row items-center md:items-start justify-between mb-12 gap-8">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">
              Interview Report
            </div>
            <h1 className="text-5xl font-bold tracking-tight mb-3">{report.candidate_name}</h1>
            <div className="text-white/40 text-sm font-medium flex items-center justify-center md:justify-start gap-4">
              <span>{new Date(report.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span>{Math.floor(report.duration_seconds / 60)}m {report.duration_seconds % 60}s duration</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-4">
            <VerdictBadge verdict={report.verdict} />
            <button onClick={() => window.print()}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 font-medium transition text-sm flex items-center gap-2 group backdrop-blur-md">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:-translate-y-0.5 transition-transform">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Export PDF
            </button>
          </div>
        </header>

        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Overall Score */}
          <div className="lg:col-span-1 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-violet-500/5 opacity-0 group-hover:opacity-100 transition duration-500" />
            <div className="text-white/50 text-xs font-bold uppercase tracking-widest mb-4">Overall Score</div>
            <div className="relative">
              <svg className="w-40 h-40 rotate-[-90deg]">
                <circle cx="80" cy="80" r="70" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <motion.circle cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="8" strokeLinecap="round"
                  className="text-violet-500 line-drop-shadow"
                  strokeDasharray={440}
                  initial={{ strokeDashoffset: 440 }}
                  animate={{ strokeDashoffset: 440 - (440 * report.overall_score) / 10 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-5xl font-bold">{report.overall_score.toFixed(1)}</div>
                <div className="text-white/30 text-xs mt-1 font-medium">/ 10</div>
              </div>
            </div>
          </div>

          {/* AI Summary */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-violet-500 to-indigo-500" />
            <h2 className="text-white/50 text-xs font-bold uppercase tracking-widest mb-4">AI Assessment Summary</h2>
            <p className="text-white/90 text-lg leading-relaxed mb-6 font-medium">
              "{report.summary}"
            </p>
            <div className="mt-auto p-4 bg-violet-500/10 border border-violet-500/20 rounded-2xl flex gap-3 items-start">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-400 mt-0.5 flex-shrink-0">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-violet-400 mb-1">Recommendation</div>
                <div className="text-violet-100/80 text-sm font-medium">{report.recommendation}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Dimension Scores (Masonry-ish grid) */}
        <h3 className="text-2xl font-semibold mb-6 tracking-tight">Dimensional Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {Object.entries(report.dimensions).map(([key, dim], i) => (
            <motion.div key={key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 hover:border-white/20 transition duration-300">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h4 className="font-semibold text-lg">{DIMENSION_LABELS[key] || key}</h4>
                  <div className="text-white/40 text-xs font-medium uppercase tracking-wider mt-1">{dim.label}</div>
                </div>
                <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-white/50">
                  {dim.score}<span className="text-white/20 text-sm ml-1">/10</span>
                </div>
              </div>
              <ScoreBar score={dim.score} />
              
              <div className="mt-5 pt-5 border-t border-white/5 space-y-3">
                <div className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Evidence Quotes</div>
                {dim.evidence.map((q, j) => (
                  <div key={j} className="text-white/60 text-sm italic pl-3 border-l-2 border-violet-500/30 py-1 bg-white/[0.02] rounded-r-lg">
                    "{q}"
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Transcript Section */}
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden mb-12 backdrop-blur-sm">
          <button onClick={() => setShowTranscript(!showTranscript)}
            className="w-full p-6 flex justify-between items-center bg-white/5 hover:bg-white/10 transition group">
            <div>
              <h3 className="text-lg font-semibold text-white group-hover:text-violet-300 transition-colors">Raw Transcript Log</h3>
              <p className="text-sm text-white/40 mt-1">Review the exact conversation</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-violet-500/20 transition">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className={`transition-transform duration-300 ${showTranscript ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </button>

          <AnimatePresence>
            {showTranscript && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-white/5">
                <div className="p-6 md:p-8 space-y-6 max-h-[600px] overflow-y-auto">
                  {report.transcript_raw.split('\n\n').map((block, i) => {
                    const isAria = block.trim().toUpperCase().startsWith('ARIA:');
                    const text = block.replace(/^(ARIA:|CANDIDATE:)\s*/i, '').trim();
                    if (!text) return null;
                    return (
                      <div key={i} className={`flex flex-col max-w-[85%] ${isAria ? 'mr-auto' : 'ml-auto items-end'}`}>
                        <div className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${isAria ? 'text-violet-400' : 'text-white/40'}`}>
                          {isAria ? 'Aria' : report.candidate_name}
                        </div>
                        <div className={`p-4 rounded-2xl text-sm leading-relaxed inline-block ${
                          isAria 
                            ? 'bg-violet-500/10 border border-violet-500/20 text-white/90 rounded-tl-sm' 
                            : 'bg-white/10 border border-white/10 text-white/80 rounded-tr-sm'
                        }`}>
                          {text}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </main>
  )
}
