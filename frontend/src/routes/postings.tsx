import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Edit,
  FileText,
  Globe,
  Loader2,
  PenSquare,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { PromptEditor } from "@/components/PromptEditor";
import StatusBadge from "@/components/StatusBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { postingsApi } from "@/lib/api";
import type {
  Posting,
  PostingCreate,
  PostingUpdate,
  URLValidationResult,
} from "@/lib/types";

export const Route = createFileRoute("/postings")({
  component: Postings,
});

// Helper function to calculate data quality score
function calculateDataQuality(posting: Posting): {
  score: number;
  missingFields: string[];
  totalFields: number;
  filledFields: number;
} {
  const requiredFields = [
    { key: "company_name", label: "Company Name" },
    { key: "job_title", label: "Job Title" },
    { key: "recipient_name", label: "Recipient Name" },
    { key: "street_address", label: "Street Address" },
    { key: "city", label: "City" },
    { key: "zip_code", label: "Zip Code" },
  ];

  const optionalFields = [
    { key: "salary_range", label: "Salary Range" },
    { key: "job_description_summary", label: "Job Description" },
  ];

  const allFields = [...requiredFields, ...optionalFields];
  const missingFields: string[] = [];

  let filledCount = 0;

  allFields.forEach((field) => {
    const value =
      posting.generated_metadata?.[
        field.key as keyof typeof posting.generated_metadata
      ];
    if (value && value !== "" && value !== "Unknown" && value !== "00000") {
      filledCount++;
    } else {
      missingFields.push(field.label);
    }
  });

  const score = Math.round((filledCount / allFields.length) * 100);

  return {
    score,
    missingFields,
    totalFields: allFields.length,
    filledFields: filledCount,
  };
}

// Helper function to get badge color based on score
function getQualityBadgeColor(score: number): string {
  if (score >= 80) return "bg-green-100 text-green-800 border-green-200";
  if (score >= 60) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-red-100 text-red-800 border-red-200";
}

