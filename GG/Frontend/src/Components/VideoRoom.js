import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { VideoPlayer } from './VideoPlayer';
import Button from 'react-bootstrap/Button';
import { useNavigate, createSearchParams, useSearchParams } from 'react-router-dom';
import './VideoRoom.css';
import { uploadRecording as uploadRecordingService } from '../Services/uploadService.js';

const APP_ID = 'ba8d7ca80c5d4ab2b2b31d145bfec130';
const TOKEN = '007eJxTYPh3WLk07bfITCnzNZG7rfh3TNoUw9O2Jrxs32PnX/Ue93coMCQlWqSYJydaGCSbppgkJhkBobFhiqGJaVJaarKhsUFFjUVmQyAjQ/Dvr0yMDBAI4nMz5CaWJGfkJmZn5qUzMAAAo+8kFQ==';
const CHANNEL = 'matchmaking';

export const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

export default function VideoRoom({ room, initialAiAllowed = true, chatId, currentUserId }) {
  const [users, setUsers] = useState([]);
  const [localTracks, setLocalTracks] = useState([]);
  const [muted, setMuted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [aiAllowed, setAiAllowed] = useState(initialAiAllowed);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const destinationRef = useRef(null);
  const [recordingFilename, setRecordingFilename] = useState(null);
  const [search] = useSearchParams();
  const id = search.get('id') || currentUserId || '';
  const navigate = useNavigate();
  const joinedRef = useRef(false);

  const [participantIds, setParticipantIds] = useState({
    self: null,
    partner: null,
  });

  const cleanupCall = async (removeListeners = true) => {
    try {
      if (localTracks.length) await client.unpublish(localTracks);
    } catch (e) { console.warn('Unpublish error:', e); }

    for (const t of localTracks) {
      try { t.stop(); t.close(); } catch {}
    }

    try { await client.leave(); } catch {}
    
    if (removeListeners) {
      client.removeAllListeners();
    }

    // Cleanup recording
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }

    setUsers([]);
    setLocalTracks([]);
    setMuted(false);
    setHidden(false);
    setIsRecording(false);
    joinedRef.current = false;
  };


  const handleUserPublished = async (user, mediaType) => {  
    await client.subscribe(user, mediaType);
    
    if (mediaType === 'video') {
      setUsers(prev => {
        const isDuplicate = prev.some(u => u.uid === user.uid);
        const isSelf = user.uid === client.uid;
        
        if (isDuplicate || isSelf) {
          return prev;
        }
        return [...prev, user];
      });
    }
    
    if (mediaType === 'audio') {
      user.audioTrack?.play();
    }
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

  // FIXED: Prevent cancel token race condition
  useEffect(() => {
    let cancelled = false;
    let joinPromise = null;
    
    const init = async () => {
      if (joinedRef.current) {
        return;
      }

      try {
        client.on('user-published', handleUserPublished);
        client.on('user-unpublished', handleUserUnpublished);
        client.on('user-left', handleUserLeft);

        const channel = room || CHANNEL;
        
        // Store promise reference to prevent cleanup race
        joinPromise = client.join(APP_ID, channel, TOKEN, null);
        const uid = await joinPromise;
        setParticipantIds(prev => ({ ...prev, self: uid }));
        const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
        if (cancelled) {
          return;
        }

        const [audioTrack, videoTrack] = tracks;
        setLocalTracks(tracks);
        
        const localUser = { uid, videoTrack, audioTrack };
        setUsers(prev => {
          if (prev.some(u => u.uid === uid)) return prev;
          return [localUser, ...prev];
        });
        
        await client.publish(tracks);
        joinedRef.current = true;

      } catch (err) {
        if (!cancelled) { // Only log real errors, not intentional cancels
          console.error('Agora init error:', err);
        }
      }
    };

    init();
    
    return () => {
      cancelled = true;
      if (joinPromise && !joinPromise.done) {
      }
      cleanupCall(false); // Don't remove listeners during normal cleanup
    };
  }, []); // EMPTY deps only


  // Log users state changes
  useEffect(() => {
  }, [users]);

  /** Cleanup when tab closes */
  useEffect(() => {
    const beforeUnload = () => {
      localTracks.forEach(t => {
        try { t.stop(); t.close(); } catch {}
      });
      try { client.leave(); } catch {}
      try { client.removeAllListeners(); } catch {}
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [localTracks]);

  useEffect(() => {
  let cancelled = false;
  let joinPromise = null;

  const init = async () => {
    if (joinedRef.current) return;

    try {
      const selfIdNum = Number(id);

      // 🔹 remote user joins the channel
      client.on('user-joined', (user) => {
        if (user.uid !== selfIdNum) {
          setParticipantIds(prev => ({
            ...prev,
            partner: user.uid,
          }));
          console.log('Remote user joined, partner uid =', user.uid);
        }
      });

      // 🔹 remote user leaves the channel
      client.on('user-left', (user) => {
        console.log('🚪 Remote user left:', user.uid);
        setUsers(prev => prev.filter(u => u.uid !== user.uid));
      });

      client.on('user-published', handleUserPublished);
      client.on('user-unpublished', handleUserUnpublished);

      const channel = room || CHANNEL;

      // join with your app user id as Agora uid
      joinPromise = client.join(APP_ID, channel, TOKEN, null);
      const uid = await joinPromise;

      setParticipantIds(prev => ({ ...prev, self: uid }));

      const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
      if (cancelled) return;

      const [audioTrack, videoTrack] = tracks;
      setLocalTracks(tracks);

      const localUser = { uid, videoTrack, audioTrack };
      setUsers(prev => (prev.some(u => u.uid === uid) ? prev : [localUser, ...prev]));

      await client.publish(tracks);
      joinedRef.current = true;
    } catch (err) {
      if (!cancelled) {
        console.error('Agora init error:', err);
      }
    }
  };

  init();

  return () => {
    cancelled = true;
    cleanupCall(false);
  };
}, []); // deps stay empty

  /** UI Handlers - ALL YOUR ORIGINAL CODE UNCHANGED */
  const toggleMute = () => {
    setMuted(prev => {
      const next = !prev;
      localTracks[0]?.setEnabled(!next);
      return next;
    });
  };

  const toggleHideVideo = () => {
    console.log('People in call:', {
      selfId: participantIds.self,
      partnerId: participantIds.partner,
    });
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

  const startRecording = async () => {
    // YOUR ORIGINAL RECORDING CODE - UNCHANGED
    try {
      recordedChunksRef.current = [];
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();

      if (localTracks[0]) {
        const localSource = audioContext.createMediaStreamSource(
          new MediaStream([localTracks[0].getMediaStreamTrack()])
        );
        localSource.connect(destination);
      }

      users.forEach(user => {
        if (user.audioTrack && user.uid !== client.uid) {
          const track = user.audioTrack.getMediaStreamTrack();
          const source = audioContext.createMediaStreamSource(new MediaStream([track]));
          source.connect(destination);
        }
      });

      const mediaRecorder = new MediaRecorder(destination.stream, {
        mimeType: 'audio/webm'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (recordedChunksRef.current.length === 0) {
          audioContext.close();
          return;
        }
        try {
          const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
          await handleUploadRecording(blob);
        } catch (error) {
          console.error('Error processing recording:', error);
        } finally {
          recordedChunksRef.current = [];
          audioContext.close();
        }
      };

      audioContextRef.current = audioContext;
      destinationRef.current = destination;
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const handleUploadRecording = async (blob) => {
    // YOUR ORIGINAL UPLOAD CODE - UNCHANGED
    if (!(blob instanceof Blob) || blob.size === 0) return;
    const formData = new FormData();
    const filename = `call-${room}-${Date.now()}.webm`;
    formData.append('audio', blob, filename);
    formData.append('userId', id);
    formData.append('chatId', chatId || '');
    formData.append('room', room);
    formData.append('timestamp', new Date().toISOString());

    try {
      const response = await uploadRecordingService(formData);
      if (response?.success) {
        setRecordingFilename(response.filename);
      }
    } catch (error) {
      console.error('Error uploading recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const endCall = async () => {
    await cleanupCall(true);
    console.log('Ending call between:', {
      selfId: participantIds.self,
      partnerId: participantIds.partner,
    });

    navigate({ pathname: '/PostVideocall', search: createSearchParams({ id, selfId: participantIds.self,
      partnerId: participantIds.partner, }).toString() });
  };

  const goHome = async () => {
    await cleanupCall(true);
    navigate({ pathname: '/Dashboard', search: createSearchParams({ id }).toString() });
  };

  return (
    <div className="vr-root">
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
          <Button className="vr-btn" variant={isRecording ? "danger" : "secondary"} onClick={isRecording ? stopRecording : startRecording}>
            {isRecording ? '⏹ Stop Recording' : '⏺ Record'}
          </Button>
        </div>
        <div className="vr-right">
          <Button className="vr-btn" size="sm" variant={aiAllowed ? 'success' : 'secondary'} onClick={toggleAiAccess}>
            {aiAllowed ? 'AI: On' : 'AI: Off'}
          </Button>
        </div>
      </div>

      <div className="vr-content">
        <div className="videos">
          {users.length === 0 && <div>No users yet (waiting for join...)</div>}
          {users.map(user => (
            <VideoPlayer key={user.uid} user={user} />
          ))}
        </div>
      </div>
    </div>
  );
}
