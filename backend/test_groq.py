import os
import groq
from dotenv import load_dotenv

load_dotenv()
groq_client = groq.Groq(api_key=os.getenv("GROQ_API_KEY"))

try:
    with open("temp_audio_b7be7245-e83a-4bb8-aa62-fc56347026a8.webm", "rb") as file_obj:
        transcription = groq_client.audio.transcriptions.create(
            model="whisper-large-v3",
            file=file_obj,
            language="en",
            response_format="text"
        )
    print("SUCCESS")
    print(type(transcription))
    print(transcription)
except Exception as e:
    print("ERROR")
    print(repr(e))
