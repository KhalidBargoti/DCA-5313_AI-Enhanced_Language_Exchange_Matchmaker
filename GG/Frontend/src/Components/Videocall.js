import { useState, useEffect } from 'react';
import React from 'react';
import './Videocall.css';
import { VideoRoom, client } from './VideoRoom';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import { createSearchParams, useSearchParams, useNavigate } from 'react-router-dom';
import { updateChatPrivacy } from '../Services/privacyService';

function Videocall() {
  const [joined, setJoined] = useState(false);
  const [room, setRoom] = useState('');

  const navigate = useNavigate();
  const [search] = useSearchParams();
  const id = search.get('id');         // current user id
  const chatId = search.get('chatId'); // optional if launched from chat

  // Privacy toggle modal
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [aiAllowed, setAiAllowed] = useState(true);

  useEffect(() => {
    setRoom('matchmaking');
  }, []);

  const handleJoinRoom = () => {
    setShowPrivacyModal(true);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const confirmAndJoin = async () => {
    try {
      if (chatId) {
        await updateChatPrivacy(chatId, id, aiAllowed);
      } else {
        console.warn('[Videocall] No chatId — skipping privacy update API call.');
      }
    } catch (e) {
      console.error('Failed to update chat privacy', e);
    } finally {
      setShowPrivacyModal(false);
      setJoined(true);
    }
  };

  return (
    <div className="video-call-container">
      <div className="body">
        <div className="join">
          {!joined ? (
            <>
              <button className="btn-back-02" onClick={handleJoinRoom}>
                Join Room
              </button>
              <button className="btn-back-02" onClick={handleBack}>
                Back
              </button>
            </>
          ) : (
            <VideoRoom
              room={room}
              initialAiAllowed={aiAllowed}
              chatId={chatId}
              currentUserId={id}
            />
          )}
        </div>
      </div>

      <Modal show={showPrivacyModal} onHide={() => setShowPrivacyModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>AI access for this video call</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Allow the app’s AI to access this conversation (e.g., for summaries or assistance)?</p>
          <Form.Check
            type="switch"
            id="ai-access-switch"
            label={aiAllowed ? 'Allowed' : 'Denied'}
            checked={aiAllowed}
            onChange={(e) => setAiAllowed(e.target.checked)}
          />
          <small>Your choice applies only to this conversation. You can change it during the call.</small>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={confirmAndJoin}>
            Join
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Videocall;
