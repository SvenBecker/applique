import { type AgentSubscriber, HttpAgent } from "@ag-ui/client";
import type { Message } from "@ag-ui/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Briefcase,
  ChevronDown,
  ChevronRight,
  FileText,
  Plus,
  Save,
  Search,
  Send,
  Settings,
  Sparkles,
  Square,
  User,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import FileVisibilityToggle, {
  type FileVisibility,
} from "@/components/FileVisibilityToggle";
import { PromptEditor } from "@/components/PromptEditor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { API_URL, documentsApi, postingsApi } from "@/lib/api";
import {
  type ChatSession,
  clearCurrentChat,
  loadCurrentChat,
  saveCurrentChat,
} from "@/lib/chat-storage";

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

export const Route = createFileRoute("/chat")({
  component: AgUiChat,
});

function uuid() {
  return crypto.randomUUID();
}

function AgUiChat() {
  const endpointUrl = `${API_URL}/api/chat`;
  const queryClient = useQueryClient();

  const [threadId, setThreadId] = useState(() => uuid());
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [selectedJobPostingId, setSelectedJobPostingId] =
    useState<string>("none");
  const [selectedCvFile, setSelectedCvFile] = useState<string>("none");
  const [selectedCoverLetterFile, setSelectedCoverLetterFile] =
    useState<string>("none");
  const [selectedPersonalInfoFile, setSelectedPersonalInfoFile] =
    useState<string>("none");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [contentToSave, setContentToSave] = useState("");
  const [saveFilename, setSaveFilename] = useState("");
  const [saveFileType, setSaveFileType] = useState<"cv" | "cover_letter">(
    "cover_letter",
  );
  const [visibility, setVisibility] = useState<FileVisibility[]>([
    "custom",
    "example",
  ]);
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<{
    filename: string;
    content: string;
  } | null>(null);
  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{
    coverLetter: boolean;
    cv: boolean;
  }>({
    coverLetter: true,
    cv: true,
  });
  const [contextExpanded, setContextExpanded] = useState(true);

  const agentRef = useRef<HttpAgent | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load chat session on mount
  useEffect(() => {
    const savedSession = loadCurrentChat();
    if (savedSession) {
      setThreadId(
        savedSession.threadId as `${string}-${string}-${string}-${string}-${string}`,
      );
      setMessages(savedSession.messages);
      setSelectedJobPostingId(savedSession.contextState.jobPostingId || "none");
      setSelectedCvFile(savedSession.contextState.cvFile || "none");
      setSelectedCoverLetterFile(
        savedSession.contextState.coverLetterFile || "none",
      );
      setSelectedPersonalInfoFile(
        savedSession.contextState.personalInfoFile || "none",
      );
    }
  }, []);

  // Save chat session whenever messages or context changes
  useEffect(() => {
    if (messages.length > 0) {
      const session: ChatSession = {
        threadId,
        messages,
        contextState: {
          jobPostingId:
            selectedJobPostingId !== "none" ? selectedJobPostingId : undefined,
          cvFile: selectedCvFile !== "none" ? selectedCvFile : undefined,
          coverLetterFile:
            selectedCoverLetterFile !== "none"
              ? selectedCoverLetterFile
              : undefined,
          personalInfoFile:
            selectedPersonalInfoFile !== "none"
              ? selectedPersonalInfoFile
              : undefined,
        },
        lastUpdated: Date.now(),
      };
      saveCurrentChat(session);
    }
  }, [
    messages,
    threadId,
    selectedJobPostingId,
    selectedCvFile,
    selectedCoverLetterFile,
    selectedPersonalInfoFile,
  ]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Use TanStack Query to fetch data
  const { data: jobPostings = [] } = useQuery({
    queryKey: ["jobPostings"],
    queryFn: postingsApi.getPostings,
  });

  const { data: templates } = useQuery({
    queryKey: ["documentTemplates"],
    queryFn: documentsApi.getTemplates,
  });

  const { data: personalInfoFiles = [] } = useQuery({
    queryKey: ["personalInfoFiles"],
    queryFn: () => documentsApi.listFiles("personal_information"),
  });

  // Filter files based on visibility toggle
  const filteredCVs = useMemo(() => {
    if (!templates) return [];
    return templates.cvs.filter((file) => {
      const isExample = file.toLowerCase().includes("example");
      if (visibility.includes("custom") && visibility.includes("example")) {
        return true;
      }
      if (visibility.includes("example")) {
        return isExample;
      }
      if (visibility.includes("custom")) {
        return !isExample;
      }
      return false;
    });
  }, [templates, visibility]);

  const filteredCoverLetters = useMemo(() => {
    if (!templates) return [];
    return templates.cover_letters.filter((file) => {
      const isExample = file.toLowerCase().includes("example");
      if (visibility.includes("custom") && visibility.includes("example")) {
        return true;
      }
      if (visibility.includes("example")) {
        return isExample;
      }
      if (visibility.includes("custom")) {
        return !isExample;
      }
      return false;
    });
  }, [templates, visibility]);

  // Query to get existing files for overwrite detection
  const { data: existingCvFiles = [] } = useQuery({
    queryKey: ["document-files", "cv"],
    queryFn: () => documentsApi.listFiles("cv"),
  });

  const { data: existingCoverLetterFiles = [] } = useQuery({
    queryKey: ["document-files", "cover_letter"],
    queryFn: () => documentsApi.listFiles("cover_letter"),
  });

  // Save cover letter mutation
  const saveMutation = useMutation({
    mutationFn: documentsApi.saveFile,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["documentTemplates"] });
      toast.success(data.message);
      setSaveDialogOpen(false);
      setSaveFilename("");
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to save file";
      toast.error(message);
    },
  });

  const aguiMessages: Message[] = useMemo(() => {
    // Map our UI messages to AG-UI messages
    return messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
    }));
  }, [messages]);

  function startNewChat() {
    clearCurrentChat();
    setThreadId(uuid());
    setMessages([]);
    setInput("");
    setSelectedJobPostingId("none");
    setSelectedCvFile("none");
    setSelectedCoverLetterFile("none");
    setSelectedPersonalInfoFile("none");
    toast.success("Started new chat");
  }

  async function send() {
    const text = input.trim();
    if (!text || isRunning) return;

    const userMsg: ChatMsg = {
      id: uuid(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsRunning(true);

    // Build state with all selected context
    const state: Record<string, string | number> = {};
    if (selectedJobPostingId !== "none") {
      state.job_posting_id = parseInt(selectedJobPostingId, 10);
    }
    if (selectedCvFile !== "none") {
      state.cv_file = selectedCvFile;
    }
    if (selectedCoverLetterFile !== "none") {
      state.cover_letter_file = selectedCoverLetterFile;
    }
    if (selectedPersonalInfoFile !== "none") {
      state.personal_info_file = selectedPersonalInfoFile;
    }

    const agent = new HttpAgent({
      url: endpointUrl,
      threadId,
      initialMessages: [
        ...aguiMessages,
        { id: userMsg.id, role: "user", content: userMsg.content },
      ],
      initialState: state,
    });
    agentRef.current = agent;

    const subscriber: AgentSubscriber = {
      onTextMessageStartEvent: ({ event }) => {
        // Start a placeholder assistant message
        setMessages((prev) => [
          ...prev,
          {
            id: event.messageId,
            role: "assistant",
            content: "",
            timestamp: Date.now(),
          },
        ]);
      },

      onTextMessageContentEvent: ({ event, textMessageBuffer }) => {
        // Update the assistant placeholder as chunks arrive
        setMessages((prev) =>
          prev.map((m) =>
            m.id === event.messageId ? { ...m, content: textMessageBuffer } : m,
          ),
        );
      },

      onTextMessageEndEvent: ({ event, textMessageBuffer }) => {
        // Ensure final buffer is applied (often already is)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === event.messageId ? { ...m, content: textMessageBuffer } : m,
          ),
        );
      },

      onRunFinishedEvent: () => {
        setIsRunning(false);
      },

      onRunErrorEvent: ({ event }) => {
        setIsRunning(false);
        setMessages((prev) => [
          ...prev,
          {
            id: uuid(),
            role: "assistant",
            content: `Error: ${event.message ?? "run failed"}`,
            timestamp: Date.now(),
          },
        ]);
      },

      // (Optional) if you want to see everything:
      // onEvent: ({ event }) => console.log(event.type, event),
    };

    // Run with explicit defaults (these fields are required in RunAgentInput)
    await agent.runAgent(
      {
        runId: uuid(),
        tools: [],
        context: [],
        forwardedProps: {},
      },
      subscriber,
    );
  }

  function abort() {
    agentRef.current?.abortRun();
    setIsRunning(false);
  }

  function handleSaveCoverLetter(content: string) {
    handleSaveLatexDocument(content, "cover_letter");
  }

  function handleSaveCV(content: string) {
    handleSaveLatexDocument(content, "cv");
  }

  function handleSaveLatexDocument(
    content: string,
    fileType: "cv" | "cover_letter",
  ) {
    // Extract LaTeX content (everything from \documentclass to \end{document})
    const latexMatch = content.match(/\\documentclass[\s\S]*\\end\{document\}/);

    if (!latexMatch) {
      toast.error(
        "No valid LaTeX content found. The content must include \\documentclass and \\end{document}.",
      );
      return;
    }

    setContentToSave(latexMatch[0]);
    setSaveFileType(fileType);
    setSaveDialogOpen(true);
  }

  async function confirmSave() {
    if (!saveFilename.trim()) {
      toast.error("Please enter a filename");
      return;
    }

    // Ensure .tex extension
    let filename = saveFilename.trim();
    if (!filename.endsWith(".tex")) {
      filename = `${filename}.tex`;
    }

    // Validate that content is LaTeX
    if (!contentToSave.includes("\\documentclass")) {
      toast.error(
        "Content must be valid LaTeX format starting with \\documentclass",
      );
      return;
    }

    // Check if file exists and show overwrite confirmation
    const existingFiles =
      saveFileType === "cv" ? existingCvFiles : existingCoverLetterFiles;
    const willOverwrite = existingFiles.includes(filename);

    if (willOverwrite) {
      setPendingSaveData({ filename, content: contentToSave });
      setShowOverwriteDialog(true);
    } else {
      await performSave(filename, contentToSave);
    }
  }

  async function performSave(filename: string, content: string) {
    await saveMutation.mutateAsync({
      file_type: saveFileType,
      filename: filename,
      content: content,
      new_filename: filename,
    });
  }

  async function handleConfirmOverwrite() {
    if (pendingSaveData) {
      setShowOverwriteDialog(false);
      await performSave(pendingSaveData.filename, pendingSaveData.content);
      setPendingSaveData(null);
    }
  }

  function handleCancelOverwrite() {
    setShowOverwriteDialog(false);
    setPendingSaveData(null);
  }

  function insertQuickPrompt(prompt: string) {
    setInput(prompt);
  }

  const toggleSection = (section: "coverLetter" | "cv") => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Simple LaTeX syntax highlighting for preview
  const highlightLatexPreview = (text: string): string => {
    if (!text) return "";

    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/^(%.*$)/gm, '<span class="latex-preview-comment">$1</span>')
      .replace(
        /(\\documentclass(?:\[[^\]]*\])?\{[^}]*\})/g,
        '<span class="latex-preview-document">$1</span>',
      )
      .replace(
        /(\\usepackage(?:\[[^\]]*\])?\{[^}]*\})/g,
        '<span class="latex-preview-package">$1</span>',
      )
      .replace(
        /(\\(?:begin|end)\{[^}]*\})/g,
        '<span class="latex-preview-environment">$1</span>',
      )
      .replace(
        /(\\(?:part|chapter|section|subsection|subsubsection|paragraph|subparagraph)\*?)(\{[^}]*\})/g,
        '<span class="latex-preview-section">$1</span><span class="latex-preview-section-title">$2</span>',
      )
      .replace(
        /(\\[a-zA-Z]+\*?)/g,
        '<span class="latex-preview-command">$1</span>',
      )
      .replace(/([{}])/g, '<span class="latex-preview-brace">$1</span>');
  };

  const selectedPosting =
    selectedJobPostingId !== "none"
      ? jobPostings.find((p) => p.id.toString() === selectedJobPostingId)
      : undefined;

  const hasContext =
    selectedJobPostingId !== "none" ||
    selectedCvFile !== "none" ||
    selectedCoverLetterFile !== "none" ||
    selectedPersonalInfoFile !== "none";

  // Build preview context for prompt editor
  const promptPreviewContext = useMemo(() => {
    const context: Record<string, unknown> = {};

    if (selectedPosting) {
      context.job_posting = {
        job_title: selectedPosting.generated_metadata?.job_title,
        company_name: selectedPosting.generated_metadata?.company_name,
        url: selectedPosting.url,
        description: selectedPosting.description,
        full_content: selectedPosting.full_content,
        generated_metadata: selectedPosting.generated_metadata,
      };
    }

    if (selectedCvFile !== "none") {
      context.cv_content = "\\documentclass{article}\n..."; // Truncated for preview
    }

    if (selectedCoverLetterFile !== "none") {
      context.cover_letter_content = "\\documentclass{letter}\n...";
    }

    if (selectedPersonalInfoFile !== "none") {
      context.personal_info = "Name: ...\nAddress: ...\n...";
    }

    return context;
  }, [
    selectedPosting,
    selectedCvFile,
    selectedCoverLetterFile,
    selectedPersonalInfoFile,
  ]);

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden">
      {/* Sidebar with Context */}
      <div className="w-80 border-r flex flex-col bg-muted/20 flex-shrink-0">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-lg">Chat Assistant</h2>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsPromptEditorOpen(true)}
              size="sm"
              variant="ghost"
              title="Customize chat prompt"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              onClick={startNewChat}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          </div>
        </div>

        {/* Context Configuration Sidebar */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Quick Actions */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Quick Actions
            </h3>
            <div className="space-y-2">
              {/* Cover Letter Section */}
              <div className="border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("coverLetter")}
                  className="w-full flex items-center justify-between p-2.5 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-xs font-medium flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" />
                    Cover Letter
                  </span>
                  {expandedSections.coverLetter ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
                {expandedSections.coverLetter && (
                  <div className="px-2 pb-2 space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs h-8 font-normal"
                      onClick={() =>
                        insertQuickPrompt(
                          "Write a professional cover letter in LaTeX format for this job position based on my CV and personal information. Use the moderncv document class and include the complete LaTeX code from \\documentclass to \\end{document}.",
                        )
                      }
                    >
                      <Sparkles className="h-3 w-3 mr-2 shrink-0" />
                      Generate
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs h-8 font-normal"
                      onClick={() =>
                        insertQuickPrompt(
                          "Improve my existing cover letter to better match the job requirements. Provide the complete improved version in LaTeX format from \\documentclass to \\end{document}.",
                        )
                      }
                    >
                      <Sparkles className="h-3 w-3 mr-2 shrink-0" />
                      Improve
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs h-8 font-normal"
                      onClick={() =>
                        insertQuickPrompt(
                          "Customize my cover letter to highlight relevant skills for this specific position. Provide the complete customized version in LaTeX format from \\documentclass to \\end{document}.",
                        )
                      }
                    >
                      <FileText className="h-3 w-3 mr-2 shrink-0" />
                      Customize
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs h-8 font-normal"
                      onClick={() =>
                        insertQuickPrompt(
                          "Review my cover letter and provide detailed feedback on content, structure, tone, and how well it addresses the job requirements. Suggest specific improvements.",
                        )
                      }
                    >
                      <Search className="h-3 w-3 mr-2 shrink-0" />
                      AI Review
                    </Button>
                  </div>
                )}
              </div>

              {/* CV Section */}
              <div className="border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("cv")}
                  className="w-full flex items-center justify-between p-2.5 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-xs font-medium flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" />
                    CV / Resume
                  </span>
                  {expandedSections.cv ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
                {expandedSections.cv && (
                  <div className="px-2 pb-2 space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs h-8 font-normal"
                      onClick={() =>
                        insertQuickPrompt(
                          "Generate a professional CV in LaTeX format tailored for this job position based on my personal information and experience. Use the moderncv document class and include the complete LaTeX code from \\documentclass to \\end{document}.",
                        )
                      }
                    >
                      <Sparkles className="h-3 w-3 mr-2 shrink-0" />
                      Generate
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs h-8 font-normal"
                      onClick={() =>
                        insertQuickPrompt(
                          "Improve my existing CV to better showcase my qualifications and experience for this job. Provide the complete improved version in LaTeX format from \\documentclass to \\end{document}.",
                        )
                      }
                    >
                      <Sparkles className="h-3 w-3 mr-2 shrink-0" />
                      Improve
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs h-8 font-normal"
                      onClick={() =>
                        insertQuickPrompt(
                          "Customize my CV to emphasize relevant experience and skills for this specific position. Provide the complete customized version in LaTeX format from \\documentclass to \\end{document}.",
                        )
                      }
                    >
                      <FileText className="h-3 w-3 mr-2 shrink-0" />
                      Customize
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs h-8 font-normal"
                      onClick={() =>
                        insertQuickPrompt(
                          "Review my CV and provide detailed feedback on formatting, content relevance, skills presentation, and how well it matches the job requirements. Suggest specific improvements.",
                        )
                      }
                    >
                      <Search className="h-3 w-3 mr-2 shrink-0" />
                      AI Review
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <button
              type="button"
              onClick={() => setContextExpanded(!contextExpanded)}
              className="w-full flex items-center justify-between mb-3 hover:opacity-70 transition-opacity"
            >
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Context & Documents
                {hasContext && (
                  <Badge variant="secondary" className="ml-1">
                    {
                      [
                        selectedJobPostingId !== "none",
                        selectedCvFile !== "none",
                        selectedCoverLetterFile !== "none",
                        selectedPersonalInfoFile !== "none",
                      ].filter(Boolean).length
                    }
                  </Badge>
                )}
              </h3>
              {contextExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {contextExpanded && (
              <div className="space-y-4">
                {/* Active Context Pills */}
                {hasContext && (
                  <div className="flex flex-wrap gap-1.5 pb-3 border-b">
                    {selectedPosting && (
                      <Badge
                        variant="outline"
                        className="gap-1.5 pr-1 cursor-pointer hover:bg-destructive/10"
                        onClick={() => setSelectedJobPostingId("none")}
                      >
                        <Briefcase className="h-3 w-3" />
                        <span className="max-w-[120px] truncate">
                          {selectedPosting.generated_metadata?.job_title ??
                            "Job"}
                        </span>
                        <X className="h-3 w-3 opacity-60 hover:opacity-100" />
                      </Badge>
                    )}
                    {selectedCvFile !== "none" && (
                      <Badge
                        variant="outline"
                        className="gap-1.5 pr-1 cursor-pointer hover:bg-destructive/10"
                        onClick={() => setSelectedCvFile("none")}
                      >
                        <FileText className="h-3 w-3" />
                        <span className="max-w-[120px] truncate">
                          {selectedCvFile}
                        </span>
                        <X className="h-3 w-3 opacity-60 hover:opacity-100" />
                      </Badge>
                    )}
                    {selectedCoverLetterFile !== "none" && (
                      <Badge
                        variant="outline"
                        className="gap-1.5 pr-1 cursor-pointer hover:bg-destructive/10"
                        onClick={() => setSelectedCoverLetterFile("none")}
                      >
                        <FileText className="h-3 w-3" />
                        <span className="max-w-[120px] truncate">
                          {selectedCoverLetterFile}
                        </span>
                        <X className="h-3 w-3 opacity-60 hover:opacity-100" />
                      </Badge>
                    )}
                    {selectedPersonalInfoFile !== "none" && (
                      <Badge
                        variant="outline"
                        className="gap-1.5 pr-1 cursor-pointer hover:bg-destructive/10"
                        onClick={() => setSelectedPersonalInfoFile("none")}
                      >
                        <User className="h-3 w-3" />
                        <span className="max-w-[120px] truncate">
                          {selectedPersonalInfoFile}
                        </span>
                        <X className="h-3 w-3 opacity-60 hover:opacity-100" />
                      </Badge>
                    )}
                  </div>
                )}

                <Tabs defaultValue="job" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="job" className="text-xs gap-1">
                      <Briefcase className="h-3 w-3" />
                      Job
                    </TabsTrigger>
                    <TabsTrigger value="cv" className="text-xs gap-1">
                      <FileText className="h-3 w-3" />
                      CV
                    </TabsTrigger>
                    <TabsTrigger value="letter" className="text-xs gap-1">
                      <FileText className="h-3 w-3" />
                      Letter
                    </TabsTrigger>
                    <TabsTrigger value="info" className="text-xs gap-1">
                      <User className="h-3 w-3" />
                      Info
                    </TabsTrigger>
                  </TabsList>

                  {/* Job Posting Tab */}
                  <TabsContent value="job" className="space-y-2 mt-3">
                    <Label className="text-xs font-medium">Job Posting</Label>
                    <Select
                      value={selectedJobPostingId}
                      onValueChange={setSelectedJobPostingId}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select job posting" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-muted-foreground">None</span>
                        </SelectItem>
                        {jobPostings.map((posting) => (
                          <SelectItem
                            key={posting.id}
                            value={posting.id.toString()}
                          >
                            <div className="flex flex-col items-start">
                              <span className="font-medium">
                                {posting.generated_metadata?.job_title ??
                                  posting.description ??
                                  "Untitled"}
                              </span>
                              {posting.generated_metadata?.company_name && (
                                <span className="text-xs text-muted-foreground">
                                  {posting.generated_metadata.company_name}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedPosting && (
                      <div className="mt-2 p-2 bg-muted/50 rounded-md text-xs space-y-1">
                        <div className="font-medium">
                          {selectedPosting.generated_metadata?.job_title}
                        </div>
                        <div className="text-muted-foreground">
                          {selectedPosting.generated_metadata?.company_name}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* CV Tab */}
                  <TabsContent value="cv" className="space-y-2 mt-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">CV Template</Label>
                      <FileVisibilityToggle
                        value={visibility}
                        onChange={setVisibility}
                      />
                    </div>
                    <Select
                      value={selectedCvFile}
                      onValueChange={setSelectedCvFile}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select CV template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-muted-foreground">None</span>
                        </SelectItem>
                        {filteredCVs.map((cv) => (
                          <SelectItem key={cv} value={cv}>
                            <div className="flex items-center gap-2">
                              <FileText className="h-3 w-3" />
                              {cv}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedCvFile !== "none" && (
                      <div className="mt-2 p-2 bg-muted/50 rounded-md text-xs">
                        <div className="font-medium flex items-center gap-1.5">
                          <FileText className="h-3 w-3" />
                          {selectedCvFile}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Cover Letter Tab */}
                  <TabsContent value="letter" className="space-y-2 mt-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">
                        Cover Letter Template
                      </Label>
                      <FileVisibilityToggle
                        value={visibility}
                        onChange={setVisibility}
                      />
                    </div>
                    <Select
                      value={selectedCoverLetterFile}
                      onValueChange={setSelectedCoverLetterFile}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select cover letter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-muted-foreground">None</span>
                        </SelectItem>
                        {filteredCoverLetters.map((cl) => (
                          <SelectItem key={cl} value={cl}>
                            <div className="flex items-center gap-2">
                              <FileText className="h-3 w-3" />
                              {cl}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedCoverLetterFile !== "none" && (
                      <div className="mt-2 p-2 bg-muted/50 rounded-md text-xs">
                        <div className="font-medium flex items-center gap-1.5">
                          <FileText className="h-3 w-3" />
                          {selectedCoverLetterFile}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Personal Info Tab */}
                  <TabsContent value="info" className="space-y-2 mt-3">
                    <Label className="text-xs font-medium">
                      Personal Information
                    </Label>
                    <Select
                      value={selectedPersonalInfoFile}
                      onValueChange={setSelectedPersonalInfoFile}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select personal info" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-muted-foreground">None</span>
                        </SelectItem>
                        {personalInfoFiles.map((file) => (
                          <SelectItem key={file} value={file}>
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              {file}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedPersonalInfoFile !== "none" && (
                      <div className="mt-2 p-2 bg-muted/50 rounded-md text-xs">
                        <div className="font-medium flex items-center gap-1.5">
                          <User className="h-3 w-3" />
                          {selectedPersonalInfoFile}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 overflow-x-hidden">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center max-w-md">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">
                  Start a conversation
                </h3>
                <p className="text-sm">
                  {hasContext
                    ? "Ask me anything about your application materials and the job posting..."
                    : "Select context from the sidebar or just start chatting..."}
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] min-w-0 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"} rounded-2xl px-4 py-3 shadow-sm`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium opacity-70">
                        {m.role === "user" ? "You" : "Assistant"}
                      </span>
                      {m.role === "assistant" && m.content.length > 100 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 -mr-2"
                              title="Save LaTeX content"
                            >
                              <Save className="h-3 w-3 mr-1" />
                              <ChevronDown className="h-2.5 w-2.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleSaveCoverLetter(m.content)}
                            >
                              <FileText className="h-3 w-3 mr-2" />
                              Save as Cover Letter
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleSaveCV(m.content)}
                            >
                              <FileText className="h-3 w-3 mr-2" />
                              Save as CV
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <div className="prose prose-sm max-w-none dark:prose-invert overflow-x-auto">
                      {m.role === "assistant" ? (
                        <Markdown
                          remarkPlugins={[remarkGfm]}
                          components={
                            {
                              table: (
                                props: React.HTMLAttributes<HTMLTableElement>,
                              ) => (
                                <table
                                  className="border-collapse border border-gray-300 my-4 w-full"
                                  {...props}
                                />
                              ),
                              thead: (
                                props: React.HTMLAttributes<HTMLTableSectionElement>,
                              ) => (
                                <thead
                                  className="bg-gray-50 dark:bg-gray-800"
                                  {...props}
                                />
                              ),
                              tbody: (
                                props: React.HTMLAttributes<HTMLTableSectionElement>,
                              ) => <tbody {...props} />,
                              th: (
                                props: React.ThHTMLAttributes<HTMLTableCellElement>,
                              ) => (
                                <th
                                  className="border border-gray-300 px-4 py-2 text-left font-semibold"
                                  {...props}
                                />
                              ),
                              td: (
                                props: React.TdHTMLAttributes<HTMLTableCellElement>,
                              ) => (
                                <td
                                  className="border border-gray-300 px-4 py-2"
                                  {...props}
                                />
                              ),
                              tr: (
                                props: React.HTMLAttributes<HTMLTableRowElement>,
                              ) => (
                                <tr
                                  className="hover:bg-gray-50 dark:hover:bg-gray-800"
                                  {...props}
                                />
                              ),
                              p: (
                                props: React.HTMLAttributes<HTMLParagraphElement>,
                              ) => <p className="my-2" {...props} />,
                              ul: (
                                props: React.HTMLAttributes<HTMLUListElement>,
                              ) => (
                                <ul
                                  className="list-disc list-inside my-2"
                                  {...props}
                                />
                              ),
                              ol: (
                                props: React.OlHTMLAttributes<HTMLOListElement>,
                              ) => (
                                <ol
                                  className="list-decimal list-inside my-2"
                                  {...props}
                                />
                              ),
                              code: (
                                props: React.HTMLAttributes<HTMLElement>,
                              ) => {
                                const isInline = !props.className;
                                return isInline ? (
                                  <code
                                    className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm"
                                    {...props}
                                  />
                                ) : (
                                  <code
                                    className="block bg-gray-100 dark:bg-gray-800 p-2 rounded my-2 overflow-x-auto text-sm"
                                    {...props}
                                  />
                                );
                              },
                              pre: (
                                props: React.HTMLAttributes<HTMLPreElement>,
                              ) => (
                                <pre
                                  className="bg-gray-100 dark:bg-gray-800 p-3 rounded my-2 overflow-x-auto"
                                  {...props}
                                />
                              ),
                              h1: (
                                props: React.HTMLAttributes<HTMLHeadingElement>,
                              ) => (
                                <h1
                                  className="text-xl font-bold my-2"
                                  {...props}
                                />
                              ),
                              h2: (
                                props: React.HTMLAttributes<HTMLHeadingElement>,
                              ) => (
                                <h2
                                  className="text-lg font-bold my-2"
                                  {...props}
                                />
                              ),
                              h3: (
                                props: React.HTMLAttributes<HTMLHeadingElement>,
                              ) => (
                                <h3
                                  className="text-base font-bold my-2"
                                  {...props}
                                />
                              ),
                              blockquote: (
                                props: React.BlockquoteHTMLAttributes<HTMLQuoteElement>,
                              ) => (
                                <blockquote
                                  className="border-l-4 border-gray-300 pl-4 italic my-2"
                                  {...props}
                                />
                              ),
                              // biome-ignore lint/suspicious/noExplicitAny: react-markdown requires complex component types
                            } as any
                          }
                        >
                          {m.content}
                        </Markdown>
                      ) : (
                        <div className="whitespace-pre-wrap">{m.content}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t p-4 bg-background flex-shrink-0">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={
                  isRunning
                    ? "Waiting for response…"
                    : "Type your message... (Shift+Enter for new line)"
                }
                disabled={isRunning}
                className="min-h-[60px] max-h-[200px] resize-none flex-1"
              />
              <div className="flex gap-2">
                {!isRunning ? (
                  <Button
                    onClick={send}
                    disabled={!input.trim()}
                    size="icon"
                    className="h-[60px] w-[60px]"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button
                    onClick={abort}
                    variant="outline"
                    size="icon"
                    className="h-[60px] w-[60px]"
                  >
                    <Square className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Thread: {threadId.slice(0, 8)}... • {messages.length} messages
            </p>
          </div>
        </div>
      </div>

      {/* Removed old layout below */}
      {/* Quick Actions for Cover Letter Generation */}

      {/* Save Document Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              Save as {saveFileType === "cv" ? "CV" : "Cover Letter"} (.tex)
            </DialogTitle>
            <DialogDescription>
              Save this LaTeX content as a{" "}
              {saveFileType === "cv" ? "CV" : "cover letter"} file. Only valid
              LaTeX code (from \documentclass to \end{"{document}"}) will be
              saved.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="filename">Filename</Label>
              <Input
                id="filename"
                placeholder={
                  saveFileType === "cv"
                    ? "cv_company_name"
                    : "cover_letter_company_name"
                }
                value={saveFilename}
                onChange={(e) => setSaveFilename(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && saveFilename.trim()) {
                    confirmSave();
                  }
                }}
              />
              {(() => {
                const existingFiles =
                  saveFileType === "cv"
                    ? existingCvFiles
                    : existingCoverLetterFiles;
                const filename = saveFilename.trim().endsWith(".tex")
                  ? saveFilename.trim()
                  : `${saveFilename.trim()}.tex`;
                const willOverwrite =
                  saveFilename.trim() && existingFiles.includes(filename);

                return (
                  <div className="flex items-start gap-2">
                    {willOverwrite && (
                      <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                    )}
                    <p
                      className={`text-xs ${willOverwrite ? "text-orange-600 dark:text-orange-400 font-medium" : "text-muted-foreground"}`}
                    >
                      {willOverwrite
                        ? `⚠️ Will overwrite existing file: ${filename}`
                        : ".tex extension will be added automatically"}
                    </p>
                  </div>
                );
              })()}
            </div>
            <div className="grid gap-2">
              <Label>LaTeX Content Preview</Label>
              <div className="max-h-[300px] overflow-y-auto border rounded-md p-3 bg-muted/50 text-sm font-mono">
                <pre
                  className="whitespace-pre-wrap break-words"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: Syntax highlighting for preview
                  dangerouslySetInnerHTML={{
                    __html: highlightLatexPreview(
                      contentToSave.slice(0, 500) +
                        (contentToSave.length > 500 ? "\n..." : ""),
                    ),
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {contentToSave.split("\n").length} lines •{" "}
                {contentToSave.length} characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmSave}
              disabled={!saveFilename.trim() || saveMutation.isPending}
            >
              {saveMutation.isPending
                ? "Saving..."
                : `Save ${saveFileType === "cv" ? "CV" : "Cover Letter"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overwrite Confirmation Dialog */}
      <AlertDialog
        open={showOverwriteDialog}
        onOpenChange={setShowOverwriteDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Overwrite Existing File?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The file{" "}
              <span className="font-semibold text-foreground">
                {pendingSaveData?.filename}
              </span>{" "}
              already exists.
              <br />
              <br />
              Do you want to overwrite it? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelOverwrite}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmOverwrite}
              className="bg-orange-600 hover:bg-orange-700 focus:ring-orange-600"
            >
              Overwrite File
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Prompt Editor */}
      <PromptEditor
        templateName="chat_instructions.txt.jinja"
        isOpen={isPromptEditorOpen}
        onClose={() => setIsPromptEditorOpen(false)}
        previewContext={promptPreviewContext}
      />

      {/* LaTeX Preview Syntax Highlighting Styles */}
      <style>{`
        .latex-preview-comment {
          color: hsl(var(--muted-foreground));
          font-style: italic;
          opacity: 0.75;
        }
        .latex-preview-document {
          color: hsl(260, 80%, 55%);
          font-weight: 700;
        }
        .latex-preview-package {
          color: hsl(280, 70%, 50%);
          font-weight: 600;
        }
        .latex-preview-environment {
          color: hsl(200, 80%, 45%);
          font-weight: 600;
        }
        .latex-preview-section {
          color: hsl(340, 75%, 50%);
          font-weight: 700;
        }
        .latex-preview-section-title {
          color: hsl(340, 70%, 45%);
          font-weight: 500;
        }
        .latex-preview-command {
          color: hsl(220, 70%, 50%);
          font-weight: 500;
        }
        .latex-preview-brace {
          color: hsl(180, 50%, 50%);
          font-weight: 500;
        }

        /* Dark mode adjustments */
        .dark .latex-preview-document {
          color: hsl(260, 70%, 65%);
        }
        .dark .latex-preview-package {
          color: hsl(280, 60%, 60%);
        }
        .dark .latex-preview-environment {
          color: hsl(200, 70%, 55%);
        }
        .dark .latex-preview-section {
          color: hsl(340, 65%, 60%);
        }
        .dark .latex-preview-section-title {
          color: hsl(340, 60%, 55%);
        }
        .dark .latex-preview-command {
          color: hsl(220, 60%, 60%);
        }
        .dark .latex-preview-brace {
          color: hsl(180, 45%, 55%);
        }
      `}</style>
    </div>
  );
}
