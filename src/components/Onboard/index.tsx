import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import OnboardLayout from './OnboardLayout';
import { ArrowRight, Wallet, Link as LinkIcon, Coins, ChevronRight, ArrowLeft } from 'lucide-react';
import mosaicLogo from './onboard-images/mosaiclogo.svg';

const Onboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <OnboardLayout>
      <div className="min-h-screen p-6" style={{ background: 'linear-gradient(to bottom, #0a0a0b 0%, #1a1a2e 100%)' }}>
        {/* Hero Section */}
        <div className="max-w-6xl mx-auto py-12 mb-24">
          {/* Back button */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Back to Home</span>
            </button>
          </div>

          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Onboard to Movement
            </h1>
            <p className="text-gray-400 text-lg">
              The easiest way to get started on Movement Network
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-4 mb-12">
          {/* Left Card - Funding an existing wallet */}
          <div className="rounded-xl p-6 border border-white/10" style={{ backgroundColor: '#131315' }}>
            <h2 className="text-xl font-bold text-white mb-4">
              Funding an existing wallet? Start here
            </h2>

            {/* Option 1 */}
            <Link to="/mosaic" className="block mb-4 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all cursor-pointer border border-white/5 hover:border-white/20 group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-white group-hover:text-emerald-400 transition-colors mb-2">
                    Swap with Mosaic
                  </h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Swap tokens seamlessly across multiple chains with Mosaic's cross-chain protocol
                  </p>
                </div>
                <img src={mosaicLogo} alt="Mosaic" className="ml-4" style={{ width: '80px', height: '80px' }} />
              </div>
            </Link>

            <div className="text-center text-gray-500 text-xs my-3">OR</div>

            {/* Option 2 */}
            <Link
              to="/transfer"
              className="block p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all cursor-pointer border border-white/5 hover:border-white/20 group"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-base font-semibold text-white group-hover:text-purple-400 transition-colors">
                  Transfer from Exchanges
                </h3>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Transfer from exchanges like Coinbase or Binance to your Movement wallet
              </p>
            </Link>
          </div>

          {/* Right Card - Already own crypto */}
          <div className="rounded-xl p-6 border border-white/10 relative" style={{ backgroundColor: '#131315' }}>
            {/* Coming Soon Overlay */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">Coming Soon</div>
                <div className="text-gray-400 text-sm">Bridge features will be available shortly</div>
              </div>
            </div>

            <h2 className="text-xl font-bold text-white mb-4">
              Already own crypto elsewhere?
            </h2>

            {/* Option 1 */}
            <div className="mb-4 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all cursor-pointer border border-white/5 hover:border-white/20 group">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors">
                  Bridge from other chains
                </h3>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Convert and move crypto assets—ETH, BNB, & others to Movement tokens
              </p>
            </div>

            <div className="text-center text-gray-500 text-xs my-3">OR</div>

            {/* Option 2 */}
            <div className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all cursor-pointer border border-white/5 hover:border-white/20 group">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-base font-semibold text-white group-hover:text-orange-400 transition-colors">
                  Bridge USDC from other chains
                </h3>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                Bridge USDC from 8 supported chains to Movement securely
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Section - New to Movement */}
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-white mb-2">New to Movement?</h2>
            <p className="text-gray-400">Set up your wallet in minutes</p>
          </div>

          <div className="professional-card rounded-2xl p-8 border border-white/10 hover:border-white/20 transition-all cursor-pointer group">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors mb-1">
                  Create your first wallet
                </h3>
                <p className="text-gray-400">Your Gateway to Movement Ecosystem</p>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
            </div>
          </div>
        </div>

      </div>
    </OnboardLayout>
  );
};

export default Onboard;
