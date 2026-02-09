import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '../../supabaseClient';
import VideoCallModal from './VideoCallModal';
import { FaVideo } from 'react-icons/fa';

const VideoCallButton = ({ creatorAddress }) => {
  const { publicKey } = useWallet();
  const [settings, setSettings] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [creatorAddress]);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from('videocall_settings')
        .select('*')
        .eq('creator_solana_address', creatorAddress)
        .single();

      setSettings(data);
    } catch (error) {
      console.error('Error fetching videocall settings:', error);
    }
  };

  if (!settings || !settings.is_available) return null;
  if (publicKey?.toString() === creatorAddress) return null; // Non mostrare a se stesso

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="videocall-btn"
      >
        <FaVideo /> Video Call {settings.price_per_minute > 0
          ? `- ${settings.price_per_minute} SOL/min`
          : '- FREE'}
      </button>

      {showModal && (
        <VideoCallModal
          creatorAddress={creatorAddress}
          pricePerMinute={settings.price_per_minute}
          maxDuration={settings.max_call_duration}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};

export default VideoCallButton;
