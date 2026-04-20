export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'done'

export type Intent = 'SUFFICIENT' | 'PROBE_NEEDED' | 'REDIRECT' | 'WRAP'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface DimensionScore {
  score: number
  label: string
  evidence: string[]
}

export interface Report {
  verdict: 'ADVANCE' | 'REVIEW' | 'DECLINE'
  overall_score: number
  summary: string
  recommendation: string
  candidate_name: string
  created_at: string
  duration_seconds: number
  transcript_raw: string
  dimensions: {
    communication_clarity: DimensionScore
    patience_empathy: DimensionScore
    simplification_ability: DimensionScore
    english_fluency: DimensionScore
    warmth_enthusiasm: DimensionScore
  }
}

export interface CandidateRow {
  report_id: string
  candidate_name: string
  verdict: 'ADVANCE' | 'REVIEW' | 'DECLINE'
  created_at: string
  overall_score: number
}
