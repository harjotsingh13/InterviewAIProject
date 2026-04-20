from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import google.generativeai as genai
import groq
import sqlite3
import uuid
import time
import json
import os
import re
import random
from datetime import datetime
from dotenv import load_dotenv
from prompts import ARIA_SYSTEM_PROMPT, SCORING_PROMPT
from db import init_db, db_exec, db_fetch, db_fetchall

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

groq_client = groq.Groq(api_key=os.getenv("GROQ_API_KEY"))

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Use models with high rate limits for free tier
GEMINI_MODELS = [
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-3.1-flash-lite-preview",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
]

init_db()


def gemini_generate(system_instruction: str, prompt_or_contents, json_mode: bool = False) -> str:
    """Try each model in the cascade until one succeeds. Raises HTTPException on total failure."""
    last_error = None
    for i, model_name in enumerate(GEMINI_MODELS):
        try:
            config = {"response_mime_type": "application/json"} if json_mode else {}
            model = genai.GenerativeModel(
                model_name,
                system_instruction=system_instruction if system_instruction else None,
                generation_config=config if config else None
            )
            if isinstance(prompt_or_contents, str):
                response = model.generate_content(prompt_or_contents)
            else:
                response = model.generate_content(prompt_or_contents)
            return response.text.strip()
        except Exception as e:
            last_error = e
            err_str = str(e).lower()
            # Only continue cascade on quota/rate errors
            if "429" in str(e) or "quota" in err_str or "rate" in err_str:
                # Brief delay before trying next model to avoid burst-rate issues
                if i < len(GEMINI_MODELS) - 1:
                    time.sleep(1.5)
                continue
            # For other errors (auth, bad request, etc.) fail immediately
            raise HTTPException(status_code=500, detail=f"Gemini error ({model_name}): {str(e)}")
    raise HTTPException(
        status_code=429,
        detail="All Gemini models are rate-limited. Please wait a moment and try again."
    )


# ── Models ────────────────────────────────────────────────────────────────────

class StartRequest(BaseModel):
    candidate_name: str

class Message(BaseModel):
    role: str          # "user" | "assistant"
    content: str

class RespondRequest(BaseModel):
    session_id: str
    history: List[Message]
    is_first_turn: bool = False

class EndRequest(BaseModel):
    session_id: str
    candidate_name: str
    history: List[Message]
    duration_seconds: int


# ── Helpers ───────────────────────────────────────────────────────────────────

FILLER_WORDS = re.compile(
    r'\b(um+|uh+|er+|ah+|like|you know|i mean|basically|literally|actually|sort of|kind of)\b',
    re.IGNORECASE
)

def count_filler_words(text: str) -> int:
    return len(FILLER_WORDS.findall(text))


# ── Endpoints ─────────────────────────────────────────────────────────────────

BUCKET_1_SIMPLIFICATION = [
    "An 8-year-old Cuemath student keeps saying multiplication is too hard and wants to give up. How would you explain it so it actually clicks for them?",
    "A 9-year-old completely freezes when they see fractions and says it makes no sense. How do you introduce it from scratch?",
    "A student solves equations fine but blanks out on word problems every time. What is your approach to help them?"
]

BUCKET_2_SOFTSKILLS = [
    "A student starts crying during your session because they feel stupid for not understanding. How do you handle the rest of that session?",
    "A parent messages saying their child used to love your sessions but now refuses to attend. What do you do?",
    "Your student is distracted and disengaged today — short answers, not paying attention. How do you bring them back?",
    "A session goes badly and the student ends more confused than they started. How do you close the session and what do you tell the parent?"
]

@app.post("/interview/start")
def start_interview(req: StartRequest):
    session_id = str(uuid.uuid4())
    q1 = random.choice(BUCKET_1_SIMPLIFICATION)
    q2 = random.choice(BUCKET_2_SOFTSKILLS)
    db_exec(
        "INSERT INTO sessions (id, candidate_name, created_at, status, q1, q2, current_q, followups_asked) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [session_id, req.candidate_name, datetime.utcnow().isoformat(), "active", q1, q2, 1, 0]
    )
    return {"session_id": session_id, "q1": q1, "q2": q2}


@app.post("/interview/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    temp_filename = f"temp_audio_{uuid.uuid4()}.webm"
    try:
        audio_bytes = await audio.read()
        with open(temp_filename, "wb") as f:
            f.write(audio_bytes)
        with open(temp_filename, "rb") as file_obj:
            transcription = groq_client.audio.transcriptions.create(
                model="whisper-large-v3",
                file=file_obj,
                language="en",
                response_format="text"
            )
        return {"transcript": transcription.strip()}
    except Exception as e:
        error_str = str(e).lower()
        if "too short" in error_str or "0.01 seconds" in error_str:
            return {"transcript": ""}
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)


