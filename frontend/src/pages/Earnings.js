// src/pages/Earnings.js
/* global BigInt */
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { DollarSign, TrendingUp, Download, Eye } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

const Earnings = ({ contract, user }) => {
  const { toast } = useToast();
  const [earnings, setEarnings] = useState('0');
  const [contentStats, setContentStats] = useState([]);
  const [withdrawing, setWithdrawing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (contract && user) {
      loadEarningsData();
    }
  }, [contract, user]);

  const loadEarningsData = async () => {
    try {
      setLoading(true);
      
      const userData = await contract.getUser(user.address);
      setEarnings(ethers.formatEther(userData.totalEarnings));
      
      const contentIds = await contract.getUserContents(user.address);
      const stats = [];
      
      for (let id of contentIds) {
        try {
          const content = await contract.getContent(Number(id));
          const purchaseCount = Number(content.purchaseCount);
          
          stats.push({
            id: Number(id),
            contentHash: content.contentHash,
            price: content.price,
            isPaid: content.isPaid,
            purchaseCount,
            earnings: content.isPaid ? content.price * BigInt(purchaseCount) * 98n / 100n : 0n,
            timestamp: Number(content.timestamp)
          });
        } catch (error) {
          console.error('Error loading content stats:', error);
        }
      }
      
      setContentStats(stats.sort((a, b) => b.timestamp - a.timestamp));
      
    } catch (error) {
      console.error('Error loading earnings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      setWithdrawing(true);
      
      const tx = await contract.withdrawEarnings();
      await tx.wait();
      
      toast.success('Earnings withdrawn successfully!');
      await loadEarningsData();
      
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error('Withdrawal failed: ' + error.message);
    } finally {
      setWithdrawing(false);
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    
    if (diff < 86400) return 'Today';
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white p-6">
        <h1 className="text-3xl font-bold mb-2">Creator Earnings</h1>
        <p className="opacity-90">Track your content performance and withdraw your earnings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Total Earnings</h3>
            <DollarSign className="text-green-500" size={24} />
          </div>
          <div className="text-2xl font-bold text-gray-900">{parseFloat(earnings).toFixed(4)} BNB</div>
          <div className="text-sm text-gray-500">≈ ${(parseFloat(earnings) * 300).toFixed(2)} USD</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Total Content</h3>
            <Eye className="text-blue-500" size={24} />
          </div>
          <div className="text-2xl font-bold text-gray-900">{contentStats.length}</div>
          <div className="text-sm text-gray-500">Posts created</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Total Sales</h3>
            <TrendingUp className="text-orange-500" size={24} />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {contentStats.reduce((sum, content) => sum + content.purchaseCount, 0)}
          </div>
          <div className="text-sm text-gray-500">Content purchases</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Available for Withdrawal</h3>
            <p className="text-gray-600">
              You have <span className="font-semibold text-green-600">{parseFloat(earnings).toFixed(4)} BNB</span> ready to withdraw
            </p>
          </div>
          <button
            onClick={handleWithdraw}
            disabled={withdrawing || parseFloat(earnings) === 0}
            className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <Download size={20} />
            <span>{withdrawing ? 'Withdrawing...' : 'Withdraw'}</span>
          </button>
        </div>
        
        {parseFloat(earnings) === 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>Tip:</strong> Create premium content to start earning! Users pay to unlock your exclusive content.
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Content Performance</h3>
          <p className="text-gray-600">Track how your content is performing</p>
        </div>

        {contentStats.length === 0 ? (
          <div className="p-12 text-center">
            <TrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">No content yet</h3>
            <p className="text-gray-400 mb-4">Create your first post to start tracking performance</p>
            <button className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition-colors">
              Create Content
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Content
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purchases
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Earnings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contentStats.map((content) => (
                  <tr key={content.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center mr-4">
                          <span className="text-xs text-gray-600">#{content.id}</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">Content #{content.id}</div>
                          <div className="text-sm text-gray-500">{content.contentHash.slice(0, 15)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        content.isPaid 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {content.isPaid ? 'Premium' : 'Free'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {content.isPaid ? `${content.price} BNB` : 'Free'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {content.purchaseCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {content.isPaid ? `${ethers.formatEther(content.earnings)} BNB` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTimeAgo(content.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-4">Tips to Increase Earnings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <ul className="space-y-2">
            <li>• Create high-quality, exclusive content</li>
            <li>• Price content competitively (0.001-0.01 BNB)</li>
            <li>• Post consistently to build audience</li>
          </ul>
          <ul className="space-y-2">
            <li>• Engage with your followers regularly</li>
            <li>• Use stories to promote premium content</li>
            <li>• Cross-promote on other platforms</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Earnings;