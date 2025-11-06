import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { VideoPlayer } from './VideoPlayer';
import Button from 'react-bootstrap/Button';
import { useNavigate, createSearchParams, useSearchParams } from 'react-router-dom';
import './VideoRoom.css';

const APP_ID = '50a71f096ba844e3be400dd9cf07e5d4';
const TOKEN = 'YOUR_TOKEN_HERE';
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

  // guard so we don't double-cleanup
  const endedRef = useRef(false);

  // ===== Join & event wiring =====
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
          if (!isMounted) {
            // safety: close tracks if we raced unmount
            try { tracks[0]?.stop(); tracks[0]?.close(); } catch {}
            try { tracks[1]?.stop(); tracks[1]?.close(); } catch {}
            return;
          }
          const [audioTrack, videoTrack] = tracks;
          setLocalTracks(tracks);
          setUsers((prev) => [...prev, { uid, videoTrack, audioTrack }]);
          client.publish(tracks);
        });
    };

    init();

    // Unmount cleanup (backup – End Call does this too)
    return () => {
      cleanupCall(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hard cleanup routine used by both unmount and explicit End Call
  const cleanupCall = async (removeListeners = true) => {
    if (endedRef.current) return;
    endedRef.current = true;

    try {
      // Best-effort unpublish
      if (localTracks && localTracks.length) {
        try {
          await client.unpublish(localTracks).catch(() => {});
        } catch {}
      }
    } catch {}

    // Stop & close local tracks
    if (localTracks && localTracks.length) {
      for (const t of localTracks) {
        try { t.stop(); } catch {}
        try { t.close(); } catch {}
      }
    }

    // Leave channel
    try { await client.leave(); } catch {}

    // Optionally remove listeners
    if (removeListeners) {
      try { client.removeAllListeners(); } catch {}
    }

    // Reset local state
    setUsers([]);
    setLocalTracks([]);
    setMuted(false);
    setHidden(false);
  };

  // Warn/cleanup when tab is closed or refreshed
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Synchronous best-effort cleanup (cannot await here)
      try { localTracks?.forEach((t) => { try { t.stop(); } catch {}; try { t.close(); } catch {}; }); } catch {}
      try { client.leave(); } catch {}
      try { client.removeAllListeners(); } catch {}
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [localTracks]);

  // ===== Controls =====
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
      setAiAllowed(!next); // revert
    }
  };

  // ===== End Call (navigate to PostVideocall) =====
  const endCall = async () => {
    await cleanupCall(true);
    navigate({
      pathname: '/PostVideocall',
      search: createSearchParams({ id: id }).toString(),
    });
  };

  // ===== Home (navigate without the PostVideocall flow) =====
  const goHome = async () => {
    await cleanupCall(true);
    navigate({
      pathname: '/Dashboard',
      search: createSearchParams({ id: id }).toString(),
    });
  };

  // ===== Render =====
  return (
    <div
      className="video-room"
      style={{
        position: 'relative',
        minHeight: '100vh',
        backgroundColor: '#fff',
      }}
    >
      {/* Top-left: Home + End Call */}
      <div
        style={{
          position: 'fixed',
          top: 12,
          left: 12,
          zIndex: 1000,
          display: 'flex',
          gap: 8,
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
        <Button
          variant="danger"
          size="sm"
          onClick={endCall}
          style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
        >
          End Call
        </Button>
      </div>

      {/* Top-right: AI toggle */}
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

      {/* Center controls */}
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

      {/* Video area */}
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
