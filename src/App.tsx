import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import MainDashboard from './components/MainDashboard';
import CreateDAO from './components/CreateDAO';
import DAODetail from './components/DAODetail';
import PlatformGrowthCharts from './components/PlatformGrowthCharts';
import { UserProfile } from './components/profile';
import BoostDashboard from './components/BoostDashboard';
import { DAO } from './types/dao';
import { Search as SearchIcon } from 'lucide-react';
import { useFilter } from './contexts/FilterContext';
import DAOCard from './components/DAOCard';

function App() {
  const { filteredDAOs, isFiltering } = useFilter();
  // Persist and restore app navigation state across refreshes
  const [currentView, setCurrentView] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('app_current_view');
      return saved || 'home';
    } catch {
      return 'home';
    }
  });
  const [selectedDAO, setSelectedDAO] = useState<DAO | null>(() => {
    try {
      const saved = localStorage.getItem('app_selected_dao');
      return saved ? (JSON.parse(saved) as DAO) : null;
    } catch {
      return null;
    }
  });
  const [daoActiveTab, setDaoActiveTab] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('app_dao_active_tab');
      return saved || 'home';
    } catch {
      return 'home';
    }
  });

  // Clear hash from URL on mount
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const handleDAOSelect = (dao: DAO) => {
    setSelectedDAO(dao);
    setCurrentView('dao-detail');
    setDaoActiveTab('home'); // Reset to home tab when selecting a DAO
    // No URL hash updates
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    setSelectedDAO(null);
    setDaoActiveTab('home'); // Reset tab when going back
    // No URL hash updates
  };

  const handleDaoTabChange = (_daoId: string, tabId: string) => {
    setDaoActiveTab(tabId);
    // No URL hash updates
  };

  // Keep navigation state in localStorage for full refresh resilience
  useEffect(() => {
    try {
      localStorage.setItem('app_current_view', currentView);
    } catch (err) {
      console.warn('LocalStorage error (app_current_view):', err);
    }
  }, [currentView]);

  useEffect(() => {
    try {
      if (selectedDAO) {
        localStorage.setItem('app_selected_dao', JSON.stringify(selectedDAO));
      } else {
        localStorage.removeItem('app_selected_dao');
      }
    } catch (err) {
      console.warn('LocalStorage error (app_selected_dao):', err);
    }
  }, [selectedDAO]);

  useEffect(() => {
    try {
      localStorage.setItem('app_dao_active_tab', daoActiveTab);
    } catch (err) {
      console.warn('LocalStorage error (app_dao_active_tab):', err);
    }
  }, [daoActiveTab]);

  // Safety: If view is dao-detail but no DAO found, fallback to home
  useEffect(() => {
    if (currentView === 'dao-detail' && !selectedDAO) {
      setCurrentView('home');
    }
  }, [currentView, selectedDAO]);



  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return <MainDashboard onDAOSelect={handleDAOSelect} onCreateDAO={() => setCurrentView('create')} />;
      case 'create':
        return <CreateDAO onBack={handleBackToHome} />;
      case 'create-new':
        return <CreateDAO onBack={handleBackToHome} />;
      case 'dao-detail':
        return selectedDAO ? (
          <DAODetail
            dao={selectedDAO}
            onBack={handleBackToHome}
            onActiveTabChange={handleDaoTabChange}
            activeTab={daoActiveTab}
          />
        ) : (
          <MainDashboard onDAOSelect={handleDAOSelect} onCreateDAO={() => setCurrentView('create')} />
        );
      case 'search':
        return (
          <div className="w-full">
            <div className="flex flex-col gap-3 mb-12">
              <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
                Discovery Results
                <div className="px-2 py-0.5 bg-white/5 rounded text-[10px] font-medium text-white/40 uppercase tracking-widest">
                  {filteredDAOs.length} Organizations
                </div>
              </h2>
              <p className="text-xs text-white/40 font-medium uppercase tracking-widest">Found in the decentralized registry</p>
            </div>

            {isFiltering ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-10 h-10 border-2 border-[#e1fd6a]/20 border-t-[#e1fd6a] rounded-full animate-spin" />
              </div>
            ) : filteredDAOs.length === 0 ? (
              <div className="text-center py-32 professional-card rounded-3xl border-dashed border-white/5">
                <div className="w-20 h-20 mx-auto mb-8 bg-white/5 rounded-3xl flex items-center justify-center">
                  <SearchIcon className="w-10 h-10 text-slate-700" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-3">No Matches Found</h3>
                <p className="text-white/40 text-sm font-medium mb-10 max-w-sm mx-auto uppercase tracking-widest leading-relaxed">
                  The registry yielded no results for your current criteria. Try adjusting your filters.
                </p>
                <button onClick={handleBackToHome} className="nb-button">
                  Return to Ecosystem
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredDAOs.map((dao) => (
                  <DAOCard
                    key={dao.id}
                    dao={dao}
                    onClick={() => handleDAOSelect(dao)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      case 'trending':
        return <PlatformGrowthCharts />;
      case 'community':
        return (
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="professional-card rounded-xl p-12 text-center">
              <h1 className="text-3xl font-semibold text-white mb-4">Community Hub</h1>
              <p className="text-white/60 mb-8">Connect with other DAO members and builders</p>
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-xl flex items-center justify-center mx-auto">
                <span className="text-2xl">👥</span>
              </div>
              <p className="text-white/30 mt-4">Coming soon...</p>
            </div>
          </div>
        );
      case 'profile':
        return <UserProfile />;
      case 'boost':
        return <BoostDashboard />;
      default:
        return <MainDashboard onDAOSelect={handleDAOSelect} />;
    }
  };

  return (
    <Routes>
      <Route path="*" element={
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
          {/* Header: always at the top */}
          <Header
            currentDAO={selectedDAO?.name}
            currentView={currentView}
            onViewChange={setCurrentView}
            onProfileClick={() => setCurrentView('profile')}
            activeTab={daoActiveTab}
            onActiveTabChange={handleDaoTabChange}
          />

          {/* Content area - Full width, sidebar removed */}
          <main className="flex-1 overflow-x-hidden">
            {renderContent()}
          </main>
        </div>
      } />
    </Routes>
  );
}

export default App;