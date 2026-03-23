import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Paperclip, Plus, Send, Sparkles, UserRound } from "lucide-react";

import api from "../lib/api";
import { Button } from "../components/ui";
import { useAIChat } from "../hooks/useAIChat";
import notify from "../lib/notify";
import { saveReminderDraft } from "../lib/reminderDraft";
import { useFamilyStore } from "../store/family-store";
import "./AIChat.css";

const MEDICATION_KEYWORDS = [
  "paracetamol",
  "acetaminophen",
  "ibuprofen",
  "cetirizine",
  "azithromycin",
  "amoxicillin",
  "omeprazole",
  "pantoprazole",
  "metformin",
  "insulin",
  "iron",
  "vitamin d",
  "calcium",
  "salbutamol",
];

const SYMPTOM_KEYWORDS = [
  "fever",
  "cough",
  "cold",
  "sore throat",
  "headache",
  "body ache",
  "nausea",
  "vomiting",
  "diarrhea",
  "acidity",
  "bloating",
  "fatigue",
  "rash",
  "congestion",
  "dizziness",
  "wheezing",
];

const SUGGESTED_PROMPTS = [
  "What are symptoms of dengue?",
  "Is paracetamol safe for children under 5?",
  "What can help with mild acidity after dinner?",
  "How should I prepare for a blood test tomorrow morning?",
];

const fileToBase64Payload = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      const [prefix, data] = result.split(",", 2);
      const mimeType = prefix.match(/data:(.*);base64/)?.[1] || file.type || "image/png";

      if (!data) {
        reject(new Error("Could not read attachment"));
        return;
      }

      resolve({
        data,
        mimeType,
        preview: result,
        fileName: file.name,
      });
    };

    reader.onerror = () => reject(new Error("Could not read attachment"));
    reader.readAsDataURL(file);
  });

const buildDefaultConversation = () => [];

const findMatches = (text, keywords) => {
  const normalized = String(text || "").toLowerCase();
  return keywords.filter((keyword) => normalized.includes(keyword)).slice(0, 3);
};

const toDisplayLabel = (value = "") =>
  value.replace(/\b\w/g, (character) => character.toUpperCase());

const safeReadConversation = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const truncateThreadTitle = (value = "", maxLength = 42) => {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
};

