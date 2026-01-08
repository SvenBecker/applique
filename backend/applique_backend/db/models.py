import datetime as dt
from enum import StrEnum

from sqlalchemy import JSON, Boolean, DateTime, Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from applique_backend.db.core import Base


class LLMConfiguration(Base):
    __tablename__ = "llm_configurations"

    id: Mapped[int] = mapped_column(primary_key=True)
    provider: Mapped[str] = mapped_column(String, index=True)
    model_name: Mapped[str] = mapped_column(String)
    api_key: Mapped[str | None] = mapped_column(String, nullable=True)
    base_url: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.now(dt.UTC))
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime, default=dt.datetime.now(dt.UTC), onupdate=dt.datetime.now(dt.UTC)
    )


class ExtractionStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class JobPosting(Base):
    __tablename__ = "job_postings"

    id: Mapped[int] = mapped_column(primary_key=True)
    url: Mapped[str] = mapped_column(String, index=True)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    full_content: Mapped[str | None] = mapped_column(String, nullable=True)

    # Metadata fields
    generated_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    extraction_status: Mapped[ExtractionStatus] = mapped_column(
        Enum(ExtractionStatus), default=ExtractionStatus.PENDING
    )
    error_message: Mapped[str | None] = mapped_column(String, nullable=True)
    status_updated: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.now(dt.UTC))


class GenerationHistory(Base):
    __tablename__ = "generation_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    posting_id: Mapped[int | None] = mapped_column(nullable=True, index=True)
    company_name: Mapped[str | None] = mapped_column(String, nullable=True)
    job_title: Mapped[str | None] = mapped_column(String, nullable=True)
    filename: Mapped[str] = mapped_column(String)
    cv_file: Mapped[str | None] = mapped_column(String, nullable=True)
    cover_letter_file: Mapped[str | None] = mapped_column(String, nullable=True)
    attachments: Mapped[list | None] = mapped_column(JSON, nullable=True)
    combined: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.now(dt.UTC))


class UserProfile(Base):
    """User profile with personal information for template variable replacement."""

    __tablename__ = "user_profile"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Personal Information
    first_name: Mapped[str | None] = mapped_column(String, nullable=True)
    last_name: Mapped[str | None] = mapped_column(String, nullable=True)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    # Address
    address_line: Mapped[str | None] = mapped_column(String, nullable=True)
    city: Mapped[str | None] = mapped_column(String, nullable=True)
    postal_code: Mapped[str | None] = mapped_column(String, nullable=True)
    country: Mapped[str | None] = mapped_column(String, nullable=True)
    # Professional Links
    github_username: Mapped[str | None] = mapped_column(String, nullable=True)
    linkedin_username: Mapped[str | None] = mapped_column(String, nullable=True)
    website_url: Mapped[str | None] = mapped_column(String, nullable=True)
    # Additional custom variables (JSON field for flexibility)
    custom_variables: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # Timestamps
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.now(dt.UTC))
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime, default=dt.datetime.now(dt.UTC), onupdate=dt.datetime.now(dt.UTC)
    )

    @property
    def full_name(self) -> str | None:
        """Generate full name from first and last name."""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        if self.first_name:
            return self.first_name
        if self.last_name:
            return self.last_name
        return None
