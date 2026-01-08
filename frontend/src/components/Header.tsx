import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  AlertCircle,
  Briefcase,
  CheckCircle2,
  FileText,
  HelpCircle,
  Home,
  Keyboard,
  Menu,
  MessageSquare,
  Settings,
  X,
  ExternalLink,
  BookOpen,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { siGithub } from "simple-icons";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { postingsApi, statusApi } from "@/lib/api";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  // Fetch status for performance indicators
  const { data: status } = useQuery({
    queryKey: ["status"],
    queryFn: statusApi.getStatus,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: postings } = useQuery({
    queryKey: ["postings"],
    queryFn: postingsApi.getPostings,
    refetchInterval: 5000,
  });

  const processingCount =
    postings?.filter((p) => p.extraction_status === "processing").length || 0;
  const pendingCount = status?.pending_postings || 0;
  const hasActiveJobs = processingCount > 0 || pendingCount > 0;

  // LLM connection status
  const llmStatus = status?.active_llm
    ? {
        label: status.active_llm.model_name,
        color: "text-green-400",
        icon: CheckCircle2,
      }
    : { label: "Not Configured", color: "text-red-400", icon: AlertCircle };

  const LLMIcon = llmStatus.icon;

  return (
    <>
      <header className="p-4 flex items-center justify-between bg-gray-800 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-semibold">
            <Link to="/" className="hover:text-cyan-400 transition-colors">
              Appliqué
            </Link>
          </h1>
        </div>

        {/* Right side - Performance Indicators & Help */}
        <div className="flex items-center gap-4">
          {/* Performance Indicators */}
          <div className="hidden md:flex items-center gap-3">
            {/* LLM Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 rounded-lg">
              <LLMIcon className={`h-4 w-4 ${llmStatus.color}`} />
              <span className="text-xs font-medium">{llmStatus.label}</span>
            </div>

            {/* Active Jobs Indicator */}
            {hasActiveJobs && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <Activity className="h-4 w-4 text-yellow-400 animate-pulse" />
                <span className="text-xs font-medium text-yellow-300">
                  {processingCount > 0
                    ? `${processingCount} Processing`
                    : `${pendingCount} Pending`}
                </span>
              </div>
            )}
          </div>

          {/* Help Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Help menu"
              >
                <HelpCircle size={20} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Help & Resources</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <a
                  href="https://github.com/SvenBecker/applique#readme"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Documentation</span>
                  <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                </a>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <a
                  href="https://github.com/SvenBecker/applique"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 cursor-pointer"
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
                  <span>GitHub Repository</span>
                  <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                </a>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 w-full cursor-pointer"
                  onClick={() => {
                    alert(
                      "Keyboard Shortcuts:\n\n" +
                        "• Cmd/Ctrl + K: Quick search (coming soon)\n" +
                        "• Esc: Close dialogs/sidebar\n" +
                        "• ?: Show help",
                    );
                  }}
                >
                  <Keyboard className="h-4 w-4" />
                  <span>Keyboard Shortcuts</span>
                </button>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  to="/settings"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem disabled className="text-xs opacity-60">
                <Zap className="h-3 w-3 mr-2" />
                Version 0.1.0
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-gray-900 text-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Navigation</h2>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              className:
                "flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2",
            }}
          >
            <Home size={20} />
            <span className="font-medium">Home</span>
          </Link>

          <Link
            to="/postings"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              className:
                "flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2",
            }}
          >
            <Briefcase size={20} />
            <span className="font-medium">Postings</span>
            {hasActiveJobs && (
              <Badge
                variant="outline"
                className="ml-auto bg-yellow-500/10 text-yellow-300 border-yellow-500/30"
              >
                <Activity className="h-3 w-3 mr-1 animate-pulse" />
                {processingCount + pendingCount}
              </Badge>
            )}
          </Link>

          <Link
            to="/documents"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              className:
                "flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2",
            }}
          >
            <FileText size={20} />
            <span className="font-medium">Generate</span>
          </Link>

          <Link
            to="/chat"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              className:
                "flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2",
            }}
          >
            <MessageSquare size={20} />
            <span className="font-medium">AI Assistant</span>
          </Link>

          <div className="my-2 border-t border-gray-700" />

          <Link
            to="/settings"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              className:
                "flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2",
            }}
          >
            <Settings size={20} />
            <span className="font-medium">Settings</span>
          </Link>
        </nav>

        {/* Sidebar Footer - Status Summary */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/50">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">LLM Status</span>
              <div className="flex items-center gap-1">
                <LLMIcon className={`h-3 w-3 ${llmStatus.color}`} />
                <span className="text-xs">{llmStatus.label}</span>
              </div>
            </div>
            {status && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Total Postings</span>
                <span className="font-medium">{status.total_postings}</span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
