import React, { useEffect, useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import "./Assistant.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "react-bootstrap/Button";
import { handleChatWithAssistant, handleSaveConversation, handleClearConversation, handleGetConversation } from "../Services/aiAssistantService";
import { handleUserDashBoardApi } from "../Services/dashboardService";
import { handleGetUserPreferencesApi } from "../Services/findFriendsService";

export default function Assistant() {
  const [search] = useSearchParams();
  const idFromUrl = search.get("id");
  const navigate = useNavigate();

  const [userId, setUserId] = useState(null);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I'm your Language Exchange Learning Assistant. How can I help?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  // Fetch current user ID from API
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        // If ID is in URL, fetch user info from Dashboard API to validate and get user data
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
              console.error("Error fetching user from Dashboard API:", err);
              setError("User not found. Please check the user ID and try again.");
              return;
            }
          }
        }

        // If no ID in URL, we need to determine the current user
        // Try to get from user preferences (returns all users, but we need a way to identify current user)
        // Note: This is a limitation - ideally there should be a session-based endpoint for current user
        const preferencesResponse = await handleGetUserPreferencesApi();
        const users = preferencesResponse?.data || [];
        
        if (users.length === 0) {
          setError("Unable to determine user ID. Please navigate to this page with a user ID in the URL.");
          return;
        }

        // If no ID in URL, we can't determine which user is current without session info
        setError("User ID is required. Please navigate to this page with a user ID in the URL (e.g., /assistant?id=123).");
      } catch (err) {
        console.error("Error fetching user ID:", err);
        setError("Failed to fetch user information. Please ensure you're logged in and try again.");
      }
    };

    fetchUserId();
  }, [idFromUrl]);

  const loadConversation = useCallback(async () => {
    if (!userId) return;
    
    try {
      const response = await handleGetConversation(userId);
      if (response.conversation && response.conversation.length > 0) {
        // Convert conversation array format to messages format
        const loadedMessages = response.conversation.map((msg) => ({
          role: msg.role,
          text: msg.content
        }));
        setMessages(loadedMessages);
      }
    } catch (err) {
      console.error("Error loading conversation:", err);
      // if conversation doesn't exist
      if (err.response?.status !== 404) {
        setError("Failed to load conversation");
      }
    }
  }, [userId]);

  // Load existing conversation on mount if userId is available
  useEffect(() => {
    if (userId) {
      loadConversation();
    }
  }, [userId, loadConversation]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !userId) {
      if (!userId) {
        setError("User ID is required. Please navigate to this page with a valid user ID.");
      }
      return;
    }

    setError(null);
    setIsLoading(true);
    
    // Add user message to UI
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setInput("");

    try {
      const response = await handleChatWithAssistant(trimmed, userId);
      const reply = response.reply || "I'm sorry, I couldn't process that request.";
      
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch (err) {
      console.error("Error sending message:", err);
      const errorMessage = err.response?.data?.error || "Failed to send message. Please try again.";
      setError(errorMessage);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: `Error: ${errorMessage}`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) {
      setError("User ID is required to save conversation.");
      return;
    }

    try {
      setError(null);
      await handleSaveConversation(userId);
      alert("Conversation saved successfully!");
    } catch (err) {
      console.error("Error saving conversation:", err);
      const errorMessage = err.response?.data?.error || "Failed to save conversation.";
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleClear = async () => {
    if (!userId) {
      setError("User ID is required to clear conversation.");
      return;
    }

    if (!window.confirm("Are you sure you want to clear this conversation? This action cannot be undone.")) {
      return;
    }

    try {
      setError(null);
      await handleClearConversation(userId);
      setMessages([{ role: "assistant", text: "Hi! I'm your Chat Assistant. How can I help?" }]);
      alert("Conversation cleared successfully!");
    } catch (err) {
      console.error("Error clearing conversation:", err);
      const errorMessage = err.response?.data?.error || "Failed to clear conversation.";
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
    }
  };

  useEffect(() => {
    const slotsAdded = search.get("slotsAdded");
    if (slotsAdded) {
      setMessages(m => [
        ...m,
        {
          role: "assistant",
          text: `You added ${slotsAdded} to your availability.`
        }
      ]);
    }
  }, [search]);


  return (
    <div className="assistant-wrap">
      <div className="assistant-card">
        <div className="assistant-header">
          <div className="assistant-title">Chat Assistant</div>
          <div className="assistant-meta">{userId ? `User ID: ${userId}` : ""}</div>
        </div>

        {error && (
          <div className="alert alert-warning" style={{ margin: "10px", padding: "8px" }}>
            {error}
          </div>
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
            disabled={isLoading || !userId}
          />
          <Button type="submit" className="assistant-send" disabled={isLoading || !userId}>
            {isLoading ? "Sending..." : "Send"}
          </Button>
        </form>

        <div className="assistant-footer">
          <Button variant="secondary" onClick={() => navigate(-1)} className="assistant-back">
            Back
          </Button>
          {userId && (
            <>
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
              <Button 
                variant="success" 
                onClick={handleSave} 
                className="assistant-save"
                style={{ marginLeft: "10px" }}
              >
                Save Conversation
              </Button>
              <Button 
                variant="danger" 
                onClick={handleClear} 
                className="assistant-clear"
                style={{ marginLeft: "10px" }}
              >
                Clear Conversation
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
