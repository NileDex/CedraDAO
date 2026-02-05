import React, { useState, useEffect } from 'react';
import { Home, FileText, Wallet, Users, Coins, Shield, ChevronRight } from 'lucide-react';
import { FaXTwitter, FaGlobe } from 'react-icons/fa6';
import { DAO } from '../types/dao';
import DAOHome from './dao/DAOHome';
import DAOProposals from './dao/DAOProposals';
import DAOTreasury from './dao/DAOTreasury';
import DAOMembers from './dao/DAOMembers';
import DAOStaking from './dao/DAOStaking';
import DAOAdmin from './dao/DAOAdmin';
import { updateMetaTags, generateDAOMetaTags, resetToDefaultMetaTags } from '../utils/metaTags';
import { MODULE_ADDRESS } from '../cedra_service/constants';
import { cedraClient } from '../cedra_service/cedra-client';

interface DAODetailProps {
  dao: DAO;
  onBack: () => void;
  sidebarCollapsed?: boolean;
  onSidebarOpen?: () => void;
  onActiveTabChange?: (_: string, __: string) => void;
  activeTab?: string;
}

const DAODetail: React.FC<DAODetailProps> = ({ dao, onBack, onActiveTabChange, activeTab: externalActiveTab }) => {
  const [activeTab, setActiveTab] = useState('home');

  // Sync with external active tab (from sidebar on mobile)
  useEffect(() => {
    if (externalActiveTab) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);

  const [avatarError, setAvatarError] = useState(false);

  // Membership for quick stake summary in test panel
  // Social links and category
  const [socialLinks, setSocialLinks] = useState<{ x?: string; discord?: string; telegram?: string; website?: string }>({});

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const res = await cedraClient.view({
          payload: { function: `${MODULE_ADDRESS}::dao_core_file::get_dao_all_links`, functionArguments: [dao.id] }
        });
        if (Array.isArray(res) && res.length >= 4) {
          const [x, discord, telegram, website] = res as string[];
          setSocialLinks({
            x: (x || '').trim() || undefined,
            discord: (discord || '').trim() || undefined,
            telegram: (telegram || '').trim() || undefined,
            website: (website || '').trim() || undefined,
          });
        }
      } catch (e) {
        console.error('Error fetching social links:', e);
      }
    };
    fetchLinks();
  }, [dao.id]);

  useEffect(() => {
    if (dao.image) {
      setAvatarError(false);
      const img = new Image();
      img.onerror = () => setAvatarError(true);
      img.src = dao.image;
    } else {
      setAvatarError(true);
    }
  }, [dao.image]);




  // Update meta tags when DAO changes
  useEffect(() => {
    const metaConfig = generateDAOMetaTags(dao);
    updateMetaTags(metaConfig);

    // Cleanup: reset to default meta tags when component unmounts
    return () => {
      resetToDefaultMetaTags();
    };
  }, [dao]);

  // Fetch MOVE price for treasury display
  // useEffect(() => {
  //   const fetchMovePrice = async () => {
  //     try {
  //       const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=movement&vs_currencies=usd');
  //       const data = await response.json();
  //       if (data.movement && data.movement.usd) {
  //         setMovePrice(data.movement.usd);
  //       }
  //     } catch (error) {
  //       console.warn('Failed to fetch MOVE price from CoinGecko:', error);
  //       // Remove $1 fallback; keep price unset so UI shows $0.00
  //       setMovePrice(null);
  //     }
  //   };

  //   fetchMovePrice();
  //   // Refresh price every 5 minutes
  //   const interval = setInterval(fetchMovePrice, 5 * 60 * 1000);
  //   return () => clearInterval(interval);
  // }, []);




  const tabs = [
    { id: 'home', label: 'Overview', icon: Home, color: 'text-blue-400' },
    { id: 'proposals', label: 'Proposals', icon: FileText, color: 'text-green-400' },
    { id: 'staking', label: 'Staking', icon: Coins, color: 'text-orange-400' },
    { id: 'treasury', label: 'Treasury', icon: Wallet, color: 'text-yellow-400' },
    { id: 'members', label: 'Members', icon: Users, color: 'text-pink-400' },
    { id: 'admin', label: 'Admin', icon: Shield, color: 'text-purple-400' },
  ];

  // Handle tab change and notify parent
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onActiveTabChange?.(dao.id, tabId);
    try {
      localStorage.setItem('app_selected_dao', JSON.stringify(dao));
      localStorage.setItem('app_dao_active_tab', tabId);
      localStorage.setItem('app_current_view', 'dao-detail');
    } catch (e) {
      console.error('Error updating local storage:', e);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <DAOHome dao={dao} />;
      case 'proposals':
        return <DAOProposals dao={dao} />;
      case 'staking':
        return <DAOStaking dao={dao} />;
      case 'treasury':
        return <DAOTreasury dao={dao} />;
      case 'members':
        return <DAOMembers dao={dao} />;
      case 'admin':
        return <DAOAdmin dao={dao} />;

      default:
        return null;
    }
  };

  return (
    <div className="w-full pb-20">
      {/* Banner Background Area - Edge to Edge */}
      <div className="relative w-full h-52 sm:h-80 overflow-hidden mb-[-120px] sm:mb-[-165px]">
        {dao.background ? (
          <img
            src={dao.background}
            alt="Banner"
            className="w-full h-full object-cover shadow-2xl"
          />
        ) : (
          <div className="w-full h-full bg-[#1c1d21]" />
        )}
        {/* Intense overlay for legibility as section moves higher */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#151618] via-transparent to-black/20" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10 space-y-8">
        {/* Breadcrumb Navigation */}
        <div className="pt-4 flex items-center gap-2 text-[10px] font-bold">
          <button
            onClick={onBack}
            className="text-white/40 hover:text-[#e1fd6a] transition-colors flex items-center gap-2 group"
          >
            <Home size={12} className="group-hover:scale-110 transition-transform" />
            <span>DAOs</span>
          </button>
          <ChevronRight size={10} className="text-white/20" />
          <span className="text-[#e1fd6a] truncate max-w-[150px] sm:max-w-none">
            {dao.name}
          </span>
        </div>

        {/* DAO Header - Overlapping Circular Layout */}
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 px-1 text-center md:text-left">
          {/* Circular Avatar with Ring */}
          <div className="relative shrink-0 w-32 h-32 sm:w-40 sm:h-40 rounded-full border-[6px] border-[#151618] bg-[#151618] shadow-2xl overflow-hidden ring-1 ring-white/10 group">
            {dao.image && !avatarError ? (
              <img
                src={dao.image}
                alt={dao.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl font-semibold bg-gradient-to-br from-white/10 to-white/5 text-white">
                {dao.name.charAt(0)}
              </div>
            )}
          </div>

          <div className="flex-1 pb-2 space-y-3 w-full">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-col md:flex-row items-center gap-3">
                <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">{dao.name}</h1>
                <div className="flex gap-1">
                  {socialLinks.website && (
                    <a href={socialLinks.website} target="_blank" rel="noreferrer" className="p-2 text-white/60 hover:text-white transition-colors">
                      <FaGlobe size={18} />
                    </a>
                  )}
                  {socialLinks.x && (
                    <a href={socialLinks.x} target="_blank" rel="noreferrer" className="p-2 text-white/60 hover:text-white transition-colors">
                      <FaXTwitter size={18} />
                    </a>
                  )}
                </div>
              </div>
            </div>
            <p className="text-white/60 font-medium text-xs sm:text-base max-w-2xl leading-relaxed mx-auto md:mx-0">
              {dao.description}
            </p>
          </div>
        </div>

        {/* Navigation Tabs - Minimalist Style */}
        <div className="border-b border-white/5 pt-2">
          <div className="flex gap-1 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 sm:px-6 py-4 transition-all relative text-xs sm:text-sm font-bold tracking-tight whitespace-nowrap ${isActive ? 'text-white' : 'text-white/70 hover:text-white'
                    }`}
                >
                  <Icon size={14} className={isActive ? 'text-[#e1fd6a]' : 'text-white/40'} />
                  <span>{tab.label}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e1fd6a] shadow-[0_0_12px_rgba(225,253,106,0.6)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Tab Content - Full Width */}
        <div className="animate-fade-in transition-all">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default DAODetail;
