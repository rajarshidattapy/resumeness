from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.db.mongo import connect_db, close_db
from app.routes import optimize, ats, chat, resume, kb, quiz, certificates

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()

app = FastAPI(title="Resumeness AI", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(optimize.router)
app.include_router(ats.router)
app.include_router(chat.router)
app.include_router(resume.router)
app.include_router(kb.router)
app.include_router(quiz.router)
app.include_router(certificates.router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "resumeness-ai"}
