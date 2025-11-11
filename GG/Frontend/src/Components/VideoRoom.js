import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { VideoPlayer } from './VideoPlayer';
import Button from 'react-bootstrap/Button';
import { useNavigate, createSearchParams, useSearchParams } from 'react-router-dom';
import './VideoRoom.css';

const APP_ID = 'f314adc296d7440295289aa2502b2cb3';
const TOKEN = '007eJxTYPBjrLyfk1A8teLj+jV7979aeKRjbv5K0xeCHedEneLklJoUGNKMDU0SU5KNLM1SzE1MDIwsTY0sLBMTjUwNjJKMkpOMVXR4MxsCGRkCtquxMjJAIIjPzZCbWJKckZuYnZmXzsAAADbKIQY=';
const CHANNEL = 'matchmaking';

export const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

export default function VideoRoom({ room, initialAiAllowed = true, chatId, currentUserId }) {
  const [users, setUsers] = useState([]);
  const [localTracks, setLocalTracks] = useState([]);
  const [muted, setMuted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [aiAllowed, setAiAllowed] = useState(initialAiAllowed);

  const [search] = useSearchParams();
  const id = search.get('id') || currentUserId || '';
  const navigate = useNavigate();

  // prevent multiple joins
  const joinedRef = useRef(false);

  // Initialize and join channel
  useEffect(() => {
    let cancelled = false;

    const handleUserPublished = async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      if (mediaType === 'video') {
        setUsers(prev => {
          if (prev.some(u => u.uid === user.uid)) return prev;
          return [...prev, user];
        });
      }
      if (mediaType === 'audio') user.audioTrack?.play();
    };

    const handleUserUnpublished = (user, mediaType) => {
      if (mediaType === 'video') {
        user.videoTrack?.stop?.();
        setUsers(prev => prev.filter(u => u.uid !== user.uid));
      } else if (mediaType === 'audio') {
        user.audioTrack?.stop?.();
      }
    };

    const handleUserLeft = (user) => {
      setUsers(prev => prev.filter(u => u.uid !== user.uid));
    };

    const init = async () => {
      if (joinedRef.current) return; // already joined
      try {
        client.on('user-published', handleUserPublished);
        client.on('user-unpublished', handleUserUnpublished);
        client.on('user-left', handleUserLeft);

        const channel = room || CHANNEL;
        const uid = await client.join(APP_ID, channel, TOKEN, null);

        const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
        if (cancelled) return;

        const [audioTrack, videoTrack] = tracks;
        setLocalTracks(tracks);

        // Add local user video
        setUsers(prev => [...prev, { uid, videoTrack, audioTrack }]);

        await client.publish(tracks);
        joinedRef.current = true;
        console.log('Joined channel:', channel, 'as UID', uid);
      } catch (err) {
        console.error('Agora init error:', err);
      }
    };

    init();

    return () => {
      cancelled = true;
      cleanupCall(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  /** Cleanup when leaving/unmounting */
  const cleanupCall = async (removeListeners = true) => {
    try {
      if (localTracks.length) await client.unpublish(localTracks);
    } catch (e) {
      console.warn('Unpublish error:', e);
    }

    for (const t of localTracks) {
      try { t.stop(); t.close(); } catch {}
    }

    try { await client.leave(); } catch {}
    if (removeListeners) client.removeAllListeners();

    setUsers([]);
    setLocalTracks([]);
    setMuted(false);
    setHidden(false);
    joinedRef.current = false;
  };

  /** Cleanup when tab closes or refreshes */
  useEffect(() => {
    const beforeUnload = () => {
      localTracks.forEach(t => { try { t.stop(); t.close(); } catch {} });
      try { client.leave(); } catch {}
      try { client.removeAllListeners(); } catch {}
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [localTracks]);

  /** UI Handlers **/
  const toggleMute = () => {
    setMuted(prev => {
      const next = !prev;
      localTracks[0]?.setEnabled(!next);
      return next;
    });
  };

  const toggleHideVideo = () => {
    setHidden(prev => {
      const next = !prev;
      localTracks[1]?.setEnabled(!next);
      return next;
    });
  };

  const toggleAiAccess = async () => {
    const next = !aiAllowed;
    setAiAllowed(next);
    try {
      if (chatId) {
        const { updateChatPrivacy } = await import('../Services/privacyService');
        await updateChatPrivacy(chatId, id, next);
      }
    } catch (e) {
      console.error('Failed to update AI access', e);
      setAiAllowed(!next);
    }
  };

  const endCall = async () => {
    await cleanupCall(true);
    navigate({ pathname: '/PostVideocall', search: createSearchParams({ id }).toString() });
  };

  const goHome = async () => {
    await cleanupCall(true);
    navigate({ pathname: '/Dashboard', search: createSearchParams({ id }).toString() });
  };

  return (
    <div className="vr-root">
      {/* Top bar controls */}
      <div className="vr-topbar">
        <div className="vr-left">
          <Button className="vr-btn" variant="primary" size="sm" onClick={goHome}>Home</Button>
          <Button className="vr-btn" variant="danger" size="sm" onClick={endCall}>End Call</Button>
        </div>
        <div className="vr-center">
          <Button className="vr-btn" variant="primary" onClick={toggleMute}>
            {muted ? 'Unmute' : 'Mute'}
          </Button>
          <Button className="vr-btn" variant="primary" onClick={toggleHideVideo}>
            {hidden ? 'Show Video' : 'Hide Video'}
          </Button>
        </div>
        <div className="vr-right">
          <Button
            className="vr-btn"
            size="sm"
            variant={aiAllowed ? 'success' : 'secondary'}
            onClick={toggleAiAccess}
            title="AI privacy for this call"
          >
            {aiAllowed ? 'AI: On' : 'AI: Off'}
          </Button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="vr-content">
        <div className="videos">
          {users.map(user => (
            <VideoPlayer key={user.uid} user={user} />
          ))}
        </div>
      </div>
    </div>
  );
}