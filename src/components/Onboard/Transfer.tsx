import React, { useEffect, useRef } from 'react';
import OnboardLayout from './OnboardLayout';
import { ArrowLeft, Copy, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../../contexts/CedraWalletProvider';
import { useAlert } from '../alert/AlertContext';
import QRCodeStyling from 'qr-code-styling';
import logoImage from '../../assets/Logonew.png';

const Transfer: React.FC = () => {
  const navigate = useNavigate();
  const { account } = useWallet();
  const { showAlert } = useAlert();
  const qrRef = useRef<HTMLDivElement>(null);

  const walletAddress = account?.address || '';

  useEffect(() => {
    if (qrRef.current && walletAddress) {
      const qrCode = new QRCodeStyling({
        width: 250,
        height: 250,
        dotsOptions: {
          color: '#ffffff',
          type: 'rounded'
        },
        backgroundOptions: {
          color: 'transparent'
        },
        cornersSquareOptions: {
          color: '#ffffff',
          type: 'extra-rounded'
        },
        cornersDotOptions: {
          color: '#ffffff',
          type: 'dot'
        },
        image: logoImage,
        imageOptions: {
          crossOrigin: 'anonymous',
          margin: 8,
          imageSize: 0.25
        }
      });

      qrRef.current.innerHTML = '';

      qrCode.update({
        data: walletAddress
      });
      qrCode.append(qrRef.current);

      return () => {
        if (qrRef.current) {
          qrRef.current.innerHTML = '';
        }
      };
    }
  }, [walletAddress]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      showAlert('Address copied to clipboard!', 'success');
    } catch (err) {
      showAlert('Failed to copy address', 'error');
    }
  };

  return (
    <OnboardLayout>
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
            Transfer from Exchanges
          </h1>
          <p className="text-gray-400 mt-2">Scan QR code or copy your wallet address</p>
        </div>

        {/* Subtitle Section */}
        <div className="max-w-6xl mx-auto mb-6">
          <p className="text-gray-400 text-center text-base">
            Transfer crypto from your favorite exchange<br />
            directly to your Movement wallet
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-md mx-auto">
          <div className="rounded-xl p-6 border border-white/10" style={{ backgroundColor: '#131315' }}>
            {/* QR Code Section */}
            <div className="text-center mb-6">
              <div className="p-4 rounded-lg inline-block mb-4">
                {walletAddress ? (
                  <div ref={qrRef} className="flex items-center justify-center"></div>
                ) : (
                  <div className="w-[250px] h-[250px] bg-gray-800 flex items-center justify-center text-gray-400 rounded-lg">
                    No wallet connected
                  </div>
                )}
              </div>
              <p className="text-gray-400 text-sm">
                Scan QR code or copy address below
              </p>
            </div>

            {/* Wallet Information */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Connected Wallet
              </label>
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-mono text-sm truncate">
                      {walletAddress || 'No wallet connected'}
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      Movement Network
                    </p>
                  </div>
                  <div className="flex gap-2 ml-3">
                    <button
                      onClick={copyToClipboard}
                      disabled={!walletAddress}
                      className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Copy address"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => window.open(`https://cedrascan.com/account/${walletAddress}`, '_blank')}
                      disabled={!walletAddress}
                      className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="View on explorer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </OnboardLayout>
  );
};

export default Transfer;
