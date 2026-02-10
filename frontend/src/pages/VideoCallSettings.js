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
      const normalizedAddress = publicKey.toString().toLowerCase();

      const { data, error } = await supabase
        .from('videocall_settings')
        .select('*')
        .eq('creator_solana_address', normalizedAddress)
        .single();

      if (data) {
        setSettings(data);
      }
    } catch (error) {
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

      const normalizedAddress = publicKey.toString().toLowerCase();

      const { data: existing } = await supabase
        .from('videocall_settings')
        .select('id')
        .eq('creator_solana_address', normalizedAddress)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('videocall_settings')
          .update({
            price_per_minute: parseFloat(settings.price_per_minute),
            is_available: settings.is_available,
            max_call_duration: parseInt(settings.max_call_duration)
          })
          .eq('creator_solana_address', normalizedAddress);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('videocall_settings')
          .insert({
            creator_solana_address: normalizedAddress,
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
      <div className="min-h-screen py-12 px-4 bg-transparent">
        <div className="max-w-2xl mx-auto bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-12 text-center border border-pink-200/50">
          <p className="text-xl text-gray-700">Please connect your wallet to access video call settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 bg-transparent">
      <div className="max-w-2xl mx-auto">
        {/* Header rosa */}
        <div className="bg-gradient-to-r from-pink-500/90 to-rose-500/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 mb-8 border border-pink-300/50 text-white text-center">
          <FaVideo className="w-16 h-16 mx-auto mb-4 opacity-90" />
          <h1 className="text-3xl font-bold mb-2">Video Call Settings</h1>
          <p className="text-pink-100">Configure your video call availability and pricing</p>
        </div>

        {/* Card principale settings */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-pink-200/50">
          <div className="settings-form space-y-8">
            {/* Enable/Disable */}
            <div className="form-group">
              <label className="toggle-label flex items-center space-x-3 p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-2xl border border-pink-200">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded-full border-pink-400 focus:ring-pink-400"
                  checked={settings.is_available}
                  onChange={(e) => setSettings({ ...settings, is_available: e.target.checked })}
                />
                <span className="text-xl font-semibold text-gray-900">
                  {settings.is_available ? '✅ Video calls enabled' : '❌ Video calls disabled'}
                </span>
              </label>
              <p className="form-hint mt-2 text-gray-600">
                Turn this on to allow fans to request video calls with you
              </p>
            </div>

            {/* Price */}
            <div className="form-group">
              <label className="block text-lg font-semibold text-gray-900 mb-3">Price per Minute (SOL)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={settings.price_per_minute}
                  onChange={(e) => setSettings({ ...settings, price_per_minute: parseFloat(e.target.value) || 0 })}
                  className="w-full p-4 pr-12 text-xl border-2 border-pink-200 rounded-2xl focus:border-pink-400 focus:ring-4 focus:ring-pink-200/50 shadow-lg transition-all bg-pink-50"
                  placeholder="0.05"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">SOL</span>
              </div>
              <p className="form-hint mt-3 text-sm text-gray-600 bg-pink-50 p-4 rounded-xl">
                Set to 0 for free calls. Recommended: 0.01 - 0.1 SOL/minute
                <br />
                <strong className="text-pink-600">You receive 98%</strong> (2% platform fee)
              </p>
            </div>

            {/* Max Duration */}
            <div className="form-group">
              <label className="block text-lg font-semibold text-gray-900 mb-3">Maximum Call Duration (minutes)</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={settings.max_call_duration}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d*$/.test(val)) {
                      setSettings({ ...settings, max_call_duration: val === '' ? '' : parseInt(val) || 60 });
                    }
                  }}
                  className="w-full p-4 pr-8 text-xl border-2 border-pink-200 rounded-2xl focus:border-pink-400 focus:ring-4 focus:ring-pink-200/50 shadow-lg transition-all bg-pink-50"
                  placeholder="60"
                />
              </div>
              <p className="form-hint mt-3 text-sm text-gray-600 bg-pink-50 p-4 rounded-xl">
                Maximum length for a single video call session
              </p>
            </div>

            {/* Preview */}
            {settings.is_available && (
              <div className="settings-preview bg-gradient-to-r from-pink-500/10 to-purple-500/10 p-6 rounded-3xl border border-pink-200/30 backdrop-blur-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  Preview
                </h3>
                <div className="preview-card p-6 bg-white/60 backdrop-blur-md rounded-2xl border border-pink-200/40 shadow-xl">
                  <p className="preview-title text-gray-700 mb-4 font-medium">Fans will see:</p>
                  <button className="preview-btn w-full flex items-center justify-center space-x-3 p-4 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1">
                    <FaVideo className="w-5 h-5" />
                    <span>Video Call {settings.price_per_minute > 0
                      ? `- ${settings.price_per_minute} SOL/min`
                      : '- FREE'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={loading}
              className="save-btn w-full p-6 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500 hover:from-pink-600 hover:via-rose-600 hover:to-purple-600 text-white text-xl font-bold rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
            >
              <FaSave />
              <span>{loading ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCallSettings;