@app.post("/interview/respond")
def get_aria_response(req: RespondRequest):
    # Fetch session state
    session_row = db_fetch("SELECT q1, q2, current_q, followups_asked FROM sessions WHERE id=?", [req.session_id])
    if not session_row:
        raise HTTPException(status_code=404, detail="Session not found")
        
    q1, q2, current_q, followups_asked = session_row
    
    if req.is_first_turn:
        context = f"Starting the interview. Greet the candidate warmly and ask Q1: {q1}"
        db_exec("UPDATE sessions SET current_q=1, followups_asked=0 WHERE id=?", [req.session_id])
    else:
        current_question = q1 if current_q == 1 else q2
        if current_q == 1:
            if followups_asked == 0:
                context = f"Just asked Q1: '{current_question}'. Candidate just answered. Evaluate if answer is sufficient. If sufficient, output [INTENT:NEXT] and ask Q2: '{q2}'. If vague, output [INTENT:PROBE] and ask ONE follow-up. If off-topic, output [INTENT:REDIRECT] and redirect."
            else:
                context = f"Asked Q1: '{current_question}' and already did a follow-up. Candidate just answered. You MUST output [INTENT:NEXT] and ask Q2: '{q2}' now."
        else:
            if followups_asked == 0:
                context = f"Just asked Q2: '{current_question}'. Candidate just answered. Evaluate if answer is sufficient. If sufficient, output [INTENT:WRAP] and conclude the interview. If vague, output [INTENT:PROBE] and ask ONE follow-up. If off-topic, output [INTENT:REDIRECT] and redirect."
            else:
                context = f"Asked Q2: '{current_question}' and already did a follow-up. Candidate just answered. You MUST output [INTENT:WRAP] and conclude the interview warmly."

    # Build prompt
    chat_history_text = "\n".join(
        f"{'Candidate' if m.role == 'user' else 'Aria'}: {m.content}"
        for m in req.history
    )
    if chat_history_text:
        prompt = f"Chat History:\n{chat_history_text}"
    else:
        prompt = "Candidate just joined. Please start."
        
    full_prompt = ARIA_SYSTEM_PROMPT.format(CONTEXT=context)
    full_text = gemini_generate(full_prompt, prompt)

    # Parse Intent
    intent_match = re.search(r'\[INTENT:(NEXT|PROBE|REDIRECT|WRAP)\]', full_text)
    intent = intent_match.group(1) if intent_match else "NEXT"
    
    # Clean text
    spoken_text = re.sub(r'\[INTENT:[A-Z]+\]', '', full_text).strip()
    
    # State transition
    if intent in ["PROBE", "REDIRECT"]:
        db_exec("UPDATE sessions SET followups_asked = followups_asked + 1 WHERE id=?", [req.session_id])
    elif intent == "NEXT":
        if current_q == 1:
            db_exec("UPDATE sessions SET current_q = 2, followups_asked = 0 WHERE id=?", [req.session_id])
        else:
            intent = "WRAP"
    
    if intent == "WRAP":
        db_exec("UPDATE sessions SET status=? WHERE id=?", ["completed_interview", req.session_id])

    return {"text": spoken_text, "intent": intent}


@app.post("/interview/end")
def end_interview(req: EndRequest):
    try:
        # Build full transcript
        transcript_lines = []
        for m in req.history:
            speaker = "CANDIDATE" if m.role == "user" else "ARIA"
            transcript_lines.append(f"{speaker}: {m.content}")
        transcript_text = "\n\n".join(transcript_lines)

        prompt = SCORING_PROMPT.format(
            NAME=req.candidate_name,
            TRANSCRIPT=transcript_text
        )

        raw = gemini_generate("", prompt, json_mode=True)
        raw = raw.replace("```json", "").replace("```", "").strip()
        
        try:
            report = json.loads(raw)
        except json.JSONDecodeError:
            raise ValueError("LLM returned malformed JSON.")

        verdict = report.get("verdict", "REVIEW")

        report_id = str(uuid.uuid4())
        db_exec(
            "INSERT INTO reports (id, session_id, candidate_name, created_at, transcript, scores, verdict, duration_seconds) VALUES (?,?,?,?,?,?,?,?)",
            [
                report_id,
                req.session_id,
                req.candidate_name,
                datetime.utcnow().isoformat(),
                transcript_text,
                json.dumps(report),
                verdict,
                req.duration_seconds
            ]
        )
        db_exec("UPDATE sessions SET status=? WHERE id=?", ["complete", req.session_id])

        return {"report_id": report_id, "report": report}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scoring failed: {str(e)}")


@app.get("/report/{report_id}")
def get_report(report_id: str):
    row = db_fetch(
        "SELECT scores, transcript, candidate_name, created_at, duration_seconds FROM reports WHERE id=?",
        [report_id]
    )
    if not row:
        raise HTTPException(status_code=404, detail="Report not found")
    report = json.loads(row[0])
    report["transcript_raw"] = row[1]
    report["candidate_name"] = row[2]
    report["created_at"] = row[3]
    report["duration_seconds"] = row[4]
    return report


@app.get("/reports")
def get_all_reports():
    rows = db_fetchall(
        "SELECT id, candidate_name, verdict, created_at, scores FROM reports ORDER BY created_at DESC"
    )
    result = []
    for r in rows:
        scores = json.loads(r[4]) if r[4] else {}
        result.append({
            "report_id": r[0],
            "candidate_name": r[1],
            "verdict": r[2],
            "created_at": r[3],
            "overall_score": scores.get("overall_score", 0)
        })
    return result
