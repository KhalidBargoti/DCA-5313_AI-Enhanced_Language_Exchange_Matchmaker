import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './AvailabilityPicker.css';
import axios from 'axios';

const AvailabilityPicker = () => {
  const [search] = useSearchParams();
  const id = search.get('id');

  const source = search.get('source') || 'friendSearch';
  const returnTo = search.get('returnTo') || '/FriendSearch';

  const navigate = useNavigate();
  
  const [selectedSlots, setSelectedSlots] = useState(new Set());
  
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const timeSlots = [
    '8 am', '9 am', '10 am', '11 am', '12 pm', 
    '1 pm', '2 pm', '3 pm', '4 pm', '5 pm', 
    '6 pm', '7 pm', '8 pm'
  ];

  // Handle time slot selection
  const handleSlotClick = (dayIndex, timeIndex) => {
    const slotKey = `${dayIndex}-${timeIndex}`;
    const newSelectedSlots = new Set(selectedSlots);
    
    if (newSelectedSlots.has(slotKey)) {
      newSelectedSlots.delete(slotKey);
    } else {
      newSelectedSlots.add(slotKey);
    }
    
    setSelectedSlots(newSelectedSlots);
    console.log("Selected slots:", Array.from(newSelectedSlots));
  };

  // Handle confirm button 
  const handleConfirm = async () => {
    if (selectedSlots.size === 0) {
      return alert("Please select at least one time slot before submitting.");
    }

    const availabilityData = Array.from(selectedSlots).map(slot => {
    const [dayIndex, timeIndex] = slot.split('-').map(Number);
      return { dayIndex, timeIndex };
    });

    console.log("handleConfirm - availabilityData:", availabilityData);

    if (!id) return alert("User ID missing");

    if (source === "aiChat") {
      try {
        await axios.post("/api/v1/ai-assistant/availability", {
          userId: Number(id),
          slots: availabilityData
        });
        // Navigate after successful POST
        navigate(returnTo || "/Assistant");
      } catch (err) {
        console.error("Failed to save availability", err);
        alert("Failed to save availability. Please try again.");
      }
    } else {
      // existing FriendSearch logic
      const params = new URLSearchParams({
        id,
        availability: JSON.stringify(availabilityData),
      });
      navigate(`/FriendSearch?${params.toString()}`);
    }
  };

  // Handle back button
  const handleBack = () => {
    if (source === "aiChat") {
      navigate(returnTo || "/assistant");
    } else {
      const params = new URLSearchParams({ id });
      navigate(`/FriendSearch?${params.toString()}`);
    }
  };
  
  return (
    <div className="availability-picker-container">
      <div className="availability-picker">
        <h1 className="page-title">Find Partners</h1>
        
        <div className="calendar-container">
          {/* Days header */}
          <div className="days-header">
            {days.map((day, index) => (
              <div key={index} className="day-header">
                <div className="day-label">{day}</div>
              </div>
            ))}
          </div>
          
          {/* Time slots and calendar grid */}
          <div className="calendar-grid">
            {timeSlots.map((time, timeIndex) => (
              <div key={timeIndex} className="time-row">
                <div className="time-label">{time}</div>
                <div className="time-slots">
                  {days.map((day, dayIndex) => {
                    const slotKey = `${dayIndex}-${timeIndex}`;
                    const isSelected = selectedSlots.has(slotKey);
                    
                    return (
                      <div
                        key={dayIndex}
                        className={`time-slot ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSlotClick(dayIndex, timeIndex)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="button-container">
          <button className="btn-back" onClick={handleBack}>
            Back
          </button>
          <button className="btn-confirm" onClick={handleConfirm}>
            Submit Availability
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityPicker;
