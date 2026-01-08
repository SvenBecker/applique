import logging

import httpx
import trafilatura
from playwright.async_api import async_playwright
from pydantic import BaseModel, Field
from pydantic_ai import Agent, ModelSettings

from applique_backend.db.models import LLMConfiguration
from applique_backend.services.llm import get_model
from applique_backend.services.prompts.manager import PromptManager, PromptTemplate

logger = logging.getLogger(__name__)


class JobMetadata(BaseModel):
    company_name: str = Field(description="Name of the company hiring")
    job_title: str = Field(description="Title of the job position")
    recipient_name: str = Field(
        default="Hiring Manager",
        description="Name of the person receiving the application. Use 'Hiring Manager' if not found.",
    )
    city: str = Field(default="Unknown", description="City where the job is located")
    zip_code: str = Field(default="00000", description="Postal/Zip code of the job location")
    street_address: str = Field(
        default="Unknown", description="Street address including number. Use 'Unknown' if not found."
    )
    job_url: str = Field(description="URL of the job posting")
    is_remote: bool | None = Field(default=None, description="Whether the job is remote")
    salary_range: str | None = Field(default=None, description="Salary range if available")
    job_description_summary: str | None = Field(default=None, description="Brief summary of the job description")
    full_content: str | None = Field(default=None, description="The full clean content fetched from the job posting")


async def _fetch_with_httpx(url: str) -> str:
    """Fetch content using httpx (fast, for static sites)."""
    logger.info("Attempting to fetch %s with httpx...", url)
    async with httpx.AsyncClient(
        timeout=15.0,
        follow_redirects=True,
        headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
    ) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.text


async def _fetch_with_playwright(url: str) -> str:
    """Fetch content using Playwright (for JavaScript-heavy sites)."""
    logger.info("Attempting to fetch %s with Playwright...", url)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            viewport={"width": 1920, "height": 1080},
        )
        try:
            page = await context.new_page()

            # Set reasonable timeout and wait for network to be idle
            await page.goto(url, wait_until="networkidle", timeout=30000)

            # Give any lazy-loaded content a moment to appear
            await page.wait_for_timeout(1000)

            # Get the fully rendered HTML
            content = await page.content()
            logger.info("Successfully fetched %s with Playwright (%d chars)", url, len(content))
            return content
        finally:
            await context.close()
            await browser.close()


def _extract_clean_content(html: str, url: str) -> str | None:
    """Extract clean, LLM-friendly content from HTML using Trafilatura."""
    try:
        clean_text = trafilatura.extract(
            html,
            include_comments=False,
            include_tables=True,  # Keep job requirement tables
            no_fallback=False,  # Use fallback extraction if needed
            favor_precision=False,  # Prefer recall over precision (get more content)
            output_format="markdown",  # LLM-friendly format
            url=url,  # Helps with link resolution
        )

        if clean_text and len(clean_text) > 100:  # noqa: PLR2004
            # Ensure we got meaningful content
            logger.info("Extracted %d chars of clean content with Trafilatura", len(clean_text))
            return clean_text
        else:
            logger.warning(
                "Trafilatura extracted insufficient content (%s chars)", len(clean_text) if clean_text else 0
            )
            return None
    except Exception as e:
        logger.warning("Trafilatura extraction failed: %s", e)
        return None


async def extract_metadata(url: str, llm_config: LLMConfiguration, prompt_manager: PromptManager) -> JobMetadata:
    """Extract job metadata from a given URL using the configured LLM."""

    # Strategy: Try httpx first (fast), then Playwright (JS-heavy sites)
    # For each method, extract clean content with Trafilatura

    clean_content: str | None = None

    # Attempt 1: httpx + Trafilatura (works for ~90% of job sites)
    try:
        html = await _fetch_with_httpx(url)
        clean_content = _extract_clean_content(html, url)

        if clean_content:
            logger.info("Successfully extracted content via httpx + Trafilatura")
        else:
            logger.warning("httpx succeeded but Trafilatura extraction insufficient, trying Playwright...")
    except Exception as e:
        logger.warning("Failed to fetch %s with httpx: %s. Falling back to Playwright.", url, e)

    # Attempt 2: Playwright + Trafilatura (for JavaScript-heavy sites like LinkedIn, Indeed)
    if not clean_content:
        try:
            html = await _fetch_with_playwright(url)
            clean_content = _extract_clean_content(html, url)

            if clean_content:
                logger.info("Successfully extracted content via Playwright + Trafilatura")
            else:
                # Last resort: use raw HTML (not ideal, but better than failing)
                logger.warning("Trafilatura failed after Playwright, using raw HTML as fallback")
                clean_content = html[:100_000]  # Truncate to avoid token limits
        except Exception as pw_e:
            logger.error("Failed to fetch %s with Playwright: %s", url, pw_e)
            raise ValueError(f"Could not retrieve content from {url}: {pw_e}") from pw_e

    if not clean_content:
        raise ValueError(f"Could not extract any content from {url}")

    # Log content stats for debugging
    logger.info(
        "Final content length: %d chars (%.1fK tokens estimated)",
        len(clean_content),
        len(clean_content) / 4,
    )

    # Configure LLM Agent
    model = get_model(
        provider=llm_config.provider,
        model_name=llm_config.model_name,
        base_url=llm_config.base_url,
        api_key=llm_config.api_key,
        model_settings=ModelSettings(temperature=0.0),
    )

    agent = Agent(
        model,
        system_prompt=prompt_manager.render_prompt(prompt_template=PromptTemplate.JOB_INFORMATION_EXTRACTION),
    )

    # Send clean content to LLM for extraction
    result = await agent.run(
        f"Extract metadata from this job posting:\n\nURL: {url}\n\n{clean_content}",
        output_type=JobMetadata,
    )

    metadata = result.output
    metadata.full_content = clean_content

    return metadata
