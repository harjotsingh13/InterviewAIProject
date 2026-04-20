import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def gemini_generate(system_instruction: str, prompt_or_contents, json_mode: bool = False) -> str:
    model_name = "gemini-2.5-flash-lite"
    config = {"response_mime_type": "application/json"} if json_mode else {}
    try:
        model = genai.GenerativeModel(
            model_name,
            system_instruction=system_instruction if system_instruction else None,
            generation_config=config if config else None
        )
        response = model.generate_content(prompt_or_contents)
        print(f"Response Object: {response}")
        return response.text.strip()
    except Exception as e:
        print(f"Error during generation: {e}")
        raise

prompt = "Analyze the following text and return a JSON with a 'sentiment' key: 'I love this product!'"
try:
    print("Testing with string prompt and json_mode=True...")
    res = gemini_generate("", prompt, json_mode=True)
    print(f"Result: {res}")
except Exception as e:
    print(f"Failed string prompt: {e}")

try:
    print("\nTesting with chat-style prompt and json_mode=True...")
    res = gemini_generate("", [{"role": "user", "parts": [prompt]}], json_mode=True)
    print(f"Result: {res}")
except Exception as e:
    print(f"Failed chat-style prompt: {e}")
