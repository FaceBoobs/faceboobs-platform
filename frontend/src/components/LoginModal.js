import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';
const LoginModal = ({ onRegister, onClose, loading }) => {
  const [formData, setFormData] = useState({
    username: '',
    bio: '',
    avatarFile: null
  });
  const [avatarPreview, setAvatarPreview] = useState(null);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, avatarFile: file });
      const reader = new FileReader();
      reader.onload = () => setAvatarPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.username.trim()) {
      alert('Please enter a username');
      return;
    }
    onRegister(formData.username, formData.bio, formData.avatarFile);
  };

  const suggestedBios = [
    "Crypto enthusiast exploring Web3",
    "Digital artist creating NFTs",
    "Blockchain developer",
    "DeFi investor",
    "Web3 educator",
    "Metaverse explorer"
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Welcome to SocialWeb3</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="text-center">
            <div className="relative inline-block">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-gray-200" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">
                    {formData.username.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
              )}
              
              <div className="absolute bottom-0 right-0">
                <label className="bg-blue-500 text-white p-2 rounded-full cursor-pointer hover:bg-blue-600">
                  <Upload size={16} />
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Enter your username"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              placeholder="Tell us about yourself"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            />
            
            <div className="mt-3">
              <p className="text-sm text-gray-600 mb-2">Suggested bios:</p>
              {suggestedBios.map((bio, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setFormData({ ...formData, bio })}
                  className="block w-full text-left text-sm text-blue-600 hover:bg-blue-50 px-2 py-1 rounded"
                >
                  {bio}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !formData.username.trim()}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? 'Creating Profile...' : 'Create Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;