from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx
import json
import os
from dotenv import load_dotenv

load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEYS = [k for k in [
    os.getenv("OPENROUTER_API_KEY_1"),
    os.getenv("OPENROUTER_API_KEY_2"),
    os.getenv("OPENROUTER_API_KEY_3"),
    os.getenv("OPENROUTER_API_KEY_4"),
    os.getenv("OPENROUTER_API_KEY_5"),
] if k]


# ─── Gemini (primary) ────────────────────────────────────────────────────────
# Free tier: 15 RPM, 1000 RPD. Get key at https://aistudio.google.com/apikey
async def call_gemini(messages: list) -> dict:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise Exception("No GEMINI_API_KEY set")

    # Use native Gemini REST API
    # Merge system prompt into first user message
    contents = []
    system_text = ""
    for m in messages:
        if m["role"] == "system":
            system_text = m["content"]
        else:
            text = (system_text + "\n\n" + m["content"]) if system_text else m["content"]
            contents.append({"role": "user", "parts": [{"text": text}]})
            system_text = ""

    # Try models in order until one works
    gemini_models = ["gemini-3.1-flash-lite", "gemini-3-flash-preview", "gemma-4-31b-it"]
    last_error = None

    for model in gemini_models:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}",
                    headers={"Content-Type": "application/json"},
                    json={"contents": contents, "generationConfig": {"maxOutputTokens": 6000}},
                )

            if response.status_code == 429:
                print(f"Gemini model {model} rate limited, trying next...")
                continue
            if response.status_code >= 400:
                print(f"Gemini model {model} error {response.status_code}, trying next...")
                continue

            data = response.json()
            if "error" in data:
                print(f"Gemini model {model} body error, trying next...")
                continue

            # Normalize to OpenAI-style so the rest of the code works the same
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            print(f"Gemini success with model: {model}")
            return {"choices": [{"message": {"content": text}}]}

        except Exception as e:
            last_error = e
            print(f"Gemini model {model} exception: {e}, trying next...")
            continue

    raise Exception(f"All Gemini models failed. Last error: {last_error}")


# ─── OpenRouter (fallback) ───────────────────────────────────────────────────
async def call_openrouter(messages: list, current_key_index: int = 0) -> dict:
    MODELS = [
        "google/gemma-4-31b-it:free",                    # working ✓
        "nvidia/nemotron-3-super-120b-a12b:free",        # working ✓
        "nvidia/nemotron-3-nano-30b-a3b:free",           # working ✓
        "meta-llama/llama-3.3-70b-instruct:free",        # fallback
        "meta-llama/llama-3.2-3b-instruct:free",         # fallback
    ]

    if current_key_index >= len(API_KEYS):
        raise Exception("All OpenRouter keys exhausted.")

    key = API_KEYS[current_key_index]
    model = MODELS[current_key_index % len(MODELS)]
    print(f"OpenRouter: trying key {current_key_index + 1} with model {model}")

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"model": model, "messages": messages, "max_tokens": 6000},
        )

    if response.status_code >= 400:
        print(f"Key {current_key_index + 1} failed ({response.status_code}), trying next...")
        return await call_openrouter(messages, current_key_index + 1)

    data = response.json()
    if "error" in data:
        print(f"Key {current_key_index + 1} body error, trying next...")
        return await call_openrouter(messages, current_key_index + 1)

    return data


# ─── Primary call: Gemini first, OpenRouter fallback ────────────────────────
async def call_ai(messages: list) -> dict:
    try:
        print("Trying Gemini...")
        return await call_gemini(messages)
    except Exception as e:
        print(f"Gemini failed: {e}. Falling back to OpenRouter...")
        return await call_openrouter(messages)


# ─── JSON parser ─────────────────────────────────────────────────────────────
def try_parse_json(text: str) -> dict | None:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    for i in range(len(text) - 1, -1, -1):
        if text[i] == '}':
            try:
                return json.loads(text[:i+1])
            except json.JSONDecodeError:
                continue
    open_count = text.count('{')
    close_count = text.count('}')
    if open_count > close_count:
        try:
            return json.loads(text + ('}' * (open_count - close_count)))
        except json.JSONDecodeError:
            pass
    return None


