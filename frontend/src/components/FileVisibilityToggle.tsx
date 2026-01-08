import { Check, FileCode, Sparkles } from "lucide-react";

export type FileVisibility = "custom" | "example";

interface FileVisibilityToggleProps {
  value: FileVisibility[];
  onChange: (value: FileVisibility[]) => void;
}

export default function FileVisibilityToggle({
  value,
  onChange,
}: FileVisibilityToggleProps) {
  const toggleVisibility = (visibility: FileVisibility) => {
    if (value.includes(visibility)) {
      // Remove if already selected
      const newValue = value.filter((v) => v !== visibility);
      // Ensure at least one is selected
      if (newValue.length > 0) {
        onChange(newValue);
      }
    } else {
      // Add if not selected
      onChange([...value, visibility]);
    }
  };

  return (
    <div className="inline-flex items-center gap-2 p-1 bg-muted/50 rounded-lg border">
      <button
        type="button"
        onClick={() => toggleVisibility("custom")}
        className={`
          relative px-3 py-1.5 text-sm font-medium rounded-md transition-all
          flex items-center gap-1.5
          ${
            value.includes("custom")
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }
        `}
        title="Show your custom files"
      >
        {value.includes("custom") && (
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        )}
        <FileCode className="h-3.5 w-3.5" />
        <span>Custom</span>
      </button>
      <button
        type="button"
        onClick={() => toggleVisibility("example")}
        className={`
          relative px-3 py-1.5 text-sm font-medium rounded-md transition-all
          flex items-center gap-1.5
          ${
            value.includes("example")
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }
        `}
        title="Show example files"
      >
        {value.includes("example") && (
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        )}
        <Sparkles className="h-3.5 w-3.5" />
        <span>Example</span>
      </button>
    </div>
  );
}
