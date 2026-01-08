import { ExternalLink, HelpCircle } from "lucide-react";
import { siGithub } from "simple-icons";
import { Separator } from "@/components/ui/separator";

const APP_VERSION = import.meta.env.VITE_APP_VERSION || "0.1.0";
const GITHUB_URL = "https://github.com/SvenBecker/applique";

export default function Footer() {
  return (
    <footer className="border-t bg-muted/50 mt-auto">
      <div className="container mx-auto px-6 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          {/* Left side - Copyright and version */}
          <div className="flex items-center gap-3">
            <span className="font-medium">
              © {new Date().getFullYear()} Appliqué
            </span>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-xs">v{APP_VERSION}</span>
          </div>

          {/* Right side - Links */}
          <div className="flex items-center gap-4">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              aria-label="GitHub Repository"
            >
              <svg
                role="img"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 fill-current"
              >
                <title>GitHub</title>
                <path d={siGithub.path} />
              </svg>
              <span className="hidden sm:inline">GitHub</span>
            </a>

            <Separator orientation="vertical" className="h-4" />

            <a
              href={`${GITHUB_URL}#readme`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              aria-label="Documentation"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Docs</span>
            </a>

            <Separator orientation="vertical" className="h-4" />

            <a
              href={`${GITHUB_URL}/blob/main/LICENSE`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              aria-label="License"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">License</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
