import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const SolanaConnectButton = () => {
  const { publicKey, connected } = useWallet();

  return (
    <div className="solana-wallet-button">
      <WalletMultiButton />
      {connected && publicKey && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
          {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
        </div>
      )}
    </div>
  );
};

export default SolanaConnectButton;