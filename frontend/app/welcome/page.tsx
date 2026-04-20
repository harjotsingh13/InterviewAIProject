'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function WelcomePage() {
  const [name, setName] = useState('')
  const [micOk, setMicOk] = useState(false)
  const [micError, setMicError] = useState('')
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
    <main className="min-h-screen bg-[#0a0a14] flex items-center justify-center px-4 relative overflow-hidden text-white font-sans">
      {/* Decorative animated blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-md w-full text-center relative z-10"
      >
        <div className="text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 mb-2">
          Cuemath
        </div>
        <div className="text-violet-400 mb-10 text-lg uppercase tracking-widest font-medium text-sm">
          Candidate Onboarding
        </div>

        <div className="backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl rounded-3xl p-8 space-y-8 relative overflow-hidden">
          {/* subtle inner glare */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <div>
            <h1 className="text-2xl font-semibold mb-2">Ready to start?</h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              We'll ask exactly <span className="text-white font-medium">2 questions</span> about your teaching approach. 
              The interview takes about 3-5 minutes.
            </p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/10 transition duration-300"
            />

            {!micOk ? (
              <button onClick={testMic}
                className="w-full py-4 rounded-2xl border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 transition duration-300 flex items-center justify-center gap-2 group">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:text-violet-400 transition-colors">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="22"></line>
                </svg>
                <span>Test Microphone</span>
              </button>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center justify-center gap-2 text-emerald-400 bg-emerald-400/10 py-4 rounded-2xl border border-emerald-400/20">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-medium">Microphone is ready</span>
              </motion.div>
            )}

            {micError && <p className="text-red-400 text-sm">{micError}</p>}
          </div>

          <button
            onClick={begin}
            disabled={!name.trim() || !micOk}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed text-white font-medium text-lg transition duration-300 shadow-[0_0_20px_rgba(124,58,237,0.3)] disabled:shadow-none"
          >
            Start Interview
          </button>
        </div>

        <p className="text-white/40 text-xs mt-8">
          Ensure you're in a quiet environment.
        </p>
      </motion.div>
    </main>
  )
}
