/**
 * TypeScript types matching backend API schemas
 */

export enum ExtractionStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

export interface LLMConfig {
  id: number;
  provider: string;
  model_name: string;
  api_key: string | null;
  base_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface LLMConfigCreate {
  provider: string;
  model_name: string;
  api_key?: string | null;
  base_url?: string | null;
  is_active?: boolean;
}

export interface LLMTestConnection {
  provider: string;
  model_name: string;
  api_key?: string | null;
  base_url?: string | null;
}

export interface LLMTestConnectionResponse {
  status: string;
  message: string;
}

export interface LLMFetchModels {
  base_url: string;
  api_key?: string | null;
}

export interface LLMFetchModelsResponse {
  models: string[];
}

export interface JobMetadata {
  company_name?: string;
  job_title?: string;
  recipient_name?: string;
  city?: string;
  zip_code?: string;
  street_address?: string;
  is_remote?: boolean;
  salary_range?: string;
  job_description_summary?: string;
}

export interface Posting {
  id: number;
  url: string;
  description: string | null;
  extraction_status: ExtractionStatus;
  generated_metadata: JobMetadata | null;
  full_content: string | null;
  error_message: string | null;
  status_updated: boolean;
  created_at: string;
}

export interface PostingCreate {
  url: string;
  description?: string | null;
  trigger_extraction?: boolean;
}

export interface PostingUpdate {
  company_name: string;
  job_title: string;
  recipient_name: string;
  city: string;
  zip_code: string;
  street_address: string;
  is_remote?: boolean | null;
  salary_range?: string | null;
  job_description_summary?: string | null;
  full_content?: string | null;
}

export interface URLValidationResult {
  posting_id: number;
  url: string;
  is_valid: boolean;
  status_code: number | null;
  error_message: string | null;
}

export interface URLValidationResponse {
  results: URLValidationResult[];
  total_checked: number;
  valid_count: number;
  invalid_count: number;
}

export interface DocumentTemplate {
  cvs: string[];
  cover_letters: string[];
  attachments: string[];
  personal_information: string[];
}

export interface DocumentGenerate {
  cv_file?: string | null;
  cover_letter_file?: string | null;
  attachments?: string[] | null;
  combine?: boolean;
  posting_id?: number | null;
  custom_variables?: Record<string, string> | null;
}

export interface DocumentGenerateResponse {
  filename: string;
  message: string;
  generation_id?: number | null;
}

export interface StatusResponse {
  active_llm: LLMConfig | null;
  total_postings: number;
  pending_postings: number;
  completed_postings: number;
  failed_postings: number;
}

export interface FilePreviewResponse {
  filename: string;
  content: string;
  file_type: string;
}

export interface DocumentSave {
  file_type: "cv" | "cover_letter" | "personal_information";
  filename: string;
  content: string;
  new_filename?: string | null;
}

export interface DocumentSaveResponse {
  filename: string;
  message: string;
}

export interface GenerationHistory {
  id: number;
  posting_id: number | null;
  company_name: string | null;
  job_title: string | null;
  filename: string;
  cv_file: string | null;
  cover_letter_file: string | null;
  attachments: string[] | null;
  combined: boolean;
  created_at: string;
}

// Prompt API types
export interface PromptInfo {
  name: string;
  display_name: string;
  description: string;
  is_customized: boolean;
  variables: string[];
}

export interface PromptDetail {
  name: string;
  display_name: string;
  description: string;
  is_customized: boolean;
  variables: string[];
  content: string;
  default_content: string;
}

export interface PromptPreviewRequest {
  context: Record<string, unknown>;
}

export interface PromptPreviewResponse {
  rendered: string;
}

export interface PromptSaveRequest {
  content: string;
}

export interface PromptSaveResponse {
  message: string;
  is_customized: boolean;
}

export interface PromptResetResponse {
  message: string;
  is_customized: boolean;
}

// User Profile
export interface UserProfile {
  id: number;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null; // Computed property
  email: string | null;
  phone: string | null;
  address_line: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  github_username: string | null;
  linkedin_username: string | null;
  website_url: string | null;
  custom_variables: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfileUpdate {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address_line?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  github_username?: string | null;
  linkedin_username?: string | null;
  website_url?: string | null;
  custom_variables?: Record<string, string> | null;
}
