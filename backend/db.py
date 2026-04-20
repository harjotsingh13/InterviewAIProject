import sqlite3

DB_PATH = "cuemath.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            candidate_name TEXT,
            created_at TEXT,
            status TEXT,
            q1 TEXT,
            q2 TEXT,
            interview_state TEXT DEFAULT 'MIC_CHECK'
        )
    """)
    try:
        c.execute("ALTER TABLE sessions ADD COLUMN silence_retries INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass
    c.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            session_id TEXT,
            candidate_name TEXT,
            created_at TEXT,
            transcript TEXT,
            scores TEXT,
            verdict TEXT,
            duration_seconds INTEGER
        )
    """)
    conn.commit()
    conn.close()

def db_exec(query, params=[]):
    conn = sqlite3.connect(DB_PATH)
    conn.execute(query, params)
    conn.commit()
    conn.close()

def db_fetch(query, params=[]):
    conn = sqlite3.connect(DB_PATH)
    row = conn.execute(query, params).fetchone()
    conn.close()
    return row

def db_fetchall(query, params=[]):
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return rows