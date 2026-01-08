"""Service for document generation and PDF operations."""

import asyncio
import logging
import re
import tempfile
from pathlib import Path

from pypdf import PdfWriter

BACKSLASH_PLACEHOLDER = "<<<BACKSLASH>>>"
logger = logging.getLogger(__name__)


def snake_to_pascal(name: str) -> str:
    return "".join(part.capitalize() for part in name.split("_") if part)


class LaTeXCompilationError(Exception):
    """Raised when LaTeX compilation fails with detailed error information."""

    def __init__(self, message: str, stdout: str, stderr: str, log_content: str | None = None):
        super().__init__(message)
        self.stdout = stdout
        self.stderr = stderr
        self.log_content = log_content


class DocumentService:
    """Service for handling document generation and PDF operations."""

    @staticmethod
    def replace_template_variables(content: str, variables: dict[str, str]) -> str:
        """
        Replace template variables in LaTeX content using \\newcommand pattern.

        Looks for \\newcommand{\\VariableName}{default_value} and replaces
        the default value with the provided value (LaTeX-escaped).

        Variable names are converted from snake_case to PascalCase for LaTeX compatibility
        (e.g., company_name -> CompanyName, job_title -> JobTitle).

        Args:
            content: LaTeX template content
            variables: Dictionary of variable names to values (snake_case keys)

        Returns:
            Content with variables replaced
        """
        for key, value in variables.items():
            if not value:
                continue

            # Escape LaTeX special characters in the value
            escaped_value = DocumentService._escape_latex(str(value))

            # Convert snake_case to PascalCase (LaTeX command names cannot contain underscores)
            latex_var_name = key.replace("_", "")

            # Pattern to match: \newcommand{\VariableName}{anything}
            pattern = r"(\\newcommand\{\\" + re.escape(latex_var_name) + r"\})\{[^}]*\}"

            # Replace with: \newcommand{\VariableName}{escaped_value}
            content = re.sub(
                pattern,
                rf"\1{{{escaped_value}}}",
                content,
            )

        return content

    @staticmethod
    def _escape_latex(text: str) -> str:
        """
        Escape special LaTeX characters in text.

        Args:
            text: Raw text to escape

        Returns:
            Text with LaTeX special characters escaped
        """
        # Use a temporary placeholder for backslashes to avoid double-escaping
        # This placeholder is extremely unlikely to appear in real text

        result = text
        # Replace backslashes with placeholder first
        result = result.replace("\\", BACKSLASH_PLACEHOLDER)

        # Now escape other special characters
        replacements = {
            "&": r"\&",
            "%": r"\%",
            "$": r"\$",
            "#": r"\#",
            "_": r"\_",
            "{": r"\{",
            "}": r"\}",
            "~": r"\textasciitilde{}",
            "^": r"\textasciicircum{}",
        }

        for char, escaped in replacements.items():
            result = result.replace(char, escaped)

        # Finally, replace the placeholder with the escaped backslash
        result = result.replace(BACKSLASH_PLACEHOLDER, r"\textbackslash{}")

        return result

    @staticmethod
    def extract_template_variables(content: str) -> list[str]:
        """
        Extract all template variables from content.

        Finds variables in {{var}} format.

        Args:
            content: Template content

        Returns:
            List of unique variable names found
        """
        pattern = r"\{\{(\w+)\}\}"
        matches = re.findall(pattern, content)
        return list(set(matches))

    @staticmethod
    async def generate_pdf_from_latex(
        tex_file: Path, output_dir: Path, variables: dict[str, str] | None = None
    ) -> Path:
        """
        Generate PDF from LaTeX file with optional variable replacement.

        Args:
            tex_file: Path to the .tex file
            output_dir: Directory where PDF should be generated
            variables: Optional dictionary of variables to replace in template.
                      If None or empty dict, unreplaced variables will use placeholder text.

        Returns:
            Path to the generated PDF file

        Raises:
            FileNotFoundError: If tex_file doesn't exist
            LaTeXCompilationError: If pdflatex compilation fails
            RuntimeError: If PDF file was not generated despite success
        """
        if not tex_file.exists():
            raise FileNotFoundError(f"LaTeX file not found: {tex_file}")

        content = tex_file.read_text(encoding="utf-8")

        # Always perform variable replacement if template has variables
        # This handles both populated variables and placeholder replacement
        if variables:
            replaced_content = DocumentService.replace_template_variables(content, variables)

            # Create temporary file with replaced content
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".tex", delete=False, dir=output_dir, encoding="utf-8"
            ) as tmp_file:
                tmp_file.write(replaced_content)
                tmp_tex_path = Path(tmp_file.name)

            try:
                result_pdf = await DocumentService._compile_latex(tmp_tex_path, output_dir)
                # Rename to original filename
                final_pdf = output_dir / tex_file.with_suffix(".pdf").name
                if result_pdf != final_pdf:
                    result_pdf.rename(final_pdf)
                return final_pdf
            finally:
                # Clean up temporary file
                tmp_tex_path.unlink(missing_ok=True)
        else:
            return await DocumentService._compile_latex(tex_file, output_dir)

    @staticmethod
    async def _compile_latex(tex_file: Path, output_dir: Path) -> Path:
        """
        Generate PDF from LaTeX file with detailed error reporting.

        Args:
            tex_file: Path to the .tex file
            output_dir: Directory where PDF should be generated

        Returns:
            Path to the generated PDF file

        Raises:
            FileNotFoundError: If tex_file doesn't exist
            LaTeXCompilationError: If pdflatex compilation fails
            RuntimeError: If PDF file was not generated despite success
        """
        if not tex_file.exists():
            raise FileNotFoundError(f"LaTeX file not found: {tex_file}")

        logger.info("Compiling LaTeX file: %s", tex_file)

        result = await asyncio.create_subprocess_exec(
            "pdflatex",
            "-interaction=nonstopmode",
            f"-output-directory={output_dir}",
            str(tex_file),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await result.communicate()
        stdout_str = stdout.decode("utf-8", errors="replace")
        stderr_str = stderr.decode("utf-8", errors="replace")

        # Expected output PDF file
        pdf_file = output_dir / tex_file.with_suffix(".pdf").name
        log_file = output_dir / tex_file.with_suffix(".log").name

        if result.returncode != 0:
            # Parse the log file for detailed error information
            log_content = None
            if log_file.exists():
                try:
                    log_content = log_file.read_text(encoding="utf-8", errors="replace")
                    parsed_errors = DocumentService._parse_latex_log(log_content)
                    error_summary = "\n".join(parsed_errors) if parsed_errors else "Unknown LaTeX error"
                except Exception as e:
                    logger.warning("Failed to parse LaTeX log file: %s", e)
                    error_summary = "LaTeX compilation failed (log file unreadable)"
            else:
                error_summary = "LaTeX compilation failed (no log file generated)"

            logger.error("pdflatex compilation failed:\n%s", error_summary)
            logger.debug("pdflatex stdout:\n%s", stdout_str)
            logger.debug("pdflatex stderr:\n%s", stderr_str)

            raise LaTeXCompilationError(
                message=f"LaTeX compilation failed:\n{error_summary}",
                stdout=stdout_str,
                stderr=stderr_str,
                log_content=log_content,
            )

        # Log successful compilation details
        logger.info("pdflatex compilation successful for %s", tex_file.name)
        logger.debug("pdflatex stdout:\n%s", stdout_str)

        if not pdf_file.exists():
            raise RuntimeError(f"PDF file was not generated despite successful compilation: {pdf_file}")

        return pdf_file

    @staticmethod
    def _parse_latex_log(log_content: str) -> list[str]:
        """
        Parse LaTeX log file to extract meaningful error messages.

        Args:
            log_content: Content of the .log file

        Returns:
            List of error messages found in the log
        """
        errors = []

        # Pattern for classic LaTeX errors: ! Error message
        error_pattern = re.compile(r"^! (.+)$", re.MULTILINE)
        errors.extend(f"Error: {match.group(1).strip()}" for match in error_pattern.finditer(log_content))

        # Pattern for missing packages: ! LaTeX Error: File `package.sty' not found
        missing_file_pattern = re.compile(r"! LaTeX Error: File `([^']+)' not found", re.MULTILINE)
        errors.extend(f"Missing file: {match.group(1)}" for match in missing_file_pattern.finditer(log_content))

        # Pattern for undefined control sequences
        undefined_pattern = re.compile(r"! Undefined control sequence\.\s*l\.(\d+)\s+(.+)?", re.MULTILINE)
        for match in undefined_pattern.finditer(log_content):
            line_num = match.group(1)
            context = match.group(2).strip() if match.group(2) else "unknown command"
            errors.append(f"Undefined control sequence at line {line_num}: {context}")

        # Pattern for package errors
        package_error_pattern = re.compile(r"! Package (\w+) Error: (.+)", re.MULTILINE)
        for match in package_error_pattern.finditer(log_content):
            package = match.group(1)
            message = match.group(2).strip()
            errors.append(f"Package {package} error: {message}")

        # Pattern for emergency stops
        if "! Emergency stop." in log_content:
            errors.append("Emergency stop: Fatal error occurred during compilation")

        # If no specific errors found, look for warnings that might be critical
        if not errors:
            warning_pattern = re.compile(r"^(?:LaTeX Warning|Package \w+ Warning): (.+)$", re.MULTILINE)
            warnings = [match.group(1).strip() for match in warning_pattern.finditer(log_content)]
            if warnings:
                errors.append(f"Warnings detected: {'; '.join(warnings[:3])}")

        return errors[:10]  # Limit to first 10 errors to avoid overwhelming output

    @staticmethod
    def merge_pdfs(pdf_files: list[Path], output_file: Path) -> None:
        """
        Merge multiple PDF files into a single PDF.

        Args:
            pdf_files: List of PDF file paths to merge
            output_file: Path where the merged PDF should be saved

        Raises:
            FileNotFoundError: If any of the input PDF files don't exist
            Exception: If PDF merging fails
        """
        logger.info("Merging %d PDF files into %s", len(pdf_files), output_file)

        writer = PdfWriter()

        try:
            for pdf_file in pdf_files:
                if not pdf_file.exists():
                    raise FileNotFoundError(f"PDF file not found: {pdf_file}")
                logger.debug("Adding PDF to merge: %s", pdf_file)
                writer.append(str(pdf_file))

            writer.write(str(output_file))
            logger.info("Successfully merged PDFs into %s", output_file)
        except Exception as e:
            logger.error("Failed to merge PDFs: %s", e)
            raise
        finally:
            writer.close()

    @staticmethod
    def get_compilation_artifacts(tex_file: Path, output_dir: Path) -> dict[str, str | None]:
        """
        Retrieve LaTeX compilation artifacts for debugging.

        Args:
            tex_file: Original .tex file
            output_dir: Directory where compilation artifacts are stored

        Returns:
            Dictionary containing log and aux file contents if they exist
        """
        base_name = tex_file.stem
        artifacts: dict[str, str | None] = {
            "log": None,
            "aux": None,
        }

        log_file = output_dir / f"{base_name}.log"
        if log_file.exists():
            try:
                artifacts["log"] = log_file.read_text(encoding="utf-8", errors="replace")
            except Exception as e:
                logger.warning("Failed to read log file %s: %s", log_file, e)

        aux_file = output_dir / f"{base_name}.aux"
        if aux_file.exists():
            try:
                artifacts["aux"] = aux_file.read_text(encoding="utf-8", errors="replace")
            except Exception as e:
                logger.warning("Failed to read aux file %s: %s", aux_file, e)

        return artifacts
