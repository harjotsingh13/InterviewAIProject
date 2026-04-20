import { useCallback, useRef, useEffect } from 'react'

export function useSpeechSynthesis() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const speakingRef = useRef(false)

  const stop = useCallback(() => {
    speakingRef.current = false
    window.speechSynthesis.cancel()
    utteranceRef.current = null
  }, [])

  // Cleanup on unmount (navigation)
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  const speak = useCallback((text: string, onStart?: () => void, onEnd?: () => void) => {
    // Cancel any in-progress speech
    speakingRef.current = false
    window.speechSynthesis.cancel()
    utteranceRef.current = null

    const createAndSpeak = (voices: SpeechSynthesisVoice[]) => {
      if (speakingRef.current) return // guard against double invocation
      speakingRef.current = true

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.90
      utterance.pitch = 1.08
      utterance.volume = 1.0

      const preferred = [
        'Samantha', 'Google UK English Female',
        'Microsoft Zira', 'Karen', 'Victoria'
      ]
      for (const name of preferred) {
        const match = voices.find(v => v.name.includes(name))
        if (match) { utterance.voice = match; break }
      }
      if (!utterance.voice) {
        const female = voices.find(v => v.name.toLowerCase().includes('female'))
        if (female) utterance.voice = female
      }

      utterance.onstart = () => onStart?.()
      utterance.onend = () => {
        speakingRef.current = false
        utteranceRef.current = null
        onEnd?.()
      }
      utterance.onerror = (e) => {
        // 'interrupted' fires when we .cancel() — not a real error
        if (e.error === 'interrupted') return
        speakingRef.current = false
        utteranceRef.current = null
        onEnd?.()
      }

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    }

    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      createAndSpeak(voices)
    } else {
      // Fire once when voices are ready, ignore subsequent firings
      const handler = () => {
        window.speechSynthesis.onvoiceschanged = null
        createAndSpeak(window.speechSynthesis.getVoices())
      }
      window.speechSynthesis.onvoiceschanged = handler

      // Safari fallback — poll after 600ms if event never fires
      setTimeout(() => {
        const v = window.speechSynthesis.getVoices()
        if (v.length > 0 && !speakingRef.current) {
          window.speechSynthesis.onvoiceschanged = null
          createAndSpeak(v)
        }
      }, 600)
    }
  }, [])

  return { speak, stop }
}
