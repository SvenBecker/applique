"""Tests for document_service.py with newcommand approach"""

from applique_backend.services.document_service import DocumentService


class TestLatexEscaping:
    """Test LaTeX special character escaping."""

    def test_escape_ampersand(self):
        """Test that ampersands are properly escaped."""
        result = DocumentService._escape_latex("Ströer SE & Co. KGaA")
        assert result == r"Ströer SE \& Co. KGaA"

    def test_escape_multiple_special_chars(self):
        """Test multiple special characters are escaped."""
        result = DocumentService._escape_latex("$100 & 50% off")
        assert result == r"\$100 \& 50\% off"


class TestNewCommandVariableReplacement:
    """Test template variable replacement using \\newcommand pattern."""

    def test_replace_single_variable(self):
        """Test replacing a single variable with newcommand."""
        template = r"\newcommand{\companyname}{Default Company}"
        variables = {"company_name": "Acme Corp"}
        result = DocumentService.replace_template_variables(template, variables)
        assert r"\newcommand{\companyname}{Acme Corp}" in result

    def test_snake_case_to_camelcase(self):
        """Test that snake_case variable names are converted to camelCase (lowercase)."""
        template = r"\newcommand{\jobtitle}{Default Title}"
        variables = {"job_title": "Senior Engineer"}
        result = DocumentService.replace_template_variables(template, variables)
        assert r"\newcommand{\jobtitle}{Senior Engineer}" in result
