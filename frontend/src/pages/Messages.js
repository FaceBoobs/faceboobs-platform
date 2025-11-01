// src/pages/Messages.js
import React, { useState, useEffect, useRef } from 'react';
import { Send, Search, Plus, X, Loader, Paperclip, Image as ImageIcon, Video, DollarSign, Lock } from 'lucide-react';
import { useWeb3 } from '../contexts/Web3Context';
import { useToast } from '../contexts/ToastContext';
import { SupabaseService } from '../services/supabaseService';
import LoadingSpinner from '../components/LoadingSpinner';
import { supabase } from '../supabaseClient';
import { ethers } from 'ethers';
import CONTRACT_ABI from '../contracts/SocialPlatform.json';

// Smart contract configuration
const CONTRACT_ADDRESS = "0x575e0532445489dd31C12615BeC7C63d737B69DD";

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
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [mediaType, setMediaType] = useState(null); // 'image' or 'video'
  const [isPaidContent, setIsPaidContent] = useState(false);
  const [contentPrice, setContentPrice] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef(null);

  // Media unlock states
  const [unlockingMedia, setUnlockingMedia] = useState({}); // { messageId: boolean }

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

  // Subscribe to all user messages for conversation list updates
  useEffect(() => {
    if (!account) return;

    console.log('📡 [Messages] Subscribing to all messages for conversation list updates');

    const subscription = SupabaseService.subscribeToUserMessages(account, async (payload) => {
      console.log('🔔 [Messages] New message event for conversation list:', payload.eventType);

      // If a new message is inserted
      if (payload.eventType === 'INSERT' && payload.new) {
        const newMessage = payload.new;
        const isReceiver = newMessage.receiver_address === account.toLowerCase();
        const isSender = newMessage.sender_address === account.toLowerCase();
        const otherAddress = isReceiver ? newMessage.sender_address : newMessage.receiver_address;

        console.log('📩 [Messages] New message:', {
          from: newMessage.sender_address,
          to: newMessage.receiver_address,
          isReceiver,
          isSender,
          otherAddress
        });

        // Update conversations
        setConversations(prev => {
          const existingConv = prev.find(c => c.address === otherAddress);

          if (existingConv) {
            // Update existing conversation
            const updatedConvs = prev.map(conv => {
              if (conv.address === otherAddress) {
                // If user is the receiver and not currently viewing this chat, increment unread
                const shouldIncrementUnread = isReceiver && activeChat?.address !== otherAddress;

                return {
                  ...conv,
                  lastMessage: newMessage.content || '💬 New message',
                  timestamp: new Date(newMessage.created_at).getTime(),
                  unread: shouldIncrementUnread || conv.unread,
                  unreadCount: shouldIncrementUnread ? (conv.unreadCount || 0) + 1 : conv.unreadCount
                };
              }
              return conv;
            });

            // Re-sort conversations: unread first, then by timestamp
            return updatedConvs.sort((a, b) => {
              if (a.unread && !b.unread) return -1;
              if (!a.unread && b.unread) return 1;
              return b.timestamp - a.timestamp;
            });
          } else {
            // New conversation - reload conversations to get user data
            loadConversations();
            return prev;
          }
        });
      }

      // If messages are updated (marked as read)
      if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
        const oldMessage = payload.old;
        const newMessage = payload.new;

        // If message was unread and now is read, decrement the unread count
        if (oldMessage.receiver_address === account.toLowerCase() &&
            !oldMessage.is_read && newMessage.is_read) {
          console.log('✅ [Messages] Message marked as read, updating conversation list');

          setConversations(prev => prev.map(conv => {
            if (conv.address === newMessage.sender_address) {
              const newUnreadCount = Math.max(0, (conv.unreadCount || 0) - 1);
              return {
                ...conv,
                unread: newUnreadCount > 0,
                unreadCount: newUnreadCount
              };
            }
            return conv;
          }));
        }
      }
    });

    return () => {
      console.log('🔌 [Messages] Unsubscribing from conversation list updates');
      subscription?.unsubscribe();
    };
  }, [account, activeChat]);

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
        const conversationsWithUserData = await Promise.all(
          Array.from(conversationsMap.values()).map(async conv => {
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

            // Count unread messages from this conversation
            const unreadResult = await SupabaseService.countUnreadMessagesFromSender(account, conv.address);
            const unreadCount = unreadResult.success ? unreadResult.count : 0;

            console.log('📊 Unread messages from', conv.address, ':', unreadCount);

            return {
              id: conv.address, // Use address as unique ID
              username: otherUser?.username || `User${conv.address?.substring(0, 6)}`,
              address: conv.address,
              lastMessage: conv.lastMessage?.content || 'No messages yet',
              timestamp: conv.lastTimestamp,
              unread: unreadCount > 0,
              unreadCount: unreadCount,
              avatar: otherUser?.username?.charAt(0).toUpperCase() || '👤'
            };
          })
        );

        // Sort: conversations with unread messages first, then by most recent message
        conversationsWithUserData.sort((a, b) => {
          // First, sort by unread status (unread first)
          if (a.unread && !b.unread) return -1;
          if (!a.unread && b.unread) return 1;
          // Then by timestamp (most recent first)
          return b.timestamp - a.timestamp;
        });

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
        // Check unlock status for paid media messages
        const messagesWithUnlockStatus = await Promise.all(
          result.data.map(async (message) => {
            let isUnlocked = true;

            // If message has paid media and user is not the sender, check if unlocked
            if (message.has_media && message.is_paid && message.sender_address !== account) {
              const { data: purchase } = await supabase
                .from('message_purchases')
                .select('*')
                .eq('message_id', message.id)
                .eq('buyer_address', account.toLowerCase())
                .single();

              isUnlocked = !!purchase;
              console.log(`📊 Message ${message.id} unlock status:`, isUnlocked);
            }

            return {
              id: message.id,
              sender_address: message.sender_address,
              content: message.content,
              has_media: message.has_media || false,
              media_url: message.media_url,
              media_type: message.media_type,
              is_paid: message.is_paid || false,
              price: message.price || 0,
              blockchain_content_id: message.blockchain_content_id,
              is_unlocked: isUnlocked,
              created_at: message.created_at,
              timestamp: new Date(message.created_at).getTime(),
              isOwn: message.sender_address === account
            };
          })
        );

        console.log('✅ Loaded messages with unlock status:', messagesWithUnlockStatus);

        // Mark all messages from this conversation as read
        await SupabaseService.markMessagesAsRead(account, otherAddress);
        console.log('✅ Messages marked as read');

        setMessages(messagesWithUnlockStatus);

        // Update the conversation's unread count in the local state
        setConversations(prev => prev.map(conv =>
          conv.address === otherAddress
            ? { ...conv, unread: false, unreadCount: 0 }
            : conv
        ));
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

    // Validation
    if (!newMessage.trim()) {
      console.log('❌ No message to send');
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

    try {
      setSendingMessage(true);
      console.log('📤 Sending message...');

      // Prepare message data (text only)
      const messageData = {
        sender_address: account.toLowerCase(),
        receiver_address: activeChat.address.toLowerCase(),
        content: newMessage.trim(),
        is_read: false
      };

      console.log('📝 Message data:', messageData);

      // Send message using Supabase
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

      // Update conversations
      setConversations(prev => prev.map(conv =>
        conv.address === activeChat.address
          ? {
              ...conv,
              lastMessage: messageData.content,
              timestamp: Date.now()
            }
          : conv
      ));

      // Reload messages
      await loadMessages(activeChat.address);

      toast.success('Message sent!');

    } catch (error) {
      console.error('❌ Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  // Media upload functions
  const handlePaperclipClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // File validation
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 50MB');
      return;
    }

    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const validVideoTypes = ['video/mp4', 'video/quicktime'];
    const isValidImage = validImageTypes.includes(file.type);
    const isValidVideo = validVideoTypes.includes(file.type);

    if (!isValidImage && !isValidVideo) {
      toast.error('Invalid file type. Please use JPG, PNG, GIF, WEBP for images or MP4, MOV for videos');
      return;
    }

    // Set file and create preview
    setSelectedFile(file);
    setMediaType(isValidImage ? 'image' : 'video');

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Open modal
    setShowMediaModal(true);

    console.log('✅ File selected:', file.name, file.type);
  };

  const closeMediaModal = () => {
    setShowMediaModal(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setMediaType(null);
    setIsPaidContent(false);
    setContentPrice('');

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadMediaToStorage = async (file) => {
    try {
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      console.log('📤 Uploading file to Supabase Storage:', fileName);

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

      console.log('✅ File uploaded successfully:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName);

      console.log('✅ Public URL generated:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('❌ Error uploading media to storage:', error);
      throw error;
    }
  };

  const registerPaidContentOnBlockchain = async (mediaUrl, price) => {
    try {
      console.log('⛓️ Registering paid content on blockchain...');

      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI.abi, signer);

      // Convert price to wei
      const priceInWei = ethers.parseEther(price);

      console.log('📝 Creating content on blockchain:', {
        mediaUrl,
        priceInWei: priceInWei.toString(),
        isPaid: true
      });

      // Call smart contract
      const tx = await contract.createContent(mediaUrl, priceInWei, true);
      console.log('⏳ Transaction sent:', tx.hash);

      toast.info('Please wait for blockchain confirmation...');

      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', receipt);

      // Get contentId from event
      const contentCreatedEvent = receipt.logs.find(
        log => log.fragment && log.fragment.name === 'ContentCreated'
      );

      if (contentCreatedEvent) {
        const contentId = contentCreatedEvent.args[0];
        console.log('✅ Content registered with ID:', contentId.toString());
        return contentId.toString();
      } else {
        throw new Error('ContentCreated event not found in transaction');
      }

    } catch (error) {
      console.error('❌ Blockchain registration error:', error);

      if (error.code === 'ACTION_REJECTED') {
        throw new Error('Transaction was rejected by user');
      } else if (error.message?.includes('Only creators can create content')) {
        throw new Error('You need to be registered as a creator. Please upgrade your account first.');
      }

      throw error;
    }
  };

  const handleSendMedia = async () => {
    if (!selectedFile || !activeChat || !account) {
      toast.error('Missing required information');
      return;
    }

    if (isPaidContent && (!contentPrice || parseFloat(contentPrice) <= 0)) {
      toast.error('Please enter a valid price');
      return;
    }

    try {
      setUploadingMedia(true);
      console.log('📤 Starting media upload process...');

      // Step 1: Upload to Supabase Storage
      const mediaUrl = await uploadMediaToStorage(selectedFile);
      console.log('✅ Media uploaded to storage');

      let blockchainContentId = null;

      // Step 2: If paid, register on blockchain
      if (isPaidContent) {
        toast.info('Registering content on blockchain...');
        blockchainContentId = await registerPaidContentOnBlockchain(mediaUrl, contentPrice);
        console.log('✅ Content registered on blockchain with ID:', blockchainContentId);
      }

      // Step 3: Save message to database
      const messageData = {
        sender_address: account.toLowerCase(),
        receiver_address: activeChat.address.toLowerCase(),
        content: newMessage.trim() || '',
        has_media: true,
        media_url: mediaUrl,
        media_type: mediaType,
        is_paid: isPaidContent,
        price: isPaidContent ? parseFloat(contentPrice) : 0,
        blockchain_content_id: blockchainContentId,
        is_read: false
      };

      console.log('💾 Saving message to database:', messageData);

      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      console.log('✅ Message saved to database:', data);

      // Clear form and close modal
      setNewMessage('');
      closeMediaModal();

      // Update conversations
      setConversations(prev => prev.map(conv =>
        conv.address === activeChat.address
          ? {
              ...conv,
              lastMessage: isPaidContent ? '💰 Paid media' : '📷 Media',
              timestamp: Date.now()
            }
          : conv
      ));

      // Reload messages
      await loadMessages(activeChat.address);

      toast.success(isPaidContent
        ? 'Paid content sent and registered on blockchain!'
        : 'Media sent successfully!');

    } catch (error) {
      console.error('❌ Error sending media:', error);
      toast.error(error.message || 'Failed to send media');
    } finally {
      setUploadingMedia(false);
    }
  };

  // Unlock paid media content
  const handleUnlockMedia = async (message) => {
    if (!message || !message.blockchain_content_id) {
      toast.error('Invalid content');
      return;
    }

    // Confirm purchase
    const confirmed = window.confirm(
      `Unlock this ${message.media_type} for ${message.price} BNB?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setUnlockingMedia(prev => ({ ...prev, [message.id]: true }));
      console.log('🔓 Unlocking media:', {
        messageId: message.id,
        blockchainContentId: message.blockchain_content_id,
        price: message.price
      });

      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI.abi, signer);

      // Convert price to wei
      const priceInWei = ethers.parseEther(message.price.toString());

      console.log('💰 Purchasing content:', {
        contentId: message.blockchain_content_id,
        priceInWei: priceInWei.toString()
      });

      toast.info('Please confirm the transaction in MetaMask...');

      // Call buyContent on smart contract
      const tx = await contract.buyContent(message.blockchain_content_id, {
        value: priceInWei
      });

      console.log('⏳ Transaction sent:', tx.hash);
      toast.info('Processing payment on blockchain...');

      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', receipt);

      // Save purchase in database
      console.log('💾 Saving purchase to database...');
      const { error: purchaseError } = await supabase
        .from('message_purchases')
        .insert([{
          message_id: message.id,
          buyer_address: account.toLowerCase(),
          amount: message.price,
          transaction_hash: tx.hash
        }]);

      if (purchaseError) {
        // Check if error is due to duplicate (already purchased)
        if (purchaseError.code === '23505') {
          console.log('⚠️ Already purchased, reloading messages...');
        } else {
          console.error('❌ Purchase record error:', purchaseError);
          throw purchaseError;
        }
      }

      console.log('✅ Purchase recorded successfully');
      toast.success('Content unlocked! 🎉');

      // Reload messages to show unlocked content
      await loadMessages(activeChat.address);

    } catch (error) {
      console.error('❌ Unlock error:', error);

      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        toast.error('Transaction cancelled');
      } else if (error.code === 'INSUFFICIENT_FUNDS' || error.message?.includes('insufficient funds')) {
        toast.error('Insufficient funds in your wallet');
      } else if (error.message?.includes('Already purchased') || error.code === '23505') {
        toast.info('You already own this content');
        await loadMessages(activeChat.address);
      } else {
        toast.error(error.message || 'Failed to unlock content');
      }
    } finally {
      setUnlockingMedia(prev => ({ ...prev, [message.id]: false }));
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
            filteredConversations.map((conversation) => {
              const isActive = activeChat?.address === conversation.address;
              const hasUnread = conversation.unread && conversation.unreadCount > 0;

              return (
                <button
                  key={conversation.address}
                  onClick={() => setActiveChat(conversation)}
                  className={`w-full p-4 border-b border-gray-100 transition-colors text-left ${
                    isActive
                      ? 'bg-blue-50 border-blue-200'
                      : hasUnread
                      ? 'bg-pink-50 hover:bg-pink-100'
                      : 'hover:bg-gray-50'
                  }`}
                  style={
                    !isActive && hasUnread
                      ? { backgroundColor: 'rgba(255, 143, 218, 0.2)' }
                      : undefined
                  }
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{conversation.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`text-gray-900 truncate ${hasUnread ? 'font-bold' : 'font-medium'}`}>
                          {conversation.username}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {formatTime(conversation.timestamp)}
                        </span>
                      </div>
                      <p className={`text-sm text-gray-600 truncate ${hasUnread ? 'font-semibold' : ''}`}>
                        {conversation.lastMessage}
                      </p>
                    </div>
                    {hasUnread && (
                      <div className="bg-pink-500 text-white text-xs font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5">
                        {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
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
                    {/* Media Content */}
                    {message.has_media && message.media_url && (
                      <div className="mb-2">
                        {/* Paid Media - Locked */}
                        {message.is_paid && !message.is_unlocked && !message.isOwn ? (
                          <div className="relative">
                            {/* Blurred Preview */}
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
                            {/* Lock Overlay */}
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
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnlockMedia(message);
                                }}
                                disabled={unlockingMedia[message.id]}
                                className="mt-2 px-4 py-1 bg-blue-600 text-white text-sm rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
                              >
                                {unlockingMedia[message.id] ? 'Unlocking...' : 'Buy Now'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Free Media or Unlocked Paid Media */
                          <div>
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
                            {/* Paid badge for sender */}
                            {message.is_paid && message.isOwn && (
                              <div className="flex items-center gap-1 mt-1 text-xs opacity-75">
                                <DollarSign size={12} />
                                <span>{message.price} BNB</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Text content */}
                    {message.content && (
                      <p className="text-sm">{message.content}</p>
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
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Input form */}
              <form onSubmit={sendMessage} className="flex items-center gap-2">
                {/* Paperclip button */}
                <button
                  type="button"
                  onClick={handlePaperclipClick}
                  className="text-gray-500 hover:text-blue-500 p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="Attach media"
                >
                  <Paperclip size={20} />
                </button>

                {/* Text input */}
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={sendingMessage}
                />

                {/* Send button */}
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sendingMessage}
                  className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sendingMessage ? (
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

      {/* Media Upload Modal - Compact Version */}
      {showMediaModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeMediaModal();
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col" style={{ maxWidth: '500px' }}>
            {/* Modal Header - Compact */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {mediaType === 'image' ? (
                  <ImageIcon className="text-blue-500" size={20} />
                ) : (
                  <Video className="text-blue-500" size={20} />
                )}
                <h2 className="text-lg font-bold text-gray-900">Attach Media</h2>
              </div>
              <button
                onClick={closeMediaModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={uploadingMedia}
                title="Close without sending"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body - Compact */}
            <div className="overflow-y-auto p-4 space-y-3">
              {/* Media Preview - Compact 200x200 */}
              <div>
                <div className="relative rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center" style={{ height: '200px' }}>
                  {mediaType === 'image' ? (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-w-full max-h-[200px] object-contain"
                    />
                  ) : (
                    <video
                      src={previewUrl}
                      controls
                      className="max-w-full max-h-[200px] object-contain"
                    />
                  )}
                </div>
              </div>

              {/* Caption - Compact */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Caption (optional)
                </label>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Add a caption..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={uploadingMedia}
                />
              </div>

              {/* Paid Content Toggle - Compact */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="text-green-600" size={18} />
                    <span className="text-sm font-medium text-gray-900">Paid Content</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPaidContent(!isPaidContent)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isPaidContent ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                    disabled={uploadingMedia}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isPaidContent ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {isPaidContent && (
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Price in BNB
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={contentPrice}
                        onChange={(e) => setContentPrice(e.target.value)}
                        placeholder="0.01"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={uploadingMedia}
                      />
                      <span className="text-xs font-medium text-gray-600">BNB</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Registered on blockchain
                    </p>
                  </div>
                )}

                {!isPaidContent && (
                  <p className="text-xs text-gray-600">
                    Free content, visible immediately
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer - Compact with prominent Send button */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-between gap-3">
              <button
                onClick={closeMediaModal}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                disabled={uploadingMedia}
              >
                Cancel
              </button>
              <button
                onClick={handleSendMedia}
                disabled={uploadingMedia || (isPaidContent && (!contentPrice || parseFloat(contentPrice) <= 0))}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
              >
                {uploadingMedia ? (
                  <>
                    <Loader className="animate-spin" size={18} />
                    <span>{isPaidContent ? 'Sending...' : 'Uploading...'}</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;