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
from prompts import UNIFIED_TURN_PROMPT, SCORING_PROMPT
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
        db_exec("UPDATE sessions SET interview_state='MIC_CHECK' WHERE id=?", [req.session_id])
        return {"text": "Hello, I’ll be conducting a short interview. There are two questions, each with one follow-up. If I don’t hear a response, I may move ahead. Let’s begin. Before we start, please say anything just so I can hear you clearly.", "intent": "NEXT"}

    if interview_state == 'MIC_CHECK':
        db_exec("UPDATE sessions SET interview_state='Q1_ASKED' WHERE id=?", [req.session_id])
        return {"text": f"Great! {q1}", "intent": "NEXT"}

    # NO_SPEECH detection natively
    import string
    cleaned = candidate_latest.translate(str.maketrans('', '', string.punctuation)).lower().split()
    filler_words = {"hmm", "okay", "thank", "you", "yes", "no", "um", "uh", "ah", "like", "yeah"}
    meaningful_words = [w for w in cleaned if w not in filler_words]
    
    if len(meaningful_words) < 3:
        if silence_retries == 0:
            db_exec("UPDATE sessions SET silence_retries = 1 WHERE id=?", [req.session_id])
            return {"text": "I'm listening.", "intent": "PROBE"}
        else:
            db_exec("UPDATE sessions SET silence_retries = 0 WHERE id=?", [req.session_id])
            if interview_state in ["Q1_ASKED", "Q1_FOLLOWUP_ASKED"]:
                db_exec("UPDATE sessions SET interview_state='Q2_ASKED' WHERE id=?", [req.session_id])
                return {"text": f"No worries, I'll move ahead to the next question. {q2}", "intent": "NEXT"}
            else:
                db_exec("UPDATE sessions SET interview_state='CLOSING', status='completed_interview' WHERE id=?", [req.session_id])
                return {"text": "No problem at all. Thank you for your time, that concludes the interview.", "intent": "WRAP"}

    # For valid speech, use unified LLM prompt
    db_exec("UPDATE sessions SET silence_retries = 0 WHERE id=?", [req.session_id])

    specific_instructions = ""
    if interview_state == 'Q1_ASKED':
        specific_instructions = f"- If VAGUE or TANGENT: ask exactly ONE probing follow-up.\n- If SUFFICIENT: acknowledge and move to Question 2: {q2}"
    elif interview_state == 'Q1_FOLLOWUP_ASKED':
        specific_instructions = f"- For any intent: acknowledge their answer briefly, then move to Question 2: {q2}. Do NOT ask another follow-up."
    elif interview_state == 'Q2_ASKED':
        specific_instructions = f"- If VAGUE or TANGENT: ask exactly ONE probing follow-up.\n- If SUFFICIENT: acknowledge warmly and gracefully conclude the interview."
    elif interview_state == 'Q2_FOLLOWUP_ASKED':
        specific_instructions = "- For any intent: acknowledge their answer briefly, then gracefully conclude the interview."
    elif interview_state == 'CLOSING':
        specific_instructions = "The interview is over. Just say goodbye."

    prompt_context = f"Current State: {interview_state}\nQuestion 1: {q1}\nQuestion 2: {q2}"
    chat_history_text = "\n".join(f"{'Candidate' if m.role == 'user' else 'Aria'}: {m.content}" for m in req.history)
    
    full_prompt = UNIFIED_TURN_PROMPT.format(
        CONTEXT=prompt_context,
        SPECIFIC_INSTRUCTIONS=specific_instructions,
        CHAT_HISTORY=chat_history_text
    )

    try:
        raw_response = gemini_generate("", full_prompt, json_mode=True)
        llm_out = json.loads(raw_response)
        intent = llm_out.get("intent", "SUFFICIENT")
        text = llm_out.get("text", "Let's move on.")
    except Exception as e:
        print("Failed to parse LLM JSON:", e)
        intent = "SUFFICIENT"
        text = "I see. Let's move smoothly to the next point. " + (q2 if interview_state in ['Q1_ASKED', 'Q1_FOLLOWUP_ASKED'] else "")

    next_state = interview_state
    if intent != "GARBLED_AUDIO":
        if interview_state == 'Q1_ASKED':
            next_state = 'Q1_FOLLOWUP_ASKED' if intent in ['VAGUE', 'TANGENT'] else 'Q2_ASKED'
        elif interview_state == 'Q1_FOLLOWUP_ASKED':
            next_state = 'Q2_ASKED'
        elif interview_state == 'Q2_ASKED':
            next_state = 'Q2_FOLLOWUP_ASKED' if intent in ['VAGUE', 'TANGENT'] else 'CLOSING'
        elif interview_state == 'Q2_FOLLOWUP_ASKED':
            next_state = 'CLOSING'

    db_exec("UPDATE sessions SET interview_state=? WHERE id=?", [next_state, req.session_id])
    
    out_intent = "WRAP" if next_state == 'CLOSING' else ("PROBE" if ('FOLLOWUP' in next_state or intent == "GARBLED_AUDIO") else "NEXT")
    if next_state == 'CLOSING':
        db_exec("UPDATE sessions SET status='completed_interview' WHERE id=?", [req.session_id])
        
    return {"text": text, "intent": out_intent}


@app.post("/interview/end")
def end_interview(req: EndRequest):
    try:
        transcript_lines = []
        candidate_turns = [m for m in req.history if m.role == "user"]
        silent_turns = [m for m in candidate_turns if len(m.content.strip(".").strip()) < 3]
        
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
        
        # Override to REVIEW if candidate was largely silent
        if candidate_turns and len(silent_turns) / max(len(candidate_turns), 1) >= 0.5:
            verdict = "REVIEW"
            report["verdict"] = "REVIEW"
            report["recommendation"] = "Insufficient verbal data — recommend a re-interview or manual review."

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

