import React, { useEffect, useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import "./Assistant.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "react-bootstrap/Button";
import {handleChatWithAssistant, handleSaveConversation, handleClearConversation, handleGetConversation, handleGetAllAIChats} from "../Services/aiAssistantService";
import { handleUserDashBoardApi } from "../Services/dashboardService";
import { handleGetUserPreferencesApi } from "../Services/findFriendsService";

export default function Assistant() {
  const [search] = useSearchParams();
  const idFromUrl = search.get("id");
  const navigate = useNavigate();

  const [userId, setUserId] = useState(null);
  const [history, setHistory] = useState([]);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I'm your Language Exchange Learning Assistant. How can I help?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        if (idFromUrl) {
          const numericId = parseInt(idFromUrl);
          if (!isNaN(numericId)) {
            try {
              const userData = await handleUserDashBoardApi(numericId);
              if (userData && userData.user) {
                setUserId(numericId);
                return;
              }
            } catch (err) {
              console.error("Error fetching user:", err);
              setError("User not found.");
              return;
            }
          }
        }

        const prefs = await handleGetUserPreferencesApi();
        if (!prefs?.data?.length) {
          setError("User ID is required in the URL.");
        }
      } catch (err) {
        console.error("Error:", err);
        setError("Failed to fetch user information.");
      }
    };

    fetchUserId();
  }, [idFromUrl]);

  // Load all conversation history for sidebar
  useEffect(() => {
    if (!userId) return;

    const fetchHistory = async () => {
      try {
        const result = await handleGetAllAIChats(userId);
        const chats = result.chats || [];

        const formatted = chats.map(chat => {
          let conversationArray = chat.conversation;

          if (typeof conversationArray === "string") {
            try { conversationArray = JSON.parse(conversationArray); }
            catch { conversationArray = []; }
          }

          if (conversationArray?.conversation) {
            conversationArray = conversationArray.conversation;
          }

          if (!Array.isArray(conversationArray)) {
            conversationArray = [];
          }

          const first = conversationArray.find(m => m.role === "user") || conversationArray[0];
          const title = first?.content?.slice(0, 40) || "Conversation";

          return {
            id: chat.id,
            timestamp: chat.createdAt,
            title,
            messages: conversationArray.map(msg => ({
              role: msg.role,
              text: msg.content
            }))
          };
        });

        setHistory(formatted);
      } catch (err) {
        console.error("Failed to load chat history:", err);
      }
    };

    fetchHistory();
  }, [userId]);

  const loadConversation = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await handleGetConversation(userId);

      if (response.conversation && response.conversation.length > 0) {
        const loadedMessages = response.conversation.map(msg => ({
          role: msg.role,
          text: msg.content
        }));
        setMessages(loadedMessages);
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        setError("Failed to load conversation.");
      }
    }
  }, [userId]);

  useEffect(() => {
    if (userId) loadConversation();
  }, [userId, loadConversation]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages]);

  const loadConversationFromHistory = chat => {
    if (!chat?.messages) return;
    setMessages(chat.messages);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    setError(null);
    setIsLoading(true);

    setMessages(m => [...m, { role: "user", text: trimmed }]);
    setInput("");

    try {
      const response = await handleChatWithAssistant(trimmed, userId);
      const reply = response.reply || "I'm sorry, I couldn't process that.";

      setMessages(m => [...m, { role: "assistant", text: reply }]);
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to send message.";
      setMessages(m => [...m, { role: "assistant", text: `Error: ${msg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;

    try {
      await handleSaveConversation(userId);

      const newItem = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        title: messages.find(m => m.role === "user")?.text?.slice(0, 40) || "Conversation",
        messages: [...messages]
      };

      setHistory(prev => [newItem, ...prev]);

      // Sync with backend for accurate IDs/timestamps
      const updated = await handleGetAllAIChats(userId);

      if (updated?.chats) {
        const formatted = updated.chats.map(chat => {
          let arr = chat.conversation;
          if (typeof arr === "string") {
            try { arr = JSON.parse(arr); } catch {}
          }
          if (arr?.conversation) arr = arr.conversation;
          if (!Array.isArray(arr)) arr = [];
          const first = arr.find(m => m.role === "user") || arr[0];
          return {
            id: chat.id,
            timestamp: chat.createdAt,
            title: first?.content?.slice(0, 40) || "Conversation",
            messages: arr.map(msg => ({ role: msg.role, text: msg.content }))
          };
        });
        setHistory(formatted);
      }

      alert("Conversation saved!");
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save conversation.");
    }
  };

  const handleClear = async () => {
    if (!userId) return;

    if (!window.confirm("Clear conversation?")) return;

    try {
      await handleClearConversation(userId);
      setMessages([
        { role: "assistant", text: "Hi! I'm your Chat Assistant. How can I help?" }
      ]);
      alert("Conversation cleared.");
    } catch (err) {
      alert("Failed to clear conversation.");
    }
  };

  return (
    <div className="assistant-wrap">
      <div className="assistant-layout">

        {/* LEFT SIDEBAR */}
        <div className="assistant-sidebar">
          <div className="sidebar-header">
            <h3>Conversations</h3>
          </div>

          <div className="sidebar-list">
            {history.length === 0 && (
              <p className="empty">No previous conversations</p>
            )}

            {history.map(chat => (
              <div 
                key={chat.id} 
                className="sidebar-item"
                onClick={() => loadConversationFromHistory(chat)}
              >
                <strong>{chat.title}</strong>
                <p className="timestamp">
                  {new Date(chat.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* MAIN CHAT PANEL */}
        <div className="assistant-card">

          <div className="assistant-header">
            <div className="assistant-title">Chat Assistant</div>
            <div className="assistant-meta">
              {userId ? `User ID: ${userId}` : ""}
            </div>
          </div>

          {error && (
            <div className="alert alert-warning">{error}</div>
          )}

          <div className="assistant-body" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`msg-row ${m.role === "user" ? "from-user" : "from-assistant"}`}>
                <div className="msg-bubble">
                  <ReactMarkdown>{m.text}</ReactMarkdown>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="msg-row from-assistant">
                <div className="msg-bubble">Thinking...</div>
              </div>
            )}
          </div>

          <form className="assistant-inputbar" onSubmit={sendMessage}>
            <input
              className="assistant-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Chat Assistant…"
              disabled={isLoading}
            />
            <Button type="submit" className="assistant-send">
              {isLoading ? "Sending…" : "Send"}
            </Button>
          </form>

          <div className="assistant-footer">
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Back
            </Button>
            <Button
                variant="primary"
                style={{ marginLeft: "10px" }}
                onClick={() => {
                  console.log("Navigating to AvailabilityPicker for userId:", userId);
                  navigate(`/AvailabilityPicker?id=${userId}&returnTo=Assistant`);
                }}
              >
                Select Availability
              </Button>

            <Button variant="success" onClick={handleSave} style={{ marginLeft: "10px" }}>
              Save to History
            </Button>

            <Button variant="danger" onClick={handleClear} style={{ marginLeft: "10px" }}>
              Clear Conversation
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}