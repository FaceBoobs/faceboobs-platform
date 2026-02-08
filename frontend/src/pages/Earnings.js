// src/pages/Earnings.js
import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Download, ShoppingBag, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { useWeb3 } from '../contexts/Web3Context';
import { useToast } from '../contexts/ToastContext';
import { SupabaseService } from '../services/supabaseService';
import { supabase } from '../supabaseClient';

const Earnings = () => {
  const { user, account } = useWeb3(); // ✅ non usiamo contract (BNB/BSC)
  const { publicKey, sendTransaction } = useWallet(); // 🔧 Solana wallet for withdrawals
  const { connection } = useConnection(); // 🔧 Solana connection
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

  // 🔧 WITHDRAW LIVE: State for withdrawal
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // UI/labels
  const CURRENCY = 'SOL';

  useEffect(() => {
    const isCreator = !!(user?.isCreator ?? user?.is_creator);

    if (user && !isCreator) {
      toast.error('Access denied. This page is for creators only.');
      setLoading(false);
      navigate('/');
      return;
    }

    // 🔧 FIX: Check Solana wallet connection
    if (user && (account || publicKey)) {
      loadEarningsData();
      return;
    }

    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, account, publicKey]);

  const loadEarningsData = async () => {
    try {
      setLoading(true);

      // 🔧 UPDATED: Load earnings from messagepurchases table (paid DMs)
      const { data: messagePurchases, error: msgError } = await supabase
        .from('messagepurchases')
        .select('*')
        .eq('creatoraddress', account?.toLowerCase());

      let totalEarnedFromDB = 0;
      let alreadyWithdrawn = 0;
      let transactions = [];

      if (!msgError && messagePurchases) {
        // Calculate total earned (creator_received column has 98% already)
        totalEarnedFromDB = messagePurchases.reduce((sum, purchase) => {
          const creatorAmount = parseFloat(purchase.creator_received || 0);
          return sum + creatorAmount;
        }, 0);

        // Calculate already withdrawn
        alreadyWithdrawn = messagePurchases
          .filter(p => p.withdrawn === true)
          .reduce((sum, purchase) => {
            return sum + parseFloat(purchase.creator_received || 0);
          }, 0);

        transactions = messagePurchases.map((purchase) => ({
          id: purchase.id,
          buyer: purchase.buyeraddress,
          postId: purchase.messageid,
          amount: purchase.amount,
          transactionHash: purchase.transactionhash,
          date: new Date(purchase.created_at),
          withdrawn: purchase.withdrawn || false
        }));
      }

      // Also load post purchases (existing functionality)
      const purchasesResult = await SupabaseService.getCreatorPurchases(account);
      if (purchasesResult.success && purchasesResult.data) {
        const postEarnings = purchasesResult.data.reduce((sum, purchase) => {
          const amount = parseFloat(purchase.amount || 0);
          return sum + (amount * 0.98); // 2% platform fee
        }, 0);

        totalEarnedFromDB += postEarnings;

        const postTransactions = purchasesResult.data.map((purchase) => ({
          id: purchase.id,
          buyer: purchase.user_address,
          postId: purchase.post_id,
          amount: purchase.amount,
          transactionHash: purchase.transaction_hash,
          date: new Date(purchase.created_at),
          withdrawn: false
        }));

        transactions = [...transactions, ...postTransactions];
      }

      // Available balance: total earned - already withdrawn
      const availableBalance = Math.max(0, totalEarnedFromDB - alreadyWithdrawn);

      setEarnings({
        totalEarned: totalEarnedFromDB.toFixed(6),
        availableBalance: availableBalance.toFixed(6),
        alreadyWithdrawn: alreadyWithdrawn.toFixed(6),
        totalSales: transactions.length
      });

      setRecentTransactions(transactions.sort((a, b) => b.date - a.date));
    } catch (error) {
      console.error('❌ Error loading earnings data:', error);
      toast.error('Failed to load earnings data');
    } finally {
      setLoading(false);
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

  // 🔧 WITHDRAW LIVE: Functional withdrawal with amount input
  const handleWithdraw = async () => {
    try {
      setIsWithdrawing(true);

      if (!publicKey) {
        toast.error('Please connect your Solana wallet');
        setIsWithdrawing(false);
        return;
      }

      // 🔧 FIX: Check Solana wallet connection
      if (!account && !publicKey) {
        toast.error('Wallet not connected');
        setIsWithdrawing(false);
        return;
      }

      // Validate withdraw amount
      const amount = parseFloat(withdrawAmount);
      if (!amount || amount <= 0) {
        toast.error('Please enter a valid amount');
        setIsWithdrawing(false);
        return;
      }

      const available = parseFloat(earnings.availableBalance);
      if (amount > available) {
        toast.error(`Amount exceeds available balance (${available.toFixed(6)} SOL)`);
        setIsWithdrawing(false);
        return;
      }

      // Minimum withdrawal: 0.000001 SOL
      if (amount < 0.000001) {
        toast.error('Minimum withdrawal is 0.000001 SOL');
        setIsWithdrawing(false);
        return;
      }

      // Confirm with user
      const confirmed = window.confirm(
        `Withdraw ${amount.toFixed(6)} SOL to ${publicKey.toString()}?\n\n⚠️ Note: This will create a withdrawal request that requires backend processing to send actual SOL.`
      );

      if (!confirmed) {
        setIsWithdrawing(false);
        return;
      }

      toast.info('Processing withdrawal request...');

      // 🔧 WITHDRAW LIVE: Save to withdraw_history table
      const { data: withdrawData, error: withdrawError } = await supabase
        .from('withdraw_history')
        .insert([{
          creator_address: publicKey.toString(),
          amount: amount,
          status: 'pending',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (withdrawError) {
        console.error('Error creating withdrawal:', withdrawError);
        throw withdrawError;
      }

      // Mark messagepurchases as withdrawn (up to the requested amount)
      const { data: messagePurchases, error: fetchError } = await supabase
        .from('messagepurchases')
        .select('*')
        .eq('creatoraddress', account.toLowerCase())
        .eq('withdrawn', false)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      // Calculate which purchases to mark as withdrawn
      let remaining = amount;
      const purchasesToMark = [];

      for (const purchase of messagePurchases) {
        if (remaining <= 0) break;
        const purchaseAmount = parseFloat(purchase.creator_received || 0);
        if (purchaseAmount <= remaining) {
          purchasesToMark.push(purchase.id);
          remaining -= purchaseAmount;
        }
      }

      // Mark purchases as withdrawn
      if (purchasesToMark.length > 0) {
        const { error: updateError } = await supabase
          .from('messagepurchases')
          .update({
            withdrawn: true,
            withdrawn_at: new Date().toISOString(),
            withdrawal_status: 'pending',
            withdrawal_id: withdrawData.id
          })
          .in('id', purchasesToMark);

        if (updateError) {
          console.error('Error marking purchases as withdrawn:', updateError);
          throw updateError;
        }
      }

      toast.success(`✅ Withdrawal request submitted! ${amount.toFixed(6)} SOL (Request ID: ${withdrawData.id})`);

      // Clear input and reload data
      setWithdrawAmount('');
      loadEarningsData();

    } catch (error) {
      console.error('❌ Withdraw error:', error);
      toast.error('Failed to process withdrawal request');
    } finally {
      setIsWithdrawing(false);
    }
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
    <div className="max-w-6xl mx-auto space-y-4 md:space-y-6 px-0 md:px-4">
      {/* Header */}
      <div
        className="rounded-xl text-white p-4 md:p-8 shadow-lg"
        style={{ background: 'linear-gradient(135deg, #d63bad 0%, #ff6bc9 50%, #ffe6f7 100%)' }}
      >
        <h1 className="text-2xl md:text-4xl font-bold mb-2">Creator Earnings</h1>
        <p className="opacity-90 text-sm md:text-lg">Track your performance and manage your earnings</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        {/* Total Earned */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2 md:mb-4">
            <h3 className="font-semibold text-gray-700 text-xs md:text-base">Total Earned</h3>
            <div className="p-1 md:p-2 bg-green-100 rounded-lg">
              <DollarSign className="text-green-600" size={16} />
            </div>
          </div>
          <div className="text-lg md:text-3xl font-bold text-gray-900">
            {parseFloat(earnings.totalEarned).toFixed(4)}
          </div>
          <div className="text-xs md:text-sm text-gray-500 mt-1">{CURRENCY} (all time)</div>
        </div>

        {/* Available Balance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2 md:mb-4">
            <h3 className="font-semibold text-gray-700 text-xs md:text-base">Available</h3>
            <div className="p-1 md:p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="text-blue-600" size={16} />
            </div>
          </div>
          <div className="text-lg md:text-3xl font-bold text-blue-600">
            {parseFloat(earnings.availableBalance).toFixed(4)}
          </div>
          <div className="text-xs md:text-sm text-gray-500 mt-1">{CURRENCY}</div>
          <div className="text-xs text-gray-400 mt-1 md:mt-2 font-medium hidden md:block">
            Ready to withdraw
          </div>
        </div>

        {/* Already Withdrawn */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2 md:mb-4">
            <h3 className="font-semibold text-gray-700 text-xs md:text-base">Withdrawn</h3>
            <div className="p-1 md:p-2 bg-purple-100 rounded-lg">
              <CheckCircle className="text-purple-600" size={16} />
            </div>
          </div>
          <div className="text-lg md:text-3xl font-bold text-gray-900">
            {parseFloat(earnings.alreadyWithdrawn).toFixed(4)}
          </div>
          <div className="text-xs md:text-sm text-gray-500 mt-1">{CURRENCY}</div>
        </div>

        {/* Total Sales */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2 md:mb-4">
            <h3 className="font-semibold text-gray-700 text-xs md:text-base">Total Sales</h3>
            <div className="p-1 md:p-2 bg-orange-100 rounded-lg">
              <ShoppingBag className="text-orange-600" size={16} />
            </div>
          </div>
          <div className="text-lg md:text-3xl font-bold text-gray-900">{earnings.totalSales}</div>
          <div className="text-xs md:text-sm text-gray-500 mt-1">Purchases</div>
        </div>
      </div>

      {/* 🔧 WITHDRAW LIVE: Functional withdraw section with amount input */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">Withdraw Earnings</h3>

        <div className="space-y-4">
          {/* Available Balance Display */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
            <p className="text-sm text-gray-600 mb-1">Available Balance</p>
            <p className="text-3xl font-bold text-green-600">
              {parseFloat(earnings.availableBalance).toFixed(6)} {CURRENCY}
            </p>
            <p className="text-xs text-gray-500 mt-1">Ready to withdraw</p>
          </div>

          {/* Withdraw Amount Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Withdraw Amount ({CURRENCY})
            </label>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="number"
                  step="0.000001"
                  min="0.000001"
                  max={parseFloat(earnings.availableBalance)}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.000000"
                  disabled={parseFloat(earnings.availableBalance) <= 0 || isWithdrawing}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-lg font-mono"
                />
                <button
                  onClick={() => setWithdrawAmount(earnings.availableBalance)}
                  disabled={parseFloat(earnings.availableBalance) <= 0 || isWithdrawing}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-semibold text-purple-600 hover:text-purple-700 disabled:text-gray-400"
                >
                  MAX
                </button>
              </div>

              <button
                onClick={handleWithdraw}
                disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || isWithdrawing || parseFloat(earnings.availableBalance) <= 0}
                className={`px-6 py-3 rounded-lg transition-all flex items-center justify-center space-x-2 font-semibold shadow-lg whitespace-nowrap ${
                  withdrawAmount && parseFloat(withdrawAmount) > 0 && !isWithdrawing && parseFloat(earnings.availableBalance) > 0
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 hover:shadow-xl'
                    : 'bg-gray-200 text-gray-600 opacity-70 cursor-not-allowed'
                }`}
              >
                {isWithdrawing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    <span>Withdraw {withdrawAmount ? parseFloat(withdrawAmount).toFixed(6) : ''} {CURRENCY}</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Min: 0.000001 {CURRENCY} • Platform fee: 2% • You receive: 98%
            </p>
          </div>
        </div>

        {parseFloat(earnings.availableBalance) <= 0 && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start space-x-3">
            <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-yellow-800">
              <strong>No balance available.</strong> Create premium content and get sales to earn {CURRENCY}!
            </div>
          </div>
        )}
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <h3 className="text-lg md:text-xl font-semibold text-gray-900">Recent Transactions</h3>
          <p className="text-sm md:text-base text-gray-600 mt-1">History of your content purchases</p>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-8 md:p-12 text-center">
            <ShoppingBag size={40} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-base md:text-lg font-medium text-gray-500 mb-2">No transactions yet</h3>
            <p className="text-sm text-gray-400 mb-4">Your sales will appear here once users purchase your content</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Post ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Your Cut (98%)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentTransactions.slice(0, 20).map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                          {tx.buyer?.slice(2, 4)?.toUpperCase?.() || '??'}
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
                      {parseFloat(tx.amount).toFixed(4)} {CURRENCY}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {(parseFloat(tx.amount) * 0.98).toFixed(4)} {CURRENCY}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(tx.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {tx.transactionHash ? (
                        <span className="text-gray-500">{tx.transactionHash.slice(0, 8)}...</span>
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
    </div>
  );
};

export default Earnings;
