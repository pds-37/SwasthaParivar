import { useState } from "react";

import { buildApiUrl } from "../lib/api";

const parseSseChunk = (buffer, onEvent) => {
  let workingBuffer = buffer;
  const parts = workingBuffer.split("\n\n");
  workingBuffer = parts.pop() || "";

  for (const part of parts) {
    const line = part
      .split("\n")
      .find((entry) => entry.startsWith("data: "));

    if (!line) {
      continue;
    }

    try {
      onEvent(JSON.parse(line.slice(6)));
    } catch {
      // Ignore malformed SSE frames.
    }
  }

  return workingBuffer;
};

export function useStreamingChat() {
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamMeta, setStreamMeta] = useState({
    riskLevel: "LOW",
    followUpPrompt: null,
    suggestedReminder: null,
  });

  const resetStreaming = () => {
    setStreamingText("");
    setStreamMeta({
      riskLevel: "LOW",
      followUpPrompt: null,
      suggestedReminder: null,
    });
  };

  const sendMessage = async ({ message, memberId, collectedData, chatHistory, language }) => {
    setIsStreaming(true);
    resetStreaming();

    const response = await fetch(buildApiUrl("/ai/chat/stream"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ message, memberId, collectedData, chatHistory, language }),
    });

    if (!response.ok || !response.body) {
      let errorMessage = "Could not start the AI stream.";
      let errorData = null;

      try {
        errorData = await response.json();
        errorMessage = errorData?.message || errorData?.error?.message || errorMessage;
      } catch {
        // Ignore JSON parsing errors for non-SSE failures.
      }

      setIsStreaming(false);
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = errorData;
      throw error;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalResult = {
      reply: "",
      riskLevel: "LOW",
      followUpPrompt: null,
      suggestedReminder: null,
      fallback: false,
      quotaExceeded: false,
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        buffer = parseSseChunk(buffer, (data) => {
          if (data.token) {
            finalResult.reply += data.token;
            setStreamingText((current) => current + data.token);
          }

          if (data.riskLevel || data.followUpPrompt || data.suggestedReminder) {
            setStreamMeta((current) => ({
              riskLevel: data.riskLevel || current.riskLevel,
              followUpPrompt:
                data.followUpPrompt === undefined
                  ? current.followUpPrompt
                  : data.followUpPrompt,
              suggestedReminder:
                data.suggestedReminder === undefined
                  ? current.suggestedReminder
                  : data.suggestedReminder,
            }));
          }

          if (data.done) {
            finalResult = {
              ...finalResult,
              ...data,
              reply: data.reply || finalResult.reply,
            };
          }
        });
      }

      return finalResult;
    } finally {
      setIsStreaming(false);
    }
  };

  return {
    streamingText,
    isStreaming,
    streamMeta,
    sendMessage,
    resetStreaming,
  };
}
