import { useState, useEffect } from 'react';
import React from "react"; 
import './Dashboard.css';
import profile from "../Styles/profilepic.jpg";
import { createSearchParams, useSearchParams, useNavigate } from "react-router-dom";
// ✅ use the functions that actually exist in Services/userService
import { handleGetUser, handleUserLogout } from "../Services/userService";

export default function Dashboard() {
  const [userInfo, setUserInfo] = useState({});
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");

  useEffect(() => {
    let ignore = false;
    async function loadUser() {
      try {
        // handleGetUser is exported by your service
        const res = await handleGetUser(id);
        // Be defensive about the response shape
        const data = res?.data ?? res ?? {};
        if (!ignore) setUserInfo(data);
      } catch (err) {
        console.error("Error fetching user info:", err);
      }
    }
    if (id) loadUser();
    return () => { ignore = true; };
  }, [id]);

  const goToPage = (path, extraParams = {}) => {
    navigate({
      pathname: `/${path}`,
      search: createSearchParams({
        id: id,
        ...extraParams,
      }).toString(),
    });
  };

  const handleLogout = async () => {
    try {
      // handleUserLogout is exported by your service
      // If your implementation needs params, pass id; otherwise it will be ignored.
      await handleUserLogout(id);
      navigate("/LogoutConfirmation");
    } catch (error) {
      console.error("Logout failed:", error);
      // still navigate away so the button isn't a dead-end if the API is flaky
      navigate("/LogoutConfirmation");
    }
  };

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h2 className="dashboard-title">Dashboard</h2>
        <div className="profile-section">
          <img src={profile} alt="Profile" className="profile-image" />
          <h3 className="user-name">{userInfo.name || `${userInfo.firstName ?? ""} ${userInfo.lastName ?? ""}`.trim() || "User"}</h3>
          <p className="user-email">{userInfo.email || userInfo.userEmail || ""}</p>
        </div>
        <div className="sidebar-buttons">
          <button className="btn-secondary" onClick={() => goToPage("HelpPage")}>
            ?
          </button>
          <button className="btn-secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="button-grid">
          <button className="btn-action" onClick={() => goToPage("CreateProfile")}>
            Set Profile
          </button>
          <button className="btn-action" onClick={() => goToPage("FindFriend")}>
            Find Friend
          </button>
          <button className="btn-action" onClick={() => goToPage("FriendsList")}>
            Friends List
          </button>
          <button
            className="btn-action"
            onClick={() => {
              const chatId = localStorage.getItem("currentChatId") || "1"; // pick real chat id if you have it
              goToPage("Videocall", { chatId });
              }}
            >
              Call
          </button>
          <button className="btn-action" onClick={() => goToPage("Translator")}>
            Translator
          </button>
          <button className="btn-action" onClick={() => goToPage("UserReport")}>
            User Report
          </button>

          {/* Open the AI Assistant; pass chatId if you have one */}
          <button
            className="btn-action"
            onClick={() => {
              // Prefer your router helper so we keep the same layout/state and the `id` param.
              const chatId = localStorage.getItem("currentChatId") || "1"; // fallback so the toggle is visible
              goToPage("AIAssistant", { chatId });
            }}
          >
            Chat Assistant
          </button>
        </div>
      </div>
    </div>
  );
}