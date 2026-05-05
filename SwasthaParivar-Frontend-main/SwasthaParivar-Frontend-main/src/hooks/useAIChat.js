import { useMemo, useState, useEffect } from "react";

const STORAGE_PREFIX = "swastha:ai_history:";

export const useAIChat = (contextKey, memberLabel) => {
  const [threads, setThreads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load threads from local storage on mount or when context changes
  useEffect(() => {
    const storageKey = `${STORAGE_PREFIX}${contextKey || "family"}`;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setThreads(JSON.parse(stored));
      } else {
        setThreads([]);
      }
    } catch (err) {
      console.error("Failed to load local AI history", err);
      setThreads([]);
    } finally {
      setIsLoading(false);
    }
  }, [contextKey]);

  const saveMemory = async (payload) => {
    const storageKey = `${STORAGE_PREFIX}${contextKey || "family"}`;
    
    // In our hybrid model, we don't save the full history to the cloud
    // But we generate a local thread ID if one doesn't exist
    const threadId = payload.threadId || `local_${Date.now()}`;
    
    setThreads(prev => {
      let next;
      const existingIndex = prev.findIndex(t => t._id === threadId);
      
      const newThread = {
        _id: threadId,
        title: payload.title || "New Chat",
        member: payload.member,
        messages: payload.messages,
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex > -1) {
        next = [...prev];
        next[existingIndex] = newThread;
      } else {
        next = [newThread, ...prev];
      }

      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });

    return { threadId };
  };

  const deleteThread = async (id) => {
    const storageKey = `${STORAGE_PREFIX}${contextKey || "family"}`;
    setThreads(prev => {
      const next = prev.filter(t => t._id !== id);
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  return {
    threads,
    loading: isLoading,
    saveMemory,
    deleteThread,
  };
};

export default useAIChat;
