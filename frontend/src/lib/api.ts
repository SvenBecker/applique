/**
 * API client for backend endpoints
 */

import type {
  DocumentGenerate,
  DocumentGenerateResponse,
  DocumentSave,
  DocumentSaveResponse,
  DocumentTemplate,
  FilePreviewResponse,
  GenerationHistory,
  LLMConfig,
  LLMConfigCreate,
  LLMFetchModels,
  LLMFetchModelsResponse,
  LLMTestConnection,
  LLMTestConnectionResponse,
  Posting,
  PostingCreate,
  PostingUpdate,
  PromptDetail,
  PromptInfo,
  PromptPreviewResponse,
  PromptResetResponse,
  PromptSaveResponse,
  StatusResponse,
  URLValidationResponse,
  UserProfile,
  UserProfileUpdate,
} from "./types";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.detail || errorMessage;
    } catch {
      // Use default error message
    }
    throw new ApiError(response.status, errorMessage);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Status API
export const statusApi = {
  getStatus: () => fetchApi<StatusResponse>("/api/status"),
};

// LLM Configuration API
export const llmApi = {
  getConfigs: () => fetchApi<LLMConfig[]>("/api/llm/configs"),

  createConfig: (data: LLMConfigCreate) =>
    fetchApi<LLMConfig>("/api/llm/configs", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  activateConfig: (configId: number) =>
    fetchApi<LLMConfig>(`/api/llm/configs/${configId}/activate`, {
      method: "POST",
    }),

  testConfig: (configId: number) =>
    fetchApi<LLMTestConnectionResponse>(`/api/llm/configs/${configId}/test`, {
      method: "POST",
    }),

  deleteConfig: (configId: number) =>
    fetchApi<void>(`/api/llm/configs/${configId}`, {
      method: "DELETE",
    }),

  testConnection: (data: LLMTestConnection) =>
    fetchApi<LLMTestConnectionResponse>("/api/llm/test-connection", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  fetchModels: (data: LLMFetchModels) =>
    fetchApi<LLMFetchModelsResponse>("/api/llm/fetch-models", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Postings API
export const postingsApi = {
  getPostings: () => fetchApi<Posting[]>("/api/postings"),

  getPosting: (postingId: number) =>
    fetchApi<Posting>(`/api/postings/${postingId}`),

  createPosting: (data: PostingCreate) =>
    fetchApi<Posting>("/api/postings", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updatePosting: (postingId: number, data: PostingUpdate) =>
    fetchApi<Posting>(`/api/postings/${postingId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  triggerExtraction: (postingId: number) =>
    fetchApi<Posting>(`/api/postings/${postingId}/extract`, {
      method: "POST",
    }),

  deletePosting: (postingId: number) =>
    fetchApi<void>(`/api/postings/${postingId}`, {
      method: "DELETE",
    }),

  validateUrls: () =>
    fetchApi<URLValidationResponse>("/api/postings/validate-urls", {
      method: "POST",
    }),
};

// Documents API
export const documentsApi = {
  getTemplates: () => fetchApi<DocumentTemplate>("/api/documents/templates"),

  generateDocuments: (data: DocumentGenerate) =>
    fetchApi<DocumentGenerateResponse>("/api/documents/generate", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  downloadDocument: (filename: string) => {
    window.open(`${API_URL}/api/documents/download/${filename}`, "_blank");
  },

  previewFile: async (fileType: string, filename: string) => {
    const response = await fetch(
      `${API_URL}/api/documents/preview/${fileType}/${filename}`,
    );
    if (!response.ok) {
      throw new ApiError(response.status, "Failed to preview file");
    }

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/pdf")) {
      return response.blob();
    }

    return response.json() as Promise<FilePreviewResponse>;
  },

  saveFile: (data: DocumentSave) =>
    fetchApi<DocumentSaveResponse>("/api/documents/save", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listFiles: (fileType: string) =>
    fetchApi<string[]>(`/api/documents/files/${fileType}`),

  getHistory: (limit: number = 50) =>
    fetchApi<GenerationHistory[]>(`/api/documents/history?limit=${limit}`),

  previewGenerated: (generationId: number) => {
    window.open(`${API_URL}/api/documents/preview/${generationId}`, "_blank");
  },

  deleteHistory: (generationId: number) =>
    fetchApi<{ message: string }>(`/api/documents/history/${generationId}`, {
      method: "DELETE",
    }),

  clearHistory: () =>
    fetchApi<{ message: string }>("/api/documents/history", {
      method: "DELETE",
    }),
};

// Prompts API
export const promptsApi = {
  listPrompts: () => fetchApi<PromptInfo[]>("/api/prompts"),

  getPrompt: (templateName: string) =>
    fetchApi<PromptDetail>(`/api/prompts/${templateName}`),

  previewPrompt: (templateName: string, context: Record<string, unknown>) =>
    fetchApi<PromptPreviewResponse>(`/api/prompts/${templateName}/preview`, {
      method: "POST",
      body: JSON.stringify({ context }),
    }),

  savePrompt: (templateName: string, content: string) =>
    fetchApi<PromptSaveResponse>(`/api/prompts/${templateName}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    }),

  resetPrompt: (templateName: string) =>
    fetchApi<PromptResetResponse>(`/api/prompts/${templateName}`, {
      method: "DELETE",
    }),
};

// Profile API
export const profileApi = {
  getProfile: () => fetchApi<UserProfile>("/api/profile"),

  updateProfile: (data: UserProfileUpdate) =>
    fetchApi<UserProfile>("/api/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

export { ApiError };
