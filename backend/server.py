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

# LLM Integrations (Emergent)
try:
    from emergentintegrations.llm.openai import LlmChat
    emergent_api_key = os.environ.get('EMERGENT_LLM_KEY')
    if emergent_api_key:
        llm_client = LlmChat(
            api_key=emergent_api_key,
            session_id="health-tracker-backend",
            system_message="You are Gugi, a friendly health coach."
        )
    else:
        llm_client = None
except Exception:  # pragma: no cover – fallback if lib not present
    llm_client = None

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

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
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# ====== Gugi AI (LLM-Light via Emergent) ======
class ChatMessage(BaseModel):
    role: Literal['system','user','assistant']
    content: str

class ChatRequest(BaseModel):
    mode: Literal['greeting','chat'] = 'chat'
    language: Literal['de','en','pl'] = 'de'
    model: Optional[str] = None  # e.g., 'gpt-4o-mini'
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
        
        # Use the OpenAI LlmChat with provider, model and async send_message
        client_with_model = llm_client.with_model('openai', model)
        resp = await client_with_model.send_message(user_message)
        
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
    model = req.model or 'gpt-4o-mini'
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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()