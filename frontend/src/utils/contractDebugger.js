// src/utils/contractDebugger.js
// Utility for debugging smart contract interactions
/* global BigInt */

export class ContractDebugger {
  constructor() {
    this.logs = [];
    this.isEnabled = process.env.NODE_ENV === 'development';
  }

  // Log contract interaction
  logInteraction(functionName, params, result, error = null) {
    if (!this.isEnabled) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      functionName,
      params,
      result,
      error: error ? {
        message: error.message,
        code: error.code,
        data: error.data
      } : null,
      success: !error
    };

    this.logs.push(logEntry);

    // Keep only last 100 logs
    if (this.logs.length > 100) {
      this.logs.shift();
    }

    console.group(`📞 Contract Call: ${functionName}`);
    console.log('⏰ Timestamp:', logEntry.timestamp);
    console.log('📝 Parameters:', params);
    if (error) {
      console.error('❌ Error:', error);
    } else {
      console.log('✅ Result:', result);
    }
    console.groupEnd();
  }

  // Enhanced error analysis
  analyzeError(error) {
    const analysis = {
      type: 'unknown',
      severity: 'medium',
      userMessage: 'Transaction failed',
      technicalDetails: error.message,
      suggestions: []
    };

    // Analyze error codes
    if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
      analysis.type = 'user_rejection';
      analysis.severity = 'low';
      analysis.userMessage = 'Transaction was rejected by user';
      analysis.suggestions.push('User chose to cancel the transaction');
    } else if (error.code === 'INSUFFICIENT_FUNDS' || error.message.includes('insufficient funds')) {
      analysis.type = 'insufficient_funds';
      analysis.severity = 'high';
      analysis.userMessage = 'Insufficient funds in wallet';
      analysis.suggestions.push('Add more BNB to your wallet', 'Check if you have enough for gas fees');
    } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      analysis.type = 'gas_estimation_failed';
      analysis.severity = 'high';
      analysis.userMessage = 'Transaction would likely fail';
      analysis.suggestions.push('Check contract requirements', 'Verify function parameters');
    } else if (error.message.includes('execution reverted')) {
      analysis.type = 'execution_reverted';
      analysis.severity = 'high';
      analysis.userMessage = 'Transaction was reverted by contract';
      analysis.suggestions.push('Check contract state', 'Verify you meet all requirements');
    } else if (error.message.includes('missing revert data') || error.code === 'BAD_DATA') {
      analysis.type = 'communication_error';
      analysis.severity = 'medium';
      analysis.userMessage = 'Communication error with contract';
      analysis.suggestions.push('Refresh the page', 'Switch MetaMask network', 'Check internet connection');
    } else if (error.code === 'NETWORK_ERROR') {
      analysis.type = 'network_error';
      analysis.severity = 'medium';
      analysis.userMessage = 'Network connection error';
      analysis.suggestions.push('Check internet connection', 'Try again in a moment');
    } else if (error.code === 'TIMEOUT') {
      analysis.type = 'timeout';
      analysis.severity = 'medium';
      analysis.userMessage = 'Transaction timed out';
      analysis.suggestions.push('Check if transaction was confirmed', 'Try again with higher gas price');
    }

    return analysis;
  }

  // Test contract connection
  async testContractConnection(contract, account) {
    const tests = [];

    try {
      // Test 1: Check if contract is connected
      tests.push({
        name: 'Contract Connection',
        status: contract ? 'pass' : 'fail',
        details: contract ? 'Contract instance available' : 'No contract instance'
      });

      if (!contract) {
        return { tests, overall: 'fail' };
      }

      // Test 2: Check contract address
      const address = contract.target || contract.address;
      tests.push({
        name: 'Contract Address',
        status: address ? 'pass' : 'fail',
        details: address || 'No contract address'
      });

      // Test 3: Test read function
      try {
        const contentCounter = await contract.contentCounter();
        tests.push({
          name: 'Read Function',
          status: 'pass',
          details: `Content counter: ${contentCounter.toString()}`
        });
      } catch (readError) {
        tests.push({
          name: 'Read Function',
          status: 'fail',
          details: `Read failed: ${readError.message}`
        });
      }

      // Test 4: Check user data if account available
      if (account) {
        try {
          const userData = await contract.getUser(account);
          tests.push({
            name: 'User Data',
            status: 'pass',
            details: `User exists: ${userData.exists}, Creator: ${userData.isCreator}`
          });
        } catch (userError) {
          tests.push({
            name: 'User Data',
            status: 'fail',
            details: `User data failed: ${userError.message}`
          });
        }
      }

      // Test 5: Gas estimation test
      if (account) {
        try {
          await contract.getUser.estimateGas(account);
          tests.push({
            name: 'Gas Estimation',
            status: 'pass',
            details: 'Gas estimation working'
          });
        } catch (gasError) {
          tests.push({
            name: 'Gas Estimation',
            status: 'fail',
            details: `Gas estimation failed: ${gasError.message}`
          });
        }
      }

    } catch (overallError) {
      tests.push({
        name: 'Overall Test',
        status: 'fail',
        details: `Test suite failed: ${overallError.message}`
      });
    }

    const overall = tests.every(test => test.status === 'pass') ? 'pass' : 'fail';

    return { tests, overall };
  }

  // Validate transaction parameters
  validateTransactionParams(functionName, params, options = {}) {
    const validation = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Common validations
    if (functionName === 'buyContent') {
      const [contentId] = params;
      const { value } = options;

      if (!contentId || contentId < 1) {
        validation.valid = false;
        validation.errors.push('Invalid content ID');
      }

      if (!value || value <= 0) {
        validation.valid = false;
        validation.errors.push('Invalid payment amount');
      }

      if (value && value < BigInt('1000000000000000')) { // Less than 0.001 ETH
        validation.warnings.push('Payment amount is very small');
      }
    }

    return validation;
  }

  // Get logs for debugging
  getLogs(functionName = null) {
    if (functionName) {
      return this.logs.filter(log => log.functionName === functionName);
    }
    return this.logs;
  }

  // Export logs
  exportLogs() {
    const blob = new Blob([JSON.stringify(this.logs, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contract-debug-logs-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
  }

  // Get statistics
  getStats() {
    const total = this.logs.length;
    const successful = this.logs.filter(log => log.success).length;
    const failed = total - successful;

    const functionCounts = this.logs.reduce((acc, log) => {
      acc[log.functionName] = (acc[log.functionName] || 0) + 1;
      return acc;
    }, {});

    const errorTypes = this.logs
      .filter(log => !log.success)
      .reduce((acc, log) => {
        const errorType = log.error?.code || 'unknown';
        acc[errorType] = (acc[errorType] || 0) + 1;
        return acc;
      }, {});

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? ((successful / total) * 100).toFixed(1) : 0,
      functionCounts,
      errorTypes
    };
  }
}

// Create singleton instance
const contractDebugger = new ContractDebugger();

// Export convenience functions
export const logContractCall = (functionName, params, result, error) =>
  contractDebugger.logInteraction(functionName, params, result, error);

export const analyzeContractError = (error) =>
  contractDebugger.analyzeError(error);

export const testContract = (contract, account) =>
  contractDebugger.testContractConnection(contract, account);

export const validateParams = (functionName, params, options) =>
  contractDebugger.validateTransactionParams(functionName, params, options);

export const getDebugStats = () => contractDebugger.getStats();
export const exportDebugLogs = () => contractDebugger.exportLogs();
export const clearDebugLogs = () => contractDebugger.clearLogs();

export default contractDebugger;