const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/** Fetch with automatic retry on 429 (rate-limit) responses */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let delay = 3000 // start at 3 s
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, options)
    if (res.status !== 429 || attempt === maxRetries) return res
    // Wait and retry
    await new Promise(r => setTimeout(r, delay))
    delay = Math.min(delay * 1.5, 12000) // cap at 12 s
  }
  throw new Error('Max retries exceeded')
}

export async function startInterview(candidateName: string) {
  const res = await fetchWithRetry(`${BASE}/interview/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidate_name: candidateName })
  })
  if (!res.ok) throw new Error('Failed to start interview')
  return res.json() as Promise<{ session_id: string }>
}

export async function transcribeAudio(audioBlob: Blob): Promise<{ transcript: string }> {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'audio.webm')
  const res = await fetchWithRetry(`${BASE}/interview/transcribe`, {
    method: 'POST',
    body: formData
  })
  if (!res.ok) throw new Error('Transcription failed')
  return res.json()
}

export async function getAriaResponse(
  sessionId: string,
  history: { role: string; content: string }[],
  isFirstTurn: boolean
): Promise<{ text: string; intent: string }> {
  const res = await fetchWithRetry(`${BASE}/interview/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      history,
      is_first_turn: isFirstTurn
    })
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error(detail?.detail || 'Failed to get response')
  }
  return res.json()
}

export async function endInterview(
  sessionId: string,
  candidateName: string,
  history: { role: string; content: string }[],
  durationSeconds: number
): Promise<{ report_id: string; report: any }> {
  const res = await fetchWithRetry(`${BASE}/interview/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({
      session_id: sessionId,
      candidate_name: candidateName,
      history,
      duration_seconds: durationSeconds
    })
  })
  if (!res.ok) throw new Error('Failed to end interview')
  return res.json()
}

export async function fetchReport(reportId: string) {
  const res = await fetch(`${BASE}/report/${reportId}`)
  if (!res.ok) throw new Error('Report not found')
  return res.json()
}

export async function fetchAllReports() {
  const res = await fetch(`${BASE}/reports`)
  if (!res.ok) throw new Error('Failed to fetch reports')
  return res.json()
}
