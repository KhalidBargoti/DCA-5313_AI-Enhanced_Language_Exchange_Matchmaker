import React, { useEffect, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { VideoPlayer } from './VideoPlayer';
import Button from 'react-bootstrap/Button';
import { useNavigate, createSearchParams, useSearchParams } from 'react-router-dom';
import './VideoRoom.css';

const APP_ID = '50a71f096ba844e3be400dd9cf07e5d4';
const TOKEN = '007eJxTYOhhrnb9uYLpTaDLQwkDQ9vpG38Ufpk68XDbtiXpGz59ZAtQYDA1SDQ3TDOwNEtKtDAxSTVOSjUxMEhJsUxOMzBPNU0xeRcalN4QyMjw7tlCFkYGCATxuRlyE0uSM3ITszPz0hkYALNiJKE=';
const CHANNEL = 'matchmaking';

export const client = AgoraRTC.createClient({
  mode: 'rtc',
  codec: 'vp8',
});

export const VideoRoom = ({ room, initialAiAllowed = true, chatId, currentUserId }) => {
  const [users, setUsers] = useState([]);
  const [localTracks, setLocalTracks] = useState([]);
  const [muted, setMuted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [aiAllowed, setAiAllowed] = useState(initialAiAllowed);

  const navigate = useNavigate();
  const [search] = useSearchParams();
  const id = search.get('id') || currentUserId;

  // ======= AGORA setup =======
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === 'video') {
          setUsers((prev) => {
            if (prev.some((u) => u.uid === user.uid)) return prev;
            return [...prev, user];
          });
        }
        if (mediaType === 'audio') user.audioTrack?.play();
      });

      client.on('user-unpublished', (user, type) => {
        if (type === 'audio') user.audioTrack?.stop?.();
        setUsers((prev) => prev.filter((u) => u.uid !== user.uid));
      });

      client.on('user-left', (user) => {
        setUsers((prev) => prev.filter((u) => u.uid !== user.uid));
      });

      const roomChannel = room || CHANNEL;
      await client
        .join(APP_ID, roomChannel, TOKEN, null)
        .then((uid) => Promise.all([AgoraRTC.createMicrophoneAndCameraTracks(), uid]))
        .then(([tracks, uid]) => {
          const [audioTrack, videoTrack] = tracks;
          if (!isMounted) return;
          setLocalTracks(tracks);
          setUsers((prev) => [...prev, { uid, videoTrack, audioTrack }]);
          client.publish(tracks);
        });
    };

    init();

    return () => {
      isMounted = false;
      for (let t of localTracks) {
        try {
          t.stop();
          t.close();
        } catch {}
      }
      client.leave().catch(() => {});
      setUsers([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ======= Controls =======
  const toggleMute = () => {
    setMuted((prev) => {
      const next = !prev;
      localTracks[0]?.setEnabled(!next);
      return next;
    });
  };

  const toggleHideVideo = () => {
    const next = !hidden;
    localTracks[1]?.setEnabled(!next);
    setHidden(next);
  };

  const toggleAiAccess = async () => {
    const next = !aiAllowed;
    setAiAllowed(next);
    try {
      if (chatId) {
        const { updateChatPrivacy } = await import('../Services/privacyService');
        await updateChatPrivacy(chatId, id ?? currentUserId, next);
      } else {
        console.warn('[VideoRoom] No chatId — privacy change is local only.');
      }
    } catch (err) {
      console.error('Failed to update AI access', err);
      setAiAllowed(!next);
    }
  };

  const goHome = () => {
    navigate({
      pathname: '/Dashboard',
      search: createSearchParams({ id: id }).toString(),
    });
  };

  // ======= Render =======
  return (
    <div
      className="video-room"
      style={{
        position: 'relative',
        minHeight: '100vh',
        backgroundColor: 'white', // fixed background color
      }}
    >
      {/* Home Button (top-left, blue like others) */}
      <div
        style={{
          position: 'fixed',
          top: 12,
          left: 12,
          zIndex: 1000,
        }}
      >
        <Button
          variant="primary"
          size="sm"
          onClick={goHome}
          style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
        >
          Home
        </Button>
      </div>

      {/* AI toggle (top-right) */}
      <div
        style={{
          position: 'fixed',
          top: 12,
          right: 12,
          zIndex: 1000,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <Button
          size="sm"
          variant={aiAllowed ? 'success' : 'secondary'}
          onClick={toggleAiAccess}
          title="AI privacy for this call"
          style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
        >
          {aiAllowed ? 'AI: On' : 'AI: Off'}
        </Button>
      </div>

      {/* Centered control buttons */}
      <div
        className="controls"
        style={{
          position: 'fixed',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 900,
          display: 'flex',
          gap: 8,
        }}
      >
        <Button variant="primary" onClick={toggleMute}>
          {muted ? 'Unmute' : 'Mute'}
        </Button>
        <Button variant="primary" onClick={toggleHideVideo}>
          {hidden ? 'Show Video' : 'Hide Video'}
        </Button>
      </div>

      {/* Video feed area */}
      <div
        className="videos"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          width: '100%',
        }}
      >
        {users.map((user) => (
          <VideoPlayer key={user.uid} user={user} />
        ))}
      </div>
    </div>
  );
};

export default VideoRoom;
