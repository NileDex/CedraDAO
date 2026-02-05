import React, { useState, useEffect, useRef } from 'react';
import { Activity, OptimizedActivityTracker } from '../useServices/useOptimizedActivityTracker';
import { ExternalLink, RefreshCw, AlertCircle, Activity as ActivityIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useGetProfile } from '../useServices/useProfile';
import { truncateAddress } from '../utils/addressUtils';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from './ui/table';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

interface OptimizedActivityTableProps {
  activities: Activity[];
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  showingCountText?: string;
  showUserColumn?: boolean;
  showDAOColumn?: boolean;
  showAmountColumn?: boolean;
  showActionColumn?: boolean;
  maxRows?: number;
  className?: string;
  title?: string;
}

const UserDisplay: React.FC<{ address: string; isCompact?: boolean }> = ({ address }) => {
  const { data: profileData, isLoading } = useGetProfile(address || null);
  const label = profileData?.displayName && !isLoading ? profileData.displayName : truncateAddress(address);
  return (
    <span className="text-[10px] font-medium text-[#e1fd6a] bg-[#e1fd6a]/5 px-2.5 py-1 rounded-lg border border-[#e1fd6a]/20 truncate">{label}</span>
  );
};

const hasLoadedActivitiesOnce = (() => {
  let loaded = false;
  return {
    get: () => loaded,
    set: (value: boolean) => { loaded = value; }
  };
})();