# ─── Option 3: Text UI pattern library ──────────────────────────────────────
UI_PATTERN_LIBRARY = """
REAL APP UI PATTERNS — use these as references for depth and specificity:

AIRBNB HOME: Full-bleed hero photo. Floating pill search bar "Where to? · Any week · Any guests".
  Horizontal scroll of category icons (Beach, Cabins, Trending, Mansions). Vertical grid of
  listing cards: photo, location, price/night, star rating. Bottom nav: Explore/Wishlists/Trips/Inbox/Profile.

UBER HOME: Map fills 70% of screen. Bottom sheet with "Where to?" search bar. Recent destinations
  as pill chips. "Ride · Eats · Connect" toggle row. Estimated prices before confirming.

SPOTIFY HOME: Dark bg, "Good morning" greeting with playlists grid. "Recently played" horizontal
  scroll with album art circles. Sticky bottom player bar: song name, play/pause, heart icon.

DUOLINGO ONBOARDING: Single question per screen. Large illustrated character. Bold question text.
  2-4 tappable answer cards with emoji + label. Progress bar at top. Continue button disabled until answered.

STRAVA HOME: Activity feed with map thumbnails. Stats row: weekly km, elevation, time. Quick-start
  FAB button. Segment leaderboards. Challenge banners.

MYFITNESSPAL: Calorie ring dashboard. Macro bars (protein/carbs/fat). Meal log sections: Breakfast/
  Lunch/Dinner/Snacks with add buttons. Water tracker. Exercise log card.
"""

# ─── Option 2: Screen-type structural templates ──────────────────────────────
SCREEN_TEMPLATES = {
    "splash": ["Full-screen brand gradient/illustration", "Centered logo + app name", "Animated tagline", "Auto-advance after 2s"],
    "onboarding": ["Progress bar top (step X of Y)", "Large illustration 60% screen", "Bold heading + 2-line subtitle", "Full-width CTA button", "Skip link top-right"],
    "auth": ["App logo", "Sign In / Sign Up tabs", "Email + Password fields", "Primary CTA button", "Social auth (Google, Apple)", "Forgot password link"],
    "home": ["Greeting + avatar top-left", "Notification bell top-right", "Hero/search section", "Horizontal category filter scroll", "Content feed or grid", "Sticky bottom nav (4-5 tabs)"],
    "search": ["Sticky search bar + back arrow", "Filter chips: scrollable row", "Results count label", "Vertical result cards: image + title + rating + meta", "Empty state if no results"],
    "detail": ["Full-bleed hero image", "Back button overlay", "Title + rating row", "Info chips (category/duration/price)", "Tabs: Overview/Reviews/Photos", "Collapsible description", "Sticky bottom CTA bar with price"],
    "profile": ["Cover photo + avatar", "Name + username + bio", "Stats row (Posts/Followers/Following)", "Edit/Follow buttons", "Content grid 3-col"],
    "success": ["Large success animation/checkmark", "Confirmation heading", "Summary details card", "Done / View Details button", "Share link"],
    "empty": ["Centered illustration", "'Nothing here yet' heading", "Subtext + CTA button to add first item"],
}

def build_template_instructions() -> str:
    lines = ["SCREEN STRUCTURE RULES — populate each type with these specific zones:\n"]
    for stype, zones in SCREEN_TEMPLATES.items():
        lines.append(f"{stype.upper()}: {' | '.join(zones)}")
    return "\n".join(lines)


# ─── System prompt (Options 1+2+3 combined) ──────────────────────────────────
SYSTEM_PROMPT = f"""You are a senior mobile UI/UX designer. Return ONLY valid JSON — no markdown, no explanation.

{UI_PATTERN_LIBRARY}

{build_template_instructions()}

Generate a realistic app flow with this exact JSON structure:
{{
  "app_name": "Specific App Name",
  "tagline": "Specific value proposition under 8 words",
  "primary_color": "#hex",
  "secondary_color": "#hex",
  "background_color": "#hex",
  "font_style": "Inter",
  "icon_style": "Rounded",
  "target_audience": "Specific audience e.g. Gym-goers aged 18-35",
  "estimated_dev_time": "X weeks",
  "tech_stack": ["React Native", "Node.js", "PostgreSQL"],
  "screens": [
    {{
      "id": "screen_1",
      "name": "Screen Name",
      "type": "splash|onboarding|auth|home|search|profile|detail|success|empty",
      "description": "One sentence: what the user does here",
      "content": {{
        "greeting": "App-specific headline (NOT generic 'Hello' or 'Welcome')",
        "subtitle": "App-specific supporting text",
        "primary_action": "Specific CTA e.g. 'Start Workout' not 'Continue'",
        "secondary_action": "Secondary link if applicable",
        "elements": [
          "Specific element e.g. 'Calorie ring: 1,840 / 2,200 kcal consumed'",
          "Specific element e.g. 'Macro bars: Protein 142g · Carbs 198g · Fat 67g'",
          "Specific element e.g. 'Meal sections: Breakfast 320kcal · Lunch 680kcal · + Add'",
          "Specific element e.g. 'Quick-add FAB: + Log Food'"
        ]
      }}
    }}
  ]
}}

RULES:
- Generate 6-8 screens forming a coherent user journey
- All elements must be domain-specific — ZERO generic placeholders like 'element1' or 'Item 1'
- Reference the UI patterns above for realistic layout depth
- Follow screen structure rules for each type
- Screens must flow: splash → onboarding → auth → home → search/detail → profile/success
- Return ONLY the JSON object"""


