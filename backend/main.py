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
from prompts import ARIA_SYSTEM_PROMPT, SCORING_PROMPT, INTENT_CLASSIFIER_PROMPT, AUDIO_CLEANUP_PROMPT
from db import init_db, db_exec, db_fetch, db_fetchall

load_dotenv()

# Application startup
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
                if i < len(GEMINI_MODELS) - 1:
                    time.sleep(1.5)
                continue
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
        "INSERT INTO sessions (id, candidate_name, created_at, status, q1, q2, interview_state) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [session_id, req.candidate_name, datetime.utcnow().isoformat(), "active", q1, q2, "MIC_CHECK"]
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
            
        transcript = transcription.strip()
        lower_t = transcript.lower().strip(".,!? ")
        if lower_t in ["thank you", "bye", "thanks", "thanks for watching", "okay", "hmm", "um", "uh", "ah"]:
            transcript = ".."
            
        return {"transcript": transcript}
    except Exception as e:
        error_str = str(e).lower()
        if "too short" in error_str or "0.01 seconds" in error_str:
            return {"transcript": ""}
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)

def run_audio_cleanup(transcript: str) -> dict:
    if not transcript or len(transcript.split()) < 2:
        return {"is_garbled": False, "confidence": "LOW"}
    prompt = AUDIO_CLEANUP_PROMPT.format(TRANSCRIPT=transcript)
    try:
        raw = gemini_generate("", prompt, json_mode=True)
        return json.loads(raw)
    except:
        return {"is_garbled": False, "confidence": "HIGH"}

def run_intent_classifier(question: str, transcript: str) -> str:
    import string
    cleaned = transcript.translate(str.maketrans('', '', string.punctuation)).lower().split()
    filler_words = {"hmm", "okay", "thank", "you", "yes", "no", "um", "uh", "ah", "like"}
    
    meaningful_words = [w for w in cleaned if w not in filler_words]
    if len(meaningful_words) < 3:
        return "NO_SPEECH"
        
    prompt = INTENT_CLASSIFIER_PROMPT.format(QUESTION=question, RESPONSE=transcript)
    try:
        raw = gemini_generate("", prompt, json_mode=True)
        return json.loads(raw).get("intent", "SUFFICIENT")
    except:
        return "SUFFICIENT"


