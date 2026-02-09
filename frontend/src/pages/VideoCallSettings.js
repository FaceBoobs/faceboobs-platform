import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { FaVideo, FaSave } from 'react-icons/fa';

const VideoCallSettings = () => {
  const { publicKey, connected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    price_per_minute: 0,
    is_available: true,
    max_call_duration: 60
  });

  useEffect(() => {
    if (publicKey) {
      fetchSettings();
    }
  }, [publicKey]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('videocall_settings')
        .select('*')
        .eq('creator_solana_address', publicKey.toString())
        .single();

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      // Nessun settings esistente, usa defaults
      console.log('No existing settings');
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      if (!connected || !publicKey) {
        toast.error('Please connect wallet');
        return;
      }

      // Verifica se esistono già settings
      const { data: existing } = await supabase
        .from('videocall_settings')
        .select('id')
        .eq('creator_solana_address', publicKey.toString())
        .single();

      if (existing) {
        // Update
        const { error } = await supabase
          .from('videocall_settings')
          .update({
            price_per_minute: parseFloat(settings.price_per_minute),
            is_available: settings.is_available,
            max_call_duration: parseInt(settings.max_call_duration)
          })
          .eq('creator_solana_address', publicKey.toString());

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('videocall_settings')
          .insert({
            creator_solana_address: publicKey.toString(),
            price_per_minute: parseFloat(settings.price_per_minute),
            is_available: settings.is_available,
            max_call_duration: parseInt(settings.max_call_duration)
          });

        if (error) throw error;
      }

      toast.success('Settings saved!');

    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="settings-page">
        <div className="settings-container">
          <p>Please connect your wallet to access video call settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-container">
        <div className="settings-header">
          <FaVideo className="header-icon" />
          <div>
            <h1>Video Call Settings</h1>
            <p>Configure your video call availability and pricing</p>
          </div>
        </div>

        <div className="settings-form">
          {/* Enable/Disable */}
          <div className="form-group">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={settings.is_available}
                onChange={(e) => setSettings({ ...settings, is_available: e.target.checked })}
              />
              <span className="toggle-text">
                {settings.is_available ? '✅ Video calls enabled' : '❌ Video calls disabled'}
              </span>
            </label>
            <p className="form-hint">
              Turn this on to allow fans to request video calls with you
            </p>
          </div>

          {/* Price */}
          <div className="form-group">
            <label>Price per Minute (SOL)</label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={settings.price_per_minute}
              onChange={(e) => setSettings({ ...settings, price_per_minute: e.target.value })}
              placeholder="0.05"
            />
            <p className="form-hint">
              Set to 0 for free calls. Recommended: 0.01 - 0.1 SOL/minute
              <br />
              <strong>You receive 98%</strong> (2% platform fee)
            </p>
          </div>

          {/* Max Duration */}
          <div className="form-group">
            <label>Maximum Call Duration (minutes)</label>
            <input
              type="number"
              min="1"
              max="180"
              value={settings.max_call_duration}
              onChange={(e) => setSettings({ ...settings, max_call_duration: e.target.value })}
              placeholder="60"
            />
            <p className="form-hint">
              Maximum length for a single video call session
            </p>
          </div>

          {/* Preview */}
          {settings.is_available && (
            <div className="settings-preview">
              <h3>Preview</h3>
              <div className="preview-card">
                <p className="preview-title">Fans will see:</p>
                <button className="preview-btn">
                  <FaVideo /> Video Call {settings.price_per_minute > 0
                    ? `- ${settings.price_per_minute} SOL/min`
                    : '- FREE'}
                </button>
              </div>
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={loading}
            className="save-btn"
          >
            <FaSave /> {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCallSettings;
