import logging
from enum import StrEnum
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader

logger = logging.getLogger(__name__)


class PromptTemplate(StrEnum):
    """Enumeration of prompt templates."""

    JOB_INFORMATION_EXTRACTION = "job_information_extraction.txt.jinja"
    CHAT_INSTRUCTIONS = "chat_instructions.txt.jinja"


class PromptManager:
    """Manages prompt templates with two-tier lookup (user templates > defaults)."""

    def __init__(self, user_prompts_dir: Path | None = None, enable_hot_reload: bool = False) -> None:
        """Initializes the PromptManager.

        Args:
            user_prompts_dir: Directory for user-customizable templates (checked first)
            enable_hot_reload: If True, templates are reloaded on every render
        """
        # Default templates (shipped with app)
        self.default_templates_dir = Path(__file__).parent / "templates"

        # User-customizable templates (overrides defaults)
        self.user_templates_dir = user_prompts_dir
        if self.user_templates_dir:
            self.user_templates_dir.mkdir(parents=True, exist_ok=True)

        self.enable_hot_reload = enable_hot_reload

        # Create Jinja environment with multi-directory loader
        # Priority: user templates > default templates
        search_paths = []
        if self.user_templates_dir:
            search_paths.append(self.user_templates_dir)
        search_paths.append(self.default_templates_dir)

        self.env = Environment(
            loader=FileSystemLoader(search_paths),
            autoescape=False,  # noqa: S701
            auto_reload=enable_hot_reload,
        )

        # Validate that all default templates exist
        self._validate_default_templates()

    def _validate_default_templates(self) -> None:
        """Validate that all default templates exist."""
        missing_templates = []
        for template_name in PromptTemplate:
            template_path = self.default_templates_dir / template_name.value
            if not template_path.exists():
                missing_templates.append(template_name.value)

        if missing_templates:
            raise FileNotFoundError(
                f"Missing default templates in '{self.default_templates_dir}': {', '.join(missing_templates)}"
            )

    def render_prompt(
        self, prompt_template: PromptTemplate, context: dict[str, Any] | None = None, force_default: bool = False
    ) -> str:
        """Renders a prompt template with the given context.

        Args:
            prompt_template: Prompt template to render
            context: Context variables for rendering the template
            force_default: If True, use default template even if user override exists

        Returns:
            str: Rendered prompt string
        """
        template_name = prompt_template.value

        # Determine which template to use
        if force_default:
            # Force default template
            template_source = "default"
            template = self.env.get_template(f"__default__/{template_name}")
        else:
            # Check if user template exists
            user_template_exists = (
                self.user_templates_dir is not None and (self.user_templates_dir / template_name).exists()
            )

            if user_template_exists:
                template_source = "user"
                logger.debug("Using user-customized template: %s", template_name)
            else:
                template_source = "default"
                logger.debug("Using default template: %s", template_name)

            template = self.env.get_template(template_name)

        # Render template
        try:
            rendered = template.render(context or {}).strip()
            logger.debug("Successfully rendered template '%s' from %s source", template_name, template_source)
            return rendered
        except Exception as e:
            logger.error("Failed to render template '%s' from %s: %s", template_name, template_source, e)
            raise

    def get_template_path(self, prompt_template: PromptTemplate) -> tuple[Path, bool]:
        """Get the active path for a template and whether it's user-customized.

        Args:
            prompt_template: Prompt template

        Returns:
            Tuple of (template_path, is_user_customized)
        """
        template_name = prompt_template.value

        # Check user template first
        if self.user_templates_dir:
            user_path = self.user_templates_dir / template_name
            if user_path.exists():
                return user_path, True

        # Fall back to default
        default_path = self.default_templates_dir / template_name
        return default_path, False

    def is_customized(self, prompt_template: PromptTemplate) -> bool:
        """Check if a template has been customized by the user.

        Args:
            prompt_template: Prompt template

        Returns:
            bool: True if user has customized this template
        """
        _, is_user = self.get_template_path(prompt_template)
        return is_user

    def get_default_template_content(self, prompt_template: PromptTemplate) -> str:
        """Get the default template content.

        Args:
            prompt_template: Prompt template

        Returns:
            str: Default template content
        """
        default_path = self.default_templates_dir / prompt_template.value
        return default_path.read_text(encoding="utf-8")

    def get_user_template_content(self, prompt_template: PromptTemplate) -> str | None:
        """Get the user template content if it exists.

        Args:
            prompt_template: Prompt template

        Returns:
            str | None: User template content or None if not customized
        """
        if not self.user_templates_dir:
            return None

        user_path = self.user_templates_dir / prompt_template.value
        if user_path.exists():
            return user_path.read_text(encoding="utf-8")

        return None

    def save_user_template(self, prompt_template: PromptTemplate, content: str) -> Path:
        """Save a user-customized template.

        Args:
            prompt_template: Prompt template
            content: Template content

        Returns:
            Path: Path to saved template

        Raises:
            ValueError: If user_prompts_dir is not configured
        """
        if not self.user_templates_dir:
            raise ValueError("User prompts directory is not configured")

        self.user_templates_dir.mkdir(parents=True, exist_ok=True)
        user_path = self.user_templates_dir / prompt_template.value
        user_path.write_text(content, encoding="utf-8")
        logger.info("Saved user template: %s", user_path)

        return user_path

    def delete_user_template(self, prompt_template: PromptTemplate) -> bool:
        """Delete a user-customized template, reverting to default.

        Args:
            prompt_template: Prompt template

        Returns:
            bool: True if template was deleted, False if it didn't exist
        """
        if not self.user_templates_dir:
            return False

        user_path = self.user_templates_dir / prompt_template.value
        if user_path.exists():
            user_path.unlink()
            logger.info("Deleted user template: %s (reverted to default)", user_path)
            return True

        return False
