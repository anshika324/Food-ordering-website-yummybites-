# backend/gemini_config.py

import os
import google.generativeai as genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set in environment variables")

genai.configure(api_key=GEMINI_API_KEY)

GEMINI_MODEL = "models/gemini-1.5-flash"

# ✅ THIS is what ai_chat.py is importing
gemini_client = genai.GenerativeModel(GEMINI_MODEL)