'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Message, OrbState } from '@/types'
import { startInterview, transcribeAudio, getAriaResponse, endInterview } from '@/lib/api'
import { useSpeechSynthesis } from './useSpeechSynthesis'
import { useSilenceDetection } from './useSilenceDetection'

export function useInterview(candidateName: string) {
  const router = useRouter()
  const [orbState, setOrbState] = useState<OrbState>('idle')
  const [history, setHistory] = useState<Message[]>([])
  const [ariaText, setAriaText] = useState('')
  const [candidateText, setCandidateText] = useState('')
  const [turnCount, setTurnCount] = useState(0)
  const [isStarted, setIsStarted] = useState(false)
  const [reportId, setReportId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sessionIdRef = useRef<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const startTimeRef = useRef<number>(0)

  // Use refs for all async-callback-accessible state to avoid stale closures
  const historyRef = useRef<Message[]>([])
  const candidateNameRef = useRef(candidateName)
  const wrappingRef = useRef(false) // prevent double-wrap

  useEffect(() => { historyRef.current = history }, [history])
  useEffect(() => { candidateNameRef.current = candidateName }, [candidateName])

  const { speak, stop: stopSpeech } = useSpeechSynthesis()

  // ── End the interview and generate report ─────────────────────────────────
  const triggerWrap = useCallback(async (finalHistory?: Message[]) => {
    if (wrappingRef.current) return
    wrappingRef.current = true
    
    // Briefly wait so the candidate can absorb the goodbye
    await new Promise(r => setTimeout(r, 1200))

    setOrbState('done')
    router.push('/thankyou')

    const h = finalHistory ?? historyRef.current
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)
    
    // Scoring call runs "off-screen" in background
    try {
      await endInterview(
        sessionIdRef.current!,
        candidateNameRef.current,
        h,
        duration
      )
    } catch (err) {
      console.error('Background scoring failed:', err)
    }
  }, [stopSpeech, router])

  // 10-minute hard limit
  useEffect(() => {
    if (!isStarted) return
    const timer = setTimeout(() => triggerWrap(), 10 * 60 * 1000)
    return () => clearTimeout(timer)
  }, [isStarted, triggerWrap])

  // ── Forward-declared refs so callbacks can reference each other ──────────
  const startRecordingRef = useRef<() => Promise<void>>()
  const stopRecordingRef = useRef<() => void>()

  // ── Silence handler uses ref to always call latest stopRecording ─────────
  const handleSilence = useCallback(() => {
    stopRecordingRef.current?.()
  }, [])

  const { start: startVAD, stop: stopVAD, analyser, initContext } = useSilenceDetection(
    handleSilence,
    1800  // 1.8s silence → stop recording
  )

  // ── Handle a completed recording chunk ───────────────────────────────────
  const handleRecordingStop = useCallback(async () => {
    if (wrappingRef.current) return
    setOrbState('thinking')
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })

    if (blob.size < 500) {
      setAriaText("I didn't catch that — could you please speak again?")
      speak("I didn't catch that — could you please speak again?", undefined, () => {
        startRecordingRef.current?.()
      })
      return
    }

    try {
      const { transcript } = await transcribeAudio(blob)
      if (!transcript || transcript.trim().length < 2) {
        speak("Take your time — I'm still listening.", undefined, () => {
          startRecordingRef.current?.()
        })
        return
      }

      setCandidateText(transcript)
      setTurnCount(c => c + 1)

      const newHistory: Message[] = [...historyRef.current, { role: 'user', content: transcript }]
      setHistory(newHistory)
      historyRef.current = newHistory

      const { text, intent } = await getAriaResponse(
        sessionIdRef.current!,
        newHistory,
        false
      )

      setAriaText(text)
      const updatedHistory: Message[] = [...newHistory, { role: 'assistant', content: text }]
      setHistory(updatedHistory)
      historyRef.current = updatedHistory

      setOrbState('speaking')

      if (intent === 'WRAP') {
        speak(text, undefined, () => triggerWrap(updatedHistory))
      } else {
        speak(text, undefined, () => startRecordingRef.current?.())
      }
    } catch (e: any) {
      console.error('Interview turn error:', e)
      const msg = e?.message || ''
      if (msg.includes('rate-limited') || msg.includes('quota')) {
        setError('AI is temporarily busy. Please wait a moment and try again.')
      } else {
        setError('Something went wrong connecting to the server. Please refresh.')
      }
    }
  }, [speak, triggerWrap])

  // Keep handleRecordingStop accessible inside recorder.onstop via a ref
  const handleRecordingStopRef = useRef(handleRecordingStop)
  useEffect(() => { handleRecordingStopRef.current = handleRecordingStop }, [handleRecordingStop])

  // ── Recording ────────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (wrappingRef.current) return
    try {
      if (!streamRef.current || streamRef.current.getTracks().some(t => t.readyState === 'ended')) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      }
      chunksRef.current = []

      let mimeType = 'audio/webm'
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus'
      } else if (!MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = MediaRecorder.isTypeSupported('audio/ogg;codecs=opus') ? 'audio/ogg;codecs=opus' : ''
      }

      const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined)
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      // Use ref so onstop always calls the latest version
      recorder.onstop = () => handleRecordingStopRef.current()
      mediaRecorderRef.current = recorder

      startVAD(streamRef.current)
      recorder.start(250) // timeslice 250ms → continuous data chunks
      setOrbState('listening')
      setCandidateText('')
    } catch {
      setError('Microphone access denied. Please allow microphone permissions and refresh.')
    }
  }, [startVAD])

  const stopRecording = useCallback(() => {
    stopVAD()
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.requestData()
      mediaRecorderRef.current.stop()
    }
  }, [stopVAD])

  // Keep refs up to date
  useEffect(() => { startRecordingRef.current = startRecording }, [startRecording])
  useEffect(() => { stopRecordingRef.current = stopRecording }, [stopRecording])

  // ── Begin the interview — fetch opening question first ────────────────────
  const begin = useCallback(async () => {
    try {
      initContext()

      const { session_id } = await startInterview(candidateNameRef.current)
      sessionIdRef.current = session_id
      startTimeRef.current = Date.now()
      setIsStarted(true)

      setOrbState('thinking')

      const { text: openingText, intent } = await getAriaResponse(
        session_id,
        [],
        true
      )

      const intro = `Hi ${candidateNameRef.current}! I'm Aria, your interviewer today. ${openingText}`
      setAriaText(intro)

      const initHistory: Message[] = [{ role: 'assistant', content: intro }]
      setHistory(initHistory)
      historyRef.current = initHistory

      setOrbState('speaking')
      if (intent === 'WRAP') {
        speak(intro, undefined, () => triggerWrap(initHistory))
      } else {
        speak(intro, undefined, () => startRecordingRef.current?.())
      }
    } catch (e: any) {
      console.error('Begin error:', e)
      const msg = e?.message || ''
      if (msg.includes('rate-limited') || msg.includes('quota')) {
        setError('AI is busy — retrying automatically. Please wait a moment...')
      } else {
        setError('Failed to connect to the server. Check your internet and try again.')
      }
    }
  }, [speak, initContext, triggerWrap])

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      stopSpeech()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [stopSpeech])

  return {
    orbState, history, ariaText, candidateText,
    turnCount, isStarted, reportId, error,
    begin, analyser
  }
}
