'use client'
import { motion } from 'framer-motion'

export default function ThankYouPage() {
  return (
    <main className="min-h-screen bg-[#050508] flex items-center justify-center px-4 relative overflow-hidden font-sans text-center">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 max-w-md">
        <h1 className="text-white text-5xl font-bold mb-4 tracking-tight">Thank You!</h1>
        <p className="text-gray-400 text-lg leading-relaxed mb-8">
          Your interview has been successfully submitted. We appreciate your interest in joining Cuemath.
        </p>
        <div className="p-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 inline-flex px-6 py-2 text-emerald-400 text-sm font-medium">
          Interview Complete
        </div>
        <p className="text-gray-600 text-xs mt-12">You can close this tab now.</p>
      </motion.div>
    </main>
  )
}
