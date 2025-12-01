import { useState } from 'react';
import { useEffect } from 'react';
import React from "react";
import './Registration.css'; 
import './UpdateProfile.css'; 
import Select from "react-select";

import Button from 'react-bootstrap/Button';

import { handleProfileUpdateAPI, handleGetAllInterests, handleAddUserInterest, handleAddUserAvailability } from '../Services/userService';
import { createSearchParams, useNavigate, useSearchParams } from "react-router-dom";


function UpdateProfile() {
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
  const [errMsg ,setErrMsg] = useState('');
  
  // States for checking the errors
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);
 
 const NativeLanguage = [
  {value: "English", label: "English"},
  {value: "Korean", label: "Korean"},
 ]

 const TargetLanguage = [
  {value: "English", label: "English"},
  {value: "Korean", label: "Korean"},
 ]
 const TargetLanguageProficiency = [
  {value: "Beginner", label: "Beginner"},
  {value: "Elementary", label: "Elementary"},
  {value: "Intermediate", label: "Intermediate"},
  {value: "Proficient", label: "Proficient"},
  {value: "Fluent", label: "Fluent"},
 ]

 const Gender = [
  {value: "Male", label: "Male"},
  {value: "Female", label: "Female"},
  {value: "Other", label: "Other"},
 ]

 const Profession = [
  {value:"Education", label:"Education"},
  {value:"Engineering", label: "Engineering"},
  {value:"Retail", label:"Retail"},
  {value:"Finance", label:"Finance"},
  {value:"Law", label:"Law"},
  {value:"Medecine", label:"Medecine"},
  {value:"Scientist", label:"Scientist"},
 ]

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
 ]

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
 ]

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
 ]

 const VisibilityOptions = [
  { value: "Show", label: "Show" },
  { value: "Hide", label: "Hide" },
 ];

 const generateHourlySlots = (day) => {
  const slots = [];
  for (let hour = 8; hour < 21; hour++) {
    const start = String(hour).padStart(2, '0') + ':00';
    const end = String(hour + 1).padStart(2, '0') + ':00';

    const formatHour = (h) => {
      const suffix = h >= 12 ? 'pm' : 'am';
      const display = ((h + 11) % 12 + 1); // convert 13 -> 1, 0 -> 12, etc
      return `${display}${suffix}`;
    };

    const label = `${day} ${formatHour(hour)}-${formatHour(hour + 1)}`;

    slots.push({
      value: { day_of_week: day, start_time: start, end_time: end },
      label,
    });
  }
  return slots;
};

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const availabilityOptions = days.flatMap(generateHourlySlots);

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
  console.log(selectedOption.value)
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
  setDefaultTimeZone(selectedOption.value)
 };

 const handleAvailability = (selectedOptions) => {
  setAvailability(selectedOptions || []);
 }

 const handleVisibility = (selectedOption) => {
  setVisibility(selectedOption.value)
 };

const [search] = useSearchParams();
 const id = search.get("id");
 console.log("Your id is: ", id)
 const navigate = useNavigate();
  // Handling the form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (nativeLanguage === '' || targetLanguage === '' || targetLanguageProficiency === '' || age === '' || profession === '') {
      setError(true);
    } else {
      setSubmitted(true);
      setError(false);
    }
    setError("");
    try{
        // for backend
        console.log('Sending update: ' + nativeLanguage + targetLanguage + targetLanguageProficiency + age + gender + profession + mbti + zodiac + defaultTimeZone + visibility);
      let data = await handleProfileUpdateAPI(id, nativeLanguage, targetLanguage, targetLanguageProficiency, age, gender, profession, mbti, zodiac, defaultTimeZone, visibility);
      console.log('Update done');

      // add user interests
      if (selectedInterests.length > 0) {
        const interestIds = selectedInterests.map(i => i.value);
      
        try {
          for (const interestId of interestIds) {
            await handleAddUserInterest(id, interestId);
            console.log(`Added interest ${interestId} for user ${id}`);
          }
          console.log("All user interests added!");
        } catch (error) {
          console.error("Failed to add user interests:", error);
        }
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
      if (data && data.errCode === 0){
        // todo when login successfull!
        setSubmitted(true);
        console.log("Profile Update Successful!");
      }
    } catch(error){
      if (error.response){
        if (error.response.data){
                setErrMsg(error.response.data.message)
                console.log(errMsg)
        }
      }
    }
    
  
    navigate({
        pathname: "/Dashboard",
        search: createSearchParams({
            id: id
        }).toString()
    });
  };
 
  // Showing success message
  const successMessage = () => {
    return (
      <div
        className="success"
        style={{
          display: submitted ? '' : 'none',
        }}>
        <h1> Updated</h1>
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
        <h1>enter required fields</h1>
      </div>
    );
  };

  const handleBack = async (e) => {
    navigate({
      pathname: "/Dashboard",
      search: createSearchParams({
        id: id
      }).toString()
    });
  };
  
  return (
  <div className="set-profile-wrapper">
    <div className="set-profile-card">

      <h1>Set Profile</h1>
      <h6>(* indicates required fields)</h6>

      <div className="messages">
        {errorMessage()}
        {successMessage()}
      </div>

      <form className="set-profile-form">

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
            type="text"
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
          <Select options={VisibilityOptions} onChange={handleVisibility}/>
        </div>

        <div className="profile-buttons">
          <button className="btn-back-02" onClick={handleSubmit}>
            Update Profile
          </button>
          <button className="btn-back-02" onClick={handleBack}>
            Back
          </button>
        </div>

      </form>

    </div>
  </div>
);
    
}
export default UpdateProfile;