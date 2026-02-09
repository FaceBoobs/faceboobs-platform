import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { AGORA_CONFIG } from '../config/agora';
import { supabase } from '../supabaseClient';
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhoneSlash } from 'react-icons/fa';
import toast from 'react-hot-toast';

const VideoCallRoom = () => {
  const { channelName } = useParams();
  const { publicKey } = useWallet();
  const navigate = useNavigate();

  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [client, setClient] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (!publicKey || !channelName) return;

    initializeCall();

    return () => {
      leaveCall();
    };
  }, [publicKey, channelName]);

  // Timer che conta i minuti
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const initializeCall = async () => {
    try {
      // Carica session dal database
      const { data: sessionData, error } = await supabase
        .from('videocall_sessions')
        .select('*, request:request_id(*)')
        .eq('agora_channel_name', channelName)
        .single();

      if (error) throw error;
      setSession(sessionData);

      // Crea client Agora
      const agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      setClient(agoraClient);

      // Event listeners
      agoraClient.on('user-published', handleUserPublished);
      agoraClient.on('user-unpublished', handleUserUnpublished);
      agoraClient.on('user-left', handleUserLeft);

      // Join channel (per semplicità, UID = 0 per auto-assign)
      await agoraClient.join(
        AGORA_CONFIG.APP_ID,
        channelName,
        null, // Token temporaneo null (solo per test)
        0
      );

      // Crea e pubblica tracce locali
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      const videoTrack = await AgoraRTC.createCameraVideoTrack();

      setLocalAudioTrack(audioTrack);
      setLocalVideoTrack(videoTrack);

      // Play video locale
      videoTrack.play('local-video');

      // Pubblica tracce
      await agoraClient.publish([audioTrack, videoTrack]);

      toast.success('Connected to call!');

    } catch (error) {
      console.error('Init call error:', error);
      toast.error('Failed to join call');
      navigate('/');
    }
  };

  const handleUserPublished = async (user, mediaType) => {
    await client.subscribe(user, mediaType);

    if (mediaType === 'video') {
      setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]);

      // Aspetta che il DOM sia pronto
      setTimeout(() => {
        user.videoTrack?.play(`remote-video-${user.uid}`);
      }, 100);
    }

    if (mediaType === 'audio') {
      user.audioTrack?.play();
    }
  };

  const handleUserUnpublished = (user, mediaType) => {
    if (mediaType === 'video') {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    }
  };

  const handleUserLeft = (user) => {
    setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    toast.info('Other user left the call');
  };

  const toggleAudio = () => {
    if (localAudioTrack) {
      localAudioTrack.setEnabled(!isAudioMuted);
      setIsAudioMuted(!isAudioMuted);
    }
  };

  const toggleVideo = () => {
    if (localVideoTrack) {
      localVideoTrack.setEnabled(!isVideoMuted);
      setIsVideoMuted(!isVideoMuted);
    }
  };

  const endCall = async () => {
    try {
      const actualMinutes = Math.ceil(callDuration / 60);

      // Aggiorna sessione con durata reale
      await supabase
        .from('videocall_sessions')
        .update({
          ended_at: new Date().toISOString(),
          actual_minutes: actualMinutes
        })
        .eq('agora_channel_name', channelName);

      // TODO: Qui dovrebbe partire il pagamento finale con commissioni

      toast.success('Call ended');
      await leaveCall();
      navigate('/');

    } catch (error) {
      console.error('End call error:', error);
      toast.error('Failed to end call');
    }
  };

  const leaveCall = async () => {
    // Ferma tracce locali
    localAudioTrack?.stop();
    localAudioTrack?.close();
    localVideoTrack?.stop();
    localVideoTrack?.close();

    // Lascia canale
    await client?.leave();
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="videocall-room">
      <div className="video-container">
        {/* Video remoto (altro utente) */}
        <div className="remote-videos">
          {remoteUsers.length === 0 ? (
            <div className="waiting-user">
              <p>Waiting for other user...</p>
            </div>
          ) : (
            remoteUsers.map(user => (
              <div key={user.uid} id={`remote-video-${user.uid}`} className="remote-video"></div>
            ))
          )}
        </div>

        {/* Video locale (te) */}
        <div id="local-video" className="local-video"></div>
      </div>

      {/* Controlli */}
      <div className="call-controls">
        <div className="call-timer">
          <span className="timer-icon">⏱️</span>
          <span className="timer-text">{formatDuration(callDuration)}</span>
        </div>

        <div className="control-buttons">
          <button
            onClick={toggleAudio}
            className={`control-btn ${isAudioMuted ? 'muted' : ''}`}
          >
            {isAudioMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
          </button>

          <button
            onClick={toggleVideo}
            className={`control-btn ${isVideoMuted ? 'muted' : ''}`}
          >
            {isVideoMuted ? <FaVideoSlash /> : <FaVideo />}
          </button>

          <button
            onClick={endCall}
            className="control-btn end-call"
          >
            <FaPhoneSlash />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCallRoom;
