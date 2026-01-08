"""API routes for document generation."""

import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from applique_backend.api.deps import get_db
from applique_backend.api.schemas import (
    DocumentGenerateRequest,
    DocumentGenerateResponse,
    DocumentSaveRequest,
    DocumentSaveResponse,
    DocumentTemplateResponse,
    GenerationHistoryResponse,
)
from applique_backend.core.settings import Settings
from applique_backend.db.models import GenerationHistory, JobPosting
from applique_backend.services.document_service import DocumentService, LaTeXCompilationError

router = APIRouter(prefix="/documents", tags=["documents"])
logger = logging.getLogger(__name__)


def _get_paths(settings: Settings) -> dict[str, Path]:
    """Get directory paths from settings."""
    data_dir = settings.DATA_DIR
    output_dir = settings.OUTPUT_DIR
    return {
        "cvs_dir": data_dir / "cvs",
        "cover_letters_dir": data_dir / "cover_letters",
        "attachments_dir": data_dir / "attachments",
        "output_dir": output_dir,
    }


@router.get("/templates", response_model=DocumentTemplateResponse)
async def get_templates(request: Request) -> DocumentTemplateResponse:
    """Get available document templates."""
    settings: Settings = request.state.settings
    paths = _get_paths(settings)

    cvs_dir = paths["cvs_dir"]
    cover_letters_dir = paths["cover_letters_dir"]
    attachments_dir = paths["attachments_dir"]
    personal_info_dir = settings.DATA_DIR / "personal_information"

    cv_files = sorted([f.name for f in cvs_dir.glob("*.tex")])
    cover_letter_files = sorted([f.name for f in cover_letters_dir.glob("*.tex")])

    attachments_dir.mkdir(parents=True, exist_ok=True)
    attachment_files = sorted([f.name for f in attachments_dir.glob("*.pdf")])

    personal_info_dir.mkdir(parents=True, exist_ok=True)
    personal_info_files = sorted([f.name for f in personal_info_dir.glob("*.txt")])

    return DocumentTemplateResponse(
        cvs=cv_files,
        cover_letters=cover_letter_files,
        attachments=attachment_files,
        personal_information=personal_info_files,
    )


