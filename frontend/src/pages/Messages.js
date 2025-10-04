// src/pages/Messages.js
import React, { useState, useEffect, useRef } from 'react';
import { Send, Search, Plus, X } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { useToast } from '../contexts/ToastContext';
import SupabaseService from '../services/supabaseService';
import LoadingSpinner from '../components/LoadingSpinner';

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
          const otherUser = users.find(u => u.address === conv.address);

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
        const messagesWithOwnership = result.data.map(message => ({
          id: message.id,
          sender_address: message.sender_address,
          content: message.content,
          created_at: message.created_at,
          timestamp: new Date(message.created_at).getTime(),
          isOwn: message.sender_address === account
        }));

        console.log('✅ Loaded messages:', messagesWithOwnership);
        setMessages(messagesWithOwnership);
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

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || !account) return;

    try {
      setSendingMessage(true);
      console.log('📤 Sending message to:', activeChat.address);

      const messageData = {
        sender_address: account,
        receiver_address: activeChat.address,
        content: newMessage.trim()
      };

      const result = await SupabaseService.sendMessage(messageData);

      if (result.success) {
        console.log('✅ Message sent successfully:', result.data);

        // Clear the input immediately for better UX
        setNewMessage('');

        // Update the conversation's last message in the sidebar
        setConversations(prev => prev.map(conv =>
          conv.address === activeChat.address
            ? {
                ...conv,
                lastMessage: messageData.content,
                timestamp: Date.now()
              }
            : conv
        ));

        // Immediately fetch and display the updated message list
        await loadMessages(activeChat.address);

        toast.success('Message sent!');
      } else {
        console.error('❌ Failed to send message:', result.error);
        const errorMessage = typeof result.error === 'string'
          ? result.error
          : result.error?.message || 'Failed to send message';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      const errorMessage = error?.message || error?.details || 'Error sending message';
      toast.error(errorMessage);
    } finally {
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
        // Filter out current user
        const users = result.data.filter(u => u.address !== account);
        console.log('✅ Loaded users:', users.length, users);
        setAvailableUsers(users);
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
                    <p className="text-sm">{message.content}</p>
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
              <form onSubmit={sendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sendingMessage}
                  className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sendingMessage ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </form>
              
              <div className="mt-2 text-xs text-gray-500 text-center">
                Messages are stored locally and not encrypted end-to-end
              </div>
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