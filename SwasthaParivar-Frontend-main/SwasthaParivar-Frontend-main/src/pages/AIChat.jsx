import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";

import api from "../lib/api";
import { Button } from "../components/ui";
import { useAIChat } from "../hooks/useAIChat";
import notify from "../lib/notify";
import { saveReminderDraft } from "../lib/reminderDraft";
import { useFamilyStore } from "../store/family-store";
import { useUIStore } from "../store/ui-store";
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
  "hair loss",
  "hair fall",
  "alopecia",
  "dandruff",
  "scalp",
];

const SUGGESTED_PROMPTS = [
  "What are symptoms of dengue?",
  "Is paracetamol safe for children under 5?",
  "What can help with mild acidity after dinner?",
  "How should I prepare for a blood test tomorrow morning?",
];

const HEALTH_FALLBACK_KEYWORDS = [
  "health",
  "symptom",
  "symptoms",
  "fever",
  "cough",
  "cold",
  "pain",
  "headache",
  "throat",
  "diarrhea",
  "vomiting",
  "nausea",
  "rash",
  "allergy",
  "medicine",
  "medicines",
  "medication",
  "doctor",
  "report",
  "blood",
  "pressure",
  "sugar",
  "sleep",
  "hydration",
  "hair",
  "hair loss",
  "hair fall",
  "alopecia",
  "dandruff",
  "scalp",
  "remedy",
  "remedies",
  "reminder",
];

const CHAT_HISTORY_LIMIT = 8;
const CHAT_HISTORY_TEXT_MAX = 2000;

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

const serializeHistoryForRequest = (entries = []) =>
  entries.slice(-CHAT_HISTORY_LIMIT).map(({ sender, text, ts }) => ({
    sender: sender === "user" ? "user" : "ai",
    text: String(text || "").trim().slice(0, CHAT_HISTORY_TEXT_MAX),
    ts,
  }));

const findMatches = (text, keywords) => {
  const normalized = String(text || "").toLowerCase();
  return keywords.filter((keyword) => normalized.includes(keyword)).slice(0, 3);
};

const toDisplayLabel = (value = "") =>
  value.replace(/\b\w/g, (character) => character.toUpperCase());

