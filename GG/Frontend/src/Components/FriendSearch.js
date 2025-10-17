import React, { useState, useEffect } from 'react';
import { FiUserPlus } from 'react-icons/fi';
import { DateTime } from "luxon";  

import {
  handleGetUserNamesApi,
  handleGetUserPreferencesApi,
  handleGetUserProfileApi,
} from '../Services/findFriendsService';
import './FriendSearch.css';
import {
  createSearchParams,
  useSearchParams,
  useNavigate,
} from 'react-router-dom';
import { getUserData } from '../Utils/userData'; // Import to retrieve stored current user data
import { handleAddToFriendsList, handleGetFriendsList, handleGetUserInterests, handleGetUserAvailability } from '../Services/userService';

const FriendSearch = () => {
  const [filterInput, setFilterInput] = useState('');
  const [preferenceFilterInput, setPreferenceFilterInput] = useState('');
  const [recentChatPartners, setRecentChatPartners] = useState([]);
  const [userNames, setUserNames] = useState([]);
  const [allUserNames, setAllUserNames] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [compatibilityScore, setCompatibilityScore] = useState(null);
  const [successMessage, setSuccessMessage] = useState(''); // For success message
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const id = search.get('id');
  const [userList, setUserList] = useState(''); // Initialize the list as an empty string
  const [selectedAvailability, setSelectedAvailability] = useState(null); // Store selected availability slots
  const [selectedMbti, setSelectedMbti] = useState([]);
  const [selectedZodiac, setSelectedZodiac] = useState([]);


  const handleAvailabilityFilter = () => {
    if (!selectedAvailability || selectedAvailability.length === 0) {
      console.log('No availability data to filter by');
      setSuccessMessage('Please select availability times first');
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      return;
    }

    console.log('Filtering users by availability:', selectedAvailability);
    try {
      // Normalize selected availability to UTC
      const selectedSlotsUTC = selectedAvailability.map(slot => {
        const convertTo24Hr = (timeStr) => {
          const dt = DateTime.fromFormat(timeStr.trim(), "h a", { zone: currentUser?.default_time_zone || "UTC" });
          return dt.isValid ? dt.toFormat("HH:mm") : null;
        };
        
        const start = convertTo24Hr(slot.time);
        const end = DateTime.fromFormat(start, "HH:mm").plus({ hours: 1 }).toFormat("HH:mm"); // assume 1-hour slot
        return {
          day_of_week: slot.day,
          start_utc: DateTime.fromISO(`2024-01-01T${start}`, { zone: currentUser?.default_time_zone || "UTC" }).toUTC(),
          end_utc: DateTime.fromISO(`2024-01-01T${end}`, { zone: currentUser?.default_time_zone || "UTC" }).toUTC(),
        };
      });
      // Filter all users
      const filteredUsers = allUserNames.filter(user => {
        if (!Array.isArray(user.Availability) || user.Availability.length === 0)
          return false;

        const userZone = user.default_time_zone || "UTC";
        return user.Availability.some(userSlot => {
          const userStartUTC = DateTime.fromISO(`2024-01-01T${userSlot.start_time}`, { zone: userZone }).toUTC();
          const userEndUTC = DateTime.fromISO(`2024-01-01T${userSlot.end_time}`, { zone: userZone }).toUTC();

          return selectedSlotsUTC.some(selSlot =>
            userSlot.day_of_week === selSlot.day_of_week &&
            userStartUTC.toISO() === selSlot.start_utc.toISO() &&
            userEndUTC.toISO() === selSlot.end_utc.toISO()
          );
        });
      });
      setUserNames(filteredUsers);
      setSuccessMessage(`Filtered by availability: ${selectedAvailability.length} time slots selected`);
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error("Error filtering by availability:", error);
      setSuccessMessage("Error applying availability filter");
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        console.log(
          'Fetching all user names and retrieving current user preferences...'
        );

        const userResponse = await handleGetUserNamesApi();
        const profilesResponse = await handleGetUserPreferencesApi();

        // Merge user data with their profiles
        const mergedUsers = await Promise.all(
          userResponse.data.map(async (user) => {
            const userProfile = profilesResponse.data.find(
              (profile) => profile.id === user.id
            );
        
            // Fetch current user's interests
            let userInterests = [];
            try {
              const interestsResponse = await handleGetUserInterests(user.id);
              userInterests = interestsResponse || [];
              console.log(`User interests received for user ${user.id}:`, userInterests);
            } catch (err) {
              console.error(`Error fetching interests for user ${user.id}:`, err);
            }
            // Fetch current user's availability
            let userAvailability = [];
            try {
              const availabilityResponse = await handleGetUserAvailability(user.id);
              userAvailability = availabilityResponse || [];
              console.log(`User availability received for user ${user.id}:`, userAvailability);
            } catch (err) {
              console.error(`Error fetching availability for user ${user.id}:`, err);
            }
        
            return {
              ...user,
              ...userProfile,
              Interests: userInterests,
              Availability: userAvailability,
              score: null,
            };
          })
        );

        // Step 3: Filter visible users
        const visibleUsers = mergedUsers.filter((user) => user.visibility === 'Show');

        console.log('Visible users:', visibleUsers);

        setUserNames(visibleUsers);
        setAllUserNames(visibleUsers);

        // Step 4: Get current user info
        const currentUserData = getUserData();
        setCurrentUser(currentUserData);

        const currentUserId = currentUserData?.id || id; // fallback
        console.log('Current user ID (resolved):', currentUserId);


        setLoading(false);
      } catch (err) {
        console.error('Error in fetchUserData:', err);
        setError(err);
        setLoading(false);
      }
    };

    fetchUserData();
  }, [id]);

  useEffect(() => {
    const availabilityParam = search.get('availability');
    if (availabilityParam) {
      try {
        const availabilityData = JSON.parse(availabilityParam);
        console.log('Received availability data from URL:', availabilityData);
        setSelectedAvailability(availabilityData);
      } catch (error) {
        console.error('Error parsing availability data:', error);
      }
    }
  }, [search]);

  useEffect(() => {
    if (
      selectedAvailability &&
      selectedAvailability.length > 0 &&
      allUserNames.length > 0
    ) {
      console.log("Auto-applying availability filter...");
      handleAvailabilityFilter();
    }
  }, [selectedAvailability, allUserNames]);

  const handleQuickAddFriend = async (user) => {
    try {
      const currentUserId = id;
      const fullName = `${user.firstName} ${user.lastName}`;

      // Get current list to avoid duplicates
      const { data } = await handleGetFriendsList(currentUserId);
      const current = Array.isArray(data?.friendsList) ? data.friendsList : [];

      if (current.includes(fullName)) {
        setSuccessMessage(`${fullName} is already in your friends list.`);
        setTimeout(() => setSuccessMessage(''), 2500);
        return;
      }

      const updated = [...current, fullName];
      await handleAddToFriendsList(currentUserId, updated);

      // keep local UI in sync
      localStorage.setItem('friendsList', JSON.stringify(updated));

      setSuccessMessage(`Added ${fullName} to your friends!`);
      setTimeout(() => setSuccessMessage(''), 2500);
    } catch (err) {
      console.error(err);
      setSuccessMessage('Could not add friend. Please try again.');
      setTimeout(() => setSuccessMessage(''), 2500);
    }
  };

  const fetchUserProfile = async (userId) => {
    try {
      console.log('Fetching profile for selected user with ID:', userId);

      const response = await handleGetUserProfileApi(userId);
      console.log('Fetched selected user profile:', response.data);

      setSelectedUserProfile(response.data);

      if (currentUser && response.data) {
        const score = calculateCompatibilityScore(response.data);
        setCompatibilityScore(score); // Update state with the calculated score
      } else {
        console.error(
          'Current user data is missing during compatibility calculation.'
        );
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const calculateCompatibilityScore = (selectedProfile) => {
    if (!currentUser || !selectedProfile) {
      console.error(
        'Selected user profile or current user is missing, skipping score calculation.'
      );
      return 0;
    }

    const genderScore =
      6 * (selectedProfile.gender === currentUser.gender ? 1 : 0);
    const professionScore =
      5 * (selectedProfile.profession === currentUser.profession ? 1 : 0);
    const interestsA = (selectedProfile.Interests || []).map(i => i.interest_name || i)
    const interestsB = (currentUser.Interests || []).map(i => i.interest_name || i)
    const shared = interestsA.filter(n => interestsB.includes(n))
    const interestsScore = 2 * shared.length;
    const ageDifferenceScore =
      -0.3 * Math.abs((selectedProfile.age || 0) - (currentUser.age || 0));

    const totalScore =
      genderScore + professionScore + interestsScore + ageDifferenceScore;

    console.log('Gender score:', genderScore);
    console.log('Profession score:', professionScore);
    console.log('Interests score:', interestsScore);
    console.log('Age difference score:', ageDifferenceScore);
    console.log('Total compatibility score:', totalScore);

    return parseFloat(totalScore.toFixed(2));
  };

  const calculateAllCompatibilityScores = async () => {
    const scoredUsers = userNames.map((user) => {
      const score = calculateCompatibilityScore(user);
      return { ...user, score };
    });

    // Sort users by score in descending order
    const sortedUsers = scoredUsers.sort((a, b) => b.score - a.score);
    setUserNames(sortedUsers);
  };

  const handleNameFilter = () => {
    const lowerCaseFilterInput = filterInput.trim().toLowerCase();
    if (lowerCaseFilterInput === '') {
      setUserNames(allUserNames);
    } else {
      const filteredNames = allUserNames.filter(
        (user) =>
          user.firstName.toLowerCase().includes(lowerCaseFilterInput) ||
          user.lastName.toLowerCase().includes(lowerCaseFilterInput) ||
          user.email.toLowerCase().includes(lowerCaseFilterInput)
      );
      setUserNames(filteredNames.length > 0 ? filteredNames : allUserNames);
    }
  };

  const handlePreferenceFilter = async () => {
    const lowerCasePreferenceInput = preferenceFilterInput.trim().toLowerCase();

    if (lowerCasePreferenceInput === '') {
      setUserNames(allUserNames);
    } else {
      try {
        console.log('Filtering users by preferences...');

        const preferencesResponse = await handleGetUserPreferencesApi();
        const preferences = preferencesResponse.data;

        console.log('Fetched preferences:', preferences);

        const filteredPreferences = preferences.filter((pref) =>
          Object.values(pref).some((value) =>
            String(value).toLowerCase().includes(lowerCasePreferenceInput)
          )
        );

        if (filteredPreferences.length === 0) {
          setUserNames(allUserNames);
        } else {
          const matchedUserIds = filteredPreferences.map((pref) => pref.id);
          const filteredNamesByPreferences = allUserNames.filter((user) =>
            matchedUserIds.includes(user.id)
          );
          setUserNames(
            filteredNamesByPreferences.length > 0
              ? filteredNamesByPreferences
              : allUserNames
          );
        }
      } catch (error) {
        console.error('Error fetching user preferences:', error);
      }
    }
  };

  const handleClearAvailabilityFilter = () => {
    setSelectedAvailability(null);
    setUserNames(allUserNames);
    setSuccessMessage('Availability filter cleared');
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  

  const handleUserClick = async (user) => {
    console.log('User clicked:', user);
    console.log('Friend List:', userList);
    fetchUserProfile(user.id);
    if (!recentChatPartners.some((partner) => partner.id === user.id)) {
      setRecentChatPartners([...recentChatPartners, user]);
    }
    const storedFriends = JSON.parse(localStorage.getItem('friendsList')) || [];
    if (!storedFriends.some((friend) => friend.id === user.id)) {
      const updatedFriends = [...storedFriends, user];
      localStorage.setItem('friendsList', JSON.stringify(updatedFriends));
      setRecentChatPartners(updatedFriends);

      // Display success message
      setSuccessMessage('User has been Successfully Added to your Friends List');

      // Clear the message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    }


    if (!userList.split(', ').includes(`${user.firstName} ${user.lastName}`)) {
      console.log(`Adding user: ${user.firstName} ${user.lastName}`);
      
      const updatedList = userList
        ? `${userList}, ${user.firstName} ${user.lastName}`
        : `${user.firstName} ${user.lastName}`;
      setUserList(updatedList);
      console.log("Updated Friends List:", updatedList);

      try {
        const response = await handleAddToFriendsList(id, updatedList.split(', '));
        // Check if response contains the expected structure
        if (response && response.data && response.data.message) {
            console.log(response.data.message);
        } else {
            console.error('Unexpected response structure:', response);
        }

          // Display success message
        setSuccessMessage('User has been Successfully Added to your Friends List');

        // Clear the message after 3 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);

      } catch (error) {
          // Handle both request and response errors
          if (error.response) {
              console.error('API Error:', error.response.data);
          } else {
              console.error('Request Error:', error.message);
          }
      }
    } else {
        // Display fail message if user is already on the friend list
        setSuccessMessage('User is already on your friends list!');

        // Clear the message after 3 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
    }
  };

  const handleRemovePartner = (userId) => {
    console.log('Removing recent chat partner with ID:', userId);
    const updatedPartners = recentChatPartners.filter(
      (partner) => partner.id !== userId
    );
    setRecentChatPartners(updatedPartners);
  };

  const handleNavigateToAvailabilityPicker = () => {
    navigate({
      pathname: '/AvailabilityPicker',
      search: createSearchParams({
        id: id,
      }).toString(),
    });
  };

  const handleBack = () => {
    navigate({
      pathname: '/Dashboard',
      search: createSearchParams({
        id: id,
      }).toString(),
    });
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  // Helper function to get field values
  const getField = (user, fieldNames) => {
    for (let field of fieldNames) {
      if (user[field] !== undefined && user[field] !== null) {
        return user[field];
      }
    }
    return 'N/A';
  };

  const MBTI_OPTIONS = [
  'INTJ','INTP','ENTJ','ENTP',
  'INFJ','INFP','ENFJ','ENFP',
  'ISTJ','ISFJ','ESTJ','ESFJ',
  'ISTP','ISFP','ESTP','ESFP'
  ];

  const ZODIAC_OPTIONS = [
    'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
    'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'
  ];

  // Convert <select multiple> event to an array of values
  const toValues = (e) => Array.from(e.target.selectedOptions).map(o => o.value);

  // Apply MBTI/Zodiac filters (and respect the Name textbox)
  const applyPersonalityFilters = () => {
    let base = allUserNames;

    // Name/email filter (re-use your name textbox)
    const nameNeedle = (filterInput || '').trim().toLowerCase();
    if (nameNeedle) {
      base = base.filter(user =>
        (user.firstName || '').toLowerCase().includes(nameNeedle) ||
        (user.lastName  || '').toLowerCase().includes(nameNeedle) ||
        (user.email     || '').toLowerCase().includes(nameNeedle)
      );
    }

    // MBTI (case-insensitive; allow multiple)
    if (selectedMbti.length) {
      const setMbti = new Set(selectedMbti.map(v => v.toUpperCase()));
      base = base.filter(u => setMbti.has(String(u.mbti || '').toUpperCase()));
    }

    // Zodiac (case-insensitive; allow multiple)
    if (selectedZodiac.length) {
      const setZ = new Set(selectedZodiac.map(v => v.toLowerCase()));
      base = base.filter(u => setZ.has(String(u.zodiac || '').toLowerCase()));
    }

    setUserNames(base);
  };

  // Clear all personality filters
  const clearPersonalityFilters = () => {
    setSelectedMbti([]);
    setSelectedZodiac([]);
    setUserNames(allUserNames);
  };

  return (
    <div className="friend-search-container">
      <div className="filter-sidebar">
        <div className="filter-section">
          <h3>Filter Users by Name</h3>
          <input
            type="text"
            placeholder="Enter name or email"
            value={filterInput}
            onChange={(e) => setFilterInput(e.target.value)}
          />
          <button className="filter-btn" onClick={handleNameFilter}>
            Filter by Name
          </button>
        </div>

        <div className="filter-section">
          <h3>Filter Users by MBTI & Zodiac</h3>

          <label className="filter-label">MBTI (multi-select)</label>
          <select
            multiple
            size={6}
            value={selectedMbti}
            onChange={(e) => setSelectedMbti(toValues(e))}
            className="filter-multiselect"
          >
            {MBTI_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>

          <label className="filter-label" style={{ marginTop: 10 }}>Zodiac (multi-select)</label>
          <select
            multiple
            size={6}
            value={selectedZodiac}
            onChange={(e) => setSelectedZodiac(toValues(e))}
            className="filter-multiselect"
          >
            {ZODIAC_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="filter-btn" onClick={applyPersonalityFilters}>
              Apply Filters
            </button>
            <button className="filter-btn" onClick={clearPersonalityFilters}>
              Clear
            </button>
          </div>

          <small>Tip: Hold <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> or <kbd>Shift</kbd> to select multiple.</small>
        </div>

        <div className="filter-section">
          <h3>Filter by Availability</h3>
          <button className="filter-btn availability-btn" onClick={handleNavigateToAvailabilityPicker}>
            Filter by Availability
          </button>
          {selectedAvailability && selectedAvailability.length > 0 && (
            <div className="availability-display">
              <p className="availability-label">Selected Times:</p>
              <div className="availability-slots">
                {selectedAvailability.map((slot, index) => (
                  <span key={index} className="availability-slot">
                    {slot.day} {slot.time}
                  </span>
                ))}
              </div>
              <button className="clear-availability-btn" onClick={handleClearAvailabilityFilter}>
                Clear Availability Filter
              </button>
            </div>
          )}
        </div>
        <button className="btn-back" onClick={handleBack}>
          Back
        </button>
      </div>

    <div className="friend-search">
      <h1>User Table</h1>
      <button
        className="calculate-score-btn"
        onClick={calculateAllCompatibilityScores}
      >
        Calculate Compatibility Scores
      </button>

      {/* Wrap the table in a container */}
      <div className="table-container">
        <table className="user-table">
          <thead>
            <tr>
              <th>First Name</th>
              <th>Last Name</th>
              <th>ID</th>
              <th>Email</th>
              <th>Gender</th>
              <th>Profession</th>
              <th>Interests</th>
              <th>MBTI</th>
              <th>Zodiac</th>
              <th>Time Zone</th>
              <th>Age</th>
              {/* New Columns */}
              <th>Native Language</th>
              <th>Target Language</th>
              <th>Compatibility Score</th>
              <th>Availability</th>
              {/* ➕ Add-Friend column */}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {userNames.map((user, index) => (
              <tr
                key={index}
                onClick={() => handleUserClick(user)}
                className="table-row"
              >
                <td>{user.firstName}</td>
                <td>{user.lastName}</td>
                <td>{user.id}</td>
                <td>{user.email}</td>
                <td>{user.gender}</td>
                <td>{user.profession}</td>
                <td>{Array.isArray(user.Interests) ? user.Interests.map(i => i.interest_name).join(', ') : ''}</td>
                <td>{user.mbti}</td>
                <td>{user.zodiac}</td>
                <td>{user.default_time_zone}</td>
                <td>{user.age}</td>
                {/* Adjusted Field Names with Helper Function */}
                <td>{getField(user, ["nativeLanguage", "native_language"])}</td>
                <td>{getField(user, ["targetLanguage", "target_language"])}</td>
                <td>{user.score !== null ? user.score : "N/A"}</td>
                <td>{Array.isArray(user.Availability) ? user.Availability.map(a => `${a.day_of_week} ${a.start_time}`).join(', '): ''}</td>

                {/* ➕ Add-Friend button cell */}
                <td>
                  <button
                    className="add-friend-btn"
                    title="Add friend"
                    onClick={(e) => {
                      e.stopPropagation(); // prevent triggering row click
                      handleQuickAddFriend(user);
                    }}
                  >
                    <FiUserPlus size={18} />
                    {/* or use <span style={{fontSize: '18px'}}>+</span> if not using react-icons */}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="success-message">
          <p>{successMessage}</p>
        </div>
      )}
    </div>
  </div>
  );
};

export default FriendSearch;