import { useState } from 'react';
import React from "react";
import './Videocall.css';
import { VideoRoom } from './VideoRoom';
import { createSearchParams, useSearchParams, useNavigate } from "react-router-dom";
import PrivacyToggle from "./PrivacyToggle";

function Videocall() {
    const [joined, setJoined] = useState();
    const [room, setRoom] = useState('');

    const navigate = useNavigate();
    const [search] = useSearchParams();
    const id = search.get("id");

    // Read chatId for privacy toggle (optional but recommended)
    const chatId = new URLSearchParams(window.location.search).get("chatId") || "";
    const userId = localStorage.getItem("userId") || sessionStorage.getItem("userId") || "";

    const handleBack = async () => {
        if (!joined) {
            navigate({
                pathname: "/Dashboard",
                search: createSearchParams({ id }).toString()
            });
        } else {
            navigate({
                pathname: "/PostVideocall",
                search: createSearchParams({ id }).toString()
            });
        }
    };

    const handleRoom = (e) => setRoom(e.target.value);

    const addParticipantToLocalStorage = (participantId, roomName) => {
        const participants = JSON.parse(localStorage.getItem('participantData')) || {};
        participants[participantId] = roomName;
        localStorage.setItem('participantData', JSON.stringify(participants));
    };

    const handleJoinRoom = () => {
        const selectedRoom = room.trim() || 'matchmaking';
        setRoom(selectedRoom);
        addParticipantToLocalStorage(id, selectedRoom);
        setJoined(true);
    };

    return (
        <div className="screen-Background">
            <div className="call-container">
                <div className="screen-Content">
                    {/* header row with toggle; keeps original look */}
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between", marginBottom:12}}>
                        <h1>Video Call</h1>
                        <PrivacyToggle
                            chatId={new URLSearchParams(window.location.search).get("chatId") || ""}
                            userId={localStorage.getItem("userId") || sessionStorage.getItem("userId") || ""}
                        />
                    </div>

                    {!joined && (
                        <>
                            <div className="screen-Content">
                                <h5>Enter Room Number 1-4</h5>
                                <input
                                    placeholder="Enter"
                                    onChange={handleRoom}
                                    className="input"
                                    type="text"
                                />
                            </div>
                            <button className='btn-back-02' onClick={handleJoinRoom}>
                                Join Room
                            </button>
                            <button className="btn-back-02" onClick={handleBack}>back</button>
                        </>
                    )}

                    {joined && <VideoRoom room={room} />}
                </div>
            </div>
        </div>
    );
}

export default Videocall;
