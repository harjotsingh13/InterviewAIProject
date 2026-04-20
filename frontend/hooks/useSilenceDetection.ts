import { useRef, useCallback, useState } from 'react'

export function useSilenceDetection(onSilence: () => void, silenceDuration = 1500) {
  const analyserRef = useRef<AnalyserNode | null>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const rafRef = useRef<number | null>(null)
  const activeRef = useRef(false)
  const ctxRef = useRef<AudioContext | null>(null)

  // Initialize context on user gesture
  const initContext = useCallback(() => {
    if (!ctxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      ctxRef.current = new AudioContextClass()
    }
  }, [])

  const start = useCallback((stream: MediaStream) => {
    if (!ctxRef.current) {
        initContext()
    }
    const ctx = ctxRef.current!
    // Resume context if it was suspended (e.g. by iOS before stream start)
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    source.connect(analyser)
    analyserRef.current = analyser
    activeRef.current = true

    const data = new Uint8Array(analyser.frequencyBinCount)

    const check = () => {
      if (!activeRef.current) return
      analyser.getByteFrequencyData(data)
      const avg = data.reduce((a, b) => a + b, 0) / data.length

      if (avg < 10) {
        if (!silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            onSilence()
          }, silenceDuration)
        }
      } else {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current)
          silenceTimerRef.current = null
        }
      }
      rafRef.current = requestAnimationFrame(check)
    }
    check()
  }, [onSilence, silenceDuration, initContext])

  const stop = useCallback(() => {
    activeRef.current = false
    if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
    }
    if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
    }
  }, [])

  return { start, stop, analyser: analyserRef, initContext }
}