@router.post("/generate", response_model=DocumentGenerateResponse)
async def generate_documents(  # noqa: PLR0915
    request: Request,
    data: DocumentGenerateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DocumentGenerateResponse:
    """Generate PDF documents from templates with optional variable replacement."""
    settings: Settings = request.state.settings
    paths = _get_paths(settings)

    cvs_dir = paths["cvs_dir"]
    cover_letters_dir = paths["cover_letters_dir"]
    attachments_dir = paths["attachments_dir"]
    output_dir = paths["output_dir"]

    attachments = data.attachments or []
    if not data.cv_file and not data.cover_letter_file and not attachments:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one document must be selected")

    output_dir.mkdir(exist_ok=True, parents=True)
    generated_files = []

    # Prepare variables for replacement
    variables: dict[str, str] = {}
    posting = None

    if data.posting_id:
        # Fetch job posting data
        stmt = select(JobPosting).where(JobPosting.id == data.posting_id)
        result = await db.execute(stmt)
        posting = result.scalars().first()

        if posting and posting.generated_metadata:
            # Extract variables from metadata
            metadata = posting.generated_metadata
            variables = {
                "company_name": metadata.get("company_name", ""),
                "job_title": metadata.get("job_title", ""),
                "recipient_name": metadata.get("recipient_name", ""),
                "city": metadata.get("city", ""),
                "zip_code": metadata.get("zip_code", ""),
                "street_address": metadata.get("street_address", ""),
                "salary_range": metadata.get("salary_range", ""),
                "job_description_summary": metadata.get("job_description_summary", ""),
            }

    # Add custom variables (override posting variables if provided)
    if data.custom_variables:
        variables.update(data.custom_variables)

    try:
        if data.cover_letter_file:
            cl_pdf = await DocumentService.generate_pdf_from_latex(
                cover_letters_dir / data.cover_letter_file, output_dir, variables
            )
            generated_files.append(cl_pdf)
            logger.info("Generated cover letter: %s", cl_pdf)

        if data.cv_file:
            cv_pdf = await DocumentService.generate_pdf_from_latex(cvs_dir / data.cv_file, output_dir, variables)
            generated_files.append(cv_pdf)
            logger.info("Generated CV: %s", cv_pdf)

        for attachment in attachments:
            if attachment:
                attachment_path = attachments_dir / attachment
                if attachment_path.exists():
                    generated_files.append(attachment_path)
                    logger.info("Added attachment: %s", attachment)

        # Determine final filename and combine if needed
        if data.combine and len(generated_files) > 1:
            # Generate unique filename based on company name and timestamp
            timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
            if posting and posting.generated_metadata:
                company = posting.generated_metadata.get("company_name", "application")
                # Sanitize company name for filename
                company_safe = "".join(c for c in company if c.isalnum() or c in (" ", "-", "_")).strip()
                company_safe = company_safe.replace(" ", "_")[:50]  # Limit length
                combined_pdf = output_dir / f"{company_safe}_application_{timestamp}.pdf"
            else:
                combined_pdf = output_dir / f"combined_application_{timestamp}.pdf"

            DocumentService.merge_pdfs(generated_files, combined_pdf)
            logger.info("Combined PDFs into: %s", combined_pdf)
            result_file = combined_pdf
        else:
            result_file = generated_files[0]

        # Save to generation history
        history = GenerationHistory(
            posting_id=data.posting_id,
            company_name=posting.generated_metadata.get("company_name")
            if posting and posting.generated_metadata
            else None,
            job_title=posting.generated_metadata.get("job_title") if posting and posting.generated_metadata else None,
            filename=result_file.name,
            cv_file=data.cv_file,
            cover_letter_file=data.cover_letter_file,
            attachments=attachments if attachments else None,
            combined=data.combine and len(generated_files) > 1,
            created_at=datetime.now(UTC),
        )
        db.add(history)
        await db.commit()
        await db.refresh(history)

        return DocumentGenerateResponse(
            filename=result_file.name, message="Document generated successfully!", generation_id=history.id
        )

    except LaTeXCompilationError as e:
        logger.error("LaTeX compilation failed: %s", e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)) from e
    except FileNotFoundError as e:
        logger.error("File not found: %s", e)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except Exception as e:
        logger.error("Document generation error: %s", e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)) from e


@router.get("/download/{filename}")
async def download_document(request: Request, filename: str) -> FileResponse:
    """Download a generated document."""
    settings: Settings = request.state.settings
    output_dir = settings.OUTPUT_DIR

    file_path = output_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    return FileResponse(path=file_path, filename=filename, media_type="application/pdf")


@router.get("/preview/{file_type}/{filename}", response_model=None)
async def preview_file(request: Request, file_type: str, filename: str) -> FileResponse | dict[str, str]:
    """Preview a template or attachment file."""
    settings: Settings = request.state.settings
    paths = _get_paths(settings)

    if file_type == "cv":
        file_path = paths["cvs_dir"] / filename
    elif file_type == "cover_letter":
        file_path = paths["cover_letters_dir"] / filename
    elif file_type == "attachment":
        file_path = paths["attachments_dir"] / filename
    elif file_type == "personal_information":
        personal_info_dir = settings.DATA_DIR / "personal_information"
        file_path = personal_info_dir / filename
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file type")

    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    file_extension = file_path.suffix

    if file_extension.lower() == ".pdf":
        return FileResponse(path=file_path, media_type="application/pdf", headers={"Content-Disposition": "inline"})

    try:
        content = file_path.read_text(encoding="utf-8")
        return {"filename": filename, "content": content, "file_type": file_extension}
    except UnicodeDecodeError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Binary file preview not supported.") from e