const isLikelyHealthMessage = (text = "") => {
  const normalized = String(text || "").trim().toLowerCase();
  return HEALTH_FALLBACK_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

const buildClientHealthFallbackReply = (message = "", focusLabel = "your family") => {
  const normalized = String(message || "").trim().toLowerCase();

  if (!normalized) {
    return "Please ask a health-related question about symptoms, medicines, reports, or reminders.";
  }

  if (!isLikelyHealthMessage(normalized)) {
    return "I can help with family health topics like symptoms, medicines, reports, remedies, and reminders. Please ask a health-related question and mention who it is about.";
  }

  const response = {
    summary: `Here is a careful health-support answer for ${focusLabel}.`,
    doNow: [
      "Encourage rest, hydration, and light food if the person feels unwell.",
      "Track symptoms for the next 12 to 24 hours and note whether they improve or worsen.",
    ],
    watchOuts: [
      "Do not start new medicines unless you already know they are safe for this person.",
    ],
    doctor: [
      "Seek medical help sooner if symptoms are severe, unusual, or getting worse.",
    ],
  };

  if (/(acidity|acid reflux|heartburn|indigestion|gas|bloating)/i.test(normalized)) {
    response.summary = `This sounds like mild acidity or indigestion for ${focusLabel}.`;
    response.doNow = [
      "Sip water slowly and stay upright after meals.",
      "Keep the next meal light and avoid oily, spicy, or very late-night food.",
      "A short gentle walk can help if the person feels comfortable.",
    ];
    response.watchOuts = [
      "Avoid lying flat right after eating.",
      "Avoid repeated trigger foods if they usually worsen symptoms.",
    ];
    response.doctor = [
      "Get urgent medical care for chest pain, vomiting blood, black stools, trouble swallowing, or severe persistent pain.",
      "Arrange a medical review if this is happening often or disturbing sleep.",
    ];
  } else if (/(fever|temperature|viral)/i.test(normalized)) {
    response.summary = `This sounds like a fever-related concern for ${focusLabel}.`;
    response.doNow = [
      "Encourage fluids, rest, and light food.",
      "Check temperature and note any worsening symptoms.",
      "Use only medicines already known to be safe for that person.",
    ];
    response.watchOuts = [
      "Watch for dehydration, unusual sleepiness, confusion, or reduced urination.",
    ];
    response.doctor = [
      "Get urgent help for breathing trouble, severe weakness, seizures, dehydration, or fever that is very high or persistent.",
    ];
  } else if (/(cough|cold|sore throat|congestion)/i.test(normalized)) {
    response.summary = `This sounds like a mild upper-respiratory issue for ${focusLabel}.`;
    response.doNow = [
      "Encourage fluids, warm drinks, and rest.",
      "Steam inhalation may help some adults if done carefully.",
      "Honey can soothe the throat for adults and children over 1 year old.",
    ];
    response.watchOuts = [
      "Avoid smoke exposure and very cold drinks if they worsen symptoms.",
    ];
    response.doctor = [
      "Get medical help for breathing difficulty, chest pain, blue lips, wheezing, or symptoms that keep worsening.",
    ];
  } else if (/(medicine|medicines|medication|tablet|dose|dosage)/i.test(normalized)) {
    response.summary = `This looks like a medicine-safety question for ${focusLabel}.`;
    response.doNow = [
      "Double-check the medicine name, dose, age, allergies, and current medicines before taking it.",
      "Use the prescription label or pharmacist instructions if available.",
    ];
    response.watchOuts = [
      "Do not guess the dose for children, pregnancy, or older adults.",
      "Avoid combining medicines unless you know they are safe together.",
    ];
    response.doctor = [
      "Contact a pharmacist or doctor if the medicine, dose, or timing is unclear.",
    ];
  } else if (/(hair loss|hair fall|alopecia|dandruff|itchy scalp|thinning hair)/i.test(normalized)) {
    response.summary = `This sounds like a hair or scalp concern for ${focusLabel}.`;
    response.doNow = [
      "Check for recent stress, illness, rapid weight change, poor sleep, or diet changes that may be contributing.",
      "Use gentle hair care, avoid harsh heat or tight hairstyles, and keep the scalp clean.",
      "Support recovery with balanced meals that include enough protein and iron-rich foods.",
    ];
    response.watchOuts = [
      "Avoid starting random supplements or medicated products without understanding the cause.",
      "Watch for patchy bald spots, scalp redness, severe itching, or rapid worsening.",
    ];
    response.doctor = [
      "Arrange a medical review if hair loss is sudden, patchy, persistent, or happening with fatigue, weight change, or hormonal symptoms.",
    ];
  }

  return [
    "Summary:",
    response.summary,
    "",
    "What to do now:",
    ...response.doNow.map((item) => `- ${item}`),
    "",
    "Watch-outs:",
    ...response.watchOuts.map((item) => `- ${item}`),
    "",
    "When to contact a doctor:",
    ...response.doctor.map((item) => `- ${item}`),
  ].join("\n");
};

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
  const {
    members: userFamily,
    selfMember,
    selectedMember,
    activeView,
    setSelectedMember,
    refreshMembers,
  } = useFamilyStore();
  const { sidebarCollapsed } = useUIStore();
  const contexts = useMemo(
    () =>
      activeView === "self"
        ? (selfMember
            ? [
                {
                  key: selfMember._id || "self",
                  label: selfMember.name || "Self",
                  memberValue: selfMember.name || "Self",
                  memberId: selfMember._id,
                  requestValue: "Self",
                },
              ]
            : [{ key: "self", label: "Self", memberValue: "Self", memberId: null, requestValue: "Self" }])
        : [
            {
              key: "family",
              label: "All family",
              memberValue: "All family",
              memberId: null,
              requestValue: "family",
            },
            ...userFamily.map((member) => ({
              key: member._id || member.name,
              label: member.name,
              memberValue: member.name,
              memberId: member._id,
              requestValue: member.name,
            })),
          ],
    [activeView, selfMember, userFamily]
  );

  const [selectedContext, setSelectedContext] = useState(() =>
    activeView === "self" ? selfMember?._id || "self" : selectedMember?._id || "family"
  );
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(true);
  const [desktopRailCollapsed, setDesktopRailCollapsed] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [pendingReminderSuggestion, setPendingReminderSuggestion] = useState(null);
  const listRef = useRef(null);

  const currentContext = contexts.find((item) => item.key === selectedContext) || contexts[0];
  const contextLabel = currentContext?.label || "All family";
  const memberValue = currentContext?.memberValue || "All family";
  const requestMemberValue =
    currentContext?.requestValue || (activeView === "self" ? "Self" : "family");
  const activeMember = useMemo(
    () => userFamily.find((member) => member._id === currentContext?.memberId) || null,
    [currentContext?.memberId, userFamily]
  );
  
  const { threads, saveMemory, deleteThread } = useAIChat();
  const [activeThreadId, setActiveThreadId] = useState(null);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (activeView === "self" && selfMember?._id) {
      setSelectedContext(selfMember._id);
      setSelectedMember(selfMember);
      return;
    }

    if (!selectedMember?._id) return;
    setSelectedContext(selectedMember._id);
  }, [activeView, selectedMember?._id, selfMember, setSelectedMember]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (sidebarCollapsed && window.matchMedia("(min-width: 64rem)").matches) {
      setDesktopRailCollapsed(true);
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (contexts.some((context) => context.key === selectedContext)) return;
    setSelectedContext("family");
  }, [contexts, selectedContext]);

  useEffect(() => {
    if (activeThreadId && threads) {
      const thread = threads.find((t) => t._id === activeThreadId);
      if (thread) {
        setMessages(thread.messages || []);
        const contextKey = contexts.find((c) => c.memberValue === thread.member)?.key || "family";
        setSelectedContext(contextKey);
      }
    }
  }, [activeThreadId, threads, contexts]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const conversationHistory = (threads || [])
    .map((thread) => {
      const lastMessage = thread.messages?.[thread.messages.length - 1];
      const userMessageCount = thread.messages?.filter((m) => m?.sender === "user").length || 0;

      return {
        _id: thread._id,
        title: thread.title || "New chat",
        member: thread.member,
        updatedLabel: formatConversationTime(thread.updatedAt ? new Date(thread.updatedAt).getTime() : (lastMessage?.ts || 0)),
        messageCount: userMessageCount,
        ts: thread.updatedAt ? new Date(thread.updatedAt).getTime() : (lastMessage?.ts || 0),
      };
    })
    .sort((a, b) => b.ts - a.ts);

  const persistConversation = async (nextMessages) => {
    try {
      const derivedTitle = getConversationTitle(nextMessages, `New ${contextLabel.toLowerCase()} chat`);
      const res = await saveMemory({
        threadId: activeThreadId,
        member: memberValue,
        title: derivedTitle,
        messages: nextMessages,
      });
      if (!activeThreadId && res?.data?.threadId) {
        setActiveThreadId(res.data.threadId);
      }
    } catch {
      // API call failed
    }
  };

  const startNewChat = () => {
    setActiveThreadId(null);
    setMessages([]);
    setInput("");
    setAttachmentPreview(null);
    setPendingReminderSuggestion(null);
    setMobileHistoryOpen(false);
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

    try {
      const response = await api.post("/ai/chat", {
        message: trimmed,
        member: requestMemberValue,
        history: serializeHistoryForRequest(history),
      });
      const replyText =
        String(response?.reply || response?.text || "").trim() ||
        buildClientHealthFallbackReply(trimmed, contextLabel);

      const nextMessages = [
        ...history,
        createAiMessage(replyText, {
          disableActions: Boolean(response?.outOfScope),
        }),
      ];
      setMessages(nextMessages);
      persistConversation(nextMessages);
    } catch {
      const fallbackMessage = buildClientHealthFallbackReply(trimmed, contextLabel);
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
    setLoading(true);

    try {
      const response = await api.post("/ai/attachments", {
        imageData: attachmentPreview.data,
        mimeType: attachmentPreview.mimeType,
        fileName: attachmentPreview.fileName,
        member: memberValue,
      });

      const replyText =
        response?.attachmentType === "medicine"
          ? response?.reply ||
            `I found a medicine image${response?.medicineName ? ` for ${response.medicineName}` : ""}, but I could not build the full summary.`
          : response?.attachmentType === "report"
            ? response?.reply || "Health report reviewed successfully."
            : response?.reason || "Please upload a medicine image or a genuine health report.";

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
      <div className={`app-shell ai-chat-shell ${desktopRailCollapsed ? "is-rail-collapsed" : ""}`}>
        <aside
          className={`ai-chat-sidebar ${mobileHistoryOpen ? "is-open" : ""} ${desktopRailCollapsed ? "is-collapsed" : ""}`}
          aria-hidden={desktopRailCollapsed || undefined}
        >
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
              <div key={conversation._id} className={`ai-chat-history__item-wrap ${activeThreadId === conversation._id ? "is-active" : ""}`}>
                <button
                  type="button"
                  className="ai-chat-history__item"
                  onClick={() => {
                    setActiveThreadId(conversation._id);
                    setMobileHistoryOpen(false);
                  }}
                >
                  <span className="avatar avatar--sm">{conversation.member.charAt(0)}</span>
                  <div className="ai-chat-history__content">
                    <div className="ai-chat-history__item-head">
                      <strong>{conversation.title}</strong>
                      <small>{conversation.updatedLabel}</small>
                    </div>
                    <div className="ai-chat-history__item-meta">
                      <span>{conversation.member}</span>
                      <span>{conversation.messageCount} question{conversation.messageCount === 1 ? "" : "s"}</span>
                    </div>
                  </div>
                </button>
                <button 
                  className="ai-chat-history__delete" 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm("Delete this chat?")) {
                      deleteThread(conversation._id);
                      if (activeThreadId === conversation._id) startNewChat();
                    }
                  }}
                  aria-label="Delete chat"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </aside>

        <section className="ai-chat-main">
          <div className="ai-chat-main__top">
            <div className="ai-chat-main__intro">
              <button
                type="button"
                className="icon-btn ai-chat-history-toggle"
                onClick={() => setDesktopRailCollapsed((currentValue) => !currentValue)}
                aria-label={desktopRailCollapsed ? "Show conversations" : "Hide conversations"}
              >
                {desktopRailCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              </button>

              <button type="button" className="icon-btn ai-chat-back" onClick={() => setMobileHistoryOpen(true)}>
                <ArrowLeft size={18} />
              </button>

              <div>
                <div className="ai-chat-main__eyebrow-row">
                  <span className="eyebrow">
                    <Sparkles size={16} />
                    Premium AI workspace
                  </span>
                  <span className="ai-chat-main__safety-pill">
                    <ShieldCheck size={14} />
                    Health-only guidance
                  </span>
                </div>
                <h2 className="ai-chat-main__title">Family AI advisor</h2>
                <p className="ai-chat-main__subtitle">
                  {activeView === "self"
                    ? "Your personal AI coach for symptoms, medicines, reports, and reminders"
                    : "Health-only guidance for symptoms, medicines, reports, and reminders"}
                </p>
              </div>
            </div>

            <div className="ai-chat-main__context">
              <Button variant="secondary" size="sm" leftIcon={<Plus size={16} />} onClick={startNewChat}>
                New chat
              </Button>

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
                  <p>Ready for medicine or report review.</p>
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
                placeholder="Ask about symptoms, medicines, reports, medicine photos, vitals, or reminders"
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
