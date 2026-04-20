import { useCallback, useRef, useEffect } from 'react'

export function useSpeechSynthesis() {
  const speakingRef = useRef(false)
  const queueRef = useRef<string[]>([])
  const onEndGlobalRef = useRef<(() => void) | null>(null)

  const stop = useCallback(() => {
    speakingRef.current = false
    queueRef.current = []
    onEndGlobalRef.current = null
    window.speechSynthesis.cancel()
  }, [])

  useEffect(() => {
    return () => { stop() }
  }, [stop])

  const speakChunk = useCallback((chunk: string, voices: SpeechSynthesisVoice[]) => {
    const utterance = new SpeechSynthesisUtterance(chunk)
    utterance.rate = 0.90
    utterance.pitch = 1.08
    utterance.volume = 1.0

    const preferred = ['Samantha', 'Google UK English Female', 'Microsoft Zira', 'Karen', 'Victoria']
    for (const name of preferred) {
      const match = voices.find(v => v.name.includes(name))
      if (match) { utterance.voice = match; break }
    }
    if (!utterance.voice) {
      const female = voices.find(v => v.name.toLowerCase().includes('female'))
      if (female) utterance.voice = female
    }

    utterance.onend = () => {
      if (!speakingRef.current) return
      const next = queueRef.current.shift()
      if (next) {
        speakChunk(next, voices)
      } else {
        speakingRef.current = false
        onEndGlobalRef.current?.()
        onEndGlobalRef.current = null
      }
    }

    utterance.onerror = (e) => {
      if (e.error === 'interrupted') return
      speakingRef.current = false
      queueRef.current = []
      onEndGlobalRef.current?.()
      onEndGlobalRef.current = null
    }

    window.speechSynthesis.speak(utterance)
  }, [])

  const speak = useCallback((text: string, onStart?: () => void, onEnd?: () => void) => {
    speakingRef.current = false
    queueRef.current = []
    window.speechSynthesis.cancel()

    // Split on sentence boundaries, keeping chunks short for browser TTS stability
    const raw = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text]
    const chunks = raw.map(s => s.trim()).filter(Boolean)

    const doSpeak = (voices: SpeechSynthesisVoice[]) => {
      if (speakingRef.current) return
      speakingRef.current = true
      onEndGlobalRef.current = onEnd ?? null

      const [first, ...rest] = chunks
      queueRef.current = rest
      onStart?.()
      speakChunk(first, voices)
    }

    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      doSpeak(voices)
    } else {
      const handler = () => {
        window.speechSynthesis.onvoiceschanged = null
        doSpeak(window.speechSynthesis.getVoices())
      }
      window.speechSynthesis.onvoiceschanged = handler
      setTimeout(() => {
        const v = window.speechSynthesis.getVoices()
        if (v.length > 0 && !speakingRef.current) {
          window.speechSynthesis.onvoiceschanged = null
          doSpeak(v)
        }
      }, 600)
    }
  }, [speakChunk])

  return { speak, stop }
}
