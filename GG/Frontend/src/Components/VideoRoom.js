import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { VideoPlayer } from './VideoPlayer';
import Button from 'react-bootstrap/Button';
import { useNavigate, createSearchParams, useSearchParams } from 'react-router-dom';
import './VideoRoom.css';
import { uploadRecording as uploadRecordingService } from '../Services/uploadService.js';

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

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const destinationRef = useRef(null);
  const [recordingFilename, setRecordingFilename] = useState(null);

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
  
const startRecording = async () => {
  try {
    // Reset chunks
    recordedChunksRef.current = [];
    
    // Create audio context for mixing
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();
    
    // Add local audio
    if (localTracks[0]) {
      const localSource = audioContext.createMediaStreamSource(
        new MediaStream([localTracks[0].getMediaStreamTrack()])
      );
      localSource.connect(destination);
    }
    
    // Add all remote users' audio
    users.forEach(user => {
      if (user.audioTrack && user.uid !== client.uid) {
        const track = user.audioTrack.getMediaStreamTrack();
        const source = audioContext.createMediaStreamSource(new MediaStream([track]));
        source.connect(destination);
      }
    });
    
    // Record the mixed stream
    const mediaRecorder = new MediaRecorder(destination.stream, { 
      mimeType: 'audio/webm' 
    });
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
        console.log('Chunk added, total chunks:', recordedChunksRef.current.length);
      }
    };
    
    mediaRecorder.onstop = async () => {
      console.log('Recording stopped, processing chunks:', recordedChunksRef.current.length);
      
      if (recordedChunksRef.current.length === 0) {
        console.error('No recorded chunks available');
        audioContext.close();
        return;
      }
      
      try {
        // Create blob from recorded chunks
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        console.log('Blob created, size:', blob.size, 'bytes, type:', blob.type);
        
        // Verify it's a valid blob
        if (blob.size === 0) {
          console.error('Created blob is empty');
          audioContext.close();
          return;
        }
        
        // Upload to server
        await handleUploadRecording(blob);
        
      } catch (error) {
        console.error('Error processing recording:', error);
      } finally {
        // Cleanup
        recordedChunksRef.current = [];
        audioContext.close();
      }
    };
    
    audioContextRef.current = audioContext;
    destinationRef.current = destination;
    mediaRecorderRef.current = mediaRecorder;
    
    mediaRecorder.start(1000); // Collect data every second
    setIsRecording(true);
    console.log('Recording started');
  } catch (error) {
    console.error('Failed to start recording:', error);
  }
};

const handleUploadRecording = async (blob) => {
  try {
    console.log('handleUploadRecording called with blob:', blob);
    console.log('Is Blob?', blob instanceof Blob);
    console.log('Blob size:', blob?.size);
    
    // Verify blob is valid
    if (!(blob instanceof Blob)) {
      console.error('Invalid blob provided to handleUploadRecording', typeof blob);
      return;
    }

    if (blob.size === 0) {
      console.error('Blob is empty, not uploading');
      return;
    }

    const formData = new FormData();
    const filename = `call-${room}-${Date.now()}.webm`;
    
    // Append the blob with explicit filename
    formData.append('audio', blob, filename);
    formData.append('userId', id);
    formData.append('chatId', chatId || '');
    formData.append('room', room);
    formData.append('timestamp', new Date().toISOString());
    
    console.log('Uploading recording, blob size:', blob.size, 'bytes');
    
    const response = await uploadRecordingService(formData);
    
    if (response && response.success) {
      console.log('Recording saved successfully:', response);
      setRecordingFilename(response.filename);
      console.log('Local filename:', response.filename);
      console.log('Local path:', response.localPath);
    } else {
      console.error('Upload failed: Invalid response structure');
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
          <Button className="vr-btn" variant={isRecording ? "danger" : "secondary"} onClick={isRecording ? stopRecording : startRecording}>
          {isRecording ? '⏹ Stop Recording' : '⏺ Record'}
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
