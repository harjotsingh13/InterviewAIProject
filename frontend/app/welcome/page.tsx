'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

const features = [
  { icon: '🎙️', text: '2 voice questions' },
  { icon: '🧠', text: 'AI-powered assessment' },
  { icon: '⏱️', text: '3–5 minutes total' },
]

export default function WelcomePage() {
  const [name, setName] = useState('')
  const [micOk, setMicOk] = useState(false)
  const [micError, setMicError] = useState('')
  const [step, setStep] = useState<'name' | 'mic'>('name')
  const router = useRouter()

  const testMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => t.stop())
      setMicOk(true)
      setMicError('')
    } catch {
      setMicError('Microphone access denied. Please allow it in your browser settings.')
    }
  }

  const begin = () => {
    if (!name.trim() || !micOk) return
    sessionStorage.setItem('candidate_name', name.trim())
    router.push('/interview')
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden font-sans"
      style={{ background: '#030305' }}>

      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)' }} />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="max-w-sm w-full relative z-10"
      >
        {/* Logo area */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 160 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-[1.2rem] mb-5 relative"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 8px 32px rgba(124,58,237,0.4)' }}
          >
            <span className="text-2xl">✦</span>
          </motion.div>
          <div className="text-white text-3xl font-bold tracking-tight mb-1">Cuemath</div>
          <div className="text-white/35 text-xs uppercase tracking-[0.25em] font-medium">AI Tutor Screener</div>
        </div>

        {/* Card */}
        <div className="relative rounded-[1.75rem] overflow-hidden border border-white/[0.08]"
          style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(40px)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
          {/* Top glare */}
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }} />

          <div className="p-8 space-y-6">
            {/* Feature pills */}
            <div className="flex gap-2 flex-wrap justify-center">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.07 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-white/50 border border-white/[0.08]"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <span>{f.icon}</span>
                  <span>{f.text}</span>
                </motion.div>
              ))}
            </div>

            <div className="h-px bg-white/[0.06]" />

            <div className="space-y-3">
              {/* Name input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && name.trim() && !micOk && testMic()}
                  className="w-full px-4 py-3.5 rounded-2xl text-white text-sm placeholder-white/25 focus:outline-none transition-all duration-300 border border-white/[0.08] focus:border-violet-500/50"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                />
              </div>

              {/* Mic check */}
              <AnimatePresence mode="wait">
                {!micOk ? (
                  <motion.button
                    key="mic-btn"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={testMic}
                    disabled={!name.trim()}
                    className="w-full py-3.5 rounded-2xl text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed border border-white/[0.1] hover:border-white/20"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                    </svg>
                    Check Microphone
                  </motion.button>
                ) : (
                  <motion.div
                    key="mic-ok"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full py-3.5 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 border border-emerald-500/25"
                    style={{ background: 'rgba(52,211,153,0.08)', color: 'rgb(110,231,183)' }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Microphone ready
                  </motion.div>
                )}
              </AnimatePresence>

              {micError && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400/80 text-xs text-center">
                  {micError}
                </motion.p>
              )}
            </div>

            {/* Start button */}
            <motion.button
              onClick={begin}
              disabled={!name.trim() || !micOk}
              whileHover={name.trim() && micOk ? { scale: 1.02 } : {}}
              whileTap={name.trim() && micOk ? { scale: 0.98 } : {}}
              className="w-full py-4 rounded-2xl font-semibold text-white text-sm transition-all duration-300 relative overflow-hidden disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: name.trim() && micOk ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'rgba(255,255,255,0.06)',
                boxShadow: name.trim() && micOk ? '0 0 24px rgba(124,58,237,0.35)' : 'none',
                border: '1px solid rgba(139,92,246,0.3)'
              }}
            >
              <span className="relative z-10">Begin Interview →</span>
            </motion.button>
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-white/20 text-xs text-center mt-5"
        >
          Find a quiet space before you start.
        </motion.p>
      </motion.div>
    </main>
  )
}
