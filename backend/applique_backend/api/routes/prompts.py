"""API routes for prompt template management."""

import logging
from typing import TypedDict

from fastapi import APIRouter, HTTPException, Request, status
from jinja2 import Template

from applique_backend.api.schemas import (
    PromptDetail,
    PromptInfo,
    PromptPreviewRequest,
    PromptPreviewResponse,
    PromptResetResponse,
    PromptSaveRequest,
    PromptSaveResponse,
)
from applique_backend.services.prompts.manager import PromptTemplate

router = APIRouter(prefix="/prompts", tags=["prompts"])
logger = logging.getLogger(__name__)


class PromptMetadata(TypedDict):
    """Metadata for a prompt template."""

    display_name: str
    description: str
    variables: list[str]


# Metadata for each prompt template
PROMPT_METADATA: dict[PromptTemplate, PromptMetadata] = {
    PromptTemplate.JOB_INFORMATION_EXTRACTION: {
        "display_name": "Job Information Extraction",
        "description": "System prompt for extracting structured metadata from job postings",
        "variables": [],
    },
    PromptTemplate.CHAT_INSTRUCTIONS: {
        "display_name": "Chat Instructions",
        "description": "Complete chat assistant instructions with dynamic context (supports template inheritance)",
        "variables": [
            "job_posting.job_title",
            "job_posting.company_name",
            "job_posting.url",
            "job_posting.description",
            "job_posting.full_content",
            "personal_info",
            "cv_content",
            "cover_letter_content",
        ],
    },
}


@router.get("", response_model=list[PromptInfo])
async def list_prompts(request: Request) -> list[PromptInfo]:
    """List all available prompt templates with their customization status."""
    prompt_mgr = request.state.prompt_manager
    prompts = [
        PromptInfo(
            name=template.value,
            display_name=PROMPT_METADATA[template]["display_name"],
            description=PROMPT_METADATA[template]["description"],
            is_customized=prompt_mgr.is_customized(template),
            variables=PROMPT_METADATA[template]["variables"],
        )
        for template in PromptTemplate
    ]
    return prompts


@router.get("/{template_name}", response_model=PromptDetail)
async def get_prompt(template_name: PromptTemplate, request: Request) -> PromptDetail:
    """Get detailed information about a specific prompt template."""
    template = PromptTemplate(template_name)
    prompt_mgr = request.state.prompt_manager
    metadata = PROMPT_METADATA[template]

    # Get content (user version if customized, otherwise default)
    user_content = prompt_mgr.get_user_template_content(template)
    default_content = prompt_mgr.get_default_template_content(template)
    current_content = user_content if user_content else default_content

    return PromptDetail(
        name=template.value,
        display_name=metadata["display_name"],
        description=metadata["description"],
        is_customized=prompt_mgr.is_customized(template),
        variables=metadata["variables"],
        content=current_content,
        default_content=default_content,
    )


@router.post("/{template_name}/preview", response_model=PromptPreviewResponse)
async def preview_prompt(
    template_name: PromptTemplate, request_body: PromptPreviewRequest, request: Request
) -> PromptPreviewResponse:
    """Preview a rendered prompt with sample context."""
    template = PromptTemplate(template_name)
    prompt_mgr = request.state.prompt_manager

    try:
        rendered = prompt_mgr.render_prompt(template, context=request_body.context)
        return PromptPreviewResponse(rendered=rendered)
    except Exception as e:
        logger.error("Failed to render prompt '%s': %s", template_name, e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to render prompt: {e}") from e


@router.put("/{template_name}", response_model=PromptSaveResponse)
async def update_prompt(
    template_name: PromptTemplate, request_body: PromptSaveRequest, request: Request
) -> PromptSaveResponse:
    """Save a custom prompt template."""
    # Validate template name
    template = PromptTemplate(template_name)
    prompt_mgr = request.state.prompt_manager

    # Validate template syntax by attempting to render it
    try:
        # Try rendering with empty context to validate syntax
        jinja_template = Template(request_body.content, autoescape=False)
        jinja_template.render({})
    except Exception as e:
        logger.error("Invalid Jinja template syntax for '%s': %s", template_name, e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid template syntax: {e}") from e

    try:
        prompt_mgr.save_user_template(template, request_body.content)
        logger.info("Saved user template: %s", template_name)
        return PromptSaveResponse(message=f"Template '{template_name}' saved successfully", is_customized=True)
    except Exception as e:
        logger.error("Failed to save template '%s': %s", template_name, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to save template: {e}"
        ) from e


@router.delete("/{template_name}", response_model=PromptResetResponse)
async def reset_prompt(template_name: PromptTemplate, request: Request) -> PromptResetResponse:
    """Delete a custom prompt template, reverting to the default."""
    template = PromptTemplate(template_name)

    prompt_mgr = request.state.prompt_manager

    deleted = prompt_mgr.delete_user_template(template)

    if deleted:
        logger.info("Reset template to default: %s", template_name)
        return PromptResetResponse(message=f"Template '{template_name}' reset to default", is_customized=False)
    else:
        return PromptResetResponse(message=f"Template '{template_name}' was not customized", is_customized=False)
