import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '../../supabaseClient';
import { FaVideo, FaCheck, FaTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';

const IncomingCallAlert = () => {
  const { publicKey } = useWallet();
  const [pendingRequests, setPendingRequests] = useState([]);

  useEffect(() => {
    if (!publicKey) return;

    // Carica richieste pending
    fetchPendingRequests();

    // Polling ogni 5 secondi per nuove richieste
    const interval = setInterval(fetchPendingRequests, 5000);

    return () => clearInterval(interval);
  }, [publicKey]);

  const fetchPendingRequests = async () => {
    try {
      const normalizedAddress = publicKey.toString().toLowerCase();

      // Fetch pending requests without join
      const { data, error } = await supabase
        .from('videocall_requests')
        .select('*')
        .eq('creator_address', normalizedAddress)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Manually fetch user data for each request
      if (data && data.length > 0) {
        const enrichedRequests = [];

        for (let request of data) {
          // ✅ FIX: Usa solana_address (corretto da FaceBoobs schema)
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('username, avatar_url')
            .eq('solana_address', request.fan_address.toLowerCase()) // ← CAMBIO QUI
            .single();

          // Attach user data to request
          enrichedRequests.push({
            ...request,
            fan: userData || { username: 'Unknown User', avatar_url: null }
          });
        }

        setPendingRequests(enrichedRequests);
      } else {
        setPendingRequests([]);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      setPendingRequests([]);
    }
  };

  const handleAccept = async (requestId) => {
    try {
      // Genera channel name unico
      const channelName = `call_${requestId}_${Date.now()}`;

      // Crea sessione
      const { error: sessionError } = await supabase
        .from('videocall_sessions')
        .insert({
          request_id: requestId,
          agora_channel_name: channelName,
          started_at: new Date().toISOString()
        });

      if (sessionError) throw sessionError;

      // Aggiorna status richiesta
      const { error: updateError } = await supabase
        .from('videocall_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      toast.success('Call accepted! Starting...');

      // Apri sala videocall
      window.location.href = `/videocall/${channelName}`;

    } catch (error) {
      console.error('Accept error:', error);
      toast.error('Failed to accept call');
    }
  };

  const handleReject = async (requestId) => {
    try {
      const { error } = await supabase
        .from('videocall_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Call rejected');
      fetchPendingRequests();

    } catch (error) {
      console.error('Reject error:', error);
      toast.error('Failed to reject call');
    }
  };

  if (pendingRequests.length === 0) return null;

  return (
    <div className="incoming-call-alerts">
      {pendingRequests.map(request => (
        <div key={request.id} className="incoming-call-alert">
          <div className="alert-content">
            <FaVideo className="call-icon" />
            <div className="alert-info">
              <p className="caller-name">
                {request.fan?.username || 'User'} is calling
              </p>
              <p className="call-details">
                {request.requested_minutes} minutes • {request.total_amount} SOL
              </p>
            </div>
          </div>
          <div className="alert-actions">
            <button
              onClick={() => handleReject(request.id)}
              className="btn-reject"
            >
              <FaTimes /> Reject
            </button>
            <button
              onClick={() => handleAccept(request.id)}
              className="btn-accept"
            >
              <FaCheck /> Accept
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default IncomingCallAlert;
