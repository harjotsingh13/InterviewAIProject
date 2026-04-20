'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useInterview } from '@/hooks/useInterview'

const AudioOrb = dynamic(() => import('@/components/AudioOrb'), { ssr: false })

export default function InterviewPage() {
  const router = useRouter()
  const [name, setName] = useState('')

  useEffect(() => {
    const n = sessionStorage.getItem('candidate_name')
    if (!n) { router.push('/'); return }
    setName(n)
  }, [router])

  const {
    orbState, ariaText, candidateText,
    turnCount, isStarted, reportId, error,
    begin, analyser
  } = useInterview(name)

  useEffect(() => {
    if (reportId) {
      sessionStorage.setItem('report_id', reportId)
      router.push('/thankyou')
    }
  }, [reportId, router])

  // Map state to a vibrant color scale for the aurora background
  const getGlowColor = () => {
    switch (orbState) {
      case 'speaking': return '#f59e0b'; // Amber
      case 'listening': return '#6366f1'; // Indigo/Blue
      case 'thinking': return '#a855f7'; // Purple
      case 'done': return '#10b981'; // Emerald
      default: return '#4b5563'; // Gray
    }
  }

  return (
    <main className="min-h-screen bg-[#050508] flex flex-col items-center justify-center relative overflow-hidden font-sans">
      {/* Premium Aurora Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ backgroundColor: getGlowColor() }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-15"
          style={{ filter: 'blur(120px)' }} 
        />
        <motion.div 
          animate={{ backgroundColor: getGlowColor() }}
          transition={{ duration: 2, ease: "easeInOut", delay: 0.2 }}
          className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full opacity-10"
          style={{ filter: 'blur(100px)' }} 
        />
      </div>

      {/* Header / Question counter */}
      {isStarted && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
          <div className="text-white/60 font-medium tracking-widest text-xs uppercase px-3 py-1 bg-white/5 rounded-full border border-white/10">
            Aria AI Interview
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  turnCount >= step ? 'w-6 bg-violet-400' : 'w-3 bg-white/15'
                }`}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Orb Container */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center mt-[-10vh]">
        <div className="relative">
          <AudioOrb orbState={orbState} analyser={analyser} />
          <motion.div 
            animate={{ boxShadow: `0 0 80px 20px ${getGlowColor()}30` }}
            transition={{ duration: 1 }}
            className="absolute inset-0 rounded-full pointer-events-none"
          />
        </div>

        {/* State label */}
        <motion.div 
          className="mt-12 text-xs uppercase tracking-[0.3em] font-semibold text-white/50 h-6 flex items-center justify-center gap-3"
          animate={{ opacity: orbState === 'listening' ? [0.5, 1, 0.5] : 1 }}
          transition={{ repeat: orbState === 'listening' ? Infinity : 0, duration: 1.5 }}
        >
          {orbState === 'idle' && 'Ready to begin'}
          {orbState === 'listening' && (
            <>
              <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              Listening...
            </>
          )}
          {orbState === 'thinking' && 'Thinking...'}
          {orbState === 'speaking' && 'Aria is speaking'}
        </motion.div>

        {/* Start button */}
        {!isStarted && (
          <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} onClick={begin}
            className="mt-8 px-10 py-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-medium transition duration-300 z-10 shadow-2xl backdrop-blur-md relative overflow-hidden group">
            <span className="relative z-10">Begin Interview</span>
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600/50 to-indigo-600/50 opacity-0 group-hover:opacity-100 transition duration-300" />
          </motion.button>
        )}

        {error && (
          <div className="mt-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm max-w-sm z-10 text-center backdrop-blur-md">
            {error}
          </div>
        )}
      </div>

      {/* Frosted Glass Subtitle Dock */}
      {isStarted && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-20"
        >
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl min-h-[140px] flex flex-col justify-end relative overflow-hidden">
            {/* Top decorative edge */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            
            {/* Candidate transcript */}
            {candidateText && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="text-white/40 text-sm mb-3">
                <span className="font-semibold text-white/30 mr-2 uppercase tracking-wider text-[10px]">You</span>
                {candidateText}
              </motion.div>
            )}

            {/* Aria subtitle */}
            <AnimatePresence mode="wait">
              {ariaText && (
                <motion.div key={ariaText} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  className="text-white text-lg font-medium leading-relaxed">
                  <span className="font-bold text-violet-400 mr-2 uppercase tracking-wider text-[10px]">Aria</span>
                  {ariaText}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </main>
  )
}
