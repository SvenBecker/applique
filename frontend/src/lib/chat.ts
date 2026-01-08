/**
 * AG-UI chat client integration
 */

import { API_URL } from "./api";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export class ChatClient {
  private abortController: AbortController | null = null;

  async sendMessage(
    content: string,
    onMessage: (message: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void,
  ): Promise<void> {
    this.abortController = new AbortController();

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          runId: crypto.randomUUID(),
          threadId: crypto.randomUUID(),
          messages: [
            {
              role: "user",
              content,
            },
          ],
          state: {},
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "TextMessageContent") {
                accumulatedContent += data.content;
                onMessage(accumulatedContent);
              } else if (data.type === "RunFinished") {
                onComplete();
              } else if (data.type === "RunError") {
                onError(new Error(data.error || "Unknown error"));
              }
            } catch {
              // Skip invalid JSON lines
            }
          }
        }
      }

      onComplete();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      onError(error instanceof Error ? error : new Error("Unknown error"));
    }
  }

  cancel(): void {
    this.abortController?.abort();
    this.abortController = null;
  }
}
