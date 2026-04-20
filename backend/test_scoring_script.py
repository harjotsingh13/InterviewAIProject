import asyncio
from db import init_db, db_exec
from main import end_interview, EndRequest, Message

req = EndRequest(
    session_id="test-session",
    candidate_name="Test User",
    history=[Message(role="user", content="hello"), Message(role="assistant", content="hi")],
    duration_seconds=10
)

try:
    res = end_interview(req)
    print("Success:", res)
except Exception as e:
    import traceback
    traceback.print_exc()
