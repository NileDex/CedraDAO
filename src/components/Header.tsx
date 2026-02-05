import React from 'react';
import { LayoutGrid, BarChart2, Settings, Search, HelpCircle, Plus, Zap, Menu, X } from 'lucide-react';
import WalletConnectButton from './WalletConnect';
import Filter from './Filter';
import { useFilter } from '../contexts/FilterContext';
import mainLogo from '../assets/Logonew.png';

interface HeaderProps {
  currentView: string;
  onViewChange: (_: string) => void;
  onProfileClick?: () => void;
  disableTheme?: boolean;
  currentDAO?: string;
  activeTab?: string;
  onActiveTabChange?: (_: string, __: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  onProfileClick,
  currentDAO
}) => {
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  useFilter();

  // Keyboard shortcut listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsFilterOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const menuItems = [
    { id: 'home', label: 'Explore DAOs', icon: LayoutGrid },
    { id: 'trending', label: 'Network Pulse', icon: BarChart2 },
    { id: 'boost', label: 'Boost', icon: Zap },
    { id: 'profile', label: 'My Profile', icon: Settings },
  ];



  return (
    <header className="bg-[#0a0a0b]/95 backdrop-blur-2xl border-b border-white/5 sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between px-4 sm:px-8 h-16 sm:h-20 lg:h-16">
        <div className="flex items-center gap-4 sm:gap-12">
          {/* Logo Section */}
          <div
            className="flex items-center gap-3 cursor-pointer group shrink-0"
            onClick={() => onViewChange('home')}
          >
            <div className="p-1.5 sm:p-2 bg-white rounded-lg sm:rounded-xl transition-all group-hover:scale-110 shadow-lg shadow-white/5">
              <img src={mainLogo} alt="Anchor" className="w-5 h-5 sm:w-6 sm:h-6 object-contain brightness-0" />
            </div>
            <span className="text-lg sm:text-xl font-semibold tracking-tighter text-white">Anchor</span>
          </div>

          {/* Desktop Nav - Keep original */}
          <nav className="hidden lg:flex items-center gap-8">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`flex items-center gap-2 text-xs font-semibold transition-all relative py-6 ${isActive ? 'text-[#e1fd6a]' : 'text-white/40 hover:text-white'
                    }`}
                >
                  <Icon size={12} className={isActive ? 'text-[#e1fd6a]' : 'text-white/20'} />
                  {item.label}
                  {isActive && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#e1fd6a]" />}
                </button>
              );
            })}
          </nav>

        </div>

        {/* Mobile Dropdown Menu */}
        {isMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-[#0d0d0e]/95 backdrop-blur-2xl border-b border-white/10 shadow-2xl animate-in slide-in-from-top duration-300 z-40 overflow-hidden">
            <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Search Bar in Dropdown */}
              <div
                onClick={() => {
                  setIsFilterOpen(true);
                  setIsMenuOpen(false);
                }}
                className="flex items-center bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3 group cursor-pointer hover:border-white/20 transition-all shadow-inner"
              >
                <Search size={16} className="text-[#e1fd6a] group-hover:text-white transition-colors" />
                <span className="text-sm font-medium text-white/40 ml-3 flex-1">Search Organizations...</span>
              </div>

              {/* Navigation Items */}
              <div className="grid grid-cols-1 gap-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onViewChange(item.id);
                        setIsMenuOpen(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-[#e1fd6a]/10 text-[#e1fd6a]' : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                    >
                      <Icon size={18} className={isActive ? 'text-[#e1fd6a]' : 'text-white/30'} />
                      <span className="text-sm font-bold">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Bottom Action */}
              <button
                onClick={() => {
                  onViewChange('create');
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-4 bg-[#e1fd6a] text-black rounded-2xl text-xs font-black hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#e1fd6a]/10"
              >
                <Plus size={16} />
                Initialize DAO
              </button>
            </div>
          </div>
        )}


        <div className="flex items-center gap-2 sm:gap-4">
          {/* Desktop Search - Keep original */}
          <div
            onClick={() => setIsFilterOpen(true)}
            className="hidden md:flex items-center bg-white/[0.03] border border-white/5 rounded-full px-4 py-2 w-48 xl:w-60 group cursor-pointer hover:border-white/20 transition-all shadow-inner"
          >
            <Search size={14} className="text-white/40 group-hover:text-white transition-colors" />
            <span className="text-[11px] font-medium text-white/40 ml-3 flex-1">Search...</span>
            <div className="hidden xl:flex items-center gap-1 px-1.5 py-0.5 bg-white/5 rounded border border-white/5">
              <span className="text-[9px] font-medium text-white/30">CMD</span>
              <span className="text-[9px] font-medium text-white/30">K</span>
            </div>
          </div>

          {/* Desktop Initialize - Keep original */}
          <button
            onClick={() => onViewChange('create')}
            className="hidden sm:flex items-center gap-2 px-5 py-2 bg-white text-black hover:bg-white/90 rounded-full text-xs font-semibold transition-all shadow-xl active:scale-95"
          >
            <Plus size={12} />
            Initialize
          </button>

          <div className="flex items-center gap-1 sm:gap-2">
            <button className="hidden sm:block p-2 text-white/40 hover:text-white transition-colors">
              <HelpCircle size={20} />
            </button>
            <WalletConnectButton onProfileClick={onProfileClick} />

            {/* Mobile Menu Button - Visible on mobile/tablet */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 ml-1 text-white/80 hover:text-white transition-colors bg-white/5 rounded-full"
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      <Filter
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onSelect={() => {
          onViewChange('dao-detail');
        }}
      />
    </header>
  );
};

export default Header;