@router.get("/files/{file_type}")
async def list_files(request: Request, file_type: str) -> list[str]:
    """List files of a specific type."""
    settings: Settings = request.state.settings
    paths = _get_paths(settings)

    if file_type == "cv":
        files = sorted([f.name for f in paths["cvs_dir"].glob("*.tex")])
    elif file_type == "cover_letter":
        files = sorted([f.name for f in paths["cover_letters_dir"].glob("*.tex")])
    elif file_type == "personal_information":
        personal_info_dir = settings.DATA_DIR / "personal_information"
        personal_info_dir.mkdir(parents=True, exist_ok=True)
        files = sorted([f.name for f in personal_info_dir.glob("*.txt")])
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file type")

    return files


@router.post("/save", response_model=DocumentSaveResponse)
async def save_file(request: Request, data: DocumentSaveRequest) -> DocumentSaveResponse:
    """Save edited LaTeX file content."""
    settings: Settings = request.state.settings
    paths = _get_paths(settings)

    # Determine save directory and file extension based on file type
    if data.file_type == "cv":
        save_dir = paths["cvs_dir"]
        extension = ".tex"
    elif data.file_type == "cover_letter":
        save_dir = paths["cover_letters_dir"]
        extension = ".tex"
    elif data.file_type == "personal_information":
        save_dir = settings.DATA_DIR / "personal_information"
        save_dir.mkdir(parents=True, exist_ok=True)
        extension = ".txt"
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file type for saving")

    # Determine the target filename
    target_filename = data.new_filename.strip() if data.new_filename and data.new_filename.strip() else None

    if not target_filename:
        target_filename = Path(data.filename).stem + extension

    # User explicitly provided a filename - use it as-is (overwrite if exists)
    # Frontend handles overwrite confirmation, so we respect the user's choice
    elif not target_filename.endswith(extension):
        target_filename += extension

    file_path = save_dir / target_filename
    save_dir.mkdir(parents=True, exist_ok=True)

    # Security check: ensure file is within the save directory
    if not str(file_path.resolve()).startswith(str(save_dir.resolve())):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename")

    try:
        file_path.write_text(data.content, encoding="utf-8")
        logger.info("Saved file: %s", file_path)
        return DocumentSaveResponse(filename=target_filename, message=f"File '{target_filename}' saved successfully!")
    except Exception as e:
        logger.error("Failed to save file: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {e}",
        ) from e


@router.get("/history", response_model=list[GenerationHistoryResponse])
async def get_generation_history(
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 50,
) -> list[GenerationHistoryResponse]:
    """Get document generation history."""
    stmt = select(GenerationHistory).order_by(GenerationHistory.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    history = result.scalars().all()

    return [GenerationHistoryResponse.model_validate(h) for h in history]


@router.get("/preview/{generation_id}")
async def preview_generated_document(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    generation_id: int,
) -> FileResponse:
    """Preview a previously generated document."""
    settings: Settings = request.state.settings
    output_dir = settings.OUTPUT_DIR

    # Get generation record
    stmt = select(GenerationHistory).where(GenerationHistory.id == generation_id)
    result = await db.execute(stmt)
    generation = result.scalars().first()

    if not generation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generation record not found")

    file_path = output_dir / generation.filename
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Generated file no longer exists: {generation.filename}"
        )

    return FileResponse(path=file_path, media_type="application/pdf", headers={"Content-Disposition": "inline"})


@router.delete("/history/{generation_id}")
async def delete_generation_history(
    db: Annotated[AsyncSession, Depends(get_db)],
    generation_id: int,
) -> dict[str, str]:
    """Delete a generation history record."""
    stmt = select(GenerationHistory).where(GenerationHistory.id == generation_id)
    result = await db.execute(stmt)
    generation = result.scalars().first()

    if not generation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generation record not found")

    await db.delete(generation)
    await db.commit()

    return {"message": "Generation history deleted successfully"}


@router.delete("/history")
async def clear_generation_history(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, str]:
    """Clear all generation history records."""
    stmt = select(GenerationHistory)
    result = await db.execute(stmt)
    records = result.scalars().all()

    for record in records:
        await db.delete(record)

    await db.commit()

    return {"message": f"Deleted {len(records)} generation history records"}
