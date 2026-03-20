import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import EmojiPicker from "emoji-picker-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  Download,
  ImagePlus,
  Mic,
  RotateCcw,
  Search,
  Sparkles,
  Sticker,
  UserRound,
} from "lucide-react";
import api from "../lib/api";
import { useThemeMode } from "../theme/theme-context";
import "./AIChat.css";

const SUGGESTED = [
  "What checkups should a 60-year-old have?",
  "Vaccination reminders for a 5-year-old",
  "Home remedies for common cold",
  "Daily diet tips for diabetes",
  "How often should I get a dental check-up?",
];

const starterMessage = {
  sender: "ai",
  text: "Hello, I am your health assistant. How can I help today?",
};

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
        fileName: file.name,
      });
    };

    reader.onerror = () => reject(new Error("Could not read attachment"));
    reader.readAsDataURL(file);
  });

export default function AIChat({ userFamily = [] }) {
  const { mode } = useThemeMode();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState("Self");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [newMessagesAvailable, setNewMessagesAvailable] = useState(false);
  const [lastError, setLastError] = useState(null);

  const mountedRef = useRef(false);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const userAtBottomRef = useRef(true);
  const pendingRequestRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;

    const load = async () => {
      setLastError(null);

      try {
        const data = await api.get(`/ai/memory?member=${encodeURIComponent(selectedMember)}`);
        if (data?.messages?.length) {
          setMessages(data.messages);
          return;
        }
      } catch (error) {
        if (error?.status === 401) {
          setMessages([{ sender: "ai", text: "Unauthorized. Please log in again.", ts: Date.now() }]);
          return;
        }
      }

      try {
        const raw = localStorage.getItem(`aichat_mem_${selectedMember}`);
        if (raw) {
          setMessages(JSON.parse(raw));
          return;
        }
      } catch {
        // ignore local storage failure
      }

      setMessages([{ ...starterMessage, ts: Date.now() }]);
    };

    load();

    return () => {
      mountedRef.current = false;
      recognitionRef.current?.stop?.();
    };
  }, [selectedMember]);

  useEffect(() => {
    if (!mountedRef.current) return;

    const timeoutId = setTimeout(async () => {
      const payload = { member: selectedMember, messages };

      try {
        await api.post("/ai/memory", payload);
      } catch {
        try {
          localStorage.setItem(`aichat_mem_${selectedMember}`, JSON.stringify(messages));
        } catch {
          // ignore local storage failure
        }
      }
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [messages, selectedMember]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    const onScroll = () => {
      const distance = scroller.scrollHeight - (scroller.scrollTop + scroller.clientHeight);
      userAtBottomRef.current = distance < 160;
      if (userAtBottomRef.current) setNewMessagesAvailable(false);
    };

    scroller.addEventListener("scroll", onScroll);
    onScroll();

    return () => scroller.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    if (userAtBottomRef.current) {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
    } else {
      setNewMessagesAvailable(true);
    }
  }, [messages]);

  const startRecording = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ");
      setInput((previous) => (previous ? `${previous} ${transcript}` : transcript));
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopRecording = () => {
    recognitionRef.current?.stop?.();
    setIsRecording(false);
  };

  const onFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAttachmentPreview({ file, url: URL.createObjectURL(file) });
  };

  const sendAttachment = async () => {
    if (!attachmentPreview?.file) return;

    setMessages((previous) => [
      ...previous,
      { sender: "user", text: "Sent an image", ts: Date.now(), attachment: attachmentPreview.url },
    ]);

    try {
      const payload = await fileToBase64Payload(attachmentPreview.file);
      const data = await api.post("/ai/attachments", {
        imageData: payload.data,
        mimeType: payload.mimeType,
        fileName: payload.fileName,
        member: selectedMember,
      });

      setMessages((previous) => [
        ...previous,
        {
          sender: "ai",
          text: data?.reply || "Image uploaded successfully.",
          ts: Date.now(),
        },
      ]);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          sender: "ai",
          text:
            error?.status === 401
              ? "Unauthorized. Please log in to upload attachments."
              : "Image upload failed. Please try again.",
          ts: Date.now(),
        },
      ]);
    } finally {
      setAttachmentPreview(null);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    const width = doc.internal.pageSize.getWidth() - margin * 2;
    let y = 60;

    doc.setFontSize(18);
    doc.text("SwasthaParivar - Chat Export", margin, y);
    y += 28;
    doc.setFontSize(11);

    messages.forEach((message) => {
      const sender = message.sender === "user" ? "You" : "Assistant";
      const lines = doc.splitTextToSize(`${sender}: ${message.text}`, width);

      if (y + lines.length * 14 > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        y = 40;
      }

      doc.text(lines, margin, y);
      y += lines.length * 14 + 10;
    });

    doc.save("chat.pdf");
  };

  const handleSend = async (overrideText = null) => {
    const messageText = (overrideText ?? input).trim();
    if (!messageText) return;

    setMessages((previous) => [...previous, { sender: "user", text: messageText, ts: Date.now() }]);
    setInput("");
    setShowEmojiPicker(false);
    setIsTyping(true);
    setLastError(null);

    pendingRequestRef.current?.abort?.();
    const controller = new AbortController();
    pendingRequestRef.current = controller;

    try {
      const parsed = await api.post(
        "/ai/chat",
        { message: messageText, member: selectedMember },
        { signal: controller.signal }
      );
      const reply = parsed?.reply || parsed?.text || parsed?.message || "Sorry, no response.";

      setTimeout(() => {
        if (!mountedRef.current) return;
        setMessages((previous) => [...previous, { sender: "ai", text: String(reply), ts: Date.now() }]);
        setIsTyping(false);
      }, 280);
    } catch (error) {
      if (error.name !== "AbortError") {
        setMessages((previous) => [
          ...previous,
          {
            sender: "ai",
            text:
              error?.status === 401
                ? "Unauthorized. Please log in to use AI features."
                : "Sorry, I could not reach the server right now.",
            ts: Date.now(),
          },
        ]);
        setLastError(error.message || "Network error");
      }
      setIsTyping(false);
    } finally {
      pendingRequestRef.current = null;
    }
  };

  const handleChipSend = (question) => {
    setInput(question);
    setTimeout(() => handleSend(question), 100);
  };

  const filteredMessages = messages.filter((message) =>
    message.text.toLowerCase().includes(search.toLowerCase())
  );

  const markdownComponents = {
    p: ({ children }) => {
      const text = String(children).trim().toLowerCase();
      if (text.startsWith("warning:") || text.startsWith("alert:")) {
        return <div className="ai-chat-warning">{children}</div>;
      }
      return <p>{children}</p>;
    },
  };

  return (
    <div className={`ai-chat-page ${mode === "dark" ? "dark" : ""}`}>
      <div className="app-shell ai-chat-shell">
        <section className="ai-chat-hero">
          <div>
            <span className="eyebrow">
              <Sparkles size={16} />
              AI Wellness Assistant
            </span>
            <h1>Ask health questions in a workspace built for clarity.</h1>
            <p>
              Search past conversations, switch family context, upload images, and keep one organized AI thread for household care.
            </p>
          </div>

          <div className="surface-card ai-chat-hero__controls">
            <label className="ai-chat-control">
              <span>Search messages</span>
              <div className="ai-chat-control__input">
                <Search size={16} />
                <input
                  placeholder="Find a message..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </label>

            <label className="ai-chat-control">
              <span>Conversation context</span>
              <div className="ai-chat-control__input">
                <UserRound size={16} />
                <select value={selectedMember} onChange={(event) => setSelectedMember(event.target.value)}>
                  <option value="Self">Self</option>
                  {userFamily.map((member) => (
                    <option key={member._id || member.name} value={member.name}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <div className="ai-chat-toolbar">
              <button type="button" className="ai-chat-toolbar__btn" onClick={exportToPDF}>
                <Download size={15} />
                Export
              </button>
              <button
                type="button"
                className="ai-chat-toolbar__btn"
                onClick={() => {
                  setMessages([]);
                  localStorage.removeItem(`aichat_mem_${selectedMember}`);
                }}
              >
                <RotateCcw size={15} />
                Clear
              </button>
            </div>
          </div>
        </section>

        <div className="ai-chat-suggestions">
          {SUGGESTED.map((question) => (
            <button key={question} type="button" className="pill-button" onClick={() => handleChipSend(question)}>
              {question}
            </button>
          ))}
        </div>

        <section className="surface-card ai-chat-panel">
          <div className="ai-chat-panel__messages" ref={scrollRef}>
            {filteredMessages.map((message, index) => (
              <div
                key={`${message.ts || index}-${index}`}
                className={`ai-chat-row ${message.sender === "user" ? "is-user" : "is-ai"}`}
              >
                <div className={`ai-chat-bubble ${message.sender === "user" ? "is-user" : "is-ai"}`}>
                  {message.attachment && (
                    <img src={message.attachment} alt="attachment" className="ai-chat-bubble__image" />
                  )}
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {message.text}
                  </ReactMarkdown>
                  <div className="ai-chat-bubble__time">
                    {new Date(message.ts || Date.now()).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="ai-chat-row is-ai">
                <div className="ai-chat-bubble is-ai ai-chat-bubble--typing" aria-hidden>
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            {lastError && <div className="ai-chat-warning">Connection problem: {String(lastError)}</div>}
          </div>

          {newMessagesAvailable && (
            <button
              type="button"
              className="ai-chat-new"
              onClick={() => {
                const scroller = scrollRef.current;
                scroller?.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
                setNewMessagesAvailable(false);
              }}
            >
              New messages
            </button>
          )}

          {attachmentPreview && (
            <div className="ai-chat-attachment">
              <img src={attachmentPreview.url} alt="preview" className="ai-chat-attachment__image" />
              <div className="ai-chat-attachment__actions">
                <button type="button" className="ai-chat-toolbar__btn" onClick={sendAttachment}>
                  Send image
                </button>
                <button type="button" className="ai-chat-toolbar__btn" onClick={() => setAttachmentPreview(null)}>
                  Remove
                </button>
              </div>
            </div>
          )}

          <div className="ai-chat-composer">
            <input
              type="file"
              accept="image/*"
              onChange={onFileChange}
              style={{ display: "none" }}
              id="aichat-file"
            />

            <label htmlFor="aichat-file" className="ai-chat-composer__icon" title="Attach image">
              <ImagePlus size={18} />
            </label>

            <button
              type="button"
              className={`ai-chat-composer__icon ${isRecording ? "is-recording" : ""}`}
              onClick={() => (isRecording ? stopRecording() : startRecording())}
              title="Record voice"
            >
              <Mic size={18} />
            </button>

            <div className="ai-chat-composer__emoji">
              <button type="button" className="ai-chat-composer__icon" onClick={() => setShowEmojiPicker((previous) => !previous)}>
                <Sticker size={18} />
              </button>
              {showEmojiPicker && (
                <div className="ai-chat-composer__emoji-panel">
                  <EmojiPicker onEmojiClick={(emojiData) => setInput((previous) => previous + (emojiData?.emoji || ""))} />
                </div>
              )}
            </div>

            <input
              className="ai-chat-composer__input"
              placeholder="Ask a health question..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />

            <button type="button" className="ai-chat-composer__send" onClick={() => handleSend()}>
              Send
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
