from google import genai
import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set in your .env file!")

# ✅ New google-genai client (replaces old google-generativeai library)
gemini_client = genai.Client(api_key=GEMINI_API_KEY)

# ✅ gemini-2.0-flash: free tier, fast, great for chat/recommendations
GEMINI_MODEL = "gemini-2.0-flash"