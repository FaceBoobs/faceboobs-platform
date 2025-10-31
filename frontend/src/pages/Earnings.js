// src/pages/Earnings.js
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { DollarSign, TrendingUp, Download, ShoppingBag, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { useToast } from '../contexts/ToastContext';
import { SupabaseService } from '../services/supabaseService';

const Earnings = () => {
  const { contract, user, account } = useWeb3();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [earnings, setEarnings] = useState({
    totalEarned: '0',
    availableBalance: '0',
    alreadyWithdrawn: '0',
    totalSales: 0
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);

  useEffect(() => {
    // Check if user is a creator
    if (user && !user.isCreator) {
      toast.error('Access denied. This page is for creators only.');
      navigate('/');
      return;
    }

    if (contract && user && account) {
      loadEarningsData();
    }
  }, [contract, user, account]);

  const loadEarningsData = async () => {
    try {
      setLoading(true);
      console.log('📊 Loading earnings data for creator:', account);

      // 1. Load total earned from Supabase (sum of all purchases)
      const purchasesResult = await SupabaseService.getCreatorPurchases(account);

      let totalEarnedFromDB = 0;
      let transactions = [];

      if (purchasesResult.success && purchasesResult.data) {
        console.log('💰 Found purchases:', purchasesResult.data.length);

        // Calculate total earned (98% after platform fee)
        totalEarnedFromDB = purchasesResult.data.reduce((sum, purchase) => {
          const amount = parseFloat(purchase.amount);
          return sum + (amount * 0.98); // 2% platform fee
        }, 0);

        // Prepare transactions for display
        transactions = purchasesResult.data.map(purchase => ({
          id: purchase.id,
          buyer: purchase.user_address,
          postId: purchase.post_id,
          amount: purchase.amount,
          transactionHash: purchase.transaction_hash,
          date: new Date(purchase.created_at)
        }));
      }

      // 2. Load available balance from blockchain (if contract available)
      let availableBalance = '0';
      try {
        if (contract && contract.getUser) {
          const userData = await contract.getUser(account);
          availableBalance = ethers.formatEther(userData.totalEarnings);
          console.log('💳 Available balance from contract:', availableBalance);
        }
      } catch (blockchainError) {
        console.warn('⚠️ Could not load blockchain balance:', blockchainError);
        // Continue with Supabase data even if blockchain fails
      }

      // 3. Calculate withdrawn amount
      const alreadyWithdrawn = Math.max(0, totalEarnedFromDB - parseFloat(availableBalance));

      setEarnings({
        totalEarned: totalEarnedFromDB.toFixed(6),
        availableBalance: availableBalance,
        alreadyWithdrawn: alreadyWithdrawn.toFixed(6),
        totalSales: purchasesResult.data?.length || 0
      });

      setRecentTransactions(transactions.sort((a, b) => b.date - a.date));

      console.log('✅ Earnings data loaded:', {
        totalEarned: totalEarnedFromDB,
        availableBalance,
        alreadyWithdrawn,
        totalSales: transactions.length
      });

    } catch (error) {
      console.error('❌ Error loading earnings data:', error);
      toast.error('Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawClick = () => {
    if (parseFloat(earnings.availableBalance) <= 0) {
      toast.warning('No balance available to withdraw');
      return;
    }
    setShowWithdrawConfirm(true);
  };

  const handleWithdrawConfirm = async () => {
    if (!contract) {
      toast.error('Contract not available. Please connect your wallet.');
      return;
    }

    try {
      setWithdrawing(true);
      setShowWithdrawConfirm(false);

      console.log('💸 Initiating withdrawal of', earnings.availableBalance, 'BNB');
      toast.info('🔐 Please confirm the transaction in MetaMask...');

      // Call withdrawEarnings() - withdraws all available balance
      const tx = await contract.withdrawEarnings();

      console.log('⏳ Transaction sent:', tx.hash);
      toast.info('⏳ Transaction sent! Waiting for confirmation...');

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('✅ Withdrawal confirmed:', receipt.hash);

      toast.success(`🎉 Successfully withdrew ${earnings.availableBalance} BNB!`);

      // Reload data
      await loadEarningsData();

    } catch (error) {
      console.error('❌ Withdrawal failed:', error);

      if (error.code === 4001) {
        toast.error('Transaction cancelled by user');
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        toast.error('Insufficient BNB for gas fees');
      } else if (error.message?.includes('user rejected')) {
        toast.error('Transaction rejected');
      } else {
        toast.error('Withdrawal failed: ' + (error.reason || error.message));
      }
    } finally {
      setWithdrawing(false);
    }
  };

  const formatAddress = (address) => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (date) => {
    if (!date) return 'Unknown';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl h-32"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="h-8 bg-gray-200 rounded mb-4"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div
        className="rounded-xl text-white p-8 shadow-lg"
        style={{ background: 'linear-gradient(135deg, #d63bad 0%, #ff6bc9 50%, #ffe6f7 100%)' }}
      >
        <h1 className="text-4xl font-bold mb-2">💰 Creator Earnings</h1>
        <p className="opacity-90 text-lg">Track your performance and manage your earnings</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Earned */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Total Earned</h3>
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="text-green-600" size={24} />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{parseFloat(earnings.totalEarned).toFixed(4)}</div>
          <div className="text-sm text-gray-500 mt-1">BNB (all time)</div>
          <div className="text-xs text-gray-400 mt-2">≈ ${(parseFloat(earnings.totalEarned) * 300).toFixed(2)} USD</div>
        </div>

        {/* Available Balance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Available</h3>
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="text-blue-600" size={24} />
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-600">{parseFloat(earnings.availableBalance).toFixed(4)}</div>
          <div className="text-sm text-gray-500 mt-1">BNB (withdrawable)</div>
          <div className="text-xs text-green-600 mt-2 font-medium">Ready to withdraw</div>
        </div>

        {/* Already Withdrawn */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Withdrawn</h3>
            <div className="p-2 bg-purple-100 rounded-lg">
              <CheckCircle className="text-purple-600" size={24} />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{parseFloat(earnings.alreadyWithdrawn).toFixed(4)}</div>
          <div className="text-sm text-gray-500 mt-1">BNB (historical)</div>
        </div>

        {/* Total Sales */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Total Sales</h3>
            <div className="p-2 bg-orange-100 rounded-lg">
              <ShoppingBag className="text-orange-600" size={24} />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{earnings.totalSales}</div>
          <div className="text-sm text-gray-500 mt-1">Content purchases</div>
        </div>
      </div>

      {/* Withdraw Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Withdraw Earnings</h3>
            <p className="text-gray-600">
              You have <span className="font-bold text-green-600">{parseFloat(earnings.availableBalance).toFixed(4)} BNB</span> available to withdraw
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Platform fee: 2% • You receive: 98% of each sale
            </p>
          </div>
          <button
            onClick={handleWithdrawClick}
            disabled={withdrawing || parseFloat(earnings.availableBalance) <= 0}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-4 rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Download size={24} />
            <span>{withdrawing ? 'Processing...' : 'Withdraw All'}</span>
          </button>
        </div>

        {parseFloat(earnings.availableBalance) <= 0 && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start space-x-3">
            <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-yellow-800">
              <strong>No balance available.</strong> Create premium content and get sales to earn BNB!
            </div>
          </div>
        )}
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <h3 className="text-xl font-semibold text-gray-900">Recent Transactions</h3>
          <p className="text-gray-600 mt-1">History of your content purchases</p>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">No transactions yet</h3>
            <p className="text-gray-400 mb-4">Your sales will appear here once users purchase your content</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Buyer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Post ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Your Cut (98%)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentTransactions.slice(0, 20).map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                          {tx.buyer.slice(2, 4).toUpperCase()}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{formatAddress(tx.buyer)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        #{tx.postId}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {parseFloat(tx.amount).toFixed(4)} BNB
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {(parseFloat(tx.amount) * 0.98).toFixed(4)} BNB
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {tx.transactionHash ? (
                        <a
                          href={`https://testnet.bscscan.com/tx/${tx.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          View →
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Withdraw Confirmation Modal */}
      {showWithdrawConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Withdrawal</h3>
            <p className="text-gray-600 mb-6">
              You are about to withdraw <span className="font-bold text-green-600">{parseFloat(earnings.availableBalance).toFixed(4)} BNB</span> to your wallet.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This will send all your available earnings to your connected wallet address.
                Gas fees will be deducted from your wallet balance.
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowWithdrawConfirm(false)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdrawConfirm}
                className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold"
              >
                Confirm Withdraw
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Earnings;
