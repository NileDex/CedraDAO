import React, { useEffect, useRef } from 'react';
import { X, Copy, ExternalLink } from 'lucide-react';
import { useWallet } from '../../contexts/CedraWalletProvider';
import { useAlert } from '../alert/AlertContext';
import QRCodeStyling from 'qr-code-styling';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose }) => {
  const { account } = useWallet();
  const { showAlert } = useAlert();
  const qrRef = useRef<HTMLDivElement>(null);

  const walletAddress = account?.address || '';

  useEffect(() => {
    if (qrRef.current && walletAddress && isOpen) {
      // Create QR Code instance
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
        }
      });

      // Clear previous content
      qrRef.current.innerHTML = '';
      
      // Set QR code data and append
      qrCode.update({
        data: walletAddress
      });
      qrCode.append(qrRef.current);

      // Cleanup function
      return () => {
        if (qrRef.current) {
          qrRef.current.innerHTML = '';
        }
      };
    }
  }, [walletAddress, isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      showAlert('Address copied to clipboard!', 'success');
    } catch (err) {
      showAlert('Failed to copy address', 'error');
    }
  };

  return (
    <div 
      className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="rounded-xl border border-white/10 max-w-md w-full p-6" 
        style={{ backgroundColor: '#131315' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Transfer from Exchange</h2>
        </div>

        {/* QR Code Section */}
        <div className="text-center mb-6">
          <div className="p-4 rounded-lg inline-block mb-4">
            {walletAddress ? (
              <div ref={qrRef} className="flex items-center justify-center"></div>
            ) : (
              <div className="w-48 h-48 bg-gray-200 flex items-center justify-center text-gray-500">
                No wallet connected
              </div>
            )}
          </div>
          <p className="text-gray-400 text-sm">
            Scan QR code or copy address below
          </p>
        </div>

        {/* Wallet Information */}
        <div className="space-y-4">
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
  );
};

export default TransferModal;
