"""Main API router."""

from fastapi import APIRouter

from applique_backend.api.routes import chat, documents, llm, postings, profile, prompts, status

api_router = APIRouter(prefix="/api")
api_router.include_router(status.router)
api_router.include_router(postings.router)
api_router.include_router(llm.router)
api_router.include_router(documents.router)
api_router.include_router(chat.router)
api_router.include_router(prompts.router)
api_router.include_router(profile.router)
