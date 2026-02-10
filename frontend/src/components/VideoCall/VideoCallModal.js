import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { supabase } from '../../supabaseClient';
import { PLATFORM_CONFIG } from '../../config/platform';
import toast from 'react-hot-toast';

const VideoCallModal = ({ creatorAddress, pricePerMinute, maxDuration, onClose }) => {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [minutes, setMinutes] = useState(10);
  const [loading, setLoading] = useState(false);

  const totalAmount = minutes * pricePerMinute;

  const handleRequestCall = async () => {
    try {
      setLoading(true);

      if (!publicKey) {
        toast.error('Please connect wallet');
        return;
      }

      console.log('💳 Starting payment...', {
        creatorAddress,
        fanAddress: publicKey.toString(),
        minutes,
        totalAmount
      });

      // 1. Invia SOL in escrow (wallet piattaforma temporaneamente)
      const transaction = new Transaction();

      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: PLATFORM_CONFIG.WALLET_ADDRESS,
          lamports: Math.floor(totalAmount * LAMPORTS_PER_SOL),
        })
      );

      const signature = await sendTransaction(transaction, connection);
      console.log('✅ Transaction sent:', signature);

      await connection.confirmTransaction(signature, 'confirmed');
      console.log('✅ Transaction confirmed');

      // 2. Salva richiesta nel database
      const requestData = {
        creator_address: creatorAddress.toLowerCase(),
        fan_address: publicKey.toString().toLowerCase(),
        requested_minutes: parseInt(minutes),
        total_amount: parseFloat(totalAmount),
        escrow_transaction: signature,
        status: 'pending'
      };

      console.log('💾 Saving request to DB:', requestData);

      const { data, error } = await supabase
        .from('videocall_requests')
        .insert(requestData)
        .select()
        .single();

      if (error) {
        console.error('❌ DB insert error:', error);
        throw error;
      }

      console.log('✅ Request saved:', data);

      toast.success('Video call request sent! Waiting for creator to accept...');
      onClose();

    } catch (error) {
      console.error('❌ Request call error:', error);
      toast.error('Failed to request call: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="videocall-modal-overlay" onClick={onClose}>
      <div className="videocall-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Request Video Call</h2>

        <div className="call-info">
          <p>Rate: <strong>{pricePerMinute} SOL/minute</strong></p>
          <p>Max duration: {maxDuration} minutes</p>
        </div>

<div className="minutes-selector">
  <label>How many minutes?</label>
  <input
    type="number"
    min="1"
    max={maxDuration}
    value={minutes}
    onChange={(e) => {
      const val = e.target.value;
      // 🔧 Fix: Permette backspace + solo numeri
      if (val === '' || /^\d*$/.test(val)) {
        setMinutes(val === '' ? '' : parseInt(val) || 1);
      }
    }}
    onKeyDown={(e) => {
      // 🔧 Backspace sempre libero
      if (e.key === 'Backspace') {
        e.target.value = '';
        setMinutes('');
        e.preventDefault();
      }
    }}
    placeholder="1-60"
  />
</div>


        <div className="total">
          <p>Total: <strong>{totalAmount.toFixed(4)} SOL</strong></p>
          <p className="refund-note">You'll be refunded for unused minutes</p>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            onClick={handleRequestCall}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Processing...' : 'Request Call 💳'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default VideoCallModal;
