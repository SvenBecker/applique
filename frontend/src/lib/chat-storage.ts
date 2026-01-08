/**
 * Chat persistence layer using localStorage
 */

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

export type ChatSession = {
  threadId: string;
  messages: ChatMessage[];
  contextState: {
    jobPostingId?: string;
    cvFile?: string;
    coverLetterFile?: string;
    personalInfoFile?: string;
  };
  lastUpdated: number;
};

const STORAGE_KEY = "applique_chat_session";

export function saveCurrentChat(session: ChatSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.error("Failed to save chat session:", error);
  }
}

export function loadCurrentChat(): ChatSession | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load chat session:", error);
    return null;
  }
}

export function clearCurrentChat(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear chat session:", error);
  }
}
