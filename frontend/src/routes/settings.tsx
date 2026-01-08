import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cloud,
  Edit,
  ExternalLink,
  Github,
  Globe,
  Home,
  Linkedin,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Rocket,
  Settings,
  Trash2,
  User,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { llmApi, profileApi } from "@/lib/api";
import type { LLMConfig, LLMConfigCreate } from "@/lib/types";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

// Provider configurations with default base URLs
const PROVIDER_CONFIGS = {
  openai: {
    label: "OpenAI",
    icon: Cloud,
    description: "Best quality, industry-leading models",
    defaultBaseUrl: "https://api.openai.com/v1",
    requiresApiKey: true,
    exampleModels: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
    cost: "paid",
    speed: "fast",
    setupUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    label: "Anthropic",
    icon: Cloud,
    description: "Claude models with strong reasoning",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    requiresApiKey: true,
    exampleModels: [
      "claude-3-5-sonnet-20241022",
      "claude-3-opus-20240229",
      "claude-3-haiku-20240307",
    ],
    cost: "paid",
    speed: "fast",
    setupUrl: "https://console.anthropic.com/settings/keys",
  },
  google: {
    label: "Google AI",
    icon: Cloud,
    description: "Gemini models for multimodal AI",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    requiresApiKey: true,
    exampleModels: [
      "gemini-2.0-flash-exp",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
    ],
    cost: "paid",
    speed: "fast",
    setupUrl: "https://aistudio.google.com/app/apikey",
  },
  mistral: {
    label: "Mistral AI",
    icon: Cloud,
    description: "Open-weight models with strong performance",
    defaultBaseUrl: "https://api.mistral.ai/v1",
    requiresApiKey: true,
    exampleModels: [
      "mistral-large-latest",
      "mistral-small-latest",
      "codestral-latest",
    ],
    cost: "paid",
    speed: "fast",
    setupUrl: "https://console.mistral.ai/api-keys/",
  },
  openrouter: {
    label: "OpenRouter",
    icon: Cloud,
    description: "Access multiple AI models via one API",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    requiresApiKey: true,
    exampleModels: [
      "anthropic/claude-3.5-sonnet",
      "google/gemini-pro",
      "meta-llama/llama-3.1-70b",
    ],
    cost: "paid",
    speed: "fast",
    setupUrl: "https://openrouter.ai/keys",
  },
  cohere: {
    label: "Cohere",
    icon: Cloud,
    description: "Enterprise-ready language models",
    defaultBaseUrl: "https://api.cohere.ai/v1",
    requiresApiKey: true,
    exampleModels: ["command-r-plus", "command-r", "command-light"],
    cost: "paid",
    speed: "fast",
    setupUrl: "https://dashboard.cohere.com/api-keys",
  },
  groq: {
    label: "Groq",
    icon: Rocket,
    description: "Ultra-fast inference, free tier available",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    requiresApiKey: true,
    exampleModels: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
    cost: "free",
    speed: "ultra-fast",
    setupUrl: "https://console.groq.com/keys",
  },
  ollama: {
    label: "Ollama",
    icon: Home,
    description: "Free, runs locally on your machine",
    defaultBaseUrl: "http://localhost:11434/v1",
    defaultBaseUrlDocker: "http://host.docker.internal:11434/v1",
    requiresApiKey: false,
    exampleModels: ["llama3.2", "mistral", "codellama"],
    cost: "free",
    speed: "medium",
    setupUrl: "https://ollama.ai",
  },
  lmstudio: {
    label: "LM Studio",
    icon: Home,
    description: "Local inference with UI, easy setup",
    defaultBaseUrl: "http://localhost:1234/v1",
    defaultBaseUrlDocker: "http://host.docker.internal:1234/v1",
    requiresApiKey: false,
    exampleModels: ["openai/gpt-oss-20b"],
    cost: "free",
    speed: "medium",
    setupUrl: "https://lmstudio.ai",
  },
} as const;

type ProviderKey = keyof typeof PROVIDER_CONFIGS;

