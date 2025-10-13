import React, { useState, useEffect } from 'react';
import { FiUserPlus } from 'react-icons/fi';

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
import { handleAddToFriendsList, handleGetFriendsList } from '../Services/userService';

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
    
    // TODO: call the backend API with availability data
    const filteredUsers = allUserNames.filter((user) => {
      // returns all users atm
      // TODO: implement the actual availability matching logic
      return true;
    });

    setUserNames(filteredUsers);
    setSuccessMessage(`Filtered by availability: ${selectedAvailability.length} time slots selected`);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  useEffect(() => {
    // Get time slot data from AvailabilityPicker
    const availabilityParam = search.get('availability');
    if (availabilityParam) {
      try {
        const availabilityData = JSON.parse(availabilityParam);
        setSelectedAvailability(availabilityData);
        console.log('Received availability data:', availabilityData);
        
        setTimeout(() => {
          handleAvailabilityFilter();
        }, 100);
      } catch (error) {
        console.error('Error parsing availability data:', error);
      }
    }
    
    const fetchUserData = async () => {
      try {
        console.log(
          'Fetching all user names and retrieving current user preferences...'
        );

        const userResponse = await handleGetUserNamesApi();
        const profilesResponse = await handleGetUserPreferencesApi();

        // Merge user data with their profiles
        const mergedUsers = userResponse.data.map((user) => {
          const userProfile = profilesResponse.data.find(
            (profile) => profile.id === user.id
          );
          const mergedUser = {
            ...user,
            ...userProfile, // Spread profile data into user object
            score: null, // Initialize compatibility score
          };
          console.log('Merged User:', mergedUser); // Debugging Line
          return mergedUser;
        });

        const visibleUsers = mergedUsers.filter(
          (user) => user.visibility === 'Show'
        );

        console.log('Visible users:', visibleUsers);

        setUserNames(visibleUsers);
        setAllUserNames(visibleUsers);

        // Retrieve stored current user data from userData.js
        const currentUserData = getUserData();
        setCurrentUser(currentUserData);

        console.log('Fetched user names:', userResponse.data);
        console.log('Retrieved current user data:', currentUserData);
        console.log('current user id:', id);

        // Fetch friends list for the current user
        try {
          console.log('Fetching friends list for user ID:', id);
      
          const friendsResponse = await handleGetFriendsList(id);
          console.log('Full friendsResponse:', friendsResponse);
      
          // Safely access friendsList
          const friendsList = friendsResponse?.friendsList;
      
          if (Array.isArray(friendsList)) {
              setUserList(friendsList.join(', ')); // Convert the list to a string
              console.log(userList);
          } else {
              console.error('Unexpected friendsList type:', friendsList);
              setUserList(''); // Reset to empty string on unexpected structure
          }
        } catch (friendsError) {
            console.error('Error fetching friends list:', friendsError);
            setUserList(''); // Reset to empty string on fetch error
        }
      


        setLoading(false);
      } catch (err) {
        setError(err);
        console.error('Error in fetchUserData:', err);
        setLoading(false);
      }
    };
    fetchUserData();
  }, [id]);


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
          <h3>Filter Users by Preference</h3>
          <input
            type="text"
            placeholder="Enter preference"
            value={preferenceFilterInput}
            onChange={(e) => setPreferenceFilterInput(e.target.value)}
          />
          <button className="filter-btn" onClick={handlePreferenceFilter}>
            Filter by Preference
          </button>
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