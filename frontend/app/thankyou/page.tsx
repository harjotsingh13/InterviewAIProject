'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function ThankYouPage() {
  const router = useRouter()
  const [showParticles, setShowParticles] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShowParticles(true), 300)
    return () => clearTimeout(t)
  }, [])

  const particles = Array.from({ length: 18 }, (_, i) => i)

  return (
    <main className="min-h-screen bg-[#030305] flex items-center justify-center px-4 relative overflow-hidden font-sans text-center">

      {/* Ambient glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.07) 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)' }} />

      {/* Floating particles */}
      {showParticles && particles.map((i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-emerald-400/40"
          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
            x: (Math.random() - 0.5) * 400,
            y: (Math.random() - 0.5) * 400,
          }}
          transition={{ delay: i * 0.08, duration: 2.5, ease: 'easeOut' }}
          style={{ left: '50%', top: '50%' }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 max-w-md w-full"
      >
        {/* iOS-style card */}
        <div className="relative backdrop-blur-2xl rounded-[2rem] overflow-hidden border border-white/[0.08] shadow-2xl"
          style={{ background: 'rgba(255,255,255,0.04)' }}>
          {/* Top glare line */}
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)' }} />

          <div className="p-10 flex flex-col items-center gap-6">
            {/* Animated checkmark */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
              className="w-20 h-20 rounded-full flex items-center justify-center relative"
              style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.2), rgba(52,211,153,0.05))' }}
            >
              <div className="absolute inset-0 rounded-full border border-emerald-500/30" />
              <motion.svg
                width="36" height="36" viewBox="0 0 24 24" fill="none"
                stroke="rgb(52,211,153)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.5, duration: 0.6, ease: 'easeOut' }}
              >
                <motion.polyline
                  points="20 6 9 17 4 12"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.5, duration: 0.6, ease: 'easeOut' }}
                />
              </motion.svg>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400/80 mb-3">
                Interview Complete
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight mb-3">
                You're all done!
              </h1>
              <p className="text-white/45 text-sm leading-relaxed">
                Your interview has been submitted to Cuemath. Our team will review your responses and be in touch soon.
              </p>
            </motion.div>

            {/* Divider */}
            <div className="w-full h-px bg-white/[0.06]" />

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.5 }}
              className="w-full flex flex-col gap-3"
            >
              <Link href="/welcome"
                className="w-full py-3.5 rounded-2xl text-white text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden group"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: 'rgba(255,255,255,0.05)' }} />
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span className="relative z-10">Return to Home</span>
              </Link>
            </motion.div>
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-white/20 text-xs mt-6"
        >
          You may safely close this tab.
        </motion.p>
      </motion.div>
    </main>
  )
}
