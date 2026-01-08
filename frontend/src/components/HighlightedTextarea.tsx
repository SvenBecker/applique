import { useCallback, useEffect, useRef } from "react";

interface HighlightedTextareaProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

/**
 * A textarea with basic Jinja2 syntax highlighting overlay.
 * Uses a pre element for highlighting behind the textarea.
 */
export function HighlightedTextarea({
  value,
  onChange,
  disabled = false,
  className = "",
  placeholder = "",
}: HighlightedTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  // Sync scroll between textarea and highlight layer
  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // Apply Jinja2 syntax highlighting
  const highlightSyntax = (text: string): string => {
    if (!text) return "";

    return (
      text
        // Escape HTML entities
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        // Highlight Jinja2 comments {# ... #}
        .replace(/(\{#.*?#\})/gs, '<span class="jinja-comment">$1</span>')
        // Highlight Jinja2 blocks {% ... %}
        .replace(
          /(\{%\s*(?:if|elif|else|endif|for|endfor|in|block|endblock|extends|include|macro|endmacro|set|import|from)\b[^%]*%\})/g,
          '<span class="jinja-keyword">$1</span>',
        )
        // Highlight other Jinja2 statements
        .replace(/(\{%[^%]*%\})/g, '<span class="jinja-statement">$1</span>')
        // Highlight Jinja2 filters (| filter_name)
        .replace(/(\|\s*\w+)/g, '<span class="jinja-filter">$1</span>')
        // Highlight Jinja2 variables {{ ... }}
        .replace(/(\{\{[^}]*\}\})/g, '<span class="jinja-variable">$1</span>')
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
        .jinja-comment {
          color: hsl(var(--muted-foreground));
          font-style: italic;
          opacity: 0.8;
        }
        .jinja-keyword {
          color: hsl(var(--primary));
          font-weight: 600;
        }
        .jinja-statement {
          color: hsl(220, 70%, 50%);
          font-weight: 500;
        }
        .jinja-variable {
          color: hsl(280, 65%, 55%);
          font-weight: 500;
        }
        .jinja-filter {
          color: hsl(30, 70%, 50%);
          font-weight: 500;
        }
        
        /* Dark mode adjustments */
        .dark .jinja-variable {
          color: hsl(280, 60%, 65%);
        }
        .dark .jinja-statement {
          color: hsl(220, 60%, 60%);
        }
        .dark .jinja-filter {
          color: hsl(30, 60%, 60%);
        }
      `}</style>
    </div>
  );
}
