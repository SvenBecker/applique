import { useCallback, useEffect, useRef } from "react";

interface LatexHighlightedTextareaProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

/**
 * A textarea with LaTeX syntax highlighting overlay.
 * Uses a pre element for highlighting behind the textarea.
 */
export function LatexHighlightedTextarea({
  value,
  onChange,
  disabled = false,
  className = "",
  placeholder = "",
}: LatexHighlightedTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  // Sync scroll between textarea and highlight layer
  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // Apply LaTeX syntax highlighting
  const highlightSyntax = (text: string): string => {
    if (!text) return "";

    return (
      text
        // Escape HTML entities
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        // Highlight LaTeX comments % ...
        .replace(/^(%.*$)/gm, '<span class="latex-comment">$1</span>')
        // Highlight document class and package declarations
        .replace(
          /(\\documentclass(?:\[[^\]]*\])?\{[^}]*\})/g,
          '<span class="latex-document">$1</span>',
        )
        .replace(
          /(\\usepackage(?:\[[^\]]*\])?\{[^}]*\})/g,
          '<span class="latex-package">$1</span>',
        )
        // Highlight begin/end environment blocks
        .replace(
          /(\\begin\{[^}]*\})/g,
          '<span class="latex-environment">$1</span>',
        )
        .replace(
          /(\\end\{[^}]*\})/g,
          '<span class="latex-environment">$1</span>',
        )
        // Highlight section commands
        .replace(
          /(\\(?:part|chapter|section|subsection|subsubsection|paragraph|subparagraph)\*?)(\{[^}]*\})/g,
          '<span class="latex-section">$1</span><span class="latex-section-title">$2</span>',
        )
        // Highlight common formatting commands
        .replace(
          /(\\(?:textbf|textit|texttt|textsc|emph|underline|textcolor|href)\{)/g,
          '<span class="latex-format">$1</span>',
        )
        // Highlight math delimiters
        .replace(/(\$\$?)/g, '<span class="latex-math">$1</span>')
        .replace(/(\\[[\]])/g, '<span class="latex-math">$1</span>')
        // Highlight other common commands (cventry, cvitem, etc.)
        .replace(
          /(\\(?:cv(?:entry|item|line|listitem|listdoubleitem)|maketitle|makecvtitle|firstname|familyname|title|address|mobile|phone|email|homepage|extrainfo|quote|photo)\b)/g,
          '<span class="latex-command">$1</span>',
        )
        // Highlight any remaining backslash commands
        .replace(
          /(\\[a-zA-Z]+\*?)/g,
          '<span class="latex-generic-command">$1</span>',
        )
        // Highlight braces
        .replace(/([{}])/g, '<span class="latex-brace">$1</span>')
        // Add newline at the end to prevent collapsing
        .concat("\n")
    );
  };

  useEffect(() => {
    handleScroll();
  }, [handleScroll]);

  return (
    <div
      className={`relative h-full border rounded-md bg-background ${className}`}
    >
      {/* Syntax highlighting layer */}
      <pre
        ref={highlightRef}
        className="absolute inset-0 pointer-events-none overflow-hidden font-mono text-sm p-3 whitespace-pre-wrap break-words rounded-md"
        style={{
          margin: 0,
          lineHeight: "1.5",
          tabSize: 2,
        }}
        aria-hidden="true"
      >
        <code
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Syntax highlighting requires HTML
          dangerouslySetInnerHTML={{
            __html: highlightSyntax(value),
          }}
        />
      </pre>

      {/* Actual textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full h-full font-mono text-sm resize-none p-3 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
        style={{
          lineHeight: "1.5",
          tabSize: 2,
          caretColor: "#000",
          color: "transparent",
          WebkitTextFillColor: "transparent",
        }}
        spellCheck={false}
      />

      {/* CSS for cursor in dark mode */}
      <style>{`
        .dark textarea {
          caret-color: #fff;
        }
      `}</style>

      {/* CSS for syntax highlighting */}
      <style>{`
        .latex-comment {
          color: hsl(var(--muted-foreground));
          font-style: italic;
          opacity: 0.75;
        }
        .latex-document {
          color: hsl(260, 80%, 55%);
          font-weight: 700;
        }
        .latex-package {
          color: hsl(280, 70%, 50%);
          font-weight: 600;
        }
        .latex-environment {
          color: hsl(200, 80%, 45%);
          font-weight: 600;
        }
        .latex-section {
          color: hsl(340, 75%, 50%);
          font-weight: 700;
        }
        .latex-section-title {
          color: hsl(340, 70%, 45%);
          font-weight: 500;
        }
        .latex-format {
          color: hsl(30, 80%, 50%);
          font-weight: 600;
        }
        .latex-math {
          color: hsl(120, 60%, 45%);
          font-weight: 600;
        }
        .latex-command {
          color: hsl(var(--primary));
          font-weight: 600;
        }
        .latex-generic-command {
          color: hsl(220, 70%, 50%);
          font-weight: 500;
        }
        .latex-brace {
          color: hsl(180, 50%, 50%);
          font-weight: 500;
        }
        
        /* Dark mode adjustments */
        .dark .latex-document {
          color: hsl(260, 70%, 65%);
        }
        .dark .latex-package {
          color: hsl(280, 60%, 60%);
        }
        .dark .latex-environment {
          color: hsl(200, 70%, 55%);
        }
        .dark .latex-section {
          color: hsl(340, 65%, 60%);
        }
        .dark .latex-section-title {
          color: hsl(340, 60%, 55%);
        }
        .dark .latex-format {
          color: hsl(30, 70%, 60%);
        }
        .dark .latex-math {
          color: hsl(120, 50%, 55%);
        }
        .dark .latex-generic-command {
          color: hsl(220, 60%, 60%);
        }
        .dark .latex-brace {
          color: hsl(180, 45%, 55%);
        }
      `}</style>
    </div>
  );
}
