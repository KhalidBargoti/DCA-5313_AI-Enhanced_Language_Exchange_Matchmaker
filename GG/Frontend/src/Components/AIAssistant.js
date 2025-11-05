import PrivacyToggle from "./PrivacyToggle";

function getUserId() {
  return localStorage.getItem("userId") || sessionStorage.getItem("userId") || "";
}

export default function AIAssistant() {
  const params = new URLSearchParams(window.location.search);
  const chatId = params.get("chatId") || "";
  const userId = getUserId();

  return (
    <div className="screen-Background">
      <div className="screen-Content" style={{maxWidth:1000, margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between", marginBottom:12}}>
          <h1>Chat Assistant</h1>
          <PrivacyToggle chatId={chatId} userId={userId} />
        </div>

        <div style={{
          height:"60vh",
          border:"1px solid #e5e7eb",
          borderRadius:12,
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
          color:"#6b7280",
          background:"#fff"
        }}>
          {/* Plug your chatbot UI here */}
          Chatbot goes here (centered)
        </div>

        {!chatId && (
          <p style={{fontSize:12,color:"#b45309",marginTop:8}}>
            Tip: pass a chat id in the URL, e.g. <code>/AIAssistant?chatId=123</code>
          </p>
        )}
      </div>
    </div>
  );
}
