// src/pages/Messages.js
// ✅ UPDATED: Added PAID TEXT MESSAGES (0.05 SOL DMs) functionality
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, DollarSign, Loader, Lock, Paperclip, Plus, Search, Send, X } from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

import { useSolanaApp } from '../contexts/SolanaAppContext';
import { useToast } from '../contexts/ToastContext';
import { SupabaseService } from '../services/supabaseService';
import LoadingSpinner from '../components/LoadingSpinner';
import { supabase } from '../supabaseClient';
import { PLATFORM_CONFIG, calculateFees, formatFeeBreakdown } from '../config/platform';

const Messages = () => {
  const navigate = useNavigate();
  const { conversationId } = useParams();

  const { account, user, loading: appLoading, getMediaUrl, sendSOL } = useSolanaApp();
  const { toast } = useToast();

  // Solana wallet hooks for split payments
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

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

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Media upload
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [mediaType, setMediaType] = useState(null); // 'image' | 'video'
  const [isPaidContent, setIsPaidContent] = useState(false);
  const [contentPrice, setContentPrice] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Unlock paid media/messages
  const [unlockingMedia, setUnlockingMedia] = useState({}); // { [messageId]: boolean }

  // ✅ NEW: Paid text message toggle
  const [isPaidTextMessage, setIsPaidTextMessage] = useState(false);
  const [paidMessagePrice, setPaidMessagePrice] = useState('0.05'); // Default 0.05 SOL

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const messageSubscriptionRef = useRef(null);
  const userMessagesSubscriptionRef = useRef(null);

  const accountLower = useMemo(() => (account ? account.toLowerCase() : null), [account]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle conversationId on mobile (deep link)
  useEffect(() => {
    if (!conversationId) return;

    if (conversations.length > 0) {
      const conv = conversations.find((c) => c.address?.toLowerCase() === conversationId.toLowerCase());
      if (conv) {
        setActiveChat(conv);
        return;
      }
    }

    // create temp
    setActiveChat({
      id: conversationId.toLowerCase(),
      username: `User${conversationId.substring(0, 6)}`,
      address: conversationId.toLowerCase(),
      lastMessage: '',
      timestamp: Date.now(),
      unread: false,
      unreadCount: 0,
      avatar: conversationId.charAt(2)?.toUpperCase() || 'U',
      avatarUrl: null
    });
  }, [conversationId, conversations]);

  // Load conversations
  useEffect(() => {
    if (!accountLower) return;
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountLower]);

  // Subscribe to all user messages for conversation list updates
  useEffect(() => {
    if (!accountLower) return;

    // cleanup previous
    if (userMessagesSubscriptionRef.current?.unsubscribe) userMessagesSubscriptionRef.current.unsubscribe();

    const channel = supabase
      .channel(`user-messages-${accountLower}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        async (payload) => {
          const msg = payload.new || payload.old;
          if (!msg) return;

          const sender = msg.sender_address?.toLowerCase();
          const receiver = msg.receiver_address?.toLowerCase();
          if (sender !== accountLower && receiver !== accountLower) return;

          // If new message inserted: refresh conversations list (cheap and safe)
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            await loadConversations();
          }
        }
      )
      .subscribe();

    userMessagesSubscriptionRef.current = channel;

    return () => {
      channel?.unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountLower]);

  // Load messages when active chat changes
  useEffect(() => {
    if (!accountLower || !activeChat?.address) return;
    loadMessages(activeChat.address);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountLower, activeChat?.address]);

  // Subscribe to messages for active chat
  useEffect(() => {
    if (!accountLower || !activeChat?.address) return;

    // cleanup previous
    if (messageSubscriptionRef.current?.unsubscribe) messageSubscriptionRef.current.unsubscribe();

    const other = activeChat.address.toLowerCase();

    const channel = supabase
      .channel(`messages-${accountLower}-${other}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        async (payload) => {
          const msg = payload.new || payload.old;
          if (!msg) return;

          const sender = msg.sender_address?.toLowerCase();
          const receiver = msg.receiver_address?.toLowerCase();

          const isBetween =
            (sender === accountLower && receiver === other) || (sender === other && receiver === accountLower);

          if (!isBetween) return;

          if (payload.eventType === 'INSERT') {
            const formatted = await formatMessageWithUnlockStatus(msg);
            setMessages((prev) => {
              if (prev.some((m) => m.id === formatted.id)) return prev;
              return [...prev, formatted];
            });
          }

          if (payload.eventType === 'UPDATE') {
            // simplest: reload messages to reflect is_read/unlock, avoids edge cases
            await loadMessages(other);
          }
        }
      )
      .subscribe();

    messageSubscriptionRef.current = channel;

    return () => channel?.unsubscribe?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountLower, activeChat?.address]);

  // autoscroll
  useEffect(() => {
    if (!messagesEndRef.current) return;
    const container = messagesEndRef.current.parentElement;
    if (!container) return;

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (isNearBottom) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 60);
    }
  }, [messages.length]);

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

  const formatMessageTime = (timestamp) =>
    new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const scrollToBottom = (force = false) => {
    if (!messagesEndRef.current) return;
    if (force) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
      return;
    }
    messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  const loadConversations = async () => {
    if (!accountLower) return;

    try {
      setLoadingConversations(true);

      const result = await SupabaseService.getConversations(accountLower);
      if (!result.success) throw new Error(result.error || 'Failed to load conversations');

      const rows = result.data || [];

      // Build map by other participant
      const map = new Map();

      for (const m of rows) {
        const sender = m.sender_address?.toLowerCase();
        const receiver = m.receiver_address?.toLowerCase();
        if (!sender || !receiver) continue;

        const other = sender === accountLower ? receiver : sender;

        if (!map.has(other)) {
          map.set(other, {
            address: other,
            lastMessage: null,
            lastTimestamp: 0
          });
        }

        const ts = new Date(m.created_at).getTime();
        const conv = map.get(other);
        if (ts > conv.lastTimestamp) {
          conv.lastTimestamp = ts;
          conv.lastMessage = m;
        }
      }

      // Load all users to enrich
      const userResult = await SupabaseService.getAllUsers(200);
      const users = userResult.success ? userResult.data : [];

      const convs = await Promise.all(
        Array.from(map.values()).map(async (conv) => {
          const otherUser = users.find((u) => (u.wallet_address || u.address)?.toLowerCase() === conv.address);

          // unread count
          const unreadCountRes = await countUnreadMessagesFromSender(accountLower, conv.address);
          const unreadCount = unreadCountRes.success ? unreadCountRes.count : 0;

          return {
            id: conv.address,
            username: otherUser?.username || `User${conv.address.substring(0, 6)}`,
            address: conv.address,
            lastMessage: conv.lastMessage?.content || 'No messages yet',
            timestamp: conv.lastTimestamp || Date.now(),
            unread: unreadCount > 0,
            unreadCount,
            avatar: (otherUser?.username || 'U').charAt(0).toUpperCase(),
            avatarUrl: otherUser?.avatar_url || null
          };
        })
      );

      // sort: unread first then recent
      convs.sort((a, b) => {
        if (a.unread && !b.unread) return -1;
        if (!a.unread && b.unread) return 1;
        return b.timestamp - a.timestamp;
      });

      setConversations(convs);

      // Auto-select first on desktop if none selected and no deep link
      if (!isMobile && !conversationId && convs.length > 0 && !activeChat) {
        setActiveChat(convs[0]);
      }
    } catch (e) {
      console.error('Error loading conversations:', e);
      toast.error(e?.message || 'Error loading conversations');
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  };

  const countUnreadMessagesFromSender = async (receiverAddress, senderAddress) => {
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_address', receiverAddress.toLowerCase())
        .eq('sender_address', senderAddress.toLowerCase())
        .eq('is_read', false);

      if (error) throw error;
      return { success: true, count: count || 0 };
    } catch (e) {
      console.error('Error counting unread messages from sender:', e);
      return { success: false, error: e?.message || String(e), count: 0 };
    }
  };

  const markMessagesAsRead = async (receiverAddress, senderAddress) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_address', receiverAddress.toLowerCase())
        .eq('sender_address', senderAddress.toLowerCase())
        .eq('is_read', false);

      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('Error marking messages as read:', e);
      return { success: false, error: e?.message || String(e) };
    }
  };

  // ✅ MODIFIED: Check unlock status for both paid media AND paid text messages
  const formatMessageWithUnlockStatus = async (messageRow) => {
    const isOwn = messageRow.sender_address?.toLowerCase() === accountLower;

    let isUnlocked = true;

    // ✅ MODIFIED: Check purchase for ANY paid content (media OR text message)
    if (messageRow.is_paid && !isOwn) {
      try {
        const { data: purchase, error } = await supabase
          .from('messagepurchases')
          .select('id')
          .eq('messageid', messageRow.id)
          .eq('buyeraddress', accountLower)
          .maybeSingle();

        isUnlocked = !!purchase && !error;
      } catch (e) {
        isUnlocked = false;
      }
    }

    return {
      id: messageRow.id,
      sender_address: messageRow.sender_address,
      receiver_address: messageRow.receiver_address,
      content: messageRow.content,
      has_media: !!messageRow.has_media,
      media_url: messageRow.media_url,
      media_type: messageRow.media_type,
      is_paid: !!messageRow.is_paid,
      price: messageRow.price || 0,
      blockchain_content_id: messageRow.blockchain_content_id || null,
      is_unlocked: isUnlocked,
      created_at: messageRow.created_at,
      timestamp: new Date(messageRow.created_at).getTime(),
      isOwn
    };
  };

  const loadMessages = async (otherAddress) => {
    if (!accountLower || !otherAddress) return;

    try {
      setLoadingMessages(true);

      const result = await SupabaseService.getMessages(accountLower, otherAddress.toLowerCase());
      if (!result.success) throw new Error(result.error || 'Failed to load messages');

      const rows = result.data || [];
      const formatted = await Promise.all(rows.map(formatMessageWithUnlockStatus));

      setMessages(formatted);

      // mark read
      await markMessagesAsRead(accountLower, otherAddress.toLowerCase());

      // refresh navbar badge if you have it
      window.dispatchEvent(new CustomEvent('refreshUnreadCount'));
      scrollToBottom(true);
    } catch (e) {
      console.error('Error loading messages:', e);
      toast.error(e?.message || 'Error loading messages');
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  // ✅ MODIFIED: Send text message with optional paid mode
  const sendTextMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim()) return;
    if (!activeChat?.address || !accountLower) {
      toast.error('Please select a conversation');
      return;
    }

    // ✅ NEW: Validate paid message settings
    if (isPaidTextMessage) {
      const price = Number(paidMessagePrice);
      if (!Number.isFinite(price) || price <= 0) {
        toast.error('Please enter a valid price for paid message');
        return;
      }
      if (!user?.is_creator) {
        toast.error('You need to be a creator to send paid messages. Upgrade your account first.');
        return;
      }
    }

    try {
      setSendingMessage(true);

      // ✅ MODIFIED: Include is_paid and price fields
      const messageData = {
        sender_address: accountLower,
        receiver_address: activeChat.address.toLowerCase(),
        content: newMessage.trim(),
        is_read: false,
        has_media: false,
        media_url: null,
        media_type: null,
        is_paid: isPaidTextMessage, // ✅ NEW
        price: isPaidTextMessage ? Number(paidMessagePrice) : 0, // ✅ NEW
        blockchain_content_id: null
      };

      const { data, error } = await supabase.from('messages').insert([messageData]).select().single();
      if (error) throw error;

      const localMsg = await formatMessageWithUnlockStatus(data);
      setMessages((prev) => [...prev, localMsg]);

      setNewMessage('');
      setIsPaidTextMessage(false); // ✅ NEW: Reset paid message toggle
      setConversations((prev) =>
        prev.map((c) =>
          c.address?.toLowerCase() === activeChat.address?.toLowerCase()
            ? { ...c, lastMessage: isPaidTextMessage ? '🔒 Paid message' : messageData.content, timestamp: Date.now() } // ✅ MODIFIED
            : c
        )
      );

      // ✅ NEW: Show success message for paid messages
      if (isPaidTextMessage) {
        toast.success(`Paid message sent! Receiver must pay ${paidMessagePrice} SOL to read.`);
      }

      scrollToBottom();
    } catch (e) {
      console.error('Error sending message:', e);
      toast.error(e?.message || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handlePaperclipClick = () => fileInputRef.current?.click();

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 50MB');
      return;
    }

    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const validVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm'];

    const isValidImage = validImageTypes.includes(file.type);
    const isValidVideo = validVideoTypes.includes(file.type);

    if (!isValidImage && !isValidVideo) {
      toast.error('Invalid file type. Use JPG/PNG/GIF/WEBP or MP4/MOV/WEBM');
      return;
    }

    setSelectedFile(file);
    setMediaType(isValidImage ? 'image' : 'video');
    setPreviewUrl(URL.createObjectURL(file));
    setShowMediaModal(true);
  };

  const closeMediaModal = () => {
    setShowMediaModal(false);
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setMediaType(null);
    setIsPaidContent(false);
    setContentPrice('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadMediaToStorage = async (file) => {
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '').slice(0, 80)}`;

    const { data, error } = await supabase.storage.from('chat-media').upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

    if (error) throw error;

    const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const handleSendMedia = async () => {
    if (!selectedFile || !activeChat?.address || !accountLower) {
      toast.error('Missing required information');
      return;
    }

    if (isPaidContent) {
      const p = Number(contentPrice);
      if (!Number.isFinite(p) || p <= 0) {
        toast.error('Please enter a valid price');
        return;
      }
      if (!user?.is_creator) {
        toast.error('You need to be a creator to sell content. Upgrade your account first.');
        return;
      }
    }

    try {
      setUploadingMedia(true);

      // 1) upload to storage
      const mediaUrl = await uploadMediaToStorage(selectedFile);

      // 2) register on blockchain (TODO) - for now null
      const blockchainContentId = null;

      // 3) save message row
      const messageData = {
        sender_address: accountLower,
        receiver_address: activeChat.address.toLowerCase(),
        content: newMessage.trim() || '',
        is_read: false,
        has_media: true,
        media_url: mediaUrl,
        media_type: mediaType,
        is_paid: !!isPaidContent,
        price: isPaidContent ? Number(contentPrice) : 0,
        blockchain_content_id: blockchainContentId
      };

      const { error } = await supabase.from('messages').insert([messageData]).select().single();
      if (error) throw error;

      closeMediaModal();
      setNewMessage('');

      // reload messages for accurate unlock status + ordering
      await loadMessages(activeChat.address);

      toast.success(isPaidContent ? 'Paid media sent!' : 'Media sent successfully!');
    } catch (e) {
      console.error('Error sending media:', e);
      toast.error(e?.message || 'Failed to send media');
    } finally {
      setUploadingMedia(false);
    }
  };

  // ✅ MODIFIED: Renamed from handleUnlockMedia - now handles BOTH media AND text messages
  const handleUnlockMessage = async (message) => {
    if (!message) return;
    if (!accountLower) {
      toast.error('Connect your wallet');
      return;
    }
    if (!message.price || Number(message.price) <= 0) {
      toast.error('Invalid content price');
      return;
    }

    // Calculate fees using platform config
    const priceSOL = Number(message.price);
    const fees = calculateFees(priceSOL);

    // ✅ MODIFIED: Determine content type (media or text message)
    const contentType = message.has_media ? message.media_type : 'message';
    const confirmed = window.confirm(
      `Unlock this ${contentType} for ${fees.total} SOL?\n\n` +
      formatFeeBreakdown(fees.total)
    );
    if (!confirmed) return;

    try {
      setUnlockingMedia((prev) => ({ ...prev, [message.id]: true }));

      toast.info('Processing payment with split (98% creator, 2% platform)...');

      if (!publicKey) {
        throw new Error('Wallet not connected');
      }

      // Create transaction with 2 transfers
      const transaction = new Transaction();

      // 1. Pay creator (98%)
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(message.sender_address),
          lamports: Math.floor(fees.creatorAmount * LAMPORTS_PER_SOL),
        })
      );

      // 2. Platform commission (2%)
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: PLATFORM_CONFIG.WALLET_ADDRESS,
          lamports: Math.floor(fees.platformFee * LAMPORTS_PER_SOL),
        })
      );

      // Send transaction
      const signature = await sendTransaction(transaction, connection);

      toast.info('Confirming transaction...');
      await connection.confirmTransaction(signature, 'confirmed');

      toast.info('Recording purchase...');

      // ✅ MODIFIED: Record purchase in messagepurchases table
      const { error: purchaseError } = await supabase.from('messagepurchases').insert({
        messageid: message.id,
        buyeraddress: publicKey.toString(),
        creatoraddress: message.sender_address,
        amount: fees.total,
        platform_fee: fees.platformFee,
        creator_received: fees.creatorAmount,
        transactionhash: signature,
        blockchain: 'solana'
      });

      if (purchaseError && purchaseError.code !== '23505') {
        throw purchaseError;
      }

      // ✅ MODIFIED: Show success with content type
      toast.success(`${contentType} unlocked! Payment split completed.`);
      await loadMessages(activeChat.address);
    } catch (e) {
      console.error('Unlock failed:', e);

      const msg = e?.message || String(e);
      if (msg.toLowerCase().includes('rejected') || msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('user rejected')) {
        toast.info('Transaction cancelled');
      } else {
        toast.error(msg || `Failed to unlock ${contentType}`); // ✅ MODIFIED
      }
    } finally {
      setUnlockingMedia((prev) => ({ ...prev, [message.id]: false }));
    }
  };

  const loadAvailableUsers = async () => {
    try {
      setLoadingUsers(true);
      const result = await SupabaseService.getAllUsers(200);
      if (!result.success) throw new Error(result.error || 'Failed to load users');

      const filtered = (result.data || [])
        .map((u) => ({
          ...u,
          address: (u.wallet_address || u.address || '').toLowerCase(),
          avatarUrl: u.avatar_url || u.avatarurl || null
        }))
        .filter((u) => u.address && u.address !== accountLower);

      setAvailableUsers(filtered);
    } catch (e) {
      console.error('Error loading users:', e);
      toast.error(e?.message || 'Error loading users');
      setAvailableUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleNewChatClick = () => {
    setShowNewChatModal(true);
    setUserSearchQuery('');
    loadAvailableUsers();
  };

  const handleStartChat = async (selectedUser) => {
    const addr = selectedUser.address?.toLowerCase();
    if (!addr) return;

    const newChat = {
      id: addr,
      username: selectedUser.username || `User${addr.substring(0, 6)}`,
      address: addr,
      lastMessage: 'Start a conversation',
      timestamp: Date.now(),
      unread: false,
      unreadCount: 0,
      avatar: (selectedUser.username || 'U').charAt(0).toUpperCase(),
      avatarUrl: selectedUser.avatarUrl || null
    };

    setConversations((prev) => {
      const exists = prev.some((c) => c.address?.toLowerCase() === addr);
      if (exists) return prev;
      return [newChat, ...prev];
    });

    setShowNewChatModal(false);

    if (isMobile) navigate(`/messages/${addr}`);
    else {
      setActiveChat(newChat);
      await loadMessages(addr);
    }
  };

  const handleConversationClick = (conversation) => {
    if (isMobile) navigate(`/messages/${conversation.address}`);
    else setActiveChat(conversation);
  };

  const handleBackToList = () => {
    navigate('/messages');
    setActiveChat(null);
  };

  const filteredConversations = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => (c.username || '').toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  const filteredUsers = useMemo(() => {
    const q = userSearchQuery.toLowerCase();
    return availableUsers.filter((u) => (u.username || '').toLowerCase().includes(q) || (u.address || '').includes(q));
  }, [availableUsers, userSearchQuery]);

  if (appLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!accountLower) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">Access Required</h2>
          <p className="text-yellow-600">Please connect your wallet to access messages.</p>
        </div>
      </div>
    );
  }

  const showChatView = isMobile ? !!conversationId : true;
  const showListView = isMobile ? !conversationId : true;

  return (
    <div className="messages-page-wrapper flex items-center justify-center" style={{ background: 'white' }}>
      <div className="w-full md:max-w-6xl mx-auto bg-white md:rounded-xl md:shadow-sm md:border md:border-gray-200 overflow-hidden h-screen md:h-[600px] flex">
        {/* Conversation List */}
        <div
          className={`${showListView ? 'flex' : 'hidden'} ${isMobile ? 'w-full' : 'w-1/3'} border-r border-gray-200 flex-col`}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-gray-900">Messages</h1>
              <button
                onClick={handleNewChatClick}
                className="bg-pink-500 text-white p-2 rounded-full hover:bg-pink-600 transition-colors"
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
            {loadingConversations ? (
              <div className="p-6 flex items-center justify-center">
                <LoadingSpinner />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-400 mb-4" />
                <h3 className="font-medium text-gray-500 mb-2">No conversations</h3>
                <p className="text-sm text-gray-400">Start a new chat to connect with creators</p>
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const isActive = activeChat?.address === conversation.address;
                const hasUnread = conversation.unread && (conversation.unreadCount || 0) > 0;

                return (
                  <button
                    key={conversation.address}
                    onClick={() => handleConversationClick(conversation)}
                    className={`w-full p-4 border-b border-gray-100 transition-colors text-left ${
                      isActive ? 'bg-blue-50 border-blue-200' : hasUnread ? 'bg-pink-50 hover:bg-pink-100' : 'hover:bg-gray-50'
                    }`}
                    style={!isActive && hasUnread ? { backgroundColor: 'rgba(255, 143, 218, 0.2)' } : undefined}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-400 to-white flex items-center justify-center overflow-hidden flex-shrink-0">
                        {conversation.avatarUrl && getMediaUrl(conversation.avatarUrl) ? (
                          <img
                            src={getMediaUrl(conversation.avatarUrl)}
                            alt={`${conversation.username}'s avatar`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextElementSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <span
                          className="text-pink-800 text-xl font-bold w-full h-full flex items-center justify-center"
                          style={{ display: conversation.avatarUrl && getMediaUrl(conversation.avatarUrl) ? 'none' : 'flex' }}
                        >
                          {conversation.avatar}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`text-gray-900 truncate ${hasUnread ? 'font-bold' : 'font-medium'}`}>
                            {conversation.username}
                          </h3>
                          <span className="text-xs text-gray-500">{formatTime(conversation.timestamp)}</span>
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

        {/* Chat View */}
        <div className={`${showChatView ? 'flex' : 'hidden'} flex-1 flex-col`} style={{ position: 'relative', zIndex: 1 }}>
          {activeChat ? (
            <>
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {isMobile && (
                    <button
                      onClick={handleBackToList}
                      className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <ArrowLeft size={24} />
                    </button>
                  )}

                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-400 to-white flex items-center justify-center overflow-hidden flex-shrink-0">
                    {activeChat.avatarUrl && getMediaUrl(activeChat.avatarUrl) ? (
                      <img
                        src={getMediaUrl(activeChat.avatarUrl)}
                        alt={`${activeChat.username}'s avatar`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <span
                      className="text-pink-800 text-lg font-bold w-full h-full flex items-center justify-center"
                      style={{ display: activeChat.avatarUrl && getMediaUrl(activeChat.avatarUrl) ? 'none' : 'flex' }}
                    >
                      {activeChat.avatar}
                    </span>
                  </div>

                  <div>
                    <h2 className="font-semibold text-gray-900">{activeChat.username}</h2>
                    <p className="text-xs text-gray-500">{activeChat.address?.slice(0, 6)}...{activeChat.address?.slice(-4)}</p>
                  </div>
                </div>
              </div>

              <div className="messages-container flex-1 overflow-y-auto p-4 bg-white">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-64">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <>
                    {messages.map((message) => {
                      const isSent = message.isOwn;

                      return (
                        <div key={message.id} className={isSent ? 'flex justify-end mb-3' : 'flex justify-start mb-3'}>
                          <div
                            className="bg-pink-500 text-white rounded-2xl shadow-md"
                            style={{
                              backgroundColor: '#ec4899',
                              color: '#ffffff',
                              padding: '12px 16px',
                              borderRadius: '16px',
                              maxWidth: '75%',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}
                          >
                            {/* Media */}
                            {message.has_media && message.media_url && (
                              <div className="mb-2">
                                {message.is_paid && !message.is_unlocked && !message.isOwn ? (
                                  <div
                                    className="relative premium-content locked-content"
                                    data-premium="true"
                                    data-paid="true"
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      return false;
                                    }}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }}
                                    onTouchStart={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }}
                                    style={{
                                      userSelect: 'none',
                                      WebkitUserSelect: 'none',
                                      WebkitTouchCallout: 'none',
                                      touchAction: 'none'
                                    }}
                                  >
                                    {/* Placeholder */}
                                    <div
                                      className="relative overflow-hidden rounded bg-gray-900 flex items-center justify-center"
                                      style={{ width: '100%', height: '192px', minHeight: '192px', pointerEvents: 'none' }}
                                    >
                                      <div className="text-gray-600 text-center">
                                        <Lock size={48} className="mx-auto mb-2 text-gray-500" />
                                        <p className="text-sm">Locked {message.media_type}</p>
                                      </div>
                                    </div>

                                    {/* ✅ MODIFIED: Use handleUnlockMessage instead of handleUnlockMedia */}
                                    <div
                                      className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center rounded cursor-pointer"
                                      onClick={() => handleUnlockMessage(message)}
                                      onTouchEnd={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleUnlockMessage(message);
                                      }}
                                      style={{ pointerEvents: 'auto', zIndex: 9999, touchAction: 'manipulation' }}
                                    >
                                      <Lock className="text-white mb-1" size={20} />
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleUnlockMessage(message);
                                        }}
                                        className="unlock-button-responsive bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors mt-1 px-3 py-2 text-sm font-semibold"
                                        style={{ cursor: 'pointer', zIndex: 10000, pointerEvents: 'auto' }}
                                        disabled={!!unlockingMedia[message.id]}
                                      >
                                        {unlockingMedia[message.id] ? (
                                          <span className="inline-flex items-center gap-2">
                                            <Loader className="animate-spin" size={16} />
                                            Unlocking...
                                          </span>
                                        ) : (
                                          `Unlock ${message.price} SOL`
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                ) : message.media_type === 'image' ? (
                                  <img src={message.media_url} alt="Media" className="w-full max-h-48 object-cover rounded" />
                                ) : (
                                  <video src={message.media_url} controls className="w-full max-h-48 rounded" />
                                )}
                              </div>
                            )}

                            {/* ✅ NEW: Paid text message rendering - Show locked if paid and not unlocked */}
                            {message.is_paid && !message.is_unlocked && !message.isOwn && !message.has_media ? (
                              <div className="flex flex-col items-center gap-2 py-4">
                                <Lock className="text-white" size={24} />
                                <p className="text-white text-xs text-center mb-2">🔒 Paid Message</p>
                                <button
                                  onClick={() => handleUnlockMessage(message)}
                                  disabled={!!unlockingMedia[message.id]}
                                  className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 text-sm font-semibold"
                                >
                                  {unlockingMedia[message.id] ? (
                                    <span className="inline-flex items-center gap-2">
                                      <Loader className="animate-spin" size={16} />
                                      Unlocking...
                                    </span>
                                  ) : (
                                    `Unlock for ${message.price} SOL`
                                  )}
                                </button>
                              </div>
                            ) : (
                              <p className="text-white text-sm break-words">{message.content || ''}</p>
                            )}

                            {/* Timestamp */}
                            <span className="text-white text-xs block mt-1" style={{ opacity: 0.7 }}>
                              {formatMessageTime(message.timestamp)}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* ✅ MODIFIED: Input area with paid message toggle */}
              <div className="message-input-container border-t border-gray-200" style={{ background: 'white', padding: 10, borderTop: '1px solid #ddd', zIndex: 100 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* ✅ NEW: Paid Message Toggle Bar */}
                {isPaidTextMessage && (
                  <div className="mb-2 p-2 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <DollarSign className="text-purple-600" size={18} />
                      <span className="text-sm font-semibold text-purple-900">Paid Message Mode</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={paidMessagePrice}
                        onChange={(e) => setPaidMessagePrice(e.target.value)}
                        className="w-20 px-2 py-1 text-sm border border-purple-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                        disabled={sendingMessage}
                      />
                      <span className="text-sm text-purple-700">SOL</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPaidTextMessage(false)}
                      className="text-purple-600 hover:text-purple-800 p-1"
                      title="Cancel paid mode"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}

                <form onSubmit={sendTextMessage} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePaperclipClick}
                    className="text-gray-500 hover:text-blue-500 p-2 hover:bg-gray-100 rounded-full transition-colors"
                    title="Attach media"
                    disabled={sendingMessage || uploadingMedia}
                  >
                    <Paperclip size={20} />
                  </button>

                  {/* ✅ NEW: Send Paid DM Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!user?.is_creator) {
                        toast.error('You need to be a creator to send paid messages. Upgrade your account first.');
                        return;
                      }
                      setIsPaidTextMessage(!isPaidTextMessage);
                    }}
                    className={`p-2 rounded-full transition-colors ${
                      isPaidTextMessage
                        ? 'bg-purple-500 text-white hover:bg-purple-600'
                        : 'text-gray-500 hover:text-purple-500 hover:bg-purple-50'
                    }`}
                    title={isPaidTextMessage ? 'Cancel paid message' : 'Send paid message (0.05 SOL default)'}
                    disabled={sendingMessage || uploadingMedia}
                  >
                    <DollarSign size={20} />
                  </button>

                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={isPaidTextMessage ? `Type paid message (${paidMessagePrice} SOL)...` : 'Type a message...'} {/* ✅ MODIFIED */}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={sendingMessage}
                  />

                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sendingMessage}
                    className="bg-pink-500 text-white p-2 rounded-full hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sendingMessage ? <Loader className="animate-spin" size={20} /> : <Send size={20} />}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="text-6xl mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Select a conversation</h3>
                <p className="text-gray-500">Choose a conversation from the sidebar to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNewChatModal(false);
          }}
        >
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[600px] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Start New Conversation</h2>
              <button onClick={() => setShowNewChatModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
              </button>
            </div>

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

            <div className="flex-1 overflow-y-auto">
              {loadingUsers ? (
                <div className="flex items-center justify-center p-8">
                  <LoadingSpinner />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-gray-400 mb-2 text-4xl" />
                  <h3 className="font-medium text-gray-500 mb-1">No users found</h3>
                  <p className="text-sm text-gray-400">{userSearchQuery ? 'Try a different search' : 'No other users registered yet'}</p>
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.address}
                    onClick={() => handleStartChat(u)}
                    className="w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left flex items-center space-x-3"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {u.avatarUrl && getMediaUrl(u.avatarUrl) ? (
                        <img
                          src={getMediaUrl(u.avatarUrl)}
                          alt={`${u.username}'s avatar`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <span
                        className="text-white text-xl font-semibold w-full h-full flex items-center justify-center"
                        style={{ display: u.avatarUrl && getMediaUrl(u.avatarUrl) ? 'none' : 'flex' }}
                      >
                        {(u.username || 'A').charAt(0).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{u.username || 'Anonymous'}</h3>
                      <p className="text-sm text-gray-500 truncate">
                        {u.address?.substring(0, 10)}...{u.address?.substring(u.address.length - 8)}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Media Upload Modal */}
      {showMediaModal && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 99999, padding: 20 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeMediaModal();
          }}
        >
          <div
            className="bg-white rounded-xl w-full overflow-hidden"
            style={{
              maxWidth: '500px',
              maxHeight: '70vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.8)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200" style={{ flexShrink: 0 }}>
              <h2 className="text-lg font-bold text-gray-900">Attach Media</h2>
              <button
                onClick={closeMediaModal}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-1.5 transition-colors disabled:opacity-50"
                type="button"
                disabled={uploadingMedia}
              >
                <X size={22} />
              </button>
            </div>

            <div className="overflow-y-auto p-4" style={{ flex: 1 }}>
              <div
                className="rounded-lg overflow-hidden bg-gray-900 flex items-center justify-center mb-4"
                style={{ maxWidth: 250, maxHeight: 250, margin: '0 auto' }}
              >
                {mediaType === 'image' ? (
                  <img src={previewUrl} alt="Preview" style={{ maxWidth: 250, maxHeight: 250, objectFit: 'contain' }} />
                ) : (
                  <video src={previewUrl} controls style={{ maxWidth: 250, maxHeight: 250, objectFit: 'contain' }} />
                )}
              </div>

              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Caption (optional)</label>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Add a caption..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={uploadingMedia}
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="text-green-600" size={18} />
                    <span className="text-sm font-semibold text-gray-900">Paid Content</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!user?.is_creator && !isPaidContent) {
                        toast.error('You need to be a creator to sell content. Please upgrade your account first.');
                        return;
                      }
                      setIsPaidContent((v) => !v);
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isPaidContent ? 'bg-green-600' : 'bg-gray-300'
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

                {isPaidContent ? (
                  <>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Price in SOL</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={contentPrice}
                        onChange={(e) => setContentPrice(e.target.value)}
                        placeholder="0.01"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        disabled={uploadingMedia}
                      />
                      <span className="text-xs font-semibold text-gray-600">SOL</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Blockchain registration: TODO (off-chain for now)</p>
                  </>
                ) : (
                  <p className="text-xs text-gray-600">Free content</p>
                )}

                {!user?.is_creator && <p className="text-xs text-amber-600 mt-1">You need to be a creator to sell content</p>}
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 border-t border-gray-200 bg-white" style={{ flexShrink: 0 }}>
              <button
                onClick={closeMediaModal}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
                type="button"
                disabled={uploadingMedia}
              >
                Cancel
              </button>

              <button
                onClick={handleSendMedia}
                disabled={uploadingMedia || (isPaidContent && (!contentPrice || Number(contentPrice) <= 0))}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5 text-sm font-semibold"
                type="button"
              >
                {uploadingMedia ? (
                  <>
                    <Loader className="animate-spin" size={16} />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
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