// Detect if running in Docker
const isRunningInDocker = () => {
  // Check if we're accessing via a Docker network or if there's a Docker-specific env var
  return (
    window.location.hostname.includes("docker") ||
    import.meta.env.VITE_DOCKER === "true"
  );
};

function SettingsPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [testingConfigId, setTestingConfigId] = useState<number | null>(null);
  const [formData, setFormData] = useState<LLMConfigCreate>({
    provider: "",
    model_name: "",
    api_key: "",
    base_url: "",
    is_active: false,
  });
  const [isTesting, setIsTesting] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);

  const { data: configs, isLoading } = useQuery({
    queryKey: ["llm-configs"],
    queryFn: llmApi.getConfigs,
  });

  const activeConfig = configs?.find((c) => c.is_active);
  const totalConfigs = configs?.length || 0;

  const createMutation = useMutation({
    mutationFn: llmApi.createConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["llm-configs"] });
      queryClient.invalidateQueries({ queryKey: ["status"] });
      toast.success("LLM configuration created successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create LLM configuration");
    },
  });

  const activateMutation = useMutation({
    mutationFn: llmApi.activateConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["llm-configs"] });
      queryClient.invalidateQueries({ queryKey: ["status"] });
      toast.success("LLM configuration activated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to activate LLM configuration");
    },
  });

  const testConfigMutation = useMutation({
    mutationFn: llmApi.testConfig,
    onSuccess: (response) => {
      if (response.status === "success") {
        toast.success("Connection test successful!");
      } else {
        toast.error(`Connection test failed: ${response.message}`);
      }
      setTestingConfigId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to test connection");
      setTestingConfigId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: llmApi.deleteConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["llm-configs"] });
      queryClient.invalidateQueries({ queryKey: ["status"] });
      toast.success("LLM configuration deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete LLM configuration");
    },
  });

  const resetForm = () => {
    setFormData({
      provider: "",
      model_name: "",
      api_key: "",
      base_url: "",
      is_active: false,
    });
    setFetchedModels([]);
    setIsEditMode(false);
  };

  const handleEdit = (config: LLMConfig) => {
    setIsEditMode(true);
    setFormData({
      provider: config.provider,
      model_name: config.model_name,
      api_key: config.api_key || "",
      base_url: config.base_url || "",
      is_active: config.is_active,
    });
    setIsDialogOpen(true);
  };

  const toggleRowExpansion = (id: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleQuickSetup = (providerKey: ProviderKey) => {
    const config = PROVIDER_CONFIGS[providerKey];
    const inDocker = isRunningInDocker();
    const baseUrl =
      inDocker && "defaultBaseUrlDocker" in config
        ? config.defaultBaseUrlDocker
        : config.defaultBaseUrl;

    setFormData({
      provider: providerKey,
      model_name: "",
      api_key: "",
      base_url: baseUrl,
      is_active: false,
    });
    setIsDialogOpen(true);
  };

  // Auto-populate base URL when provider changes
  const handleProviderChange = (provider: string) => {
    const config = PROVIDER_CONFIGS[provider as ProviderKey];
    if (config) {
      const inDocker = isRunningInDocker();
      const baseUrl =
        inDocker && "defaultBaseUrlDocker" in config
          ? config.defaultBaseUrlDocker
          : config.defaultBaseUrl;

      setFormData({
        ...formData,
        provider,
        base_url: baseUrl,
        model_name: "", // Reset model when provider changes
      });
      setFetchedModels([]); // Clear fetched models when provider changes
    } else {
      setFormData({
        ...formData,
        provider,
        model_name: "",
      });
      setFetchedModels([]);
    }
  };

  const handleTestConnection = async () => {
    if (!formData.provider || !formData.model_name) {
      toast.error("Provider and model name are required");
      return;
    }

    setIsTesting(true);
    try {
      const result = await llmApi.testConnection({
        provider: formData.provider,
        model_name: formData.model_name,
        api_key: formData.api_key || null,
        base_url: formData.base_url || null,
      });
      toast.success(`Connection successful: ${result.message}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Connection test failed";
      toast.error(message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleFetchModels = async () => {
    if (!formData.base_url) {
      toast.error("Base URL is required to fetch models");
      return;
    }

    setIsFetchingModels(true);
    try {
      const result = await llmApi.fetchModels({
        base_url: formData.base_url,
        api_key: formData.api_key || null,
      });
      if (result.models.length > 0) {
        setFetchedModels(result.models);
        toast.success(`Found ${result.models.length} models`);
      } else {
        toast.info("No models found");
        setFetchedModels([]);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch models";
      toast.error(message);
      setFetchedModels([]);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const selectedProviderConfig = formData.provider
    ? PROVIDER_CONFIGS[formData.provider as ProviderKey]
    : null;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure your LLM provider and manage API connections
          </p>
        </div>
      </div>

      <Tabs defaultValue="llm" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="llm" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            LLM Configuration
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
        </TabsList>

        {/* LLM Configuration Tab */}
        <TabsContent value="llm" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold">LLM Configurations</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your language model providers and API keys
              </p>
            </div>
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Configuration
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {isEditMode ? "Edit" : "Add"} LLM Configuration
                  </DialogTitle>
                  <DialogDescription>
                    Configure an LLM provider for AI-powered extraction
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="provider">Provider *</Label>
                    <Select
                      value={formData.provider}
                      onValueChange={handleProviderChange}
                    >
                      <SelectTrigger id="provider">
                        <SelectValue placeholder="Select a provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PROVIDER_CONFIGS).map(
                          ([key, config]) => (
                            <SelectItem key={key} value={key}>
                              {config.label}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    {selectedProviderConfig && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Example models:{" "}
                        {selectedProviderConfig.exampleModels.join(", ")}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="model_name">Model Name *</Label>
                    {fetchedModels.length > 0 ? (
                      <Select
                        value={formData.model_name}
                        onValueChange={(value) =>
                          setFormData({ ...formData, model_name: value })
                        }
                      >
                        <SelectTrigger id="model_name">
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          {fetchedModels.map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="model_name"
                        name="llm-model-name"
                        autoComplete="off"
                        data-1p-ignore
                        data-lpignore="true"
                        value={formData.model_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            model_name: e.target.value,
                          })
                        }
                        placeholder={
                          selectedProviderConfig
                            ? `e.g., ${selectedProviderConfig.exampleModels[0]}`
                            : "Enter model name"
                        }
                        required
                      />
                    )}
                  </div>
                  {selectedProviderConfig?.requiresApiKey && (
                    <div>
                      <Label htmlFor="api_key">API Key *</Label>
                      <Input
                        id="api_key"
                        name="llm-api-key"
                        type="password"
                        autoComplete="off"
                        data-1p-ignore
                        data-lpignore="true"
                        value={formData.api_key || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, api_key: e.target.value })
                        }
                        placeholder="Your API key"
                        required
                      />
                    </div>
                  )}
                  {!selectedProviderConfig?.requiresApiKey &&
                    formData.provider && (
                      <div>
                        <Label htmlFor="api_key">API Key (optional)</Label>
                        <Input
                          id="api_key"
                          name="llm-api-key"
                          type="password"
                          autoComplete="off"
                          data-1p-ignore
                          data-lpignore="true"
                          value={formData.api_key || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              api_key: e.target.value,
                            })
                          }
                          placeholder="Optional API key"
                        />
                      </div>
                    )}
                  <div>
                    <Label htmlFor="base_url">Base URL</Label>
                    <Input
                      id="base_url"
                      name="llm-base-url"
                      autoComplete="off"
                      data-1p-ignore
                      data-lpignore="true"
                      value={formData.base_url || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, base_url: e.target.value })
                      }
                      placeholder="Auto-populated based on provider"
                    />
                    {formData.provider && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {isRunningInDocker()
                          ? "🐳 Docker mode: Using host.docker.internal for local services"
                          : "💻 Local mode: Using localhost for local services"}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={
                        isTesting || !formData.provider || !formData.model_name
                      }
                      className="flex-1"
                    >
                      {isTesting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      Test Connection
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleFetchModels}
                      disabled={isFetchingModels || !formData.base_url}
                      className="flex-1"
                    >
                      {isFetchingModels ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Fetch Models
                    </Button>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {isEditMode ? "Updating..." : "Creating..."}
                      </>
                    ) : isEditMode ? (
                      "Update Configuration"
                    ) : (
                      "Create Configuration"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card className="border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Total Configurations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {totalConfigs}
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {totalConfigs === 0
                    ? "Get started by adding one"
                    : "LLM providers configured"}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Active Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeConfig ? (
                  <>
                    <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {activeConfig.provider}
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 truncate">
                      {activeConfig.model_name}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                      None
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Activate a configuration
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeConfig ? (
                  <>
                    <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                      Ready
                    </div>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                      System operational
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                      Inactive
                    </div>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                      No active LLM
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Provider Quick Setup Cards (show when no configs) */}
          {configs && configs.length === 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">Popular Providers</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Object.entries(PROVIDER_CONFIGS).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <Card
                      key={key}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleQuickSetup(key as ProviderKey)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <Icon className="h-6 w-6 text-primary" />
                          <div className="flex gap-1">
                            {config.cost === "free" && (
                              <Badge variant="outline" className="text-xs">
                                Free
                              </Badge>
                            )}
                            {config.cost === "paid" && (
                              <Badge variant="outline" className="text-xs">
                                Paid
                              </Badge>
                            )}
                          </div>
                        </div>
                        <CardTitle className="text-base mt-2">
                          {config.label}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {config.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground capitalize">
                            {config.speed}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                          >
                            Set up →
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Configured LLMs</CardTitle>
              <CardDescription>
                Manage your AI model providers and their configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : configs && configs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Base URL</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {configs.map((config) => {
                      const providerConfig =
                        PROVIDER_CONFIGS[config.provider as ProviderKey];
                      const Icon = providerConfig?.icon || Settings;
                      const isExpanded = expandedRows.has(config.id);

                      return (
                        <>
                          <TableRow key={config.id} className="group">
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => toggleRowExpansion(config.id)}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {config.provider}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{config.model_name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {config.base_url || "-"}
                            </TableCell>
                            <TableCell>
                              {config.is_active ? (
                                <Badge className="gap-1 bg-green-600 hover:bg-green-700">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="outline">Inactive</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {!config.is_active && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      activateMutation.mutate(config.id)
                                    }
                                    disabled={activateMutation.isPending}
                                  >
                                    Activate
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setTestingConfigId(config.id);
                                    testConfigMutation.mutate(config.id);
                                  }}
                                  disabled={testingConfigId === config.id}
                                  title="Test Connection"
                                >
                                  {testingConfigId === config.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Zap className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(config)}
                                  title="Edit Configuration"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() =>
                                    deleteMutation.mutate(config.id)
                                  }
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={6} className="bg-muted/50">
                                <div className="py-4 px-2 space-y-3">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground mb-1">
                                        Full Base URL
                                      </p>
                                      <p className="text-sm font-mono bg-background px-2 py-1 rounded">
                                        {config.base_url || "Not specified"}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground mb-1">
                                        API Key
                                      </p>
                                      <p className="text-sm font-mono bg-background px-2 py-1 rounded">
                                        {config.api_key
                                          ? `${"•".repeat(32)}${config.api_key.slice(-4)}`
                                          : "Not required"}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground mb-1">
                                        Created
                                      </p>
                                      <p className="text-sm">
                                        {new Date(
                                          config.created_at,
                                        ).toLocaleString()}
                                      </p>
                                    </div>
                                    {providerConfig?.setupUrl && (
                                      <div>
                                        <p className="text-sm font-medium text-muted-foreground mb-1">
                                          Documentation
                                        </p>
                                        <a
                                          href={providerConfig.setupUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sm text-primary hover:underline flex items-center gap-1"
                                        >
                                          Setup Guide
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Settings className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No LLM Configurations Yet
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                    Get started by configuring an AI model provider. Choose from
                    cloud-based services like OpenAI and Groq, or run models
                    locally with Ollama or LM Studio.
                  </p>
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">
                      Get started in 3 easy steps:
                    </h4>
                    <ol className="text-sm text-muted-foreground space-y-2 max-w-md mx-auto text-left">
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs">
                          1
                        </span>
                        <span>Choose a provider from the cards above</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs">
                          2
                        </span>
                        <span>
                          Add your credentials (API key for cloud providers)
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs">
                          3
                        </span>
                        <span>
                          Test connection and start extracting job posting data
                        </span>
                      </li>
                    </ol>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <ProfileSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Profile Settings Component
function ProfileSettings() {
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-profile"],
    queryFn: profileApi.getProfile,
  });

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address_line: "",
    city: "",
    postal_code: "",
    country: "",
    github_username: "",
    linkedin_username: "",
    website_url: "",
  });

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        address_line: profile.address_line || "",
        city: profile.city || "",
        postal_code: profile.postal_code || "",
        country: profile.country || "",
        github_username: profile.github_username || "",
        linkedin_username: profile.linkedin_username || "",
        website_url: profile.website_url || "",
      });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: profileApi.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      toast.success("Profile updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update profile");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Your Profile</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Personal information used for template variable replacement
        </p>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Your basic contact details for application documents
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                placeholder="Jane"
                value={formData.first_name}
                onChange={(e) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                placeholder="Doe"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
              />
            </div>
          </div>

          {(formData.first_name || formData.last_name) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Full name:</span>
              <code className="px-2 py-1 rounded bg-muted font-mono">
                {[formData.first_name, formData.last_name]
                  .filter(Boolean)
                  .join(" ")}
              </code>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              Variables:{" "}
              <code className="text-primary">\applicantfirstname</code>,{" "}
              <code className="text-primary">\applicantlastname</code>,{" "}
              <code className="text-primary">\applicantfullname</code>
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">
              <Mail className="h-4 w-4 inline mr-1" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="jane.doe@example.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Variable: <code className="text-primary">\applicantemail</code>
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">
              <Phone className="h-4 w-4 inline mr-1" />
              Phone
            </Label>
            <Input
              id="phone"
              placeholder="+49 123 4567890"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Variable: <code className="text-primary">\applicantphone</code>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Address
          </CardTitle>
          <CardDescription>
            Your location information for document headers
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="address_line">Street Address</Label>
            <Input
              id="address_line"
              placeholder="123 Main Street"
              value={formData.address_line}
              onChange={(e) =>
                setFormData({ ...formData, address_line: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Variable: <code className="text-primary">\applicantaddress</code>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="Berlin"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Variable: <code className="text-primary">\applicantcity</code>
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input
                id="postal_code"
                placeholder="12345"
                value={formData.postal_code}
                onChange={(e) =>
                  setFormData({ ...formData, postal_code: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Variable:{" "}
                <code className="text-primary">\applicantpostalcode</code>
              </p>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              placeholder="Germany"
              value={formData.country}
              onChange={(e) =>
                setFormData({ ...formData, country: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Variable: <code className="text-primary">\applicantcountry</code>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Professional Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Professional Links
          </CardTitle>
          <CardDescription>
            Social media and portfolio links for your CV
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="github_username">
              <Github className="h-4 w-4 inline mr-1" />
              GitHub Username
            </Label>
            <Input
              id="github_username"
              placeholder="janedoe"
              value={formData.github_username}
              onChange={(e) =>
                setFormData({ ...formData, github_username: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Variable: <code className="text-primary">\applicantgithub</code>
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="linkedin_username">
              <Linkedin className="h-4 w-4 inline mr-1" />
              LinkedIn Username
            </Label>
            <Input
              id="linkedin_username"
              placeholder="janedoe"
              value={formData.linkedin_username}
              onChange={(e) =>
                setFormData({ ...formData, linkedin_username: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Variable: <code className="text-primary">\applicantlinkedin</code>
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="website_url">
              <Globe className="h-4 w-4 inline mr-1" />
              Website URL
            </Label>
            <Input
              id="website_url"
              placeholder="https://www.janedoe.com"
              value={formData.website_url}
              onChange={(e) =>
                setFormData({ ...formData, website_url: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Variable: <code className="text-primary">\applicantwebsite</code>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Profile"
          )}
        </Button>
      </div>
    </form>
  );
}
