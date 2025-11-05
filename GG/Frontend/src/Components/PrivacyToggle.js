import { useEffect, useState } from "react";
import "./PrivacyToggle.css";

async function asJson(res) {
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { throw new Error(txt.slice(0,120) || "Non-JSON response"); }
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
        const res = await fetch(`/api/v1/chats/${chatId}`, { credentials: "include" });
        if (!res.ok) throw new Error(`GET ${res.status}`);
        const j = await asJson(res);
        if (!ignore) setAllowed(Boolean(j?.data?.aiAccessAllowed ?? true));
      } catch (e) {
        if (!ignore) {
          setErr(e.message || "Could not load privacy");
          setAllowed(false);
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
    setAllowed(next); // optimistic UI
    try {
      const res = await fetch(`/api/v1/chats/${chatId}/privacy`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, aiAccessAllowed: next })
      });
      if (!res.ok) {
        let msg = `PUT ${res.status}`;
        try { const j = await res.json(); msg = j?.message || msg; } catch {}
        throw new Error(msg);
      }
    } catch (e) {
      setAllowed(!next); // revert on failure
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
        aria-label="Toggle AI access"
      >
        <span className="pt-knob" />
      </button>
      <span className="pt-label">{label}</span>
      {err && <span className="pt-error" style={{marginLeft:8}}>{err}</span>}
    </div>
  );
}
