import { useState, useRef, useEffect, useCallback } from 'react';
import { socket } from '../utils/socket';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRTC(currentUserId) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callStatus, setCallStatus] = useState('idle'); // idle, calling, ringing, connected

  const peerConnection = useRef(null);
  const remoteUserId = useRef(null);

  // Initialize media stream
  const initializeMedia = useCallback(async () => {
    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera/microphone access requires HTTPS. Please use HTTPS or localhost.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      if (error.name === 'NotAllowedError') {
        throw new Error('Camera/microphone permission denied. Please allow access in browser settings.');
      } else if (error.name === 'NotFoundError') {
        throw new Error('No camera or microphone found on this device.');
      } else if (error.message.includes('HTTPS')) {
        throw error;
      } else {
        throw new Error('Failed to access camera/microphone. Error: ' + error.message);
      }
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((stream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local stream tracks to peer connection
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log('Received remote track');
      setRemoteStream(event.streams[0]);
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && remoteUserId.current) {
        socket.sendIceCandidate(remoteUserId.current, event.candidate);
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallStatus('connected');
        setIsCallActive(true);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        endCall();
      }
    };

    peerConnection.current = pc;
    return pc;
  }, []);

  // Start a call
  const startCall = useCallback(async (contactId) => {
    try {
      setCallStatus('calling');
      remoteUserId.current = contactId;

      const stream = await initializeMedia();
      const pc = createPeerConnection(stream);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.callUser(contactId, offer, currentUserId);
    } catch (error) {
      console.error('Error starting call:', error);
      setCallStatus('idle');
      throw error;
    }
  }, [currentUserId, initializeMedia, createPeerConnection]);

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;

    try {
      setCallStatus('connecting');
      remoteUserId.current = incomingCall.from;

      const stream = await initializeMedia();
      const pc = createPeerConnection(stream);

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.acceptCall(incomingCall.from, answer);
      setIncomingCall(null);
    } catch (error) {
      console.error('Error accepting call:', error);
      setCallStatus('idle');
      throw error;
    }
  }, [incomingCall, initializeMedia, createPeerConnection]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    if (incomingCall) {
      socket.rejectCall(incomingCall.from);
      setIncomingCall(null);
      setCallStatus('idle');
    }
  }, [incomingCall]);

  // End call
  const endCall = useCallback(() => {
    if (remoteUserId.current) {
      socket.endCall(remoteUserId.current);
    }

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    setRemoteStream(null);
    setIsCallActive(false);
    setCallStatus('idle');
    remoteUserId.current = null;
  }, [localStream]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }, [localStream]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }, [localStream]);

  // Socket event handlers
  useEffect(() => {
    socket.on('incoming-call', ({ from, offer }) => {
      console.log('Incoming call from:', from);
      setIncomingCall({ from, offer });
      setCallStatus('ringing');
    });

    socket.on('call-accepted', async ({ answer }) => {
      console.log('Call accepted');
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
      }
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      if (peerConnection.current && candidate) {
        try {
          await peerConnection.current.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });

    socket.on('call-ended', () => {
      console.log('Call ended by remote user');
      endCall();
    });

    socket.on('call-rejected', () => {
      console.log('Call rejected');
      endCall();
    });

    return () => {
      socket.off('incoming-call');
      socket.off('call-accepted');
      socket.off('ice-candidate');
      socket.off('call-ended');
      socket.off('call-rejected');
    };
  }, [endCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return {
    localStream,
    remoteStream,
    isCallActive,
    incomingCall,
    callStatus,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleVideo,
    toggleAudio,
  };
}
