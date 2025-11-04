import React from 'react';
import OnboardLayout from './OnboardLayout';
import SwapWidget from '@mosaicag/swap-widget';
import { useWallet } from '../../contexts/CedraWalletProvider';
import { createWalletAdapter } from '../../utils/walletAdapter';
import { useAlert } from '../alert/AlertContext';
import { API_KEYS } from '../../constants/apiKeys';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Mosaic: React.FC = () => {
  const walletContext = useWallet();
  const adaptedWallet = createWalletAdapter(walletContext);
  const { showAlert } = useAlert();
  const navigate = useNavigate();

  // Create a fallback wallet object for when no wallet is connected
  const fallbackWallet = {
    account: undefined,
    connected: false,
    connecting: false,
    name: 'No Wallet'
  };

  const walletToUse = adaptedWallet || fallbackWallet;

  console.log('Mosaic component rendering, wallet:', walletToUse);
  console.log('API Key:', API_KEYS.MOSAIC_API_KEY ? 'Present' : 'Missing');

  return (
    <OnboardLayout>
      <style>{`
        /* Override Mosaic button disabled opacity */
        [data-disabled="true"].bg-primary,
        button[disabled].bg-primary {
          opacity: 1 !important;
          background-color: #e1fe67 !important;
          border-color: #e1fe67 !important;
        }
      `}</style>
      <div className="min-h-screen p-6" style={{ backgroundColor: '#0f0f11' }}>
        {/* Hero Section */}
        <div className="max-w-6xl mx-auto py-12 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/onboard')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Back to Onboard</span>
            </button>
          </div>
          <h1 className="text-xl font-semibold text-white">
            Swap with Mosaic
          </h1>
          <p className="text-gray-400 mt-2">Wallet Status: {walletToUse.connected ? 'Connected' : 'Not Connected'}</p>
        </div>

        {/* Subtitle Section */}
        <div className="max-w-6xl mx-auto mb-6">
          <p className="text-gray-400 text-center text-base">
            Trade tokens seamlessly across multiple chains<br />
            with Mosaic's cross-chain protocol
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto flex justify-center">
          <div className="w-full max-w-md" style={{ position: 'relative', zIndex: 1 }}>
            <SwapWidget
              wallet={walletToUse as any}
              apiKey={API_KEYS.MOSAIC_API_KEY}
              chainId="126"
              defaultInputAmount="1"
              defaultSlippage={50}
              notification={false}
              showPriceImpactWarningsMsg={false}
              defaultTokenInAddress="0xa484a866e1bfcb76e8057939d6944539070b53c511813d7b21c76cae9e6a6e26"
              defaultTokenOutAddress="0xe161897670a0ee5a0e3c79c3b894a0c46e4ba54c6d2ca32e285ab4b01eb74b66"
              onChangeTokenIn={(token) => {
                console.log("swap onChangeTokenIn", token);
                showAlert(`Selected input token: ${token.symbol}`, 'info');
              }}
              onChangeTokenOut={(token) => {
                console.log("swap onChangeTokenOut", token);
                showAlert(`Selected output token: ${token.symbol}`, 'info');
              }}
              onTxFail={(data) => {
                console.log("swap failed", data);
                showAlert(`Transaction failed: ${data.error.message}`, 'error');
              }}
              onTxSubmit={(data) => {
                console.log("swap onTxSubmit", data);
                showAlert('Transaction submitted successfully!', 'success');
              }}
              onTxSuccess={(data) => {
                console.log("swap onTxSuccess", data);
                showAlert('Transaction completed successfully!', 'success');
              }}
              slippageOptions={[
                50,
                100,
                200,
                300
              ]}
              title={{
                input: 'Pay',
                output: 'Receive',
                title: 'Swap on Mosaic'
              }}
              theme={{
                background: '#131315',
                baseContent: '#ffffff',
                border: 'rgba(255, 255, 255, 0.1)',
                error: '#ef4444',
                neutralContent: '#e1fe67',
                primary: '#e1fe67',
                secondary: '#8b5cf6',
                secondaryBackground: '#1a1a1e'
              }}
              style={{
                ctaButton: {
                  backgroundColor: '#e1fe67',
                  borderColor: '#e1fe67',
                  color: '#000000'
                }
              }}
            />
          </div>
        </div>
      </div>
    </OnboardLayout>
  );
};

export default Mosaic;
