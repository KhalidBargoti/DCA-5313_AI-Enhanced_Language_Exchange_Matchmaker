// Store a conversation in localStorage
export function saveConversationLocal(messages) {
  const prev = JSON.parse(localStorage.getItem("ai_conversations") || "[]");

  const newChat = {
    id: Date.now(),
    title: messages?.[1]?.text?.slice(0, 40) || "New conversation",
    timestamp: new Date().toISOString(),
    messages
  };

  localStorage.setItem("ai_conversations", JSON.stringify([newChat, ...prev]));
}

// Load all saved conversations
export function getAllConversations() {
  return JSON.parse(localStorage.getItem("ai_conversations") || "[]");
}
