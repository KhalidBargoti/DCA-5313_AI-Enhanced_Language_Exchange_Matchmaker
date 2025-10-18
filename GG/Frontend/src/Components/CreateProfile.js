import { useState, useEffect } from 'react';
import React from "react";
import './Registration.css'; 
import './CreateProfile.scss'; 
import Select from "react-select";

import { handleProfileCreationAPI, handleGetAllInterests, handleAddUserInterest, handleAddUserAvailability } from '../Services/userService';
import { createSearchParams, useNavigate, useSearchParams } from "react-router-dom";


function CreateProfile() {
  // States for registration
  const [nativeLanguage, setNativeLanguage] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [targetLanguageProficiency, setTargetLanguageProficiency] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [profession, setProfession] = useState('');
  const [mbti, setMBTI] = useState('');
  const [zodiac, setZodiac] = useState('');
  const [allInterests, setAllInterests] = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [defaultTimeZone, setDefaultTimeZone] = useState('');
  const [availability, setAvailability] = useState([]);
  const [visibility, setVisibility] = useState('');
  const [errMsg, setErrMsg] = useState('');
  
  // States for checking the errors
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);

  const [search] = useSearchParams();
  const id = search.get("id");
  const navigate = useNavigate();
 
  const NativeLanguage = [
    {value: "English", label: "English"},
    {value: "Korean", label: "Korean"},
  ];

  const TargetLanguage = [
    {value: "English", label: "English"},
    {value: "Korean", label: "Korean"},
  ];

  const TargetLanguageProficiency = [
    {value: "Beginner", label: "Beginner"},
    {value: "Elementary", label: "Elementary"},
    {value: "Intermediate", label: "Intermediate"},
    {value: "Proficient", label: "Proficient"},
    {value: "Fluent", label: "Fluent"},
  ];

  const Gender = [
    {value: "Male", label: "Male"},
    {value: "Female", label: "Female"},
    {value: "Other", label: "Other"},
  ];

  const Profession = [
    {value:"Education", label:"Education"},
    {value:"Engineering", label: "Engineering"},
    {value:"Retail", label:"Retail"},
    {value:"Finance", label:"Finance"},
    {value:"Law", label:"Law"},
    {value:"Medicine", label:"Medicine"},
    {value:"Scientist", label:"Scientist"},
  ];

  const Zodiac = [
    { value: "Aries", label: "Aries" },
    { value: "Taurus", label: "Taurus" },
    { value: "Gemini", label: "Gemini" },
    { value: "Cancer", label: "Cancer" },
    { value: "Leo", label: "Leo" },
    { value: "Virgo", label: "Virgo" },
    { value: "Libra", label: "Libra" },
    { value: "Scorpio", label: "Scorpio" },
    { value: "Sagittarius", label: "Sagittarius" },
    { value: "Capricorn", label: "Capricorn" },
    { value: "Aquarius", label: "Aquarius" },
    { value: "Pisces", label: "Pisces" },
  ];

  const TimeZones = [
    { value: "UTC", label: "UTC" },
    { value: "America/New_York", label: "America/New_York" },
    { value: "America/Chicago", label: "America/Chicago" },
    { value: "America/Denver", label: "America/Denver" },
    { value: "America/Los_Angeles", label: "America/Los_Angeles" },
    { value: "Europe/London", label: "Europe/London" },
    { value: "Europe/Paris", label: "Europe/Paris" },
    { value: "Asia/Seoul", label: "Asia/Seoul" },
    { value: "Asia/Tokyo", label: "Asia/Tokyo" },
  ];

  const MBTI = [
    {value: "INTJ", label: "INTJ"},
    {value: "INTP", label: "INTP"},
    {value: "ENTJ", label: "ENTJ"},
    {value: "ENTP", label: "ENTP"},
    {value: "INFJ", label: "INFJ"},
    {value: "INFP", label: "INFP"},
    {value: "ENFJ", label: "ENFJ"},
    {value: "ENFP", label: "ENFP"},
    {value: "ISTJ", label: "ISTJ"},
    {value: "ISFJ", label: "ISFJ"},
    {value: "ESTJ", label: "ESTJ"},
    {value: "ESFJ", label: "ESFJ"},
    {value: "ISTP", label: "ISTP"},
    {value: "ISFP", label: "ISFP"},
    {value: "ESTP", label: "ESTP"},
    {value: "ESFP", label: "ESFP"},
  ];

  const VisibilityOptions = [
    { value: "Show", label: "Show" },
    { value: "Hide", label: "Hide" },
  ];

  const availabilityOptions = [
    { value: "Monday Morning", label: "Monday Morning" },
    { value: "Monday Afternoon", label: "Monday Afternoon" },
    { value: "Monday Evening", label: "Monday Evening" },
    { value: "Tuesday Morning", label: "Tuesday Morning" },
    { value: "Tuesday Afternoon", label: "Tuesday Afternoon" },
    { value: "Tuesday Evening", label: "Tuesday Evening" },
    { value: "Wednesday Morning", label: "Wednesday Morning" },
    { value: "Wednesday Afternoon", label: "Wednesday Afternoon" },
    { value: "Wednesday Evening", label: "Wednesday Evening" },
    { value: "Thursday Morning", label: "Thursday Morning" },
    { value: "Thursday Afternoon", label: "Thursday Afternoon" },
    { value: "Thursday Evening", label: "Thursday Evening" },
    { value: "Friday Morning", label: "Friday Morning" },
    { value: "Friday Afternoon", label: "Friday Afternoon" },
    { value: "Friday Evening", label: "Friday Evening" },
    { value: "Saturday Morning", label: "Saturday Morning" },
    { value: "Saturday Afternoon", label: "Saturday Afternoon" },
    { value: "Saturday Evening", label: "Saturday Evening" },
    { value: "Sunday Morning", label: "Sunday Morning" },
    { value: "Sunday Afternoon", label: "Sunday Afternoon" },
    { value: "Sunday Evening", label: "Sunday Evening" },
  ];

  useEffect(() => {
    const fetchInterests = async () => {
      try {
        const response = await handleGetAllInterests();
        const interestArray = Array.isArray(response.data) ? response.data : response;
        const formatted = interestArray.map(i => ({
          value: i.id,
          label: i.interest_name
        }));
        setAllInterests(formatted);
      } catch (err) {
        console.error('Failed to fetch interests:', err);
      }
    };
    fetchInterests();
  }, []);

  const handleNativeLanguage = (selectedOption) => {
    console.log(selectedOption.value);
    setNativeLanguage(selectedOption.value);
  };

  const handleTargetLanguage = (selectedOption) => {
    setTargetLanguage(selectedOption.value);
  };

  const handleTargetLanguageProficiency = (selectedOption) => {
    setTargetLanguageProficiency(selectedOption.value);
  };

  const handleAge = (e) => {
    setAge(e.target.value);
  };

  const handleGender = (selectedOption) => {
    setGender(selectedOption.value);
  };

  const handleProfession = (selectedOption) => {
    setProfession(selectedOption.value);
  };

  const handleZodiac = (selectedOption) => {
    setZodiac(selectedOption.value);
  };

  const handleMBTI = (selectedOption) => {
    setMBTI(selectedOption.value);
  };

  const handleInterestsChange = (selectedOptions) => {
    setSelectedInterests(selectedOptions || []);
  };

  const handleDefaultTimeZone = (selectedOption) => {
    setDefaultTimeZone(selectedOption.value);
  };

  const handleAvailability = (selectedOptions) => {
    setAvailability(selectedOptions || []);
  };

  const handleVisibility = (selectedOption) => {
    setVisibility(selectedOption.value);
  };

  // Handling the form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (nativeLanguage === '' || targetLanguage === '' || targetLanguageProficiency === '' || age === '' || profession === '') {
      setError(true);
      setErrMsg("Not all required fields entered!");
      return;
    }
    
    setSubmitted(false);
    setError(false);
    
    try {
      // for backend
      console.log('Sending create: ' + nativeLanguage + targetLanguage + targetLanguageProficiency + age + gender + profession + mbti + zodiac + defaultTimeZone + visibility);
      let data = await handleProfileCreationAPI(id, nativeLanguage, targetLanguage, targetLanguageProficiency, age, gender, profession, mbti, zodiac, defaultTimeZone, visibility);
      console.log('Create done');

      // add user interests
      if (selectedInterests.length > 0) {
        const interestIds = selectedInterests.map(i => i.value);
      
        for (const interestId of interestIds) {
          await handleAddUserInterest(id, interestId);
          console.log(`Added interest ${interestId} for user ${id}`);
        }
        console.log("All user interests added!");
      }

      // add user availability
      if (availability.length > 0) {
        const slots = availability.map(a => a.value);
        try {
          await handleAddUserAvailability(id, slots);
          console.log("All user availabilities added!");
        } catch (error) {
          console.error("Failed to add user availability:", error);
        }
      }

      if (data && data.errCode !== 0){
          setSubmitted(true);
          setErrMsg(data.message);
      }
      
      if (data && data.errCode === 0) {
        setSubmitted(true);
        console.log("Profile Creation Successful!");
        
        // Navigate after successful creation
        navigate({
          pathname: "/Dashboard",
          search: createSearchParams({
            id: id
          }).toString()
        });
      }
    } catch (error) {
      setError(true);
      if (error.response && error.response.data) {
        setErrMsg(error.response.data.message);
      } else {
        setErrMsg("An error occurred while creating the profile");
      }
      console.log(error);
    }
  };
 
  // Showing success message
  const successMessage = () => {
    return (
      <div
        className="success"
        style={{
          display: submitted ? '' : 'none',
        }}>
        <h1>Updated</h1>
      </div>
    );
  };
 
  // Showing error message if error is true
  const errorMessage = () => {
    return (
      <div
        className="error"
        style={{
          display: error ? '' : 'none',
        }}>
        {errMsg || 'Please enter all required fields'}
      </div>
    );
  };

  const handleBack = (e) => {
    e.preventDefault();
    navigate({
      pathname: "/Dashboard",
      search: createSearchParams({
        id: id
      }).toString()
    });
  };
 
  return (
    <div className="screen-Background">
      <div className="screen-Container" style={{ justifyContent: 'center' }}>
        <div className="screen-Content">
          <div>
            <h1>Set Profile</h1>
            <h6>(* indicates required fields)</h6>
          </div>
          {/* Calling to the methods */}
          <div className="messages">
            {errorMessage()}
            {successMessage()}
          </div>
 
          <form onSubmit={handleSubmit}>
            <div className="profile-container">
              {/* Labels and inputs for form data */}

              <div className='form-group'>
                <label className="label">Native Language*</label>
                <Select options={NativeLanguage} onChange={handleNativeLanguage}/>
              </div>

              <div className='form-group'>
                <label className="label">Target Language*</label>
                <Select options={TargetLanguage} onChange={handleTargetLanguage}/>
              </div>

              <div className='form-group'>
                <label className="label">Level of Target Language*</label>
                <Select options={TargetLanguageProficiency} onChange={handleTargetLanguageProficiency}/>
              </div>

              <div className='form-group'>
                <label className="label">Age*</label>
                <input 
                  placeholder="Enter Age"
                  onChange={handleAge}
                  className="input"
                  type="number"
                  value={age}
                />
              </div>

              <div className='form-group'>
                <label className="label">Gender</label>
                <Select options={Gender} onChange={handleGender}/>
              </div>

              <div className='form-group'>
                <label className="label">Profession*</label>
                <Select options={Profession} onChange={handleProfession}/>
              </div>

              <div className='form-group'>
                <label className="label">Personality Type</label>
                <Select options={MBTI} onChange={handleMBTI}/>
              </div>

              <div className='form-group'>
                <label className="label">Zodiac</label>
                <Select options={Zodiac} onChange={handleZodiac}/>
              </div>

              <div className='form-group'>
                <label className="label">Interests</label>
                <Select
                  isMulti
                  options={allInterests}
                  onChange={handleInterestsChange}
                  value={selectedInterests}
                />
              </div>

              <div className='form-group'>
                <label className="label">Default Time Zone</label>
                <Select options={TimeZones} onChange={handleDefaultTimeZone}/>
              </div>

              <div className='form-group'>
                <label className="label">Availability</label>
                <Select 
                  isMulti
                  options={availabilityOptions}
                  value={availability}
                  onChange={handleAvailability}
                />
              </div>

              <div className='form-group'>
                <label className="label">Visibility</label>
                <Select options={VisibilityOptions} onChange={handleVisibility} />
              </div>

            </div>
            <button className="btn-back-02" type="submit">
              Update Profile
            </button>
          </form>
        </div>
      </div>
    </div>
  );
    
}
export default CreateProfile;
