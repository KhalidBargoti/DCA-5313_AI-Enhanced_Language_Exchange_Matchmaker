import React, { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';
import './Schedular.css';
import { useNavigate, createSearchParams, useSearchParams } from "react-router-dom";
import { handleGetFriendsList, handleCreateMeeting, handleGetTrueFriendsList, handleRemoveTrueFriend, handleAddToFriendsList, handleGetTrueUserAvailability } from '../Services/userService'; // Import your API handler

const Schedular = () => {
  const [friends, setFriends] = useState([]);
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const id = search.get("id");
  
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");

  useEffect(() => {
    // Retrieve friends from localStorage
    const storedFriends = JSON.parse(localStorage.getItem('friendsList')) || [];
    //setFriends(storedFriends);
    console.log("Friends loaded from localStorage:", storedFriends);
  }, []);

  // Second useEffect: Fetch friends from the database
  useEffect(() => {
  const fetchFriends = async () => {
    try {
      console.log('FriendsList: id=', id);
      const payload = await handleGetTrueFriendsList(id);
      console.log('FriendsList payload:', payload); // expect { friendsList: [...] }
      setFriends(Array.isArray(payload?.friendsList) ? payload.friendsList : []);
    } catch (err) {
      console.error('Failed to fetch friends:', err);
      setFriends([]);
    }
  };
  if (id) fetchFriends();
}, [id]); // Dependencies: id and friends state

  const handleBack = () => {
    navigate({
      pathname: "/Dashboard", // Navigate back to the dashboard
      search: createSearchParams({ id: id }).toString(),
    });
  };

  const handleFriendClick = async (friend) => {
    setSelectedFriend(friend);
    setSelectedSlot("");
    setAvailableSlots([]);

    try {
      const data = await handleGetTrueUserAvailability(friend.id);

      console.log("Availability API response:", data); 

      // Try multiple common shapes:
      const slots =
        data?.availability ||  // { availability: [...] }
        data?.slots ||         // { slots: [...] }
        (Array.isArray(data) ? data : []); // data is just an array

      setAvailableSlots(Array.isArray(slots) ? slots : []);
    } catch (err) {
      console.error("Failed to load availability:", err);
      setAvailableSlots([]);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "Unknown time";
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value); // fallback to raw string
    return d.toLocaleString();
  };

  const handleSchedule = () => {
    if (!selectedFriend || !selectedSlot) return;

    const slot = availableSlots.find(
      s => String(s.id) === String(selectedSlot)
    );
    if (!slot) return;

    console.log("Schedule meeting with:", selectedFriend, "at:", slot);

    // Extract times using all possible field names
    const startRaw =
      slot.start_time ||
      slot.startTime ||
      slot.start ||
      slot.from;

    const endRaw =
      slot.end_time ||
      slot.endTime ||
      slot.end ||
      slot.to;

    // Extract day of week (prefer backend value, fallback to computed)
    const dayOfWeek =
      slot.day_of_week ||    // e.g., "Mon"
      new Date(startRaw).toLocaleDateString(undefined, { weekday: "short" });

    // Format display time
    const timeLabel = `${dayOfWeek} ${formatDateTime(startRaw)}`;

    // Call backend API
    handleCreateMeeting(
      id,                 // user1
      selectedFriend.id,  // user2
      dayOfWeek,          // NEW: day_of_week
      startRaw,
      endRaw
    );

    alert(
      `Meeting requested with ${selectedFriend.firstName} ${selectedFriend.lastName} on ${dayOfWeek} at ${formatDateTime(startRaw)}`
    );
  };

  return (
    <div className="screen-Background">
      <div className="friends-list-container">
        <h2>Your Friends List</h2>
        <p className="instructions">Please Click on a User to Schedule a Meeting</p>
        {friends.length === 0 ? (
          <p className="no-friends-message">No friends added yet.</p>
        ) : (
          <div className="friends-list">
            {friends.map(friend => (
              <div
                key={friend.id} // Ensure each item has a unique key
                className="friend-chip"
                onClick={() => {
                  handleFriendClick(friend);
                 // put the drop down thing here.
                }}
              >
                {friend.firstName} {friend.lastName}
              </div>
            ))}
          </div>
        )}

        {selectedFriend && (
        <div className="scheduler-panel">
          <h3>
            Schedule with {selectedFriend.firstName} {selectedFriend.lastName}
          </h3>

          {availableSlots.length === 0 ? (
            <p className="no-slots-message">
              This user has no available time slots.
            </p>
          ) : (
            <>
              <label className="dropdown-label">
                Choose a time: 
                <select
                  className="time-dropdown"
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                >
                  <option value="">...</option>
                  {availableSlots.map(slot => {
                    const startRaw =
                      slot.start_time ||
                      slot.startTime ||
                      slot.start ||
                      slot.from;

                    const endRaw =
                      slot.end_time ||
                      slot.endTime ||
                      slot.end ||
                      slot.to;

                    const startDate = new Date(startRaw);
                    const endDate = new Date(endRaw);

                    // If the date can't be parsed, fallback raw
                    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                      return (
                        <option key={slot.id} value={slot.id}>
                          {slot.day_of_week ?? "??"} — {String(startRaw)} – {String(endRaw)}
                        </option>
                      );
                    }

                      // WEEKDAY NAME (Convert date → "Mon", OR use slot.day_of_week directly)
                      const weekdayAuto = startDate.toLocaleDateString(undefined, { weekday: "short" });
                      const weekday = slot.day_of_week || weekdayAuto;  // prefer backend, fallback to computed

                      const startTimeLabel = startDate.toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      });

                      const endTimeLabel = endDate.toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      });

                      return (
                        <option key={slot.id} value={slot.id}>
                          {weekday} — {startTimeLabel} to {endTimeLabel}
                        </option>
                      );
                    })}
                </select>
              </label>

              <button
                className="btn-confirm"
                disabled={!selectedSlot}
                onClick={handleSchedule}
              >
                Confirm Meeting
              </button>
            </>
          )}
        </div>
      )}

        {/* Back Button */}
        <div className="button-container">
          <button className="btn-back-02" onClick={handleBack}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
};
export default Schedular;
