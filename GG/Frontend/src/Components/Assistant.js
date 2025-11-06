import React, { useEffect, useRef, useState } from "react";
import "./Assistant.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "react-bootstrap/Button";

export default function Assistant() {
  const [search] = useSearchParams();
  const id = search.get("id");
  const navigate = useNavigate();

  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I’m your Chat Assistant. How can I help?" }
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setInput("");

    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text:
            "This is a placeholder response. Later, you can connect this to your backend (e.g., an AI API)."
        }
      ]);
    }, 500);
  };

  return (
    <div className="assistant-wrap">
      <div className="assistant-card">
        <div className="assistant-header">
          <div className="assistant-title">Chat Assistant</div>
          <div className="assistant-meta">{id ? `User ID: ${id}` : ""}</div>
        </div>

        <div className="assistant-body" ref={scrollRef}>
          {messages.map((m, i) => (
            <div key={i} className={`msg-row ${m.role === "user" ? "from-user" : "from-assistant"}`}>
              <div className="msg-bubble">{m.text}</div>
            </div>
          ))}
        </div>

        <form className="assistant-inputbar" onSubmit={sendMessage}>
          <input
            className="assistant-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message Chat Assistant…"
          />
          <Button type="submit" className="assistant-send">Send</Button>
        </form>

        <div className="assistant-footer">
          <Button variant="secondary" onClick={() => navigate(-1)} className="assistant-back">
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}
