"""API routes for AI chat."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from pydantic_ai import Agent
from pydantic_ai.ui import StateDeps
from pydantic_ai.ui.ag_ui import AGUIAdapter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from applique_backend.api.deps import get_db
from applique_backend.core.settings import Settings
from applique_backend.db import crud
from applique_backend.db.models import JobPosting
from applique_backend.services.llm import get_model
from applique_backend.services.prompts.manager import PromptManager, PromptTemplate

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)


class JobPostingContext(BaseModel):
    """Context information about a job posting."""

    id: int
    url: str
    description: str | None
    company_name: str | None
    job_title: str | None
    full_content: str | None
    generated_metadata: dict | None


class ChatState(BaseModel):
    """State for the chat agent that will be persisted by AG-UI."""

    job_posting: JobPostingContext | None = None
    cv_content: str | None = None
    cover_letter_content: str | None = None
    personal_info: str | None = None


def _build_instructions(state: ChatState, prompt_manager: PromptManager) -> str:
    """Build dynamic instructions based on available context using templates."""
    # Build context for the consolidated template
    context = {}

    if state.job_posting:
        context["job_posting"] = state.job_posting.model_dump()

    if state.personal_info:
        context["personal_info"] = state.personal_info

    if state.cv_content:
        context["cv_content"] = state.cv_content

    if state.cover_letter_content:
        context["cover_letter_content"] = state.cover_letter_content

    # Render the consolidated template with all context
    return prompt_manager.render_prompt(PromptTemplate.CHAT_INSTRUCTIONS, context=context)


async def _load_state(db: AsyncSession, settings: Settings, body: dict) -> ChatState:
    """Load state from request body."""
    state_data = body.get("state", {})
    chat_state = ChatState()

    # Load job posting
    job_posting_id = state_data.get("job_posting_id")
    if job_posting_id:
        stmt = select(JobPosting).where(JobPosting.id == job_posting_id)
        result = await db.execute(stmt)
        posting = result.scalars().first()
        if posting:
            chat_state.job_posting = JobPostingContext(
                id=posting.id,
                url=posting.url,
                description=posting.description,
                company_name=posting.generated_metadata.get("company_name") if posting.generated_metadata else None,
                job_title=posting.generated_metadata.get("job_title") if posting.generated_metadata else None,
                full_content=posting.full_content,
                generated_metadata=posting.generated_metadata,
            )

    # Load CV content
    cv_file = state_data.get("cv_file")
    if cv_file:
        cv_path = settings.DATA_DIR / "cvs" / cv_file
        if cv_path.exists():
            chat_state.cv_content = cv_path.read_text(encoding="utf-8")

    # Load cover letter content
    cover_letter_file = state_data.get("cover_letter_file")
    if cover_letter_file:
        cl_path = settings.DATA_DIR / "cover_letters" / cover_letter_file
        if cl_path.exists():
            chat_state.cover_letter_content = cl_path.read_text(encoding="utf-8")

    # Load personal information
    personal_info_file = state_data.get("personal_info_file")
    if personal_info_file:
        pi_path = settings.DATA_DIR / "personal_information" / personal_info_file
        if pi_path.exists():
            chat_state.personal_info = pi_path.read_text(encoding="utf-8")

    return chat_state


@router.post("")
async def run_agent(db: Annotated[AsyncSession, Depends(get_db)], request: Request):
    active_llm_config = await crud.get_active_llm_config(db)
    if not active_llm_config:
        raise HTTPException(detail="No active LLM configuration found.", status_code=status.HTTP_404_NOT_FOUND)

    settings: Settings = request.state.settings
    body = await request.json()

    # Load all context and state
    chat_state = await _load_state(db=db, settings=settings, body=body)

    # Build dynamic instructions based on available context
    instructions = _build_instructions(
        state=chat_state,
        prompt_manager=request.state.prompt_manager,
    )

    model = get_model(
        provider=active_llm_config.provider,
        model_name=active_llm_config.model_name,
        api_key=active_llm_config.api_key,
        base_url=active_llm_config.base_url,
    )

    # Create agent with StateDeps type - this implements StateHandler protocol
    agent = Agent(model=model, instructions=instructions, deps_type=StateDeps[ChatState])

    # Create StateDeps instance with the loaded state
    deps = StateDeps(state=chat_state)

    return await AGUIAdapter.dispatch_request(request=request, agent=agent, deps=deps)
