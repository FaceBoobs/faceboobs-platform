// src/components/RegisterPostOnBlockchain.js
import React, { useState } from 'react';
import { AlertTriangle, Zap } from 'lucide-react';
import { ethers } from 'ethers';
import { useWeb3 } from '../contexts/Web3Context';
import { useToast } from '../contexts/ToastContext';
import { SupabaseService } from '../services/supabaseService';

/**
 * Component to register an existing premium post on the blockchain
 * Use this for posts that were created before blockchain_content_id was added
 */
const RegisterPostOnBlockchain = ({ post, onSuccess }) => {
  const { contract } = useWeb3();
  const { toast } = useToast();
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegisterOnBlockchain = async () => {
    if (!contract) {
      toast.error('Smart contract not available. Please connect your wallet.');
      return;
    }

    if (!post.is_paid || post.price <= 0) {
      toast.error('This post is not a premium post.');
      return;
    }

    if (post.blockchain_content_id) {
      toast.info('This post is already registered on blockchain.');
      return;
    }

    try {
      setIsRegistering(true);

      // Use existing content_hash or create a new one
      const contentHash = post.content_hash || `content_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      toast.info('⏳ Please confirm the transaction in MetaMask...');

      // Register content on blockchain
      const priceInWei = ethers.parseEther(post.price.toString());
      const tx = await contract.createContent(contentHash, priceInWei, true);

      toast.info('⏳ Transaction sent! Waiting for confirmation...');
      const receipt = await tx.wait();

      // Extract blockchain content ID from event
      let blockchainContentId = null;
      try {
        const contentCreatedEvent = receipt.logs.find(log => {
          try {
            const parsed = contract.interface.parseLog(log);
            return parsed && parsed.name === 'ContentCreated';
          } catch (e) {
            return false;
          }
        });

        if (contentCreatedEvent) {
          const parsed = contract.interface.parseLog(contentCreatedEvent);
          blockchainContentId = parsed.args.contentId.toString();
        }
      } catch (eventError) {
        console.error('Error parsing ContentCreated event:', eventError);
      }

      if (!blockchainContentId) {
        throw new Error('Failed to extract blockchain content ID from transaction');
      }

      // Update post in database with blockchain_content_id
      const updateResult = await SupabaseService.updatePost(post.id, {
        blockchain_content_id: blockchainContentId,
        content_hash: contentHash // Update content_hash if it was missing
      });

      if (!updateResult.success) {
        throw new Error('Failed to update post: ' + updateResult.error);
      }

      toast.success('✅ Post successfully registered on blockchain!');

      if (onSuccess) {
        onSuccess({ ...post, blockchain_content_id: blockchainContentId });
      }

    } catch (error) {
      console.error('Error registering post on blockchain:', error);

      if (error.code === 4001) {
        toast.error('Transaction cancelled by user.');
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        toast.error('Insufficient BNB for gas fees.');
      } else {
        toast.error('Failed to register post: ' + error.message);
      }
    } finally {
      setIsRegistering(false);
    }
  };

  // Don't show button if post is already registered
  if (post.blockchain_content_id) {
    return null;
  }

  // Only show for premium posts
  if (!post.is_paid || post.price <= 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-amber-900 mb-1">
            Blockchain Registration Required
          </h4>
          <p className="text-sm text-amber-800 mb-3">
            This premium post needs to be registered on the blockchain before users can purchase it.
          </p>
          <button
            onClick={handleRegisterOnBlockchain}
            disabled={isRegistering}
            className="inline-flex items-center px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRegistering ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Registering...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Register on Blockchain
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterPostOnBlockchain;
