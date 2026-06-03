import { useState, useEffect } from "react";
import api from "../lib/api";

const STORAGE_PREFIX = "swastha:ai_history:";

const getStorageKey = (contextKey) => `${STORAGE_PREFIX}${contextKey || "family"}`;

const readLocalThreads = (contextKey) => {
  try {
    const stored = localStorage.getItem(getStorageKey(contextKey));
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error("Failed to load local AI history", err);
    return [];
  }
};

const writeLocalThreads = (contextKey, threads) => {
  try {
    localStorage.setItem(getStorageKey(contextKey), JSON.stringify(threads));
  } catch (err) {
    console.error("Failed to save local AI history", err);
  }
};

const normalizeThread = (thread, fallbackMember) => ({
  _id: thread?._id || `local_${Date.now()}`,
  title: thread?.title || "New chat",
  member: thread?.member || fallbackMember || "All family",
  contextKey: thread?.contextKey || "",
  messages: Array.isArray(thread?.messages) ? thread.messages : [],
  createdAt: thread?.createdAt || null,
  updatedAt: thread?.updatedAt || new Date().toISOString(),
  localOnly: Boolean(thread?.localOnly),
});

export const useAIChat = (contextKey, memberLabel) => {
  const [threads, setThreads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [usingLocalFallback, setUsingLocalFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadThreads = async () => {
      setIsLoading(true);

      try {
        const response = await api.get("/ai/memory", {
          params: { contextKey: contextKey || "family" },
          suppressErrorToast: true,
        });
        const serverThreads = Array.isArray(response?.threads)
          ? response.threads.map((thread) => normalizeThread(thread, memberLabel))
          : [];

        if (!cancelled) {
          setThreads(serverThreads);
          setUsingLocalFallback(false);
          writeLocalThreads(contextKey, serverThreads);
        }
      } catch {
        if (!cancelled) {
          setThreads(readLocalThreads(contextKey));
          setUsingLocalFallback(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadThreads();

    return () => {
      cancelled = true;
    };
  }, [contextKey, memberLabel]);

  const saveMemory = async (payload) => {
    const saveLocal = (threadPayload = payload) => {
      const threadId = threadPayload.threadId || `local_${Date.now()}`;

      setThreads((prev) => {
        let next;
        const existingIndex = prev.findIndex((thread) => thread._id === threadId);
        const newThread = {
          _id: threadId,
          title: threadPayload.title || "New chat",
          member: threadPayload.member || memberLabel,
          contextKey: threadPayload.contextKey || contextKey || "family",
          messages: threadPayload.messages || [],
          updatedAt: new Date().toISOString(),
          localOnly: true,
        };

        if (existingIndex > -1) {
          next = [...prev];
          next[existingIndex] = newThread;
        } else {
          next = [newThread, ...prev];
        }

        writeLocalThreads(contextKey, next);
        return next;
      });

      return { threadId };
    };

    if (usingLocalFallback || String(payload.threadId || "").startsWith("local_")) {
      return saveLocal();
    }

    try {
      const response = await api.post("/ai/memory", payload, {
        suppressErrorToast: true,
      });
      const savedThread = normalizeThread(
        {
          _id: response?.threadId,
          member: response?.member,
          contextKey: response?.contextKey,
          title: response?.title,
          messages: response?.messages,
        },
        memberLabel
      );

      setThreads((prev) => {
        const withoutSaved = prev.filter((thread) => thread._id !== savedThread._id);
        const next = [savedThread, ...withoutSaved].sort(
          (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
        );
        writeLocalThreads(contextKey, next);
        return next;
      });
      setUsingLocalFallback(false);

      return { threadId: savedThread._id };
    } catch {
      setUsingLocalFallback(true);
      return saveLocal();
    }
  };

  const deleteThread = async (id) => {
    const deleteLocal = () => {
      setThreads((prev) => {
        const next = prev.filter((thread) => thread._id !== id);
        writeLocalThreads(contextKey, next);
        return next;
      });
    };

    deleteLocal();

    if (!String(id || "").startsWith("local_")) {
      try {
        await api.delete(`/ai/memory/${id}`, { suppressErrorToast: true });
      } catch {
        setUsingLocalFallback(true);
      }
    }
  };

  return {
    threads,
    loading: isLoading,
    saveMemory,
    deleteThread,
    usingLocalFallback,
  };
};

export default useAIChat;
