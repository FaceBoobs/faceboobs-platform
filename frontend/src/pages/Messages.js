// src/pages/Messages.js
import React, { useState, useEffect, useRef } from 'react';
import { Send, Search, Plus, X, Image, DollarSign, Lock, Loader } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { useToast } from '../contexts/ToastContext';
import { SupabaseService } from '../services/supabaseService';
import LoadingSpinner from '../components/LoadingSpinner';
import { supabase } from '../supabaseClient';
import { ethers } from 'ethers';

const Messages = () => {
  const { user, account, loading } = useWeb3();
  const { toast } = useToast();
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const messageSubscriptionRef = useRef(null);

  // Media upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [isPaidMedia, setIsPaidMedia] = useState(false);
  const [mediaPrice, setMediaPrice] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [unlockingMedia, setUnlockingMedia] = useState({});

  useEffect(() => {
    if (user && account) {
      console.log('📱 Messages component mounted for user:', account);
      loadConversations();
    }
  }, [user, account]);

  useEffect(() => {
    if (activeChat && user && account) {
      console.log('💬 Loading messages for active chat:', activeChat.address);
      loadMessages(activeChat.address);

      // Subscribe to real-time messages
      if (messageSubscriptionRef.current) {
        messageSubscriptionRef.current.unsubscribe();
      }

      messageSubscriptionRef.current = SupabaseService.subscribeToMessages(
        account,
        activeChat.address,
        (payload) => {
          console.log('📨 Real-time message received:', payload);
          // Supabase uses 'INSERT' for eventType in postgres_changes
          if (payload.eventType === 'INSERT' && payload.new) {
            const newMessage = {
              id: payload.new.id,
              sender_address: payload.new.sender_address,
              content: payload.new.content,
              created_at: payload.new.created_at,
              timestamp: new Date(payload.new.created_at).getTime(),
              isOwn: payload.new.sender_address === account
            };

            // Avoid duplicates by checking if message already exists
            setMessages(prev => {
              if (prev.some(msg => msg.id === newMessage.id)) {
                return prev;
              }
              return [...prev, newMessage];
            });
          }
        }
      );
    }

    return () => {
      if (messageSubscriptionRef.current) {
        messageSubscriptionRef.current.unsubscribe();
      }
    };
  }, [activeChat, user, account]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    console.log('🔄 Modal state changed:', showNewChatModal);
  }, [showNewChatModal]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    if (!account) return;

    try {
      setLoadingConversations(true);
      console.log('🔄 Loading conversations for account:', account);

      const result = await SupabaseService.getConversations(account);

      if (result.success && result.data.length > 0) {
        // Group messages by conversation partner
        const conversationsMap = new Map();

        result.data.forEach(message => {
          // Determine the other participant
          const otherParticipant = message.sender_address === account
            ? message.receiver_address
            : message.sender_address;

          if (!conversationsMap.has(otherParticipant)) {
            conversationsMap.set(otherParticipant, {
              address: otherParticipant,
              messages: [],
              lastMessage: null,
              lastTimestamp: 0
            });
          }

          const conv = conversationsMap.get(otherParticipant);
          conv.messages.push(message);

          // Track the most recent message
          const msgTimestamp = new Date(message.created_at).getTime();
          if (msgTimestamp > conv.lastTimestamp) {
            conv.lastMessage = message;
            conv.lastTimestamp = msgTimestamp;
          }
        });

        // Get user data for all participants
        const userResult = await SupabaseService.getAllUsers();
        const users = userResult.success ? userResult.data : [];

        // Convert map to array and add user data
        const conversationsWithUserData = Array.from(conversationsMap.values()).map(conv => {
          // Find user by wallet_address or address field
          const otherUser = users.find(u => {
            const userAddr = (u.wallet_address || u.address)?.toLowerCase();
            return userAddr === conv.address?.toLowerCase();
          });

          console.log('🔍 Matching user for conversation:', {
            convAddress: conv.address,
            foundUser: otherUser?.username,
            userAddress: otherUser?.wallet_address || otherUser?.address
          });

          return {
            id: conv.address, // Use address as unique ID
            username: otherUser?.username || `User${conv.address?.substring(0, 6)}`,
            address: conv.address,
            lastMessage: conv.lastMessage?.content || 'No messages yet',
            timestamp: conv.lastTimestamp,
            unread: false, // TODO: Implement unread logic
            avatar: otherUser?.username?.charAt(0).toUpperCase() || '👤'
          };
        });

        // Sort by most recent message
        conversationsWithUserData.sort((a, b) => b.timestamp - a.timestamp);

        console.log('✅ Loaded conversations:', conversationsWithUserData);
        setConversations(conversationsWithUserData);

        if (conversationsWithUserData.length > 0) {
          setActiveChat(conversationsWithUserData[0]);
        }
      } else {
        console.log('📭 No messages found, showing demo conversations');
        createDemoConversations();
      }
    } catch (error) {
      console.error('❌ Error loading conversations:', error);
      const errorMessage = error?.message || error?.details || 'Error loading conversations';
      toast.error(errorMessage);
      createDemoConversations();
    } finally {
      setLoadingConversations(false);
    }
  };

  const createDemoConversations = () => {
    console.log('🎯 Creating demo conversations for testing');
    const demoConversations = [
      {
        id: '0x1234567890123456789012345678901234567890',
        username: 'Demo User 1',
        address: '0x1234567890123456789012345678901234567890',
        lastMessage: 'This is a demo conversation for testing',
        timestamp: Date.now() - 300000,
        unread: false,
        avatar: '🎨',
        isDemoConversation: true
      },
      {
        id: '0x2345678901234567890123456789012345678901',
        username: 'Demo User 2',
        address: '0x2345678901234567890123456789012345678901',
        lastMessage: 'Another demo conversation',
        timestamp: Date.now() - 3600000,
        unread: false,
        avatar: '💰',
        isDemoConversation: true
      }
    ];

    setConversations(demoConversations);
    if (demoConversations.length > 0) {
      setActiveChat(demoConversations[0]);
    }
  };

  const loadMessages = async (otherAddress) => {
    if (!otherAddress || !account) return;

    try {
      setLoadingMessages(true);
      console.log('📨 Loading messages between:', account, 'and', otherAddress);

      const result = await SupabaseService.getMessages(account, otherAddress);

      if (result.success) {
        // Check unlock status for paid messages
        const messagesWithStatus = await Promise.all(
          result.data.map(async (message) => {
            let isUnlocked = true;

            // If message is paid and user is not the sender, check if unlocked
            if (message.is_paid && message.sender_address !== account) {
              const { data: purchase } = await supabase
                .from('message_purchases')
                .select('*')
                .eq('message_id', message.id)
                .eq('buyer_address', account.toLowerCase())
                .single();

              isUnlocked = !!purchase;
            }

            return {
              id: message.id,
              sender_address: message.sender_address,
              content: message.content,
              media_url: message.media_url,
              media_type: message.media_type,
              is_paid: message.is_paid || false,
              price: message.price || 0,
              is_unlocked: isUnlocked,
              created_at: message.created_at,
              timestamp: new Date(message.created_at).getTime(),
              isOwn: message.sender_address === account
            };
          })
        );

        console.log('✅ Loaded messages with unlock status:', messagesWithStatus);
        setMessages(messagesWithStatus);
      } else {
        console.error('❌ Failed to load messages:', result.error);
        const errorMessage = typeof result.error === 'string'
          ? result.error
          : result.error?.message || 'Failed to load messages';
        toast.error(errorMessage);
        setMessages([]);
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      const errorMessage = error?.message || error?.details || 'Error loading messages';
      toast.error(errorMessage);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validation
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast.error('File too large. Max 50MB');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Use jpg, png, gif, mp4, or mov');
      return;
    }

    setSelectedFile(file);

    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    console.log('✅ File selected:', file.name, file.type);
  };

  // Clear file selection
  const clearFileSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsPaidMedia(false);
    setMediaPrice('');
  };

  // Upload media to Supabase Storage
  const uploadMedia = async (file) => {
    try {
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      console.log('🔵 Uploading file to chat-media bucket:', fileName);

      const { data, error } = await supabase.storage
        .from('chat-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Upload error:', error);
        throw error;
      }

      console.log('✅ File uploaded:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName);

      console.log('✅ Public URL:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('❌ Error uploading media:', error);
      throw error;
    }
  };

  // Unlock paid media
  const handleUnlockMedia = async (message) => {
    try {
      setUnlockingMedia(prev => ({ ...prev, [message.id]: true }));
      console.log('🔵 Unlocking media for message:', message.id);

      // For demo purposes, we'll skip the blockchain transaction
      // In production, uncomment this:
      /*
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const tx = await contract.purchaseContent(
        message.id,
        { value: ethers.parseEther(message.price.toString()) }
      );

      toast.info('Processing payment...');
      await tx.wait();
      */

      // For now, just mark as unlocked in database
      console.log('🔵 Marking as unlocked in database...');

      // Record purchase
      const { error: purchaseError } = await supabase
        .from('message_purchases')
        .insert([{
          message_id: message.id,
          buyer_address: account.toLowerCase(),
          price: message.price
        }]);

      if (purchaseError) {
        console.error('❌ Purchase error:', purchaseError);
        throw purchaseError;
      }

      console.log('✅ Purchase recorded');
      toast.success(`Content unlocked! (Demo mode - no actual payment)`);

      // Reload messages to show unlocked content
      await loadMessages(activeChat.address);

    } catch (error) {
      console.error('❌ Unlock error:', error);
      if (error.code === 'ACTION_REJECTED') {
        toast.error('Transaction cancelled');
      } else if (error.code === '23505') {
        toast.info('You already own this content');
        await loadMessages(activeChat.address);
      } else {
        toast.error('Failed to unlock content');
      }
    } finally {
      setUnlockingMedia(prev => ({ ...prev, [message.id]: false }));
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();

    // Validation
    if (!newMessage.trim() && !selectedFile) {
      console.log('❌ No message or file to send');
      return;
    }

    if (!activeChat || !account) {
      toast.error('Please select a conversation');
      return;
    }

    if (activeChat.isDemoConversation) {
      toast.error('This is a demo conversation. Start a real chat to send messages.');
      return;
    }

    // Validate paid media
    if (isPaidMedia && (!mediaPrice || parseFloat(mediaPrice) <= 0)) {
      toast.error('Please enter a valid price');
      return;
    }

    try {
      setUploading(true);
      console.log('📤 Sending message...');

      let mediaUrl = null;
      let mediaType = null;

      // Upload media if present
      if (selectedFile) {
        console.log('🔵 Uploading media...');
        try {
          mediaUrl = await uploadMedia(selectedFile);
          mediaType = selectedFile.type.startsWith('image/') ? 'image' : 'video';
          console.log('✅ Media uploaded:', mediaUrl);
        } catch (uploadError) {
          console.error('❌ Media upload failed:', uploadError);
          toast.error('Failed to upload media. Please try again.');
          setUploading(false);
          return;
        }
      }

      // Prepare message data
      const messageData = {
        sender_address: account.toLowerCase(),
        receiver_address: activeChat.address.toLowerCase(),
        content: newMessage.trim() || '',
        media_url: mediaUrl,
        media_type: mediaType,
        is_paid: isPaidMedia,
        price: isPaidMedia ? parseFloat(mediaPrice) : 0
      };

      console.log('📝 Message data:', messageData);

      // Send message using Supabase directly (includes media fields)
      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();

      if (error) {
        console.error('❌ Send error:', error);
        throw error;
      }

      console.log('✅ Message sent:', data);

      // Clear form
      setNewMessage('');
      clearFileSelection();

      // Update conversations
      setConversations(prev => prev.map(conv =>
        conv.address === activeChat.address
          ? {
              ...conv,
              lastMessage: messageData.content || (mediaUrl ? '📷 Photo' : 'Message'),
              timestamp: Date.now()
            }
          : conv
      ));

      // Reload messages
      await loadMessages(activeChat.address);

      toast.success(isPaidMedia ? 'Paid content sent!' : 'Message sent!');

    } catch (error) {
      console.error('❌ Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setUploading(false);
      setSendingMessage(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const formatMessageTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const loadAvailableUsers = async () => {
    try {
      setLoadingUsers(true);
      console.log('🔍 Loading available users for new chat');
      console.log('👤 Current account:', account);

      const result = await SupabaseService.getAllUsers();
      console.log('📦 getAllUsers result:', result);

      if (result.success) {
        // Filter out current user and users without valid addresses
        const users = result.data.filter(u => {
          const userAddress = u.wallet_address || u.address;
          const hasValidAddress = userAddress && userAddress !== account?.toLowerCase();

          if (!userAddress) {
            console.warn('⚠️ User without address:', u);
          }

          return hasValidAddress;
        });

        // Transform users to ensure they have 'address' field for Messages component
        const transformedUsers = users.map(u => ({
          ...u,
          address: u.wallet_address || u.address,
          username: u.username || `User${(u.wallet_address || u.address)?.substring(0, 6)}`
        }));

        console.log('✅ Loaded users:', transformedUsers.length, transformedUsers);
        setAvailableUsers(transformedUsers);
      } else {
        console.error('❌ Failed to load users:', result.error);
        toast.error('Failed to load users');
      }
    } catch (error) {
      console.error('❌ Error loading users:', error);
      toast.error('Error loading users');
    } finally {
      setLoadingUsers(false);
      console.log('🏁 Finished loading users');
    }
  };

  const handleNewChatClick = () => {
    console.log('🔵 New Chat button clicked!');
    console.log('📊 Current modal state:', showNewChatModal);
    setShowNewChatModal(true);
    console.log('✅ Modal state set to true');
    setUserSearchQuery('');
    loadAvailableUsers();
  };

  const handleStartChat = (selectedUser) => {
    console.log('💬 Starting chat with:', selectedUser.username);

    // Create conversation object
    const newChat = {
      id: selectedUser.address,
      username: selectedUser.username,
      address: selectedUser.address,
      lastMessage: 'Start a conversation',
      timestamp: Date.now(),
      unread: false,
      avatar: selectedUser.username?.charAt(0).toUpperCase() || '👤'
    };

    // Set as active chat
    setActiveChat(newChat);

    // Add to conversations if not already there
    setConversations(prev => {
      const exists = prev.some(conv => conv.address === selectedUser.address);
      if (!exists) {
        return [newChat, ...prev];
      }
      return prev;
    });

    // Close modal
    setShowNewChatModal(false);

    // Load messages (will be empty for new chat)
    loadMessages(selectedUser.address);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = availableUsers.filter(user =>
    user.username?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    user.address?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">Access Required</h2>
          <p className="text-yellow-600">Please connect your wallet to access messages.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-[600px] flex">
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">Messages</h1>
            <button
              onClick={handleNewChatClick}
              className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors"
              title="Start new conversation"
            >
              <Plus size={20} />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-4">💬</div>
              <h3 className="font-medium text-gray-500 mb-2">No conversations</h3>
              <p className="text-sm text-gray-400">Start a new chat to connect with creators</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <button
                key={conversation.address}
                onClick={() => setActiveChat(conversation)}
                className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                  activeChat?.address === conversation.address ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{conversation.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {conversation.username}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {formatTime(conversation.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {conversation.lastMessage}
                    </p>
                  </div>
                  {conversation.unread && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {activeChat ? (
          <>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{activeChat.avatar}</div>
                <div>
                  <h2 className="font-semibold text-gray-900">{activeChat.username}</h2>
                  <p className="text-sm text-gray-500">Active now</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.isOwn
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}
                  >
                    {/* PAID MEDIA - LOCKED */}
                    {message.is_paid && !message.is_unlocked && !message.isOwn && message.media_url ? (
                      <div className="relative mb-2">
                        {/* Blurred preview */}
                        <div className="relative overflow-hidden rounded">
                          {message.media_type === 'image' ? (
                            <img
                              src={message.media_url}
                              alt="Locked content"
                              className="w-full max-h-48 object-cover blur-lg"
                            />
                          ) : (
                            <video
                              src={message.media_url}
                              className="w-full max-h-48 object-cover blur-lg"
                            />
                          )}
                        </div>
                        {/* Lock overlay */}
                        <div
                          className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center rounded cursor-pointer hover:bg-opacity-70 transition-all"
                          onClick={() => handleUnlockMedia(message)}
                        >
                          {unlockingMedia[message.id] ? (
                            <Loader className="animate-spin text-white mb-2" size={32} />
                          ) : (
                            <Lock className="text-white mb-2" size={32} />
                          )}
                          <p className="text-white font-bold text-sm">Locked Content</p>
                          <p className="text-white text-xs mt-1">
                            Unlock for {message.price} BNB
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* MEDIA UNLOCKED OR FREE */
                      message.media_url && (
                        <div className="mb-2">
                          {message.media_type === 'image' ? (
                            <img
                              src={message.media_url}
                              alt="Media"
                              className="w-full max-h-64 object-cover rounded cursor-pointer"
                              onClick={() => window.open(message.media_url, '_blank')}
                            />
                          ) : (
                            <video
                              src={message.media_url}
                              controls
                              className="w-full max-h-64 rounded"
                            />
                          )}
                        </div>
                      )
                    )}

                    {/* Text content */}
                    {message.content && (
                      <p className="text-sm">{message.content}</p>
                    )}

                    {/* Paid badge for sender */}
                    {message.is_paid && message.isOwn && (
                      <div className="flex items-center gap-1 mt-1 text-xs opacity-75">
                        <DollarSign size={12} />
                        <span>{message.price} BNB</span>
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className={`text-xs mt-1 ${
                      message.isOwn ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {formatMessageTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-200">
              {/* File preview */}
              {previewUrl && (
                <div className="mb-3 relative inline-block">
                  {selectedFile?.type.startsWith('image/') ? (
                    <img src={previewUrl} alt="Preview" className="max-h-32 rounded-lg" />
                  ) : (
                    <video src={previewUrl} className="max-h-32 rounded-lg" controls />
                  )}
                  <button
                    onClick={clearFileSelection}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Paid media options */}
              {selectedFile && (
                <div className="mb-3 flex items-center gap-4 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPaidMedia}
                      onChange={(e) => setIsPaidMedia(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Make this paid content</span>
                  </label>

                  {isPaidMedia && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={mediaPrice}
                        onChange={(e) => setMediaPrice(e.target.value)}
                        placeholder="0.01"
                        className="border rounded px-3 py-1 w-24 text-sm"
                      />
                      <span className="text-sm text-gray-600">BNB</span>
                    </div>
                  )}
                </div>
              )}

              {/* Input form */}
              <form onSubmit={sendMessage} className="flex items-center gap-2">
                {/* Media upload button */}
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="media-upload"
                  disabled={uploading}
                />
                <label
                  htmlFor="media-upload"
                  className="cursor-pointer text-gray-500 hover:text-blue-500 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Image size={24} />
                </label>

                {/* Text input */}
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={uploading}
                />

                {/* Send button */}
                <button
                  type="submit"
                  disabled={(!newMessage.trim() && !selectedFile) || uploading}
                  className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? (
                    <Loader className="animate-spin" size={20} />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-500">
                Choose a conversation from the sidebar to start messaging
              </p>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            // Close modal when clicking backdrop
            if (e.target === e.currentTarget) {
              console.log('🔴 Closing modal via backdrop click');
              setShowNewChatModal(false);
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[600px] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Start New Conversation</h2>
              <button
                onClick={() => {
                  console.log('🔴 Closing modal via X button');
                  setShowNewChatModal(false);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-y-auto">
              {loadingUsers ? (
                <div className="flex items-center justify-center p-8">
                  <LoadingSpinner />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-gray-400 mb-2 text-4xl">👥</div>
                  <h3 className="font-medium text-gray-500 mb-1">No users found</h3>
                  <p className="text-sm text-gray-400">
                    {userSearchQuery ? 'Try a different search' : 'No other users registered yet'}
                  </p>
                </div>
              ) : (
                <div>
                  {filteredUsers.map((user) => (
                    <button
                      key={user.address}
                      onClick={() => handleStartChat(user)}
                      className="w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left flex items-center space-x-3"
                    >
                      <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center text-xl font-semibold">
                        {user.username?.charAt(0).toUpperCase() || '👤'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {user.username || 'Anonymous'}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">
                          {user.address?.substring(0, 10)}...{user.address?.substring(user.address.length - 8)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;