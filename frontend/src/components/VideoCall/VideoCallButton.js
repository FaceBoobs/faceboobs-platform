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
    console.log('🔍 VideoCallButton - Creator address:', creatorAddress);
    fetchSettings();
  }, [creatorAddress]);

  const fetchSettings = async () => {
    try {
      console.log('📞 Fetching settings for:', creatorAddress);

      // Normalize address to lowercase for consistent matching
      const normalizedAddress = creatorAddress?.toLowerCase();
      console.log('📞 Normalized address:', normalizedAddress);

      const { data, error } = await supabase
        .from('videocall_settings')
        .select('*')
        .eq('creator_solana_address', normalizedAddress)
        .single();

      console.log('📦 Settings result:', { data, error });

      if (error) {
        console.error('❌ Settings error:', error);
      }

      setSettings(data);
    } catch (error) {
      console.error('❌ Fetch settings error:', error);
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