const formatConversationTime = (timestamp) => {
  if (!timestamp) return "No activity yet";

  const date = new Date(timestamp);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  if (sameDay) {
    return date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return date.toLocaleDateString("en-IN", { weekday: "short" });
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
};

const getConversationTitle = (messages = [], fallbackLabel = "New chat") => {
  const firstUserMessage = messages.find(
    (message) => message?.sender === "user" && String(message?.text || "").trim()
  );

  if (!firstUserMessage) {
    return fallbackLabel;
  }

  return truncateThreadTitle(firstUserMessage.text);
};

const AIChat = () => {
  const navigate = useNavigate();
  const { members: userFamily, selectedMember, setSelectedMember, refreshMembers } = useFamilyStore();
  const contexts = useMemo(
    () => [
      { key: "family", label: "All family", memberValue: "All family", memberId: null },
      ...userFamily.map((member) => ({
        key: member._id || member.name,
        label: member.name,
        memberValue: member.name,
        memberId: member._id,
      })),
    ],
    [userFamily]
  );

  const [selectedContext, setSelectedContext] = useState(() => selectedMember?._id || "family");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(true);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [pendingReminderSuggestion, setPendingReminderSuggestion] = useState(null);
  const listRef = useRef(null);

  const currentContext = contexts.find((item) => item.key === selectedContext) || contexts[0];
  const contextLabel = currentContext?.label || "All family";
  const memberValue = currentContext?.memberValue || "All family";
  const activeMember = useMemo(
    () => userFamily.find((member) => member._id === currentContext?.memberId) || null,
    [currentContext?.memberId, userFamily]
  );
  const { messages: remoteMessages, saveMemory } = useAIChat(memberValue);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (!selectedMember?._id) return;
    setSelectedContext(selectedMember._id);
  }, [selectedMember?._id]);

  useEffect(() => {
    if (contexts.some((context) => context.key === selectedContext)) return;
    setSelectedContext("family");
  }, [contexts, selectedContext]);

  useEffect(() => {
    if (remoteMessages.length > 0) {
      setMessages(remoteMessages);
      return;
    }

    const cached = safeReadConversation(`aichat_mem_${memberValue}`);
    setMessages(cached.length ? cached : buildDefaultConversation());
  }, [memberValue, remoteMessages]);

  useEffect(() => {
    localStorage.setItem(`aichat_mem_${memberValue}`, JSON.stringify(messages));
  }, [memberValue, messages]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const conversationHistory = contexts
    .map((context) => {
      const parsed = safeReadConversation(`aichat_mem_${context.memberValue}`);
      const lastMessage = parsed[parsed.length - 1];
      const userMessageCount = parsed.filter((message) => message?.sender === "user").length;

      return {
        ...context,
        title: getConversationTitle(parsed, `New ${context.label.toLowerCase()} chat`),
        updatedLabel: formatConversationTime(lastMessage?.ts || 0),
        messageCount: userMessageCount,
        ts: lastMessage?.ts || 0,
      };
    })
    .sort((first, second) =>
      first.key === selectedContext ? -1 : second.key === selectedContext ? 1 : second.ts - first.ts
    );

  const persistConversation = async (nextMessages) => {
    try {
      await saveMemory({
        member: memberValue,
        messages: nextMessages,
      });
    } catch {
      // local cache stays as the fallback source
    }
  };

  const startNewChat = async () => {
    const nextMessages = buildDefaultConversation();
    setMessages(nextMessages);
    setInput("");
    setAttachmentPreview(null);
    setPendingReminderSuggestion(null);
    setMobileHistoryOpen(false);
    await persistConversation(nextMessages);
  };

  const buildAiActions = (text) => {
    if (!activeMember) {
      return [];
    }

    const medications = findMatches(text, MEDICATION_KEYWORDS);
    const symptoms = findMatches(text, SYMPTOM_KEYWORDS);
    const actions = [];

    if (medications[0]) {
      actions.push({
        type: "add-medication",
        label: `Add ${toDisplayLabel(medications[0])} to ${activeMember.name}`,
        value: medications[0],
      });
    }

    if (symptoms.length) {
      actions.push({
        type: "log-symptom",
        label: `Log ${symptoms.map(toDisplayLabel).join(", ")}`,
        value: symptoms,
      });
    }

    if (medications.length || /daily|twice|schedule|remind|follow up|take\b/i.test(text)) {
      actions.push({
        type: "set-reminder",
        label: `Set reminder for ${activeMember.name}`,
        value: medications[0] || "Follow-up care",
      });
    }

    return actions;
  };

  const createAiMessage = (text, options = {}) => ({
    sender: "ai",
    text,
    ts: Date.now(),
    actions: options.disableActions ? [] : buildAiActions(text),
  });

  const openReminderDraft = ({ title, memberId, memberName, description = "", frequency = "daily" }) => {
    saveReminderDraft({
      title,
      description,
      category: "medicine",
      frequency,
      selectedMembers: [memberId],
      memberName,
    });
    navigate("/reminders");
  };

  const handleMessageAction = async (action, message) => {
    if (!activeMember) {
      notify.error("Select a specific family member first");
      return;
    }

    try {
      if (action.type === "add-medication") {
        const nextMedications = Array.from(
          new Set([...(activeMember.medications || []), toDisplayLabel(action.value)])
        );
        await api.patch(`/members/${activeMember._id}/profile`, {
          medications: nextMedications,
        });
        await refreshMembers?.();
        notify.success(`${toDisplayLabel(action.value)} added to ${activeMember.name}`);
        setPendingReminderSuggestion({
          title: toDisplayLabel(action.value),
          memberId: activeMember._id,
          memberName: activeMember.name,
        });
        return;
      }

      if (action.type === "log-symptom") {
        await api.post("/symptoms/episodes", {
          memberId: activeMember._id,
          symptoms: action.value.map((item) => ({
            name: toDisplayLabel(item),
            severity: 2,
          })),
          severity: "mild",
          sourceMessage: message.text,
        });
        notify.success(`Symptom episode logged for ${activeMember.name}`);
        return;
      }

      if (action.type === "set-reminder") {
        openReminderDraft({
          title: toDisplayLabel(action.value),
          memberId: activeMember._id,
          memberName: activeMember.name,
          description: `Suggested from AI guidance for ${activeMember.name}.`,
        });
      }
    } catch (error) {
      notify.error(error.message || "Could not complete that action");
    }
  };

  const sendMessage = async (messageText = input) => {
    const trimmed = String(messageText || "").trim();
    if (!trimmed) return;

    const nextUserMessage = { sender: "user", text: trimmed, ts: Date.now() };
    const history = [...messages, nextUserMessage];
    setMessages(history);
    setInput("");
    setLoading(true);
    setMobileHistoryOpen(false);
    persistConversation(history);

    try {
      const response = await api.post("/ai/chat", {
        message: trimmed,
        member: memberValue,
        history: history.slice(-8).map(({ sender, text, ts }) => ({ sender, text, ts })),
      });

      const nextMessages = [
        ...history,
        createAiMessage(response?.reply || response?.text || "No response from AI.", {
          disableActions: Boolean(response?.outOfScope),
        }),
      ];
      setMessages(nextMessages);
      persistConversation(nextMessages);
    } catch (error) {
      const fallbackMessage =
        error?.message ||
        "I could not reach the server right now. Please try again in a moment.";
      const nextMessages = [
        ...history,
        createAiMessage(fallbackMessage),
      ];
      setMessages(nextMessages);
      persistConversation(nextMessages);
    } finally {
      setLoading(false);
    }
  };

  const sendAttachment = async () => {
    if (!attachmentPreview) return;

    const nextMessages = [
      ...messages,
      {
        sender: "user",
        text: `Attached ${attachmentPreview.fileName}`,
        ts: Date.now(),
        attachment: attachmentPreview.preview,
      },
    ];
    setMessages(nextMessages);
    persistConversation(nextMessages);
    setLoading(true);

    try {
      const response = await api.post("/ai/attachments", {
        imageData: attachmentPreview.data,
        mimeType: attachmentPreview.mimeType,
        fileName: attachmentPreview.fileName,
        member: memberValue,
      });

      const replyText =
        response?.isHealthReport === false
          ? response?.reason || "Please upload a genuine health report."
          : response?.reply || "Attachment reviewed successfully.";

      const updatedMessages = [...nextMessages, createAiMessage(replyText)];
      setMessages(updatedMessages);
      persistConversation(updatedMessages);
      setAttachmentPreview(null);
    } catch {
      const updatedMessages = [
        ...nextMessages,
        createAiMessage("I could not analyze this attachment right now."),
      ];
      setMessages(updatedMessages);
      persistConversation(updatedMessages);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-chat-page">
      <div className="app-shell ai-chat-shell">
        <aside className={`ai-chat-sidebar ${mobileHistoryOpen ? "is-open" : ""}`}>
          <div className="ai-chat-sidebar__head">
            <div className="ai-chat-sidebar__title-block">
              <span className="eyebrow">
                <Sparkles size={16} />
                Care conversations
              </span>
              <h1 className="text-h4">Conversations</h1>
            </div>

            <button type="button" className="ai-chat-sidebar__new" onClick={startNewChat}>
              <Plus size={16} />
              New chat
            </button>
          </div>

          <div className="ai-chat-history">
            {conversationHistory.map((conversation) => (
              <button
                key={conversation.key}
                type="button"
                className={`ai-chat-history__item ${selectedContext === conversation.key ? "is-active" : ""}`}
                onClick={() => {
                  setSelectedContext(conversation.key);
                  setSelectedMember(
                    conversation.memberId
                      ? userFamily.find((member) => member._id === conversation.memberId) || null
                      : null
                  );
                  setMobileHistoryOpen(false);
                }}
              >
                <span className="avatar avatar--sm">{conversation.label.charAt(0)}</span>
                <div className="ai-chat-history__content">
                  <div className="ai-chat-history__item-head">
                    <strong>{conversation.title}</strong>
                    <small>{conversation.updatedLabel}</small>
                  </div>
                  <div className="ai-chat-history__item-meta">
                    <span>{conversation.label}</span>
                    <span>{conversation.messageCount} question{conversation.messageCount === 1 ? "" : "s"}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="ai-chat-main">
          <div className="ai-chat-main__top">
            <div className="ai-chat-main__intro">
              <button type="button" className="icon-btn ai-chat-back" onClick={() => setMobileHistoryOpen(true)}>
                <ArrowLeft size={18} />
              </button>

              <div>
                <h2 className="ai-chat-main__title">Family AI advisor</h2>
                <p className="ai-chat-main__subtitle">Health-only guidance for symptoms, medicines, reports, and reminders</p>
              </div>
            </div>

            <div className="ai-chat-main__context">
              <div className="badge badge--primary">
                <UserRound size={14} />
                Context: talking about {contextLabel}
              </div>

              <div className="ai-chat-context-pills">
                {contexts.map((context) => (
                  <button
                    key={context.key}
                    type="button"
                    className={`pill-button ${selectedContext === context.key ? "is-active" : ""}`}
                    onClick={() => {
                      setSelectedContext(context.key);
                      setSelectedMember(
                        context.memberId
                          ? userFamily.find((member) => member._id === context.memberId) || null
                          : null
                      );
                    }}
                  >
                    {context.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="ai-chat-messages" ref={listRef}>
            <div className={`ai-chat-thread ${hasMessages ? "" : "is-empty"}`}>
              {!hasMessages ? (
                <div className="ai-chat-empty">
                  <h3>Ask a family health question</h3>
                  <p>This assistant only handles health topics like symptoms, medicines, reports, vitals, reminders, and safer next steps.</p>
                  <div className="ai-chat-empty__suggestions">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <button key={prompt} type="button" className="pill-button" onClick={() => sendMessage(prompt)}>
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {messages.map((message, index) => (
                <article
                  key={`${message.ts || index}-${index}`}
                  className={`ai-chat-message ${message.sender === "user" ? "is-user" : "is-ai"}`}
                >
                  <div className={`ai-chat-bubble ${message.sender === "user" ? "is-user" : "is-ai"}`}>
                    {message.attachment ? <img src={message.attachment} alt="attachment" loading="lazy" /> : null}
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>

                    {message.sender === "ai" && message.actions?.length ? (
                      <div className="ai-chat-actions">
                        {message.actions.map((action) => (
                          <button
                            key={`${message.ts}-${action.type}-${action.label}`}
                            type="button"
                            className="pill-button"
                            onClick={() => handleMessageAction(action, message)}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <small>{new Date(message.ts || Date.now()).toLocaleString("en-IN")}</small>
                  </div>
                </article>
              ))}

              {loading ? (
                <article className="ai-chat-message is-ai">
                  <div className="ai-chat-bubble is-ai ai-chat-bubble--typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </article>
              ) : null}
            </div>
          </div>

          <div className="ai-chat-composer-wrap">
            {pendingReminderSuggestion ? (
              <div className="ai-chat-reminder-suggestion">
                <div>
                  <strong>Want to set a daily reminder for {pendingReminderSuggestion.title}?</strong>
                  <p>
                    This was just added to {pendingReminderSuggestion.memberName}&apos;s medications, so we can prefill
                    the reminder for you.
                  </p>
                </div>
                <Button size="sm" onClick={() => openReminderDraft(pendingReminderSuggestion)}>
                  Create reminder
                </Button>
              </div>
            ) : null}

            {attachmentPreview ? (
              <div className="ai-chat-attachment">
                <img src={attachmentPreview.preview} alt={attachmentPreview.fileName} loading="lazy" />
                <div>
                  <strong>{attachmentPreview.fileName}</strong>
                  <p>Ready to send to the AI for review.</p>
                </div>
                <Button size="sm" onClick={sendAttachment}>
                  Send attachment
                </Button>
              </div>
            ) : null}

            <div className="ai-chat-composer">
              <label className="ai-chat-composer__icon">
                <Paperclip size={18} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const payload = await fileToBase64Payload(file);
                    setAttachmentPreview(payload);
                  }}
                />
              </label>

              <input
                className="ai-chat-composer__input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about symptoms, medicines, reports, vitals, or reminders"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
              />

              <Button rightIcon={<Send size={16} />} onClick={() => sendMessage()}>
                Send
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AIChat;