# ─── Fallback screens ────────────────────────────────────────────────────────
def _fallback_screens(prompt: str, color: str) -> dict:
    return {
        "app_name": "Your App", "tagline": prompt[:50],
        "primary_color": color, "secondary_color": "#6366f1",
        "background_color": "#0f172a", "font_style": "Inter",
        "icon_style": "Rounded", "target_audience": "General users",
        "estimated_dev_time": "8 weeks",
        "tech_stack": ["React Native", "Node.js", "MongoDB"],
        "screens": [
            {"id": "screen_1", "name": "Splash", "type": "splash", "description": "App intro",
             "content": {"greeting": "Welcome", "subtitle": prompt[:40], "primary_action": "Get Started", "elements": ["App logo", "Loading animation"]}},
            {"id": "screen_2", "name": "Home", "type": "home", "description": "Main dashboard",
             "content": {"greeting": "Good morning!", "subtitle": "Here's your overview", "primary_action": "Explore", "elements": ["Stats card", "Recent activity feed", "Quick actions row", "Bottom nav"]}},
            {"id": "screen_3", "name": "Search", "type": "search", "description": "Find content",
             "content": {"greeting": "Find anything", "subtitle": "Search across the app", "primary_action": "Search", "elements": ["Search bar", "Filter chips", "Results list"]}},
            {"id": "screen_4", "name": "Profile", "type": "profile", "description": "User profile",
             "content": {"greeting": "Your Profile", "subtitle": "Manage your account", "primary_action": "Edit Profile", "elements": ["Avatar", "Stats row", "Content grid"]}},
        ]
    }


# ─── Request model ───────────────────────────────────────────────────────────
class GenerateRequest(BaseModel):
    prompt: str
    primary_color: str
    style: str


# ─── Streaming generation ────────────────────────────────────────────────────
async def generation_stream(prompt: str, color: str, style: str):
    def step_event(step: int, message: str, done: bool = False) -> str:
        return f"data: {json.dumps({'type': 'step', 'data': {'step': step, 'message': message, 'done': done}})}\n\n"

    yield step_event(1, "Understanding your idea...")

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Create an app flow for: {prompt}. Use {color} as the primary color. Style: {style}."}
    ]

    yield step_event(2, "Planning the user journey...")

    try:
        result = await call_ai(messages)
        yield step_event(3, "Designing the screens...")

        raw = result["choices"][0]["message"]["content"]
        # Strip markdown code fences if present
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        yield step_event(4, "Applying your color system...")

        app_flow = try_parse_json(raw.strip())
        if not app_flow:
            print("JSON parse failed, using fallback")
            app_flow = _fallback_screens(prompt, color)

    except Exception as e:
        print(f"AI call failed: {e}. Using fallback.")
        yield step_event(3, "Designing the screens...")
        yield step_event(4, "Applying your color system...")
        app_flow = _fallback_screens(prompt, color)

    app_flow["primary_color"] = color
    yield step_event(5, "Finalizing your prototype...", done=True)
    yield f"data: {json.dumps({'type': 'result', 'data': app_flow})}\n\n"


# ─── Routes ──────────────────────────────────────────────────────────────────
@app.post("/generate")
async def generate(request: GenerateRequest):
    return StreamingResponse(
        generation_stream(request.prompt, request.primary_color, request.style),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )

@app.get("/")
async def root():
    return {"message": "Wireframe Generator API running"}
