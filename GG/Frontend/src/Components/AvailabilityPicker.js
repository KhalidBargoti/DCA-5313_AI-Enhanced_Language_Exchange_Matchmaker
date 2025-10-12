import React, { useState } from 'react';
import { useNavigate, useSearchParams, createSearchParams } from 'react-router-dom';
import './AvailabilityPicker.css';

const AvailabilityPicker = () => {
  const [search] = useSearchParams();
  const id = search.get('id');
  const navigate = useNavigate();
  
  const [selectedSlots, setSelectedSlots] = useState(new Set());
  
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
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
  };

  // Handle confirm button 
  const handleConfirm = () => {
    // Convert selected slots to a format that can be passed back
    const availabilityData = Array.from(selectedSlots).map(slot => {
      const [dayIndex, timeIndex] = slot.split('-').map(Number);
      return {
        day: dayNames[dayIndex],
        time: timeSlots[timeIndex],
        dayIndex,
        timeIndex
      };
    });

    // Navigate back to FriendSearch with selected availability
    navigate({
      pathname: '/FriendSearch',
      search: createSearchParams({
        id: id,
        availability: JSON.stringify(availabilityData)
      }).toString(),
    });
  };

  // Handle back button
  const handleBack = () => {
    navigate({
      pathname: '/FriendSearch',
      search: createSearchParams({
        id: id,
      }).toString(),
    });
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
