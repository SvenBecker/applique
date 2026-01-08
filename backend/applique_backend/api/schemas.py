"""Response schemas for API endpoints."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from applique_backend.db.models import ExtractionStatus


class PostingResponse(BaseModel):
    """Response schema for job posting."""

    id: int
    url: str
    description: str | None = None
    extraction_status: ExtractionStatus
    generated_metadata: dict[str, Any] | None = None
    full_content: str | None = None
    error_message: str | None = None
    status_updated: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PostingCreateRequest(BaseModel):
    """Request schema for creating a job posting entry."""

    url: str = Field(..., min_length=1)
    description: str | None = None
    trigger_extraction: bool = True


class PostingUpdateRequest(BaseModel):
    """Request schema for updating job posting metadata."""

    company_name: str
    job_title: str
    recipient_name: str
    city: str
    zip_code: str
    street_address: str
    is_remote: bool | None = None
    salary_range: str | None = None
    job_description_summary: str | None = None
    full_content: str | None = None


class LLMConfigResponse(BaseModel):
    """Response schema for LLM configuration."""

    id: int
    provider: str
    model_name: str
    api_key: str | None = None
    base_url: str | None = None
    is_active: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LLMConfigCreateRequest(BaseModel):
    """Request schema for creating LLM config."""

    provider: str = Field(..., min_length=1)
    model_name: str = Field(..., min_length=1)
    api_key: str | None = None
    base_url: str | None = None
    is_active: bool = False


class LLMTestConnectionRequest(BaseModel):
    """Request schema for testing LLM connection."""

    provider: str
    model_name: str
    api_key: str | None = None
    base_url: str | None = None


class LLMTestConnectionResponse(BaseModel):
    """Response schema for LLM connection test."""

    status: str
    message: str


class LLMFetchModelsRequest(BaseModel):
    """Request schema for fetching available models."""

    base_url: str
    api_key: str | None = None


class LLMFetchModelsResponse(BaseModel):
    """Response schema for fetching models."""

    models: list[str]


class DocumentTemplateResponse(BaseModel):
    """Response schema for document templates."""

    cvs: list[str]
    cover_letters: list[str]
    attachments: list[str]
    personal_information: list[str]


class DocumentGenerateRequest(BaseModel):
    """Request schema for document generation."""

    cv_file: str | None = None
    cover_letter_file: str | None = None
    attachments: list[str] | None = None
    combine: bool = False
    posting_id: int | None = None  # Optional job posting for variable replacement
    custom_variables: dict[str, str] | None = None  # Additional custom variables


class DocumentGenerateResponse(BaseModel):
    """Response schema for document generation."""

    filename: str
    message: str
    generation_id: int | None = None  # ID of the generation history record


class DocumentSaveRequest(BaseModel):
    """Request schema for saving LaTeX file."""

    file_type: str = Field(..., pattern="^(cv|cover_letter|personal_information)$")
    filename: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)
    new_filename: str | None = None


class DocumentSaveResponse(BaseModel):
    """Response schema for saving LaTeX file."""

    filename: str
    message: str


class StatusResponse(BaseModel):
    """Response schema for dashboard status."""

    active_llm: LLMConfigResponse | None = None
    total_postings: int = 0
    pending_postings: int = 0
    completed_postings: int = 0
    failed_postings: int = 0


# Prompt Management Schemas


class PromptInfo(BaseModel):
    """Information about a prompt template."""

    name: str
    display_name: str
    description: str
    is_customized: bool
    variables: list[str]


class PromptDetail(BaseModel):
    """Detailed information about a prompt template."""

    name: str
    display_name: str
    description: str
    is_customized: bool
    variables: list[str]
    content: str
    default_content: str


class PromptPreviewRequest(BaseModel):
    """Request schema for previewing a prompt with sample context."""

    context: dict[str, Any] = Field(default_factory=dict)


class PromptPreviewResponse(BaseModel):
    """Response schema for prompt preview."""

    rendered: str


class PromptSaveRequest(BaseModel):
    """Request schema for saving a prompt template."""

    content: str = Field(..., min_length=1)


class PromptSaveResponse(BaseModel):
    """Response schema for saving a prompt template."""

    message: str
    is_customized: bool


class GenerationHistoryResponse(BaseModel):
    """Response schema for document generation history."""

    id: int
    posting_id: int | None = None
    company_name: str | None = None
    job_title: str | None = None
    filename: str
    cv_file: str | None = None
    cover_letter_file: str | None = None
    attachments: list[str] | None = None
    combined: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentPreviewResponse(BaseModel):
    """Response schema for PDF preview."""

    preview_url: str
    filename: str


class PromptResetResponse(BaseModel):
    """Response schema for resetting a prompt template."""

    message: str
    is_customized: bool


class UserProfileResponse(BaseModel):
    """Response schema for user profile."""

    id: int
    first_name: str | None = None
    last_name: str | None = None
    full_name: str | None = None  # Computed property
    email: str | None = None
    phone: str | None = None
    address_line: str | None = None
    city: str | None = None
    postal_code: str | None = None
    country: str | None = None
    github_username: str | None = None
    linkedin_username: str | None = None
    website_url: str | None = None
    custom_variables: dict[str, str] | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserProfileUpdateRequest(BaseModel):
    """Request schema for updating user profile."""

    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    phone: str | None = None
    address_line: str | None = None
    city: str | None = None
    postal_code: str | None = None
    country: str | None = None
    github_username: str | None = None
    linkedin_username: str | None = None
    website_url: str | None = None
    custom_variables: dict[str, str] | None = None
