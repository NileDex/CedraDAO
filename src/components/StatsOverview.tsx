import React from 'react';
import { Building2, FileText, Vote, Users } from 'lucide-react';
import { usePlatformStats } from '../useServices/usePlatformStats';

const StatsOverview: React.FC = () => {
  const { stats: platformStats, isLoading, error } = usePlatformStats();

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const stats = [
    { label: 'Total Organizations', value: isLoading ? '...' : formatNumber(platformStats.totalDAOs), icon: Building2 },
    { label: 'Active Proposals', value: isLoading ? '...' : formatNumber(platformStats.activeProposals), icon: FileText },
    { label: 'Global Votes', value: isLoading ? '...' : formatNumber(platformStats.totalVotes), icon: Vote },
    { label: 'Total Participants', value: isLoading ? '...' : formatNumber(platformStats.totalMembers), icon: Users },
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="nb-card !p-5 flex flex-col items-start gap-4 h-full bg-transparent border-white/5">
              <div className="p-2.5 bg-[#e1fd6a] rounded-lg">
                <Icon className="w-5 h-5 text-black" />
              </div>
              <div>
                <div className="text-2xl font-semibold tracking-tight text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-[10px] font-medium text-white/40">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-400/10 border border-red-400/20 rounded-xl flex items-center gap-3">
          <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
          <span className="text-red-400 font-medium text-[10px]">Sync Error: Live stats temporarily unavailable</span>
        </div>
      )}
    </div>
  );
};

export default StatsOverview;