import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Download,
  Edit,
  FileText,
  GripVertical,
  Loader2,
  History,
  Briefcase,
  Clock,
  ExternalLink,
  Trash2,
  Info,
  ChevronDown,
  ChevronUp,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import FileVisibilityToggle, {
  type FileVisibility,
} from "@/components/FileVisibilityToggle";
import { LatexEditor } from "@/components/LatexEditor";
import { PdfViewer } from "@/components/PdfViewer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { documentsApi, postingsApi, profileApi } from "@/lib/api";
import type { DocumentGenerate, FilePreviewResponse } from "@/lib/types";

export const Route = createFileRoute("/documents")({
  component: Documents,
});

interface SortableAttachmentItemProps {
  file: string;
  isSelected: boolean;
  onToggle: () => void;
  onPreview: () => void;
}

function SortableAttachmentItem({
  file,
  isSelected,
  onToggle,
  onPreview,
}: SortableAttachmentItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: file });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-2 rounded-md border ${
        isSelected ? "bg-accent border-accent-foreground/20" : "bg-background"
      }`}
    >
      <div className="flex items-center space-x-2 flex-1">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <Checkbox
          id={`attachment-${file}`}
          checked={isSelected}
          onCheckedChange={onToggle}
        />
        <Label htmlFor={`attachment-${file}`} className="cursor-pointer flex-1">
          {file}
        </Label>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onPreview}
        title="View PDF document"
      >
        <FileText className="h-4 w-4 mr-1" />
        View
      </Button>
    </div>
  );
}

function Documents() {
  const queryClient = useQueryClient();
  const [visibility, setVisibility] = useState<FileVisibility[]>([
    "custom",
    "example",
  ]);
  const [formData, setFormData] = useState<DocumentGenerate>({
    cv_file: null,
    cover_letter_file: null,
    attachments: [],
    combine: false,
    posting_id: null,
  });
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState<"generate" | "history">(
    "generate",
  );
  const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);
  const [showVariablesHelp, setShowVariablesHelp] = useState(false);
  const [useProfileVariables, setUseProfileVariables] = useState(true);
  const [editorState, setEditorState] = useState<{
    isOpen: boolean;
    fileType: "cv" | "cover_letter" | "personal_information";
    filename: string;
    content: string;
  } | null>(null);
  const [pdfViewerState, setPdfViewerState] = useState<{
    isOpen: boolean;
    pdfUrl: string;
    filename: string;
  } | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["document-templates"],
    queryFn: documentsApi.getTemplates,
  });

  const { data: postings } = useQuery({
    queryKey: ["postings"],
    queryFn: postingsApi.getPostings,
  });

  const { data: profile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: profileApi.getProfile,
    enabled: useProfileVariables,
  });

  const { data: history } = useQuery({
    queryKey: ["generation-history"],
    queryFn: () => documentsApi.getHistory(20),
  });

  const generateMutation = useMutation({
    mutationFn: documentsApi.generateDocuments,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["generation-history"] });
      toast.success(data.message);
      // Auto-download the generated file
      documentsApi.downloadDocument(data.filename);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to generate documents");
    },
  });

  const saveMutation = useMutation({
    mutationFn: documentsApi.saveFile,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
      toast.success(data.message);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save file");
    },
  });

  const deleteHistoryMutation = useMutation({
    mutationFn: documentsApi.deleteHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generation-history"] });
      toast.success("History item deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete history item");
    },
  });

  const clearHistoryMutation = useMutation({
    mutationFn: documentsApi.clearHistory,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["generation-history"] });
      toast.success(data.message);
      setShowClearHistoryDialog(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to clear history");
    },
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

  const filteredAttachments = useMemo(() => {
    if (!templates) return [];
    return templates.attachments.filter((file) => {
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

  const handleAttachmentToggle = (filename: string) => {
    setSelectedAttachments((prev) =>
      prev.includes(filename)
        ? prev.filter((f) => f !== filename)
        : [...prev, filename],
    );
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSelectedAttachments((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleGenerate = () => {
    if (
      !formData.cv_file &&
      !formData.cover_letter_file &&
      selectedAttachments.length === 0
    ) {
      toast.error("Please select at least one document to generate");
      return;
    }

    // Automatically combine if multiple documents are selected
    const selectedDocsCount =
      (formData.cv_file ? 1 : 0) +
      (formData.cover_letter_file ? 1 : 0) +
      selectedAttachments.length;
    const shouldCombine = selectedDocsCount > 1;

    // Build custom_variables from profile and posting metadata
    const customVariables: Record<string, string> = {};

    // Add profile variables if enabled
    if (useProfileVariables && profile) {
      if (profile.first_name)
        customVariables.applicantfirstname = profile.first_name;
      if (profile.last_name)
        customVariables.applicantlastname = profile.last_name;
      if (profile.full_name)
        customVariables.applicantfullname = profile.full_name;
      if (profile.email) customVariables.applicantemail = profile.email;
      if (profile.phone) customVariables.applicantphone = profile.phone;
      if (profile.address_line)
        customVariables.applicantaddress = profile.address_line;
      if (profile.city) customVariables.applicantcity = profile.city;
      if (profile.postal_code)
        customVariables.applicantpostalcode = profile.postal_code;
      if (profile.country) customVariables.applicantcountry = profile.country;
      if (profile.github_username)
        customVariables.applicantgithub = profile.github_username;
      if (profile.linkedin_username)
        customVariables.applicantlinkedin = profile.linkedin_username;
      if (profile.website_url)
        customVariables.applicantwebsite = profile.website_url;
    }

    // Add job posting variables (these override profile if same key)
    if (formData.posting_id && postings) {
      const selectedPosting = postings.find(
        (p) => p.id === formData.posting_id,
      );
      if (selectedPosting?.generated_metadata) {
        const metadata = selectedPosting.generated_metadata;
        customVariables.companyname = metadata.company_name || "";
        customVariables.jobtitle = metadata.job_title || "";
        customVariables.recipientname = metadata.recipient_name || "";
        customVariables.city = metadata.city || "";
        customVariables.zipcode = metadata.zip_code || "";
        customVariables.streetaddress = metadata.street_address || "";
      }
    }

    generateMutation.mutate({
      cv_file: formData.cv_file,
      cover_letter_file: formData.cover_letter_file,
      attachments: selectedAttachments.length > 0 ? selectedAttachments : null,
      combine: shouldCombine,
      posting_id: formData.posting_id,
      custom_variables:
        Object.keys(customVariables).length > 0 ? customVariables : null,
    });
  };

  const handlePreview = async (fileType: string, filename: string) => {
    try {
      const result = await documentsApi.previewFile(fileType, filename);
      if (result instanceof Blob) {
        // PDF preview - open in modal
        const url = URL.createObjectURL(result);
        setPdfViewerState({
          isOpen: true,
          pdfUrl: url,
          filename,
        });
      } else {
        // Text preview - create HTML as Blob and open it
        const content = result.content;
        const html = `
            <html>
              <head>
                <title>${filename}</title>
                <style>
                  body { font-family: monospace; padding: 20px; white-space: pre-wrap; }
                </style>
              </head>
              <body>${content}</body>
            </html>
          `;
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      }
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || "Failed to preview file");
    }
  };

  const handleClosePdfViewer = () => {
    if (pdfViewerState?.pdfUrl) {
      URL.revokeObjectURL(pdfViewerState.pdfUrl);
    }
    setPdfViewerState(null);
  };

  const handleEdit = async (
    fileType: "cv" | "cover_letter" | "personal_information",
    filename: string,
  ) => {
    try {
      const result = await documentsApi.previewFile(fileType, filename);
      if (result instanceof Blob) {
        toast.error("Cannot edit PDF files");
        return;
      }
      const preview = result as FilePreviewResponse;
      setEditorState({
        isOpen: true,
        fileType,
        filename,
        content: preview.content,
      });
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || "Failed to load file for editing");
    }
  };

  const handleCreateNew = async (
    fileType: "cv" | "cover_letter" | "personal_information",
  ) => {
    const exampleFiles = {
      cv: "cv.example.tex",
      cover_letter: "cover_letter.example.tex",
      personal_information: "personal_information.example.txt",
    };

    try {
      const result = await documentsApi.previewFile(
        fileType,
        exampleFiles[fileType],
      );
      if (result instanceof Blob) {
        toast.error("Cannot use PDF files as templates");
        return;
      }
      const preview = result as FilePreviewResponse;
      setEditorState({
        isOpen: true,
        fileType,
        filename: `new_${fileType}${fileType === "personal_information" ? ".txt" : ".tex"}`,
        content: preview.content,
      });
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || "Failed to load example file");
    }
  };

  const handleSave = async (content: string, newFilename?: string) => {
    if (!editorState) return;

    await saveMutation.mutateAsync({
      file_type: editorState.fileType,
      filename: editorState.filename,
      content,
      new_filename: newFilename || null,
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Generate Documents</h1>
            <p className="text-muted-foreground mt-1">
              Create personalized CVs and cover letters from templates
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCreateNew("cv")}
            >
              <FileText className="h-4 w-4 mr-2" />
              New CV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCreateNew("cover_letter")}
            >
              <FileText className="h-4 w-4 mr-2" />
              New Cover Letter
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCreateNew("personal_information")}
            >
              <FileText className="h-4 w-4 mr-2" />
              New Personal Info
            </Button>
          </div>
        </div>

        {/* Job Posting Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Job Posting (Optional)
            </CardTitle>
            <CardDescription>
              Select a job posting to automatically fill template variables like
              company name, job title, and recipient information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="posting_select">Select Job Posting</Label>
                <Select
                  value={formData.posting_id?.toString() || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      posting_id: value === "none" ? null : parseInt(value, 10),
                    })
                  }
                >
                  <SelectTrigger id="posting_select">
                    <SelectValue placeholder="None selected (templates will use placeholders)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {postings
                      ?.filter(
                        (p) =>
                          p.extraction_status === "completed" &&
                          p.generated_metadata,
                      )
                      .map((posting) => (
                        <SelectItem
                          key={posting.id}
                          value={posting.id.toString()}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {posting.generated_metadata?.company_name ??
                                "Unknown Company"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {posting.generated_metadata?.job_title ??
                                "Unknown Position"}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {formData.posting_id && (
                  <p className="text-xs text-muted-foreground mt-2">
                    ✓ Template variables will be replaced with job posting data
                  </p>
                )}
              </div>

              {/* Profile Variables Toggle */}
              <Collapsible>
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                        useProfileVariables
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <User className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          Use Profile Variables
                        </span>
                        {profile && useProfileVariables && (
                          <Badge variant="secondary" className="text-xs">
                            {
                              Object.values({
                                first_name: profile.first_name,
                                last_name: profile.last_name,
                                full_name: profile.full_name,
                                email: profile.email,
                                phone: profile.phone,
                                address: profile.address_line,
                                city: profile.city,
                                postal_code: profile.postal_code,
                                country: profile.country,
                                github: profile.github_username,
                                linkedin: profile.linkedin_username,
                                website: profile.website_url,
                              }).filter(Boolean).length
                            }{" "}
                            variables
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Include your personal information from Settings
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={useProfileVariables ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        setUseProfileVariables(!useProfileVariables)
                      }
                    >
                      {useProfileVariables ? "Enabled" : "Disabled"}
                    </Button>
                    {profile && useProfileVariables && (
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          title="View available variables"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </CollapsibleTrigger>
                    )}
                  </div>
                </div>

                {profile && useProfileVariables && (
                  <CollapsibleContent>
                    <div className="mt-2 p-3 rounded-lg border bg-background space-y-2">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Available Variables:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        {profile.first_name && (
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">
                              \applicantfirstname
                            </code>
                            <span className="text-muted-foreground truncate">
                              {profile.first_name}
                            </span>
                          </div>
                        )}
                        {profile.last_name && (
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">
                              \applicantlastname
                            </code>
                            <span className="text-muted-foreground truncate">
                              {profile.last_name}
                            </span>
                          </div>
                        )}
                        {profile.full_name && (
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">
                              \applicantfullname
                            </code>
                            <span className="text-muted-foreground truncate">
                              {profile.full_name}
                            </span>
                          </div>
                        )}
                        {profile.email && (
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">
                              \applicantemail
                            </code>
                            <span className="text-muted-foreground truncate">
                              {profile.email}
                            </span>
                          </div>
                        )}
                        {profile.phone && (
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">
                              \applicantphone
                            </code>
                            <span className="text-muted-foreground truncate">
                              {profile.phone}
                            </span>
                          </div>
                        )}
                        {profile.address_line && (
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">
                              \applicantaddress
                            </code>
                            <span className="text-muted-foreground truncate">
                              {profile.address_line}
                            </span>
                          </div>
                        )}
                        {profile.city && (
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">
                              \applicantcity
                            </code>
                            <span className="text-muted-foreground truncate">
                              {profile.city}
                            </span>
                          </div>
                        )}
                        {profile.postal_code && (
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">
                              \applicantpostalcode
                            </code>
                            <span className="text-muted-foreground truncate">
                              {profile.postal_code}
                            </span>
                          </div>
                        )}
                        {profile.country && (
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">
                              \applicantcountry
                            </code>
                            <span className="text-muted-foreground truncate">
                              {profile.country}
                            </span>
                          </div>
                        )}
                        {profile.github_username && (
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">
                              \applicantgithub
                            </code>
                            <span className="text-muted-foreground truncate">
                              {profile.github_username}
                            </span>
                          </div>
                        )}
                        {profile.linkedin_username && (
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">
                              \applicantlinkedin
                            </code>
                            <span className="text-muted-foreground truncate">
                              {profile.linkedin_username}
                            </span>
                          </div>
                        )}
                        {profile.website_url && (
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono">
                              \applicantwebsite
                            </code>
                            <span className="text-muted-foreground truncate">
                              {profile.website_url}
                            </span>
                          </div>
                        )}
                      </div>
                      {Object.values({
                        first_name: profile.first_name,
                        last_name: profile.last_name,
                        full_name: profile.full_name,
                        email: profile.email,
                        phone: profile.phone,
                        address: profile.address_line,
                        city: profile.city,
                        postal_code: profile.postal_code,
                        country: profile.country,
                        github: profile.github_username,
                        linkedin: profile.linkedin_username,
                        website: profile.website_url,
                      }).filter(Boolean).length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          No profile variables set. Go to Settings → Profile to
                          add your information.
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                )}
              </Collapsible>

              {/* Template Variables Help Section */}
              <Collapsible
                open={showVariablesHelp}
                onOpenChange={setShowVariablesHelp}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between text-muted-foreground hover:text-foreground"
                  >
                    <span className="flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      How to use template variables
                    </span>
                    {showVariablesHelp ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3">
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2">
                        Available Variables
                      </h4>
                      <p className="text-xs text-muted-foreground mb-3">
                        Define these variables in your LaTeX templates using{" "}
                        <code className="text-primary">\newcommand</code>. They
                        will be automatically replaced when you select a job
                        posting.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="flex items-start gap-2">
                        <code className="bg-background px-2 py-1 rounded border text-primary font-mono whitespace-nowrap">
                          \companyname
                        </code>
                        <span className="text-muted-foreground">
                          Company name
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <code className="bg-background px-2 py-1 rounded border text-primary font-mono whitespace-nowrap">
                          \jobtitle
                        </code>
                        <span className="text-muted-foreground">
                          Job position
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <code className="bg-background px-2 py-1 rounded border text-primary font-mono whitespace-nowrap">
                          \recipientname
                        </code>
                        <span className="text-muted-foreground">
                          Hiring manager
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <code className="bg-background px-2 py-1 rounded border text-primary font-mono whitespace-nowrap">
                          \streetaddress
                        </code>
                        <span className="text-muted-foreground">
                          Street address
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <code className="bg-background px-2 py-1 rounded border text-primary font-mono whitespace-nowrap">
                          \city
                        </code>
                        <span className="text-muted-foreground">City</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <code className="bg-background px-2 py-1 rounded border text-primary font-mono whitespace-nowrap">
                          \zipcode
                        </code>
                        <span className="text-muted-foreground">
                          Postal code
                        </span>
                      </div>
                    </div>

                    <div className="border-t pt-3 space-y-3">
                      <div>
                        <h5 className="font-medium text-xs mb-2">
                          Example Usage:
                        </h5>
                        <div className="bg-background rounded border p-3 space-y-2">
                          <p className="text-xs text-muted-foreground mb-2">
                            Define variables with defaults at the top of your
                            LaTeX file:
                          </p>
                          <pre className="text-xs font-mono text-foreground overflow-x-auto">
                            {`\\newcommand{\\companyname}{Acme Corp}
