# AI App Wireframe Generator

Turn any app idea into a detailed screen-by-screen wireframe in seconds — powered by Google Gemini AI.

## What it does

You describe your app in plain English (e.g. "a fitness app that tracks workouts"), pick a color and style, and the AI generates a full screen flow with:
- 6–8 realistic screens (splash, onboarding, auth, home, search, detail, profile, success)
- Specific UI elements per screen based on real app patterns (Airbnb, Spotify, Uber, etc.)
- Color system, font style, tech stack, and estimated dev time
- Interactive phone mockups you can click through

## Tech Stack

**Frontend**
- React 19 + TypeScript
- Vite
- Pure CSS-in-JS (no UI library)

**Backend**
- FastAPI (Python)
- Google Gemini API (primary)
- OpenRouter (fallback — 5 API keys across multiple free models)
- Server-Sent Events for real-time streaming

## How to run locally

### Backend
```bash
cd backend
pip install -r requiremnts.txt
# Copy .env.example to .env and add your API keys
cp .env.example .env
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:8000`.

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in your keys:

```
GEMINI_API_KEY=        # from https://aistudio.google.com/apikey
OPENROUTER_API_KEY_1=  # from https://openrouter.ai (fallback)
OPENROUTER_API_KEY_2=
OPENROUTER_API_KEY_3=
OPENROUTER_API_KEY_4=
OPENROUTER_API_KEY_5=
```

## How the AI works

The backend uses a 3-layer approach to get high quality, app-specific output:

1. **Rich system prompt** — forces specific, realistic content instead of generic placeholders
2. **Screen type templates** — each screen type (home, search, detail etc.) has fixed UI zones the AI must populate
3. **UI pattern library** — text descriptions of real apps (Airbnb, Spotify, Uber) baked into the prompt as references

Gemini is tried first across 3 models, then falls back to OpenRouter across 5 keys and 5 models if Gemini fails.
