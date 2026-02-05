import React from 'react';
import StatsOverview from './StatsOverview';
import FeaturedDAOs from './FeaturedDAOs';
import { DAO } from '../types/dao';

interface MainDashboardProps {
  onDAOSelect: (_dao: DAO) => void;
  onCreateDAO?: () => void;
  sidebarCollapsed?: boolean;
}

const MainDashboard: React.FC<MainDashboardProps> = ({ onDAOSelect, onCreateDAO }) => {
  return (
    <div className="container mx-auto px-8 md:px-12 py-10 space-y-16">
      {/* Main Section: Explorer */}
      <section>
        <FeaturedDAOs onDAOSelect={onDAOSelect} onCreateDAO={onCreateDAO} />
      </section>

      {/* Pulse Section: Stats moved to bottom and refined */}
      <section className="pt-12 border-t border-white/5">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold tracking-tight text-white">Network Pulse</h2>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#e1fd6a]/10 rounded text-[10px] font-medium text-[#e1fd6a]">
              <div className="w-1 h-1 bg-[#e1fd6a] rounded-full animate-pulse" />
              Live
            </div>
          </div>
        </div>
        <StatsOverview />
      </section>
    </div>
  );
};

export default MainDashboard;