\\newcommand{\\jobtitle}{Software Engineer}
\\newcommand{\\streetname}{123 Main St}
\\newcommand{\\zipcode}{1234}
\\newcommand{\\city}{Hamburg}
\\newcommand{\\recipientname}{Hiring Manager}`}
                          </pre>
                          <p className="text-xs text-muted-foreground mt-3 mb-2">
                            Then use them anywhere in your document:
                          </p>
                          <pre className="text-xs font-mono text-foreground overflow-x-auto">
                            {`\\recipient{\\recipientname}{\\companyname\\\\\\streetaddress\\\\\\zipcode{} \\city}
\\opening{Dear \\recipientname,}

I am excited to apply for the \\jobtitle{} position at \\companyname.`}
                          </pre>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      <strong>Tip:</strong> When you select a job posting above,
                      the default values will be replaced with actual data from
                      the posting. Without a posting, your default values will
                      be used.
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Generation and History */}
        <Tabs
          value={selectedTab}
          onValueChange={(v) => setSelectedTab(v as "generate" | "history")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Generate Documents
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Generation History
              {history && history.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {history.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Generation Tab */}
          <TabsContent value="generate" className="space-y-6 mt-6">
            {/* File Visibility Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">
                  Filter:
                </span>
                <FileVisibilityToggle
                  value={visibility}
                  onChange={setVisibility}
                />
              </div>
            </div>

            {isLoading ? (
              <Card>
                <CardContent className="flex justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Selection Area */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Document Templates Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Document Templates
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Choose your CV and cover letter templates
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* CV Selection */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label
                            htmlFor="cv_file"
                            className="text-base font-semibold"
                          >
                            CV Template
                          </Label>
                          {formData.cv_file && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (formData.cv_file) {
                                  handleEdit("cv", formData.cv_file);
                                }
                              }}
                              title="Edit template"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>
                        <Select
                          value={formData.cv_file || ""}
                          onValueChange={(value) =>
                            setFormData({ ...formData, cv_file: value || null })
                          }
                        >
                          <SelectTrigger id="cv_file">
                            <SelectValue placeholder="Select a CV template" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredCVs.map((file) => (
                              <SelectItem key={file} value={file}>
                                {file}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Divider */}
                      <div className="border-t" />

                      {/* Divider */}
                      <div className="border-t" />

                      {/* Cover Letter Selection */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label
                            htmlFor="cover_letter_file"
                            className="text-base font-semibold"
                          >
                            Cover Letter Template
                          </Label>
                          {formData.cover_letter_file && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (formData.cover_letter_file) {
                                  handleEdit(
                                    "cover_letter",
                                    formData.cover_letter_file,
                                  );
                                }
                              }}
                              title="Edit template"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>
                        <Select
                          value={formData.cover_letter_file || ""}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              cover_letter_file: value || null,
                            })
                          }
                        >
                          <SelectTrigger id="cover_letter_file">
                            <SelectValue placeholder="Select a cover letter template" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredCoverLetters.map((file) => (
                              <SelectItem key={file} value={file}>
                                {file}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Divider */}
                      <div className="border-t" />

                      {/* Divider */}
                      <div className="border-t" />

                      {/* Attachments Section */}
                      <div className="space-y-3">
                        <div>
                          <Label className="text-base font-semibold">
                            Additional Attachments
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Drag selected items to reorder • Order controls PDF
                            sequence
                          </p>
                        </div>
                        {filteredAttachments.length > 0 ? (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext
                              items={selectedAttachments}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="space-y-2">
                                {/* Selected attachments (sortable) */}
                                {selectedAttachments.map((file) => (
                                  <SortableAttachmentItem
                                    key={file}
                                    file={file}
                                    isSelected={true}
                                    onToggle={() =>
                                      handleAttachmentToggle(file)
                                    }
                                    onPreview={() =>
                                      handlePreview("attachment", file)
                                    }
                                  />
                                ))}
                                {/* Unselected attachments (not sortable) */}
                                {filteredAttachments
                                  .filter(
                                    (file) =>
                                      !selectedAttachments.includes(file),
                                  )
                                  .map((file) => (
                                    <div
                                      key={file}
                                      className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors"
                                    >
                                      <div className="flex items-center space-x-2 flex-1">
                                        <div className="w-4" />
                                        <Checkbox
                                          id={`attachment-${file}`}
                                          checked={false}
                                          onCheckedChange={() =>
                                            handleAttachmentToggle(file)
                                          }
                                        />
                                        <Label
                                          htmlFor={`attachment-${file}`}
                                          className="cursor-pointer flex-1"
                                        >
                                          {file}
                                        </Label>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handlePreview("attachment", file)
                                        }
                                        title="View PDF document"
                                      >
                                        <FileText className="h-4 w-4 mr-1" />
                                        View
                                      </Button>
                                    </div>
                                  ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        ) : (
                          <p className="text-sm text-muted-foreground py-4 text-center bg-muted/50 rounded-md">
                            No attachments available
                          </p>
                        )}
                      </div>

                      {/* Divider */}
                      <div className="border-t" />
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar - Generation Summary & Actions */}
                <div className="lg:col-span-1">
                  <div className="lg:sticky lg:top-6 space-y-4">
                    {/* Summary Card */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-2 h-2 rounded-full mt-2 ${formData.cv_file ? "bg-green-500" : "bg-muted"}`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">CV</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {formData.cv_file || "Not selected"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-2 h-2 rounded-full mt-2 ${formData.cover_letter_file ? "bg-green-500" : "bg-muted"}`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">
                                Cover Letter
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {formData.cover_letter_file || "Not selected"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-2 h-2 rounded-full mt-2 ${selectedAttachments.length > 0 ? "bg-green-500" : "bg-muted"}`}
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium">Attachments</p>
                              <p className="text-xs text-muted-foreground">
                                {selectedAttachments.length > 0
                                  ? `${selectedAttachments.length} selected`
                                  : "None selected"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Total documents
                            </span>
                            <span className="font-semibold">
                              {(formData.cv_file ? 1 : 0) +
                                (formData.cover_letter_file ? 1 : 0) +
                                selectedAttachments.length}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Generate Button Card */}
                    <Card>
                      <CardContent className="pt-6">
                        <Button
                          onClick={handleGenerate}
                          disabled={generateMutation.isPending}
                          className="w-full"
                          size="lg"
                        >
                          {generateMutation.isPending ? (
                            <>
                              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Download className="h-5 w-5 mr-2" />
                              Generate PDF
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground mt-3">
                          {(formData.cv_file ? 1 : 0) +
                            (formData.cover_letter_file ? 1 : 0) +
                            selectedAttachments.length >
                          1
                            ? "All documents will be combined"
                            : "Single document will be generated"}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Generations</CardTitle>
                    <CardDescription>
                      View and re-download previously generated documents
                    </CardDescription>
                  </div>
                  {history && history.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowClearHistoryDialog(true)}
                      className="border-destructive text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {history && history.length > 0 ? (
                  <div className="space-y-3">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{item.filename}</span>
                            {item.combined && (
                              <Badge variant="secondary" className="text-xs">
                                Combined
                              </Badge>
                            )}
                          </div>
                          {item.company_name && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Briefcase className="h-3 w-3" />
                              <span>{item.company_name}</span>
                              {item.job_title && (
                                <>
                                  <span>•</span>
                                  <span>{item.job_title}</span>
                                </>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                {new Date(item.created_at).toLocaleString()}
                              </span>
                            </div>
                            {item.cv_file && <span>CV: {item.cv_file}</span>}
                            {item.cover_letter_file && (
                              <span>CL: {item.cover_letter_file}</span>
                            )}
                            {item.attachments &&
                              item.attachments.length > 0 && (
                                <span>
                                  {item.attachments.length} attachments
                                </span>
                              )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              documentsApi.previewGenerated(item.id)
                            }
                            title="Open PDF in new tab"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              documentsApi.downloadDocument(item.filename)
                            }
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              deleteHistoryMutation.mutate(item.id)
                            }
                            disabled={deleteHistoryMutation.isPending}
                            title="Delete from history"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No generation history yet</p>
                    <p className="text-sm mt-1">
                      Generate your first document to see it here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* LaTeX Editor Dialog */}
      {editorState && (
        <LatexEditor
          isOpen={editorState.isOpen}
          onClose={() => setEditorState(null)}
          filename={editorState.filename}
          content={editorState.content}
          fileType={editorState.fileType}
          onSave={handleSave}
        />
      )}

      {/* PDF Viewer Dialog */}
      {pdfViewerState && (
        <PdfViewer
          isOpen={pdfViewerState.isOpen}
          onClose={handleClosePdfViewer}
          pdfUrl={pdfViewerState.pdfUrl}
          filename={pdfViewerState.filename}
        />
      )}

      {/* Clear History Confirmation Dialog */}
      <AlertDialog
        open={showClearHistoryDialog}
        onOpenChange={setShowClearHistoryDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All History?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all generation history records. This
              action cannot be undone. The generated PDF files will remain in
              the output folder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => clearHistoryMutation.mutate()}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {clearHistoryMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                "Clear All History"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