@app.post("/interview/respond")
def get_aria_response(req: RespondRequest):
    # Fetch silence_retries using a safe query block in case schema hasn't strictly updated yet
    try:
        session_row = db_fetch("SELECT q1, q2, interview_state, silence_retries FROM sessions WHERE id=?", [req.session_id])
        q1, q2, interview_state, silence_retries = session_row
    except:
        # Fallback if the column is entirely missing
        session_row = db_fetch("SELECT q1, q2, interview_state FROM sessions WHERE id=?", [req.session_id])
        q1, q2, interview_state = session_row
        silence_retries = 0

    if not session_row:
        raise HTTPException(status_code=404, detail="Session not found")
        
    silence_retries = silence_retries or 0
    candidate_latest = req.history[-1].content if req.history and req.history[-1].role == 'user' else ""
    
    if req.is_first_turn:
        # Phase 5: Mic check behavior on startup
        db_exec("UPDATE sessions SET interview_state='MIC_CHECK' WHERE id=?", [req.session_id])
        return {"text": f"Hello, I’ll be conducting a short interview. There are two questions, each with one follow-up. If I don’t hear a response, I may move ahead. Let’s begin. Before we start, please say anything just so I can hear you clearly.", "intent": "NEXT"}

    if interview_state == 'MIC_CHECK':
        db_exec("UPDATE sessions SET interview_state='Q1_ASKED' WHERE id=?", [req.session_id])
        return {"text": f"Great! {q1}", "intent": "NEXT"}

    current_q = q1 if interview_state in ["Q1_ASKED", "Q1_FOLLOWUP_ASKED"] else q2
    
    # Phase 3 Audio Check
    audio_flags = run_audio_cleanup(candidate_latest)
    if audio_flags.get("is_garbled") and len(candidate_latest.split()) > 0:
        system_context = "Candidate's audio was garbled. Acknowledge this kindly, paraphrase what you think they said, ask if you got it right, AND continue with the current flow. Don't evaluate."
        db_exec(f"UPDATE sessions SET interview_state='{interview_state}' WHERE id=?", [req.session_id])
        full_prompt = ARIA_SYSTEM_PROMPT.format(CONTEXT=system_context)
        chat_history_text = "\n".join(f"{'Candidate' if m.role == 'user' else 'Aria'}: {m.content}" for m in req.history)
        text = gemini_generate(full_prompt, f"Chat History:\n{chat_history_text}")
        return {"text": text, "intent": "PROBE"}
        
    # Phase 2 Intent Classifier
    intent = run_intent_classifier(current_q, candidate_latest)
    
    system_context = ""
    next_state = interview_state
    forced_text = None
    
    if intent == "NO_SPEECH":
        if silence_retries == 0:
            db_exec("UPDATE sessions SET silence_retries = 1 WHERE id=?", [req.session_id])
            forced_text = "I'm listening."
        else:
            db_exec("UPDATE sessions SET silence_retries = 0 WHERE id=?", [req.session_id])
            if interview_state in ["Q1_ASKED", "Q1_FOLLOWUP_ASKED"]:
                forced_text = f"No worries, I'll move ahead to the next question. {q2}"
                next_state = 'Q2_ASKED'
            else:
                forced_text = "No problem at all. Thank you for your time, that concludes the interview."
                next_state = 'CLOSING'
                
    else:
        db_exec("UPDATE sessions SET silence_retries = 0 WHERE id=?", [req.session_id])
        if interview_state == 'Q1_ASKED':
            if intent in ["VAGUE", "TANGENT"]:
                system_context = f"Candidate's answer was {intent}. Acknowledge their point gently, and ask EXACTLY ONE follow-up question to probe deeper."
                next_state = 'Q1_FOLLOWUP_ASKED'
            else: # SUFFICIENT
                system_context = f"Candidate gave a sufficient answer. Acknowledge it nicely and move on to ask Question 2: {q2}"
                next_state = 'Q2_ASKED'
                
        elif interview_state == 'Q1_FOLLOWUP_ASKED':
            system_context = f"Acknowledge their answer briefly, then move to Question 2: {q2}"
            next_state = 'Q2_ASKED'
            
        elif interview_state == 'Q2_ASKED':
            if intent in ["VAGUE", "TANGENT"]:
                system_context = f"Candidate's answer was {intent}. Acknowledge gently, and ask EXACTLY ONE follow-up question to probe deeper."
                next_state = 'Q2_FOLLOWUP_ASKED'
            else:
                system_context = f"Candidate gave a sufficient answer. Acknowledge warmly and gracefully conclude the interview."
                next_state = 'CLOSING'
                
        elif interview_state == 'Q2_FOLLOWUP_ASKED':
            system_context = f"Acknowledge their follow-up answer, then gracefully conclude the interview."
            next_state = 'CLOSING'
            
        elif interview_state == 'CLOSING':
            system_context = "The interview is already over."
            next_state = 'CLOSING'

    db_exec("UPDATE sessions SET interview_state=? WHERE id=?", [next_state, req.session_id])
    
    if forced_text:
        text = forced_text
    elif next_state == 'CLOSING' and intent == 'NO_SPEECH':
        text = "Thank you for your time. That concludes the interview."
    else:
        full_prompt = ARIA_SYSTEM_PROMPT.format(CONTEXT=system_context)
        chat_history_text = "\n".join(f"{'Candidate' if m.role == 'user' else 'Aria'}: {m.content}" for m in req.history)
        text = gemini_generate(full_prompt, f"Chat History:\n{chat_history_text}")
    
    out_intent = "WRAP" if next_state == 'CLOSING' else ("PROBE" if ('FOLLOWUP' in next_state or forced_text) else "NEXT")
    
    if next_state == 'CLOSING':
        db_exec("UPDATE sessions SET status='completed_interview' WHERE id=?", [req.session_id])
        
    cleaned_text = re.sub(r'\[INTENT:[A-Z]+\]', '', text).strip()
    return {"text": cleaned_text, "intent": out_intent}


@app.post("/interview/end")
def end_interview(req: EndRequest):
    try:
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

