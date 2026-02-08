import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

const NETWORK = 'devnet'; // Cambieremo in 'mainnet-beta' dopo i test
const connection = new Connection(`https://api.${NETWORK}.solana.com`, 'confirmed');

export const solanaService = {
  // Invia SOL da un wallet all'altro
  sendSOL: async (wallet, connectionParam, toAddress, amountSOL) => {
    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: new PublicKey(toAddress),
          lamports: amountSOL * LAMPORTS_PER_SOL,
        })
      );

      const signature = await wallet.sendTransaction(transaction, connectionParam);
      await connectionParam.confirmTransaction(signature, 'confirmed');

      return { success: true, signature };
    } catch (error) {
      console.error('Send SOL error:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Ottieni balance in SOL
  getBalance: async (publicKeyString) => {
    try {
      const balance = await connection.getBalance(new PublicKey(publicKeyString));
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Get balance error:', error);
      return 0;
    }
  },
  
  // Verifica transazione
  verifyTransaction: async (signature) => {
    try {
      const result = await connection.getSignatureStatus(signature);
      return result?.value?.confirmationStatus === 'confirmed';
    } catch (error) {
      console.error('Verify transaction error:', error);
      return false;
    }
  }
};