function Postings() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isManualCreateDialogOpen, setIsManualCreateDialogOpen] =
    useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPosting, setSelectedPosting] = useState<Posting | null>(null);
  const [isValidationDialogOpen, setIsValidationDialogOpen] = useState(false);
  const [validationResults, setValidationResults] = useState<
    URLValidationResult[]
  >([]);
  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const [createFormData, setCreateFormData] = useState<PostingCreate>({
    url: "",
    description: "",
    trigger_extraction: true,
  });

  const [manualFormData, setManualFormData] = useState<PostingUpdate>({
    company_name: "",
    job_title: "",
    recipient_name: "",
    city: "",
    zip_code: "",
    street_address: "",
    is_remote: false,
    salary_range: "",
    job_description_summary: "",
    full_content: "",
  });

  const [editFormData, setEditFormData] = useState<PostingUpdate>({
    company_name: "",
    job_title: "",
    recipient_name: "",
    city: "",
    zip_code: "",
    street_address: "",
    is_remote: false,
    salary_range: "",
    job_description_summary: "",
    full_content: "",
  });

  const [isFullContentOpen, setIsFullContentOpen] = useState(false);

  const { data: postings, isLoading } = useQuery({
    queryKey: ["postings"],
    queryFn: postingsApi.getPostings,
    refetchInterval: (query) => {
      // Auto-refetch every 3 seconds if any application is processing
      const hasProcessing = query.state.data?.some(
        (app: Posting) => app.extraction_status === "processing",
      );
      return hasProcessing ? 3000 : false;
    },
  });

  const createMutation = useMutation({
    mutationFn: postingsApi.createPosting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["postings"] });
      queryClient.invalidateQueries({ queryKey: ["status"] });
      toast.success("Job posting created successfully");
      setIsCreateDialogOpen(false);
      resetCreateForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create job posting");
    },
  });

  const manualCreateMutation = useMutation({
    mutationFn: async (data: PostingUpdate) => {
      const posting = await postingsApi.createPosting({
        url: "manual://created",
        description: null,
        trigger_extraction: false,
      });
      await postingsApi.updatePosting(posting.id, data);
      return posting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["postings"] });
      queryClient.invalidateQueries({ queryKey: ["status"] });
      toast.success("Job posting created successfully");
      setIsManualCreateDialogOpen(false);
      resetManualForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create job posting");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PostingUpdate }) =>
      postingsApi.updatePosting(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["postings"] });
      toast.success("Application updated successfully");
      setIsEditDialogOpen(false);
      setSelectedPosting(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update application");
    },
  });

  const extractMutation = useMutation({
    mutationFn: postingsApi.triggerExtraction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["postings"] });
      toast.success("Extraction started");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to trigger extraction");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: postingsApi.deletePosting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["postings"] });
      queryClient.invalidateQueries({ queryKey: ["status"] });
      toast.success("Job posting deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete job posting");
    },
  });

  const validateUrlsMutation = useMutation({
    mutationFn: postingsApi.validateUrls,
    onSuccess: (data) => {
      setValidationResults(data.results);
      setIsValidationDialogOpen(true);
      if (data.invalid_count === 0) {
        toast.success("All job posting URLs are valid!");
      } else {
        toast.warning(
          `${data.invalid_count} of ${data.total_checked} URLs are invalid`,
        );
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to validate URLs");
    },
  });

  const resetCreateForm = () => {
    setCreateFormData({
      url: "",
      description: "",
      trigger_extraction: true,
    });
  };

  const resetManualForm = () => {
    setManualFormData({
      company_name: "",
      job_title: "",
      recipient_name: "",
      city: "",
      zip_code: "",
      street_address: "",
      is_remote: false,
      salary_range: "",
      job_description_summary: "",
      full_content: "",
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(createFormData);
  };

  const handleManualCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    manualCreateMutation.mutate(manualFormData);
  };

  const handleEditClick = (app: Posting) => {
    setSelectedPosting(app);
    setEditFormData({
      company_name: app.generated_metadata?.company_name ?? "",
      job_title: app.generated_metadata?.job_title ?? "",
      recipient_name: app.generated_metadata?.recipient_name ?? "",
      city: app.generated_metadata?.city ?? "",
      zip_code: app.generated_metadata?.zip_code ?? "",
      street_address: app.generated_metadata?.street_address ?? "",
      is_remote: app.generated_metadata?.is_remote ?? false,
      salary_range: app.generated_metadata?.salary_range ?? "",
      job_description_summary:
        app.generated_metadata?.job_description_summary ?? "",
      full_content: app.full_content || "",
    });
    setIsFullContentOpen(false);
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPosting) {
      updateMutation.mutate({ id: selectedPosting.id, data: editFormData });
    }
  };

  const handleExportJson = () => {
    if (!postings || postings.length === 0) {
      toast.error("No job postings to export");
      return;
    }

    const dataStr = JSON.stringify(postings, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `job-postings-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Job postings exported successfully");
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonData = JSON.parse(event.target?.result as string);

        if (!Array.isArray(jsonData)) {
          toast.error("Invalid JSON format: expected an array of postings");
          return;
        }

        let successCount = 0;
        let errorCount = 0;

        for (const posting of jsonData) {
          try {
            const createData: PostingCreate = {
              url: posting.url,
              description: posting.description || null,
              trigger_extraction: false,
            };
            await postingsApi.createPosting(createData);
            successCount++;
          } catch (error) {
            errorCount++;
            console.error("Failed to import posting:", posting.url, error);
          }
        }

        queryClient.invalidateQueries({ queryKey: ["postings"] });
        queryClient.invalidateQueries({ queryKey: ["status"] });

        if (errorCount === 0) {
          toast.success(`Successfully imported ${successCount} job postings`);
        } else {
          toast.warning(
            `Imported ${successCount} postings, ${errorCount} failed`,
          );
        }
      } catch (error) {
        toast.error("Failed to parse JSON file");
        console.error("JSON parse error:", error);
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleValidateUrls = () => {
    validateUrlsMutation.mutate();
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Postings</h1>
          <p className="text-muted-foreground mt-1">
            Manage job postings and extract metadata with AI
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPromptEditorOpen(true)}
            title="Customize AI extraction prompt"
          >
            <Settings className="h-4 w-4 mr-2" />
            Extraction Prompt
          </Button>
          <Button
            variant="outline"
            onClick={handleExportJson}
            disabled={!postings || postings.length === 0}
            title="Export all postings as JSON"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            title="Import postings from JSON"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImportJson}
          />
          <Button
            variant="outline"
            onClick={handleValidateUrls}
            disabled={
              validateUrlsMutation.isPending ||
              !postings ||
              postings.length === 0
            }
            title="Check if all job posting URLs are still valid"
          >
            {validateUrlsMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Validate URLs
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Job Posting
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setIsCreateDialogOpen(true)}>
                <Globe className="h-4 w-4 mr-2" />
                <div className="flex flex-col">
                  <span className="font-medium">Extract from URL</span>
                  <span className="text-xs text-muted-foreground">
                    AI-powered extraction
                  </span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsManualCreateDialogOpen(true)}
              >
                <PenSquare className="h-4 w-4 mr-2" />
                <div className="flex flex-col">
                  <span className="font-medium">Create Manually</span>
                  <span className="text-xs text-muted-foreground">
                    Enter details yourself
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Extract from URL Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Extract Job Posting from URL</DialogTitle>
            <DialogDescription>
              Paste the URL from LinkedIn, StepStone, Indeed, or similar job
              boards. The AI will automatically extract company details,
              requirements, and job description for your application documents.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <Label htmlFor="url">Job Posting URL *</Label>
              <Input
                id="url"
                type="url"
                value={createFormData.url}
                onChange={(e) =>
                  setCreateFormData({ ...createFormData, url: e.target.value })
                }
                placeholder="https://linkedin.com/jobs/..."
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                AI extraction will start automatically
              </p>
            </div>
            <div>
              <Label htmlFor="description">Notes (optional)</Label>
              <Textarea
                id="description"
                value={createFormData.description || ""}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    description: e.target.value,
                  })
                }
                placeholder="Personal notes about this posting (e.g., referral contact, application deadline)"
                rows={3}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : (
                "Extract Job Posting"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manual Create Dialog */}
      <Dialog
        open={isManualCreateDialogOpen}
        onOpenChange={setIsManualCreateDialogOpen}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Job Posting Manually</DialogTitle>
            <DialogDescription>
              Enter job posting details manually. All required fields must be
              filled in.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleManualCreateSubmit} className="space-y-6">
            {/* Essential Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">
                Company & Position Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="manual_company_name">Company Name *</Label>
                  <Input
                    id="manual_company_name"
                    value={manualFormData.company_name}
                    onChange={(e) =>
                      setManualFormData({
                        ...manualFormData,
                        company_name: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="manual_job_title">Job Title *</Label>
                  <Input
                    id="manual_job_title"
                    value={manualFormData.job_title}
                    onChange={(e) =>
                      setManualFormData({
                        ...manualFormData,
                        job_title: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>
            </div>

            {/* Address Information Section */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-semibold text-foreground">
                Contact & Location Information
              </h3>
              <div>
                <Label htmlFor="manual_recipient_name">Recipient Name *</Label>
                <Input
                  id="manual_recipient_name"
                  value={manualFormData.recipient_name}
                  onChange={(e) =>
                    setManualFormData({
                      ...manualFormData,
                      recipient_name: e.target.value,
                    })
                  }
                  placeholder="e.g., Hiring Manager, HR Department"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Used in cover letter salutation
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="manual_city">City *</Label>
                  <Input
                    id="manual_city"
                    value={manualFormData.city}
                    onChange={(e) =>
                      setManualFormData({
                        ...manualFormData,
                        city: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="manual_zip_code">Zip Code *</Label>
                  <Input
                    id="manual_zip_code"
                    value={manualFormData.zip_code}
                    onChange={(e) =>
                      setManualFormData({
                        ...manualFormData,
                        zip_code: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="flex items-center space-x-2 pt-8">
                  <Checkbox
                    id="manual_is_remote"
                    checked={manualFormData.is_remote || false}
                    onCheckedChange={(checked) =>
                      setManualFormData({
                        ...manualFormData,
                        is_remote: checked as boolean,
                      })
                    }
                  />
                  <Label htmlFor="manual_is_remote" className="cursor-pointer">
                    Remote Position
                  </Label>
                </div>
              </div>
              <div>
                <Label htmlFor="manual_street_address">Street Address *</Label>
                <Input
                  id="manual_street_address"
                  value={manualFormData.street_address}
                  onChange={(e) =>
                    setManualFormData({
                      ...manualFormData,
                      street_address: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>

            {/* Additional Details Section */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-semibold text-foreground">
                Additional Details
              </h3>
              <div>
                <Label htmlFor="manual_salary_range">
                  Salary Range (optional)
                </Label>
                <Input
                  id="manual_salary_range"
                  value={manualFormData.salary_range || ""}
                  onChange={(e) =>
                    setManualFormData({
                      ...manualFormData,
                      salary_range: e.target.value,
                    })
                  }
                  placeholder="e.g., €60,000 - €80,000"
                />
              </div>
              <div>
                <Label htmlFor="manual_job_description_summary">
                  Job Description Summary (optional)
                </Label>
                <Textarea
                  id="manual_job_description_summary"
                  value={manualFormData.job_description_summary || ""}
                  onChange={(e) =>
                    setManualFormData({
                      ...manualFormData,
                      job_description_summary: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Brief summary of key responsibilities and requirements"
                />
              </div>
              <div>
                <Label htmlFor="manual_full_content">
                  Full Job Description (optional)
                </Label>
                <Textarea
                  id="manual_full_content"
                  value={manualFormData.full_content || ""}
                  onChange={(e) =>
                    setManualFormData({
                      ...manualFormData,
                      full_content: e.target.value,
                    })
                  }
                  rows={8}
                  className="font-mono text-xs"
                  placeholder="The complete job posting content..."
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={manualCreateMutation.isPending}
            >
              {manualCreateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Job Posting"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Job Postings</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Manage scraped job postings. Extracted data is used to personalize
            your cover letters and application documents.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : postings && postings.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 flex-shrink-0"></TableHead>
                    <TableHead className="w-[180px]">Company</TableHead>
                    <TableHead className="w-[220px]">Position</TableHead>
                    <TableHead className="w-[280px]">URL</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[180px] text-right flex-shrink-0">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {postings.map((app) => {
                    const isExpanded = expandedRows.has(app.id);
                    const toggleExpanded = () => {
                      const newExpanded = new Set(expandedRows);
                      if (isExpanded) {
                        newExpanded.delete(app.id);
                      } else {
                        newExpanded.add(app.id);
                      }
                      setExpandedRows(newExpanded);
                    };

                    return (
                      <>
                        <TableRow key={app.id} className="hover:bg-muted/50">
                          <TableCell
                            onClick={toggleExpanded}
                            className="cursor-pointer"
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell
                            className="font-medium cursor-pointer"
                            onClick={toggleExpanded}
                          >
                            <div
                              className="truncate"
                              title={
                                app.generated_metadata?.company_name ?? "-"
                              }
                            >
                              {app.generated_metadata?.company_name ?? "-"}
                            </div>
                          </TableCell>
                          <TableCell
                            className="cursor-pointer"
                            onClick={toggleExpanded}
                          >
                            <div
                              className="truncate"
                              title={app.generated_metadata?.job_title ?? "-"}
                            >
                              {app.generated_metadata?.job_title ?? "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <a
                              href={app.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline truncate block"
                              onClick={(e) => e.stopPropagation()}
                              title={app.url}
                            >
                              {app.url}
                            </a>
                          </TableCell>
                          <TableCell
                            onClick={toggleExpanded}
                            className="cursor-pointer"
                          >
                            <div className="flex flex-col gap-1">
                              <StatusBadge status={app.extraction_status} />
                              {app.extraction_status === "completed" &&
                                (() => {
                                  const quality = calculateDataQuality(app);
                                  return (
                                    <div
                                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${getQualityBadgeColor(quality.score)}`}
                                    >
                                      {quality.score < 80 && (
                                        <AlertTriangle className="h-3 w-3" />
                                      )}
                                      {quality.score >= 80 && (
                                        <CheckCircle2 className="h-3 w-3" />
                                      )}
                                      <span className="font-medium">
                                        {quality.score}%
                                      </span>
                                    </div>
                                  );
                                })()}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2 flex-shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => extractMutation.mutate(app.id)}
                                disabled={extractMutation.isPending}
                                title="Trigger extraction"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditClick(app)}
                                title="Edit metadata"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteMutation.mutate(app.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${app.id}-expanded`}>
                            <TableCell colSpan={6} className="bg-muted/20 p-6">
                              <div className="space-y-4 max-w-full overflow-hidden">
                                {/* Error Message Display */}
                                {app.extraction_status === "failed" &&
                                  app.error_message && (
                                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
                                      <div className="flex items-start gap-3">
                                        <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <h4 className="text-sm font-semibold text-destructive mb-1">
                                            Extraction Failed
                                          </h4>
                                          <p className="text-sm text-destructive/90 break-words">
                                            {app.error_message}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                {/* Data Quality Indicator */}
                                {app.extraction_status === "completed" &&
                                  (() => {
                                    const quality = calculateDataQuality(app);
                                    if (quality.score < 100) {
                                      return (
                                        <div
                                          className={`rounded-lg p-4 mb-4 ${
                                            quality.score >= 80
                                              ? "bg-yellow-50 border border-yellow-200"
                                              : "bg-orange-50 border border-orange-200"
                                          }`}
                                        >
                                          <div className="flex items-start gap-3">
                                            <AlertTriangle
                                              className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                                                quality.score >= 80
                                                  ? "text-yellow-600"
                                                  : "text-orange-600"
                                              }`}
                                            />
                                            <div className="flex-1 min-w-0">
                                              <h4
                                                className={`text-sm font-semibold mb-1 ${
                                                  quality.score >= 80
                                                    ? "text-yellow-800"
                                                    : "text-orange-800"
                                                }`}
                                              >
                                                Incomplete Data (
                                                {quality.filledFields}/
                                                {quality.totalFields} fields)
                                              </h4>
                                              <p
                                                className={`text-sm mb-2 ${
                                                  quality.score >= 80
                                                    ? "text-yellow-700"
                                                    : "text-orange-700"
                                                }`}
                                              >
                                                Missing:{" "}
                                                {quality.missingFields.join(
                                                  ", ",
                                                )}
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                Click the Edit button to
                                                complete the missing information
                                                for better document generation.
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}

                                {/* Metadata Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                  {/* Location Information */}
                                  <div className="min-w-0">
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
                                      Location & Contact
                                    </h4>
                                    <dl className="space-y-2">
                                      <div>
                                        <dt className="text-xs text-muted-foreground">
                                          Recipient
                                        </dt>
                                        <dd className="text-sm font-medium truncate">
                                          {app.generated_metadata
                                            ?.recipient_name || "-"}
                                        </dd>
                                      </div>
                                      <div>
                                        <dt className="text-xs text-muted-foreground">
                                          Address
                                        </dt>
                                        <dd className="text-sm truncate">
                                          {app.generated_metadata
                                            ?.street_address || "-"}
                                        </dd>
                                      </div>
                                      <div>
                                        <dt className="text-xs text-muted-foreground">
                                          City
                                        </dt>
                                        <dd className="text-sm truncate">
                                          {app.generated_metadata?.zip_code &&
                                          app.generated_metadata?.city
                                            ? `${app.generated_metadata.zip_code} ${app.generated_metadata.city}`
                                            : app.generated_metadata?.city ||
                                              "-"}
                                        </dd>
                                      </div>
                                      <div>
                                        <dt className="text-xs text-muted-foreground">
                                          Work Type
                                        </dt>
                                        <dd className="text-sm">
                                          {app.generated_metadata?.is_remote ? (
                                            <span className="inline-flex items-center gap-1">
                                              <Globe className="h-3 w-3" />
                                              Remote
                                            </span>
                                          ) : (
                                            "On-site"
                                          )}
                                        </dd>
                                      </div>
                                    </dl>
                                  </div>

                                  {/* Job Details */}
                                  <div className="min-w-0">
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
                                      Job Details
                                    </h4>
                                    <dl className="space-y-2">
                                      {app.generated_metadata?.salary_range && (
                                        <div>
                                          <dt className="text-xs text-muted-foreground">
                                            Salary Range
                                          </dt>
                                          <dd className="text-sm font-medium truncate">
                                            {
                                              app.generated_metadata
                                                .salary_range
                                            }
                                          </dd>
                                        </div>
                                      )}
                                      <div>
                                        <dt className="text-xs text-muted-foreground">
                                          Created
                                        </dt>
                                        <dd className="text-sm">
                                          {new Date(
                                            app.created_at,
                                          ).toLocaleDateString("en-US", {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </dd>
                                      </div>
                                    </dl>
                                  </div>
                                </div>

                                {/* Notes */}
                                {app.description && (
                                  <div className="min-w-0">
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                                      Notes
                                    </h4>
                                    <p className="text-sm bg-background rounded-md p-3 border break-words whitespace-pre-wrap">
                                      {app.description}
                                    </p>
                                  </div>
                                )}

                                {/* Job Description Summary */}
                                {app.generated_metadata
                                  ?.job_description_summary && (
                                  <div className="min-w-0">
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                                      Job Description Summary
                                    </h4>
                                    <div className="text-sm bg-background rounded-md p-3 border max-h-48 overflow-y-auto break-words whitespace-pre-wrap">
                                      {
                                        app.generated_metadata
                                          .job_description_summary
                                      }
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No job postings yet</p>
              <p className="text-sm mt-1">
                Add a job posting URL to get started
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Metadata Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Job Posting Data</DialogTitle>
            <DialogDescription>
              Update the extracted information. This data will be used to
              personalize your application documents.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-6">
            {/* Essential Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">
                Company & Position Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    value={editFormData.company_name}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        company_name: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="job_title">Job Title *</Label>
                  <Input
                    id="job_title"
                    value={editFormData.job_title}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        job_title: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>
            </div>

            {/* Address Information Section */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-semibold text-foreground">
                Contact & Location Information
              </h3>
              <div>
                <Label htmlFor="recipient_name">Recipient Name *</Label>
                <Input
                  id="recipient_name"
                  value={editFormData.recipient_name}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      recipient_name: e.target.value,
                    })
                  }
                  placeholder="e.g., Hiring Manager, HR Department"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Used in cover letter salutation
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={editFormData.city}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, city: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="zip_code">Zip Code *</Label>
                  <Input
                    id="zip_code"
                    value={editFormData.zip_code}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        zip_code: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="flex items-center space-x-2 pt-8">
                  <Checkbox
                    id="is_remote"
                    checked={editFormData.is_remote || false}
                    onCheckedChange={(checked) =>
                      setEditFormData({
                        ...editFormData,
                        is_remote: checked as boolean,
                      })
                    }
                  />
                  <Label htmlFor="is_remote" className="cursor-pointer">
                    Remote Position
                  </Label>
                </div>
              </div>
              <div>
                <Label htmlFor="street_address">Street Address *</Label>
                <Input
                  id="street_address"
                  value={editFormData.street_address}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      street_address: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>

            {/* Additional Details Section */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-semibold text-foreground">
                Additional Details
              </h3>
              <div>
                <Label htmlFor="salary_range">Salary Range (optional)</Label>
                <Input
                  id="salary_range"
                  value={editFormData.salary_range || ""}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      salary_range: e.target.value,
                    })
                  }
                  placeholder="e.g., €60,000 - €80,000"
                />
              </div>
              <div>
                <Label htmlFor="job_description_summary">
                  Job Description Summary (optional)
                </Label>
                <Textarea
                  id="job_description_summary"
                  value={editFormData.job_description_summary || ""}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      job_description_summary: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Brief summary of key responsibilities and requirements"
                />
              </div>
            </div>

            {/* Full Job Description Section - Collapsible */}
            <div className="pt-4 border-t">
              <Collapsible
                open={isFullContentOpen}
                onOpenChange={setIsFullContentOpen}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Full Job Description (Scraped Content)
                    </span>
                    {isFullContentOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div>
                    <Label htmlFor="full_content">
                      Raw Job Description Content
                    </Label>
                    <Textarea
                      id="full_content"
                      value={editFormData.full_content || ""}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          full_content: e.target.value,
                        })
                      }
                      rows={15}
                      className="font-mono text-xs"
                      placeholder="The complete job posting content as extracted from the website..."
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      This is the complete text extracted from the job posting.
                      You can edit it if the extraction missed important details
                      or included irrelevant information.
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* URL Validation Results Dialog */}
      <AlertDialog
        open={isValidationDialogOpen}
        onOpenChange={setIsValidationDialogOpen}
      >
        <AlertDialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>URL Validation Results</AlertDialogTitle>
            <AlertDialogDescription>
              Checked {validationResults.length} job posting URLs for
              availability
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 my-4">
            {validationResults.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>URL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validationResults.map((result) => {
                      const posting = postings?.find(
                        (p) => p.id === result.posting_id,
                      );
                      return (
                        <TableRow key={result.posting_id}>
                          <TableCell>
                            {result.is_valid ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-red-600" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {posting?.generated_metadata?.company_name ?? "-"}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {posting?.generated_metadata?.job_title ?? "-"}
                          </TableCell>
                          <TableCell>
                            {result.is_valid ? (
                              <span className="text-sm text-green-600 font-medium">
                                Valid{" "}
                                {result.status_code &&
                                  `(${result.status_code})`}
                              </span>
                            ) : (
                              <span className="text-sm text-red-600 font-medium">
                                {result.error_message ||
                                  `Error ${result.status_code || ""}`}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-xs">
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {result.url}
                            </a>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No results to display
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogAction>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Prompt Editor */}
      <PromptEditor
        templateName="job_information_extraction.txt.jinja"
        isOpen={isPromptEditorOpen}
        onClose={() => setIsPromptEditorOpen(false)}
        previewContext={{}}
        height="h-[65vh]"
      />
    </div>
  );
}