const OptimizedActivityTable: React.FC<OptimizedActivityTableProps> = ({
  activities,
  isLoading = false,
  error = null,
  onRefresh,
  onNextPage,
  onPrevPage,
  hasNextPage,
  hasPrevPage,
  showingCountText,
  showUserColumn = false,
  showDAOColumn = false,
  showAmountColumn = true,
  showActionColumn = true,
  maxRows,
  className = '',
  title = 'Recent Activity'
}) => {
  const [cachedActivities, setCachedActivities] = useState<Activity[]>(activities);
  const hasEverLoaded = useRef(hasLoadedActivitiesOnce.get());

  useEffect(() => {
    if (activities.length > 0) {
      setCachedActivities(activities);
      hasEverLoaded.current = true;
      hasLoadedActivitiesOnce.set(true);
    }
  }, [activities]);

  const displayActivities = maxRows
    ? (isLoading && hasEverLoaded.current ? cachedActivities : activities).slice(0, maxRows)
    : (isLoading && hasEverLoaded.current ? cachedActivities : activities);



  const getExplorerUrl = (activity: Activity) => {
    return `https://cedrascan.com/txn/${activity.transactionHash}`;
  };

  if (error) {
    return (
      <Card className={`border-red-500/30 bg-red-500/10 ${className}`}>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-red-300 font-medium">Error Loading Activities</p>
              <p className="text-red-200 text-sm">{error}</p>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="mt-2 px-3 py-1 bg-red-600/20 text-red-300 rounded text-sm hover:bg-red-600/30 transition-colors"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading && !hasEverLoaded.current && cachedActivities.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm border-none bg-transparent">
            <div className="flex items-center gap-2">
              <ActivityIcon className="w-4 h-4" />
              <span>{title}</span>
            </div>
          </CardTitle>
          <RefreshCw className="w-4 h-4 animate-spin text-white/40" />
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={`!bg-[#1a1b1e] border-white/5 !p-0 rounded-3xl overflow-hidden ${className}`}>
      <CardHeader className="!flex-row !items-center !justify-between !space-y-0 p-8 pb-4">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-[#e1fd6a]/10 text-[#e1fd6a] rounded-xl border border-[#e1fd6a]/20">
            <ActivityIcon size={20} />
          </div>
          <div className="flex flex-col">
            <h3 className="text-xl font-semibold text-white tracking-tighter leading-none mb-1">
              {title}
            </h3>
            <p className="text-[10px] font-medium text-white/40">Real-time data feed</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2.5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl transition-all border border-white/10 disabled:opacity-50"
              title="Refresh Feed"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-white/[0.02]">
            <TableRow className="hover:bg-transparent border-white/5">
              <TableHead className="py-5 px-4 sm:px-8 text-[10px] font-bold text-white/30 tracking-wider">Activity</TableHead>
              <TableHead className="text-right text-[10px] font-bold text-white/30 tracking-wider">Type</TableHead>
              {showUserColumn && <TableHead className="text-right text-[10px] font-bold text-white/30 tracking-wider">User</TableHead>}
              {showAmountColumn && <TableHead className="text-right text-[10px] font-bold text-white/30 tracking-wider">Value</TableHead>}
              <TableHead className="text-right text-[10px] font-bold text-white/30 tracking-wider">Time</TableHead>
              {showDAOColumn && <TableHead className="hidden md:table-cell text-left text-[10px] font-bold text-white/30 tracking-wider">DAO</TableHead>}
              {showActionColumn && <TableHead className="text-right pr-4 sm:pr-8 text-[10px] font-bold text-white/30 tracking-wider">TX</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayActivities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-60 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <ActivityIcon size={48} className="mb-4 text-white/10" />
                    <p className="font-semibold text-white/40 text-xs">No Activity Yet</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              displayActivities.map((activity, index) => {
                const display = OptimizedActivityTracker.getActivityDisplay(activity);
                return (
                  <TableRow key={activity.id || index} className="group transition-colors border-white/5">
                    <TableCell className="pl-4 sm:pl-8">
                      <div className="space-y-1">
                        <h4 className="font-medium text-sm tracking-tight text-white leading-none group-hover:text-[#e1fd6a] transition-colors">{activity.title}</h4>
                        <p className="text-[11px] font-medium text-white/40 leading-none truncate max-w-[200px]">{activity.description}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-[10px] font-medium px-2.5 py-1 rounded-md bg-white/5 text-slate-300 border border-white/10">
                        {display.displayType}
                      </span>
                    </TableCell>
                    {showUserColumn && (
                      <TableCell className="text-right">
                        <UserDisplay address={activity.user} />
                      </TableCell>
                    )}
                    {showAmountColumn && (
                      <TableCell className="text-right">
                        {activity.amount ? (
                          <div className="flex flex-col items-end">
                            <span className="font-medium text-sm text-white">{activity.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <span className="text-[9px] font-medium text-[#e1fd6a]">CEDRA</span>
                          </div>
                        ) : (
                          <span className="text-white/20">-</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <span className="text-[10px] font-medium text-white/40 whitespace-nowrap tracking-tighter">
                        {OptimizedActivityTracker.formatTimeAgo(activity.timestamp)}
                      </span>
                    </TableCell>
                    {showDAOColumn && (
                      <TableCell className="hidden md:table-cell text-left">
                        <span className="text-[10px] font-mono font-medium text-white/40">{truncateAddress(activity.dao)}</span>
                      </TableCell>
                    )}
                    {showActionColumn && (
                      <TableCell className="text-right pr-4 sm:pr-8">
                        {activity.transactionHash && activity.transactionHash !== '0x' ? (
                          <a
                            href={getExplorerUrl(activity)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex p-2 bg-white/5 text-white/40 hover:text-[#e1fd6a] hover:bg-[#e1fd6a]/10 rounded-lg transition-all border border-white/10"
                          >
                            <ExternalLink size={14} />
                          </a>
                        ) : (
                          <span className="text-white/20">-</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>


        {/* Custom Pagination Style matching the image provided */}
        {(hasNextPage || hasPrevPage) && (
          <div className="p-8 pt-4 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-white/5 bg-black/20">
            <div className="text-[10px] font-bold text-white/20 tracking-wider italic">
              {showingCountText || (maxRows && activities.length > maxRows ? `Limited to ${maxRows} records` : 'Live activity stream')}
            </div>

            <div className="flex items-center gap-3">
              {/* Number block */}
              <div className="flex border border-white/10 rounded-2xl overflow-hidden bg-black/40">
                <button className="px-4 py-2 text-xs font-bold text-[#e1fd6a] bg-white/5 border-r border-white/10">1</button>
                <button className="px-4 py-2 text-xs font-bold text-white/40 border-r border-white/10 hover:bg-white/5 transition-colors">2</button>
                <button className="px-4 py-2 text-xs font-bold text-white/40 hover:bg-white/5 transition-colors">3</button>
              </div>

              {/* Arrow block */}
              <div className="flex border border-white/10 rounded-2xl overflow-hidden bg-black/40">
                <button
                  onClick={onPrevPage}
                  disabled={!hasPrevPage}
                  className="px-4 py-2 text-white/40 hover:bg-white/5 border-r border-white/10 transition-colors disabled:opacity-20"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={onNextPage}
                  disabled={!hasNextPage}
                  className="px-4 py-2 text-white/40 hover:bg-white/5 transition-colors disabled:opacity-20"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OptimizedActivityTable;