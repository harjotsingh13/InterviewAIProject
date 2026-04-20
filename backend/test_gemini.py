import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

models_to_test = [
    "gemini-2.5-flash-lite"
]

print("Available models:")
for m in genai.list_models():
    if "generateContent" in m.supported_generation_methods:
        print("-", m.name)

print("\nTesting specific models:")
for model_name in models_to_test:
    sys_model_name = "models/" + model_name
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Hello")
        print(f"OK {model_name}: Success")
    except Exception as e:
        print(f"ERR {model_name}: Error - {e}")
