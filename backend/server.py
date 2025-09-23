from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Literal, Optional, Dict, Any
import uuid
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# LLM Integrations (Emergent)
try:
    from emergentintegrations.llm.openai import LlmChat
    emergent_api_key = os.environ.get('EMERGENT_LLM_KEY')
    logger.info(f"EMERGENT_LLM_KEY found: {bool(emergent_api_key)}")
    if emergent_api_key:
        llm_client = LlmChat(
            api_key=emergent_api_key,
            session_id="health-tracker-backend",
            system_message="You are Gugi, a friendly health coach."
        )
        logger.info("LLM client initialized successfully")
    else:
        llm_client = None
        logger.warning("No EMERGENT_LLM_KEY found, LLM client set to None")
except Exception as e:  # pragma: no cover – fallback if lib not present
    logger.error(f"Failed to initialize LLM client: {e}")
    llm_client = None
# MongoDB connection (graceful if env missing)
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME')
client = None
db = None
if mongo_url and db_name:
    try:
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        logger.info("Connected to MongoDB")
    except Exception as e:
        logger.exception("Failed to initialize MongoDB client: %s", e)
else:
    logger.warning("MONGO_URL or DB_NAME not set; database features disabled")

# Create the main app without a prefix
app = FastAPI()

# Root route to help health checks and human checks
@app.get("/")
async def root_ok():
    return {"status": "ok", "service": "backend", "docs": "/docs", "api": "/api/"}

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    if db is None:
        raise HTTPException(status_code=503, detail="Database not configured")
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    if db is None:
        raise HTTPException(status_code=503, detail="Database not configured")
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# DB health endpoint
@api_router.get("/health/db")
async def health_db():
    if db is None:
        raise HTTPException(status_code=503, detail="Database not configured")
    try:
        await db.command("ping")
        return {"connected": True}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database ping failed: {e}")

# ====== Gugi AI (LLM-Light via Emergent) ======
class ChatMessage(BaseModel):
    role: Literal['system','user','assistant']
    content: str

class ChatRequest(BaseModel):
    mode: Literal['greeting','chat'] = 'chat'
    language: Literal['de','en','pl'] = 'de'
    model: Optional[str] = None  # e.g., 'gemini-2.0-flash'
    summary: Optional[Dict[str, Any]] = None
    messages: Optional[List[ChatMessage]] = None

class ChatResponse(BaseModel):
    text: str

SYSTEM_PROMPT_DE = (
    "Du bist Gugi – ein freundlicher, pragmatischer Gesundheitscoach. "
    "Nutze ausschließlich die bereitgestellte Zusammenfassung (summary), keine Websuche. "
    "Gib konkrete, kurze Tipps (1–3 Sätze), keine Diagnosen, kein medizinischer Rat. "
    "Sprich locker, positiv, aber präzise."
)
SYSTEM_PROMPT_EN = (
    "You are Gugi – a friendly, pragmatic health coach. "
    "Use only the provided summary; no web browsing. "
    "Provide concrete, short tips (1–3 sentences), no diagnoses or medical advice. "
    "Be casual, positive, and precise."
)
SYSTEM_PROMPT_PL = (
    "Jesteś Gugi – przyjaznym, pragmatycznym trenerem zdrowia. "
    "Używaj wyłącznie podanego podsumowania; bez przeglądania sieci. "
    "Dawaj konkretne, krótkie wskazówki (1–3 zdania), bez diagnoz i porad medycznych. "
    "Mów swobodnie, pozytywnie i precyzyjnie."
)


# Normalize/Map incoming model names to supported Gemini models
_SUPPORTED_GEMINI = {
    'gemini-2.0-flash': 'gemini-2.0-flash',
    'gemini-1.5-flash': 'gemini-2.0-flash',
    'flash': 'gemini-2.0-flash',
    'default': 'gemini-2.0-flash',
    '': 'gemini-2.0-flash',
    None: 'gemini-2.0-flash',
}

def _normalize_gemini_model(name: Optional[str]) -> str:
    try:
        return _SUPPORTED_GEMINI.get(name, 'gemini-2.0-flash')
    except Exception:
        return 'gemini-2.0-flash'


# Minimal message wrapper to satisfy emergentintegrations expectations
class _SimpleUserMessage:
    def __init__(self, text: str, file_contents=None):
        # Library checks for attribute 'file_contents' existence; keep as empty list if None
        self.text = text
        self.file_contents = file_contents or []

async def _call_llm(messages: List[Dict[str,str]], model: str) -> str:
    logger.info(f"_call_llm called with model: {model}, llm_client is None: {llm_client is None}")
    
    if llm_client is None:
        logger.warning("LLM client is None, using fallback")
        # Fallback: simple echo/tip if integration not available
        return messages[-1].get('content','').strip() or "Hi!"
    
    try:
        # Get the user message (last message in the conversation)
        user_message = messages[-1].get('content', '') if messages else ''
        logger.info(f"Sending message to LLM: {user_message[:50]}...")
        
        # Switch to Google Gemini Flash as requested
        provider = 'gemini'
        model_name = model or 'gemini-2.0-flash'
        client_with_model = llm_client.with_model(provider, model_name)
        # Wrap plain text into a minimal message object to satisfy library expectations
        user_msg_obj = _SimpleUserMessage(text=user_message)
        resp = await client_with_model.send_message(user_msg_obj)
        
        logger.info(f"LLM response type: {type(resp)}, content: {str(resp)[:100]}...")
        
        # Extract content from response
        if isinstance(resp, str):
            return resp.strip()
        else:
            return str(resp).strip()
            
    except Exception as e:
        logging.exception("LLM call failed: %s", e)
        # Return fallback instead of raising error to keep API working
        return "I'm having trouble connecting to the AI service right now. Please try again later."

@api_router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    lang = req.language or 'de'
    # default to gemini flash if not provided
    model = req.model or 'gemini-2.0-flash'
    system = SYSTEM_PROMPT_DE if lang=='de' else (SYSTEM_PROMPT_PL if lang=='pl' else SYSTEM_PROMPT_EN)

    # Build base messages
    msgs: List[Dict[str,str]] = [
        {"role":"system","content": system}
    ]
    # Inject compact summary as assistant context
    if req.summary:
        msgs.append({"role":"system","content": f"summary: {req.summary}"})

    if req.mode == 'greeting':
        user_prompt = {
            'de': "Gib einen sehr kurzen Tipp und einen kurzen Hinweis basierend auf der summary.",
            'en': "Give one short tip and one short remark based on the summary.",
            'pl': "Podaj jedną krótką wskazówkę i jedną krótką uwagę na podstawie podsumowania.",
        }[lang]
        msgs.append({"role":"user","content": user_prompt})
    else:
        # normal chat
        for m in (req.messages or [])[-12:]:
            msgs.append({"role": m.role, "content": m.content})

    text = await _call_llm(msgs, model)
    return ChatResponse(text=text)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    if client:
        client.close()