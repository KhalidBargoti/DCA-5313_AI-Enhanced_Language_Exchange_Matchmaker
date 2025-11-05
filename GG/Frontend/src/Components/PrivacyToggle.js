import { useEffect, useState } from "react";
import "./PrivacyToggle.css";

const API_BASE = process.env.REACT_APP_API_BASE || ""; // e.g. http://localhost:3001/api (Option B) or "" if using proxy (Option A)

async function safeJson(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { throw new Error(text.slice(0,120) || "Non-JSON response"); }
}

export default function PrivacyToggle({ chatId, userId, className = "" }) {
  const [allowed, setAllowed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!chatId) return;
    let ignore = false;
    (async () => {
      setErr("");
      try {
        const r = await fetch(`${API_BASE}/chats/${chatId}`, { credentials: "include" });
        if (!r.ok) throw new Error(`GET ${r.status}`);
        const j = await safeJson(r);
        if (!ignore) setAllowed(Boolean(j?.data?.aiAccessAllowed ?? true));
      } catch (e) {
        if (!ignore) {
          setErr(e.message || "Could not load privacy");
          setAllowed(false); // default display
        }
      }
    })();
    return () => { ignore = true; };
  }, [chatId]);

  async function toggle() {
    if (allowed === null || loading || !chatId) return;
    const next = !allowed;
    setLoading(true);
    setErr("");
    setAllowed(next); // optimistic
    try {
      const r = await fetch(`${API_BASE}/chats/${chatId}/privacy`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, aiAccessAllowed: next })
      });
      if (!r.ok) {
        // try to read JSON, fallback to text
        let msg = `PUT ${r.status}`;
        try { const j = await r.json(); msg = j?.message || msg; } catch {}
        throw new Error(msg);
      }
    } catch (e) {
      setAllowed(!next); // revert
      setErr(e.message || "Update failed");
    } finally {
      setLoading(false);
    }
  }

  const label = allowed ? "AI Can Access" : "AI Blocked";

  return (
    <div className={`pt-wrap ${className}`}>
      <button
        className={`pt-toggle ${allowed ? "pt-on" : "pt-off"}`}
        onClick={toggle}
        disabled={allowed === null || loading || !chatId}
        aria-pressed={!!allowed}
        title={chatId ? label : "No chat selected"}
        aria-label="Toggle AI access for this conversation"
      >
        <span className="pt-knob" />
      </button>
      <span className="pt-label">{label}</span>
      {err && <span className="pt-error" style={{marginLeft:8}}>{err}</span>}
    </div>
  );
}
