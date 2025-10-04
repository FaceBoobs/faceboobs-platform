import React, { useState, useEffect } from 'react';
import { debugStorage, storage } from '../utils/storageUtils';
import { testDataPersistence, testPersistenceAfterRefresh, cleanupTestData } from '../utils/testPersistence';
import { runPerformanceTest, testCompressionOnly } from '../utils/compressionPerformanceTest';
import { getDebugStats, exportDebugLogs, clearDebugLogs, testContract } from '../utils/contractDebugger';
import { useWeb3 } from '../contexts/Web3Context';

const DataPersistenceDebug = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [storageInfo, setStorageInfo] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [performanceResults, setPerformanceResults] = useState(null);
  const [isRunningPerformanceTest, setIsRunningPerformanceTest] = useState(false);
  const [contractTestResults, setContractTestResults] = useState(null);
  const [contractStats, setContractStats] = useState(null);
  const { contract, account } = useWeb3();

  // Load storage info when component mounts or when opened
  useEffect(() => {
    if (isOpen) {
      const info = debugStorage.getStorageSize();
      setStorageInfo(info);
    }
  }, [isOpen]);

  const handleRunTests = () => {
    const results = testDataPersistence();
    setTestResults(results);
  };

  const handleTestAfterRefresh = () => {
    const results = testPersistenceAfterRefresh();
    setTestResults(prev => ({ ...prev, ...results }));
  };

  const handleCleanup = () => {
    cleanupTestData();
    setTestResults(null);
    // Refresh storage info
    const info = debugStorage.getStorageSize();
    setStorageInfo(info);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all stored data? This action cannot be undone.')) {
      storage.clearAll();
      setStorageInfo({ bytes: 0, kb: '0.00', mb: '0.00' });
      setTestResults(null);
      setPerformanceResults(null);
      alert('All data cleared successfully!');
    }
  };

  const handleRunPerformanceTest = async () => {
    setIsRunningPerformanceTest(true);
    try {
      console.log('🚀 Running comprehensive performance test...');
      const results = await runPerformanceTest();
      setPerformanceResults(results);
      console.log('✅ Performance test completed:', results);
    } catch (error) {
      console.error('❌ Performance test failed:', error);
      alert('Performance test failed. Check console for details.');
    } finally {
      setIsRunningPerformanceTest(false);
    }
  };

  const handleRunCompressionTest = async () => {
    setIsRunningPerformanceTest(true);
    try {
      console.log('🗜️ Running compression test...');
      const results = await testCompressionOnly();
      setPerformanceResults({ compressionTests: results });
      console.log('✅ Compression test completed:', results);
    } catch (error) {
      console.error('❌ Compression test failed:', error);
      alert('Compression test failed. Check console for details.');
    } finally {
      setIsRunningPerformanceTest(false);
    }
  };

  const handleExportData = () => {
    const allData = {};

    // Get all storage keys and their data
    const keys = ['socialweb3_likes', 'socialweb3_comments', 'socialweb3_notifications', 'socialweb3_deleted_posts'];
    keys.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          allData[key] = JSON.parse(data);
        } catch (e) {
          allData[key] = data;
        }
      }
    });

    // Create and download JSON file
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `socialweb3_data_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTestContract = async () => {
    if (!contract) {
      alert('No contract available. Please connect your wallet first.');
      return;
    }

    try {
      console.log('🧪 Running contract tests...');
      const results = await testContract(contract, account);
      setContractTestResults(results);
      console.log('✅ Contract tests completed:', results);
    } catch (error) {
      console.error('❌ Contract tests failed:', error);
      setContractTestResults({ tests: [], overall: 'fail', error: error.message });
    }
  };

  const handleGetContractStats = () => {
    const stats = getDebugStats();
    setContractStats(stats);
    console.log('📊 Contract debug stats:', stats);
  };

  const handleExportContractLogs = () => {
    exportDebugLogs();
  };

  const handleClearContractLogs = () => {
    clearDebugLogs();
    setContractStats(null);
    alert('Contract debug logs cleared!');
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-purple-500 text-white p-3 rounded-full shadow-lg hover:bg-purple-600 transition-colors"
          title="Open Data Persistence Debug Panel"
        >
          🔧
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-80 max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Data Persistence Debug</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      {/* Storage Info */}
      <div className="mb-4">
        <h4 className="font-medium text-gray-700 mb-2">Storage Usage</h4>
        {storageInfo && (
          <div className="bg-gray-50 p-2 rounded text-sm">
            <div>Size: {storageInfo.kb} KB ({storageInfo.bytes} bytes)</div>
            <div className="text-xs text-gray-600 mt-1">
              {storageInfo.mb} MB used
            </div>
          </div>
        )}
      </div>

      {/* Test Controls */}
      <div className="space-y-2 mb-4">
        <button
          onClick={handleRunTests}
          className="w-full bg-blue-500 text-white py-2 px-3 rounded text-sm hover:bg-blue-600 transition-colors"
        >
          🧪 Run Persistence Tests
        </button>

        <button
          onClick={handleTestAfterRefresh}
          className="w-full bg-green-500 text-white py-2 px-3 rounded text-sm hover:bg-green-600 transition-colors"
        >
          🔄 Test After Refresh
        </button>

        <button
          onClick={handleCleanup}
          className="w-full bg-yellow-500 text-white py-2 px-3 rounded text-sm hover:bg-yellow-600 transition-colors"
        >
          🧹 Cleanup Test Data
        </button>
      </div>

      {/* Performance Tests */}
      <div className="space-y-2 mb-4">
        <button
          onClick={handleRunCompressionTest}
          disabled={isRunningPerformanceTest}
          className="w-full bg-purple-500 text-white py-2 px-3 rounded text-sm hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isRunningPerformanceTest ? '⏳ Testing...' : '🗜️ Test Image Compression'}
        </button>

        <button
          onClick={handleRunPerformanceTest}
          disabled={isRunningPerformanceTest}
          className="w-full bg-orange-500 text-white py-2 px-3 rounded text-sm hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isRunningPerformanceTest ? '⏳ Testing...' : '🚀 Full Performance Test'}
        </button>
      </div>

      {/* Data Management */}
      <div className="space-y-2 mb-4">
        <button
          onClick={handleExportData}
          className="w-full bg-indigo-500 text-white py-2 px-3 rounded text-sm hover:bg-indigo-600 transition-colors"
        >
          📤 Export Data
        </button>

        <button
          onClick={handleClearAll}
          className="w-full bg-red-500 text-white py-2 px-3 rounded text-sm hover:bg-red-600 transition-colors"
        >
          🗑️ Clear All Data
        </button>
      </div>

      {/* Contract Debugging */}
      <div className="space-y-2 mb-4 border-t pt-4">
        <h4 className="font-medium text-gray-700 mb-2">Contract Debugging</h4>

        <button
          onClick={handleTestContract}
          className="w-full bg-cyan-500 text-white py-2 px-3 rounded text-sm hover:bg-cyan-600 transition-colors"
        >
          🔍 Test Contract Connection
        </button>

        <button
          onClick={handleGetContractStats}
          className="w-full bg-emerald-500 text-white py-2 px-3 rounded text-sm hover:bg-emerald-600 transition-colors"
        >
          📊 Get Debug Stats
        </button>

        <div className="flex space-x-2">
          <button
            onClick={handleExportContractLogs}
            className="flex-1 bg-teal-500 text-white py-2 px-3 rounded text-sm hover:bg-teal-600 transition-colors"
          >
            📁 Export Logs
          </button>

          <button
            onClick={handleClearContractLogs}
            className="flex-1 bg-gray-500 text-white py-2 px-3 rounded text-sm hover:bg-gray-600 transition-colors"
          >
            🧹 Clear Logs
          </button>
        </div>
      </div>

      {/* Test Results */}
      {testResults && (
        <div className="mt-4">
          <h4 className="font-medium text-gray-700 mb-2">Persistence Test Results</h4>
          <div className="bg-gray-50 p-2 rounded text-xs max-h-32 overflow-y-auto">
            <pre>{JSON.stringify(testResults, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* Performance Test Results */}
      {performanceResults && (
        <div className="mt-4">
          <h4 className="font-medium text-gray-700 mb-2">Performance Test Results</h4>

          {performanceResults.summary && (
            <div className="bg-blue-50 p-3 rounded mb-3 text-sm">
              <div className="font-medium text-blue-900 mb-2">📊 Summary</div>
              <div className="space-y-1 text-blue-800">
                <div>Avg Compression: {performanceResults.summary.avgCompressionRatio}%</div>
                <div>Avg Compression Time: {performanceResults.summary.avgCompressionTime}ms</div>
                <div>Avg Storage Write: {performanceResults.summary.avgStorageWriteTime}ms</div>
                <div>Avg Storage Read: {performanceResults.summary.avgStorageReadTime}ms</div>
              </div>
              {performanceResults.summary.recommendations.length > 0 && (
                <div className="mt-2">
                  <div className="font-medium text-blue-900 mb-1">💡 Recommendations:</div>
                  <ul className="text-xs text-blue-700 space-y-1">
                    {performanceResults.summary.recommendations.map((rec, idx) => (
                      <li key={idx}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="bg-gray-50 p-2 rounded text-xs max-h-40 overflow-y-auto">
            <pre>{JSON.stringify(performanceResults, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* Contract Test Results */}
      {contractTestResults && (
        <div className="mt-4">
          <h4 className="font-medium text-gray-700 mb-2">Contract Test Results</h4>
          <div className={`p-3 rounded mb-2 text-sm ${
            contractTestResults.overall === 'pass' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className={`font-medium mb-2 ${
              contractTestResults.overall === 'pass' ? 'text-green-900' : 'text-red-900'
            }`}>
              {contractTestResults.overall === 'pass' ? '✅ All Tests Passed' : '❌ Tests Failed'}
            </div>
            {contractTestResults.tests.map((test, idx) => (
              <div key={idx} className={`text-xs mb-1 ${
                test.status === 'pass' ? 'text-green-700' : 'text-red-700'
              }`}>
                {test.status === 'pass' ? '✓' : '✗'} {test.name}: {test.details}
              </div>
            ))}
            {contractTestResults.error && (
              <div className="text-xs text-red-600 mt-2">Error: {contractTestResults.error}</div>
            )}
          </div>
        </div>
      )}

      {/* Contract Debug Stats */}
      {contractStats && (
        <div className="mt-4">
          <h4 className="font-medium text-gray-700 mb-2">Contract Debug Stats</h4>
          <div className="bg-gray-50 p-3 rounded text-sm">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>Total Calls: {contractStats.total}</div>
              <div>Success Rate: {contractStats.successRate}%</div>
              <div className="text-green-700">Successful: {contractStats.successful}</div>
              <div className="text-red-700">Failed: {contractStats.failed}</div>
            </div>

            {Object.keys(contractStats.functionCounts).length > 0 && (
              <div className="mt-2">
                <div className="font-medium text-gray-700 mb-1">Function Calls:</div>
                {Object.entries(contractStats.functionCounts).map(([func, count]) => (
                  <div key={func} className="text-xs text-gray-600">
                    {func}: {count}
                  </div>
                ))}
              </div>
            )}

            {Object.keys(contractStats.errorTypes).length > 0 && (
              <div className="mt-2">
                <div className="font-medium text-gray-700 mb-1">Error Types:</div>
                {Object.entries(contractStats.errorTypes).map(([error, count]) => (
                  <div key={error} className="text-xs text-red-600">
                    {error}: {count}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        💡 Open browser DevTools console for detailed logs
      </div>
    </div>
  );
};

export default DataPersistenceDebug;