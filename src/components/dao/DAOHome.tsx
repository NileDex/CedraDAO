import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Info } from 'lucide-react';
import Avatar from 'boring-avatars';
import { MODULE_ADDRESS } from '../../cedra_service/constants';
import { DAO } from '../../types/dao';
import { useDAOActivities } from '../../useServices/useOptimizedActivityTracker';
import OptimizedActivityTable from '../OptimizedActivityTable';
import { cedraClient } from '../../cedra_service/cedra-client';
import { safeView } from '../../utils/rpcUtils';
import { useGetProfile } from '../../useServices/useProfile';
import { truncateAddress } from '../../utils/addressUtils';
import { useSectionLoader } from '../../hooks/useSectionLoader';
import MemberProfileCard from '../MemberProfileCard';

// Admin Display with boring avatar
const AdminDisplay: React.FC<{ address: string; onClick: (_ref: React.RefObject<HTMLDivElement>, _shortAddress: string) => void }>
  = ({ address, onClick }) => {
    const { data: profileData } = useGetProfile(address || null);
    const avatarRef = useRef<HTMLDivElement>(null);
    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

    return (
      <div ref={avatarRef} className="flex items-center space-x-3 cursor-pointer" onClick={() => onClick(avatarRef, shortAddress)}>
        <div style={{ borderRadius: '50%', overflow: 'hidden' }}>
          <Avatar
            name={address}
            variant="beam"
            size={32}
            colors={["#e1fd6a", "#a3e635", "#84cc16", "#65a30d", "#4d7c0f"]}
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-white tracking-tight">
            {profileData?.displayName || shortAddress}
          </span>
          <span className="text-[10px] text-white/40 font-mono">
            {truncateAddress(address)}
          </span>
        </div>
      </div>
    );
  };

interface DAOHomeProps {
  dao: DAO;
}

const DAOHome: React.FC<DAOHomeProps> = ({ dao }) => {
  const [fullAdminAddress, setFullAdminAddress] = useState<string>('');
  const [treasuryBalance, setTreasuryBalance] = useState<string>('0.00');

  // Section loader for Overview tab
  const sectionLoader = useSectionLoader();

  const [page, setPage] = useState<number>(1);
  const PAGE_LIMIT = 10;

  // Profile card popup state (reused from Members behavior)
  const [selectedMember, setSelectedMember] = useState<{ address: string; shortAddress: string; ref: React.RefObject<HTMLDivElement> } | null>(null);
  const [isProfileCardOpen, setIsProfileCardOpen] = useState(false);

  const handleAvatarClick = (ref: React.RefObject<HTMLDivElement>, shortAddress: string) => {
    if (!fullAdminAddress) return;
    setSelectedMember({ address: fullAdminAddress, shortAddress, ref });
    setIsProfileCardOpen(true);
  };

  const {
    activities,
    isLoading,
    error,
    pagination,
    refetch
  } = useDAOActivities(dao.id, {
    limit: PAGE_LIMIT,
    page
  });

  // Professional cached approach
  const cacheMap = useMemo(() => {
    const win = window as unknown as { __overviewCache?: Map<string, { admin: string; treasuryBalance: string; timestamp: number }> };
    if (!win.__overviewCache) {
      win.__overviewCache = new Map();
    }
    return win.__overviewCache;
  }, []);

  // Fetch treasury balance from contract - professional cached approach
  const fetchTreasuryBalance = useCallback(async () => {
    try {
      let balance = 0;
      let treasuryObject: unknown = null;

      // Step 1: Try to get treasury object first (modern DAOs) - with caching
      try {
        const objectResult = await safeView({
          function: `${MODULE_ADDRESS}::dao_core_file::get_treasury_object`,
          functionArguments: [dao.id]
        }, `treasury_object_${dao.id}`);
        treasuryObject = (objectResult as unknown[])?.[0];
      } catch (error) {
        console.debug('Modern treasury query failed, falling back:', error);
      }

      // Step 2: If treasury object exists, get balance from it - with caching
      if (treasuryObject) {
        try {
          // Use the raw treasury object directly (it's already in the correct Object<Treasury> format)
          // Try comprehensive treasury info first - with caching
          try {
            const infoRes = await safeView({
              function: `${MODULE_ADDRESS}::treasury::get_treasury_info`,
              functionArguments: [treasuryObject]
            }, `treasury_info_${dao.id}`);
            if (Array.isArray(infoRes) && infoRes.length >= 1) {
              balance = Number(infoRes[0] || 0) / 1e8;
            }
          } catch (_infoError) {
            // Fallback to direct object balance - with caching
            try {
              const balanceResult = await safeView({
                function: `${MODULE_ADDRESS}::treasury::get_balance_from_object`,
                functionArguments: [treasuryObject]
              }, `treasury_balance_obj_${dao.id}`);
              balance = Number(balanceResult[0] || 0) / 1e8;
            } catch (_balError) {
              // Silent fallback to legacy
            }
          }
        } catch (_objError) {
          // Silent fallback to legacy
        }
      }

      // Step 3: Fallback to legacy balance if no object approach worked - with caching
      if (balance === 0) {
        try {
          const balanceResult = await safeView({
            function: `${MODULE_ADDRESS}::treasury::get_balance`,
            functionArguments: [dao.id]
          }, `treasury_balance_legacy_${dao.id}`);

          if (balanceResult && Array.isArray(balanceResult) && balanceResult.length > 0) {
            balance = Number(balanceResult[0] || 0) / 1e8;
          }
        } catch (_legacyError) {
          console.debug('Legacy treasury query failed');
        }
      }

      setTreasuryBalance(balance.toFixed(2));
      // Update session cache
      // We use the cacheMap from the component scope
      const existing = cacheMap.get(dao.id) || {};
      cacheMap.set(dao.id, {
        admin: (existing as { admin?: string }).admin || fullAdminAddress,
        treasuryBalance: balance.toFixed(2),
        timestamp: Date.now(),
      });
    } catch (error) {
      console.warn('Treasury balance calculation error:', error);
      setTreasuryBalance('0.00');
    }
  }, [dao.id, fullAdminAddress, cacheMap]);

  // Fetch admin address based on contract behavior
  useEffect(() => {
    const SESSION_TTL_MS = 5 * 60 * 1000;
    const MAX_STALE_MS = 10 * 60 * 1000;
    // Try session cache for instant tab switches
    const cached = cacheMap.get(dao.id);
    const now = Date.now();
    if (cached && (now - cached.timestamp) < SESSION_TTL_MS) {
      if (cached.admin) setFullAdminAddress(cached.admin);
      if (cached.treasuryBalance) setTreasuryBalance(cached.treasuryBalance);
      return;
    }
    if (cached && (now - cached.timestamp) < MAX_STALE_MS) {
      if (cached.admin) setFullAdminAddress(cached.admin);
      if (cached.treasuryBalance) setTreasuryBalance(cached.treasuryBalance);
      // Silent background refresh
      (async () => {
        try {
          await fetchTreasuryBalance();
        } catch (err) {
          console.warn('Silent treasury refresh failed:', err);
        }
      })();
      return;
    }

    const fetchOverviewData = async () => {
      try {
        // Run admin fetch and treasury fetch in parallel
        const adminPromise = (async () => {
          // Primary: Get admins from AdminList (contract initializes this during DAO creation)
          try {
            // First check if admin system exists - with caching
            const adminListExists = await safeView({
              function: `${MODULE_ADDRESS}::admin::exists_admin_list`,
              functionArguments: [dao.id]
            }, `admin_list_exists_${dao.id}`);

            if (adminListExists && adminListExists[0]) {
              // Get admins from the AdminList - with caching
              const adminResult = await safeView({
                function: `${MODULE_ADDRESS}::admin::get_admins`,
                functionArguments: [dao.id]
              }, `admin_list_${dao.id}`);

              // Parse admin list (vector<address>)
              const admins: string[] = (() => {
                if (Array.isArray(adminResult)) {
                  if (adminResult.length === 1 && Array.isArray(adminResult[0])) return adminResult[0] as string[];
                  if (adminResult.every((a: unknown) => typeof a === 'string')) return adminResult as string[];
                }
                return [];
              })();

              if (admins.length > 0) {
                return admins[0];
              }
            }
          } catch (adminError) {
            console.warn('Admin system query failed:', adminError);
          }

          // Fallback: Get creator from DAOCreated event (with timeout)
          try {
            // Create a promise for the event fetch
            const eventsPromise = cedraClient.getModuleEventsByEventType({
              eventType: `${MODULE_ADDRESS}::dao_core_file::DAOCreated`,
              options: { limit: 100 },
            });

            // Race against a 3s timeout
            const timeoutPromise = new Promise<any>((_, reject) =>
              setTimeout(() => reject(new Error('Event fetch timeout')), 3000)
            );

            const events = await Promise.race([eventsPromise, timeoutPromise]);

            interface DAOCreatedData {
              anchor_addrx: string;
              creator: string;
            }
            interface DAOCreatedEvent {
              data: DAOCreatedData;
            }
            const ev = (events as unknown as DAOCreatedEvent[]).find((e) => e?.data?.anchor_addrx === dao.id);
            return ev?.data?.creator || null;
          } catch (eventError) {
            console.warn('Error fetching creator from events:', eventError);
            return null;
          }
        })();

        // Execute parallel requests
        const [adminAddr, _] = await Promise.all([
          adminPromise,
          fetchTreasuryBalance()
        ]);

        const finalAdmin = adminAddr || dao.id; // Contract guarantees DAO creator is admin, so use DAO address as fallback

        setFullAdminAddress(finalAdmin);
        cacheMap.set(dao.id, {
          admin: finalAdmin,
          treasuryBalance: treasuryBalance,
          timestamp: Date.now(),
        });

      } catch (error: any) {
        console.warn('Error fetching overview data:', error);
        // Contract guarantees DAO creator is admin, so use DAO address as fallback
        setFullAdminAddress(dao.id);
        sectionLoader.setError(error?.message || 'Failed to load overview data');
      }
    };

    sectionLoader.executeWithLoader(fetchOverviewData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dao.id, fetchTreasuryBalance, sectionLoader.executeWithLoader, treasuryBalance, cacheMap]);

  // Silent refresh on window focus if cache is stale
  useEffect(() => {
    const onFocus = () => {
      const cached = cacheMap.get(dao.id);
      const now = Date.now();
      const SESSION_TTL_MS = 5 * 60 * 1000;
      const MAX_STALE_MS = 10 * 60 * 1000;
      if (cached && (now - cached.timestamp) >= SESSION_TTL_MS && (now - cached.timestamp) < MAX_STALE_MS) {
        (async () => {
          try {
            await fetchTreasuryBalance();
          } catch (err) {
            console.warn('Flash refresh failed:', err);
          }
        })();
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [dao.id, fetchTreasuryBalance, cacheMap]);

  const retryOverviewData = () => {
    sectionLoader.reset();
    const fetchOverviewData = async () => {
      // Re-fetch all overview data
      await fetchTreasuryBalance();
    };
    sectionLoader.executeWithLoader(fetchOverviewData);
  };

  return (
    <div className="w-full space-y-12 animate-fade-in">
      {/* Overview Section */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-white tracking-tighter flex items-center gap-2">
              <Info size={20} className="text-[#e1fd6a]" />
              Overview
            </h2>
            <p className="text-[11px] font-medium text-white/40 leading-none">DAO Governance & Activity</p>
          </div>

          <div className="flex items-center gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/5 backdrop-blur-sm group/admin hover:border-[#e1fd6a]/20 transition-all">
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-white/30 mb-2">Administrator</span>
              {fullAdminAddress ? (
                <AdminDisplay address={fullAdminAddress} onClick={handleAvatarClick} />
              ) : (
                <span className="text-[10px] font-semibold text-[#e1fd6a] animate-pulse">Fetching admin...</span>
              )}
            </div>
          </div>
        </div>

        {sectionLoader.error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center justify-between">
            <p className="text-xs font-medium text-red-500">{sectionLoader.error}</p>
            <button
              onClick={retryOverviewData}
              className="text-[10px] font-semibold bg-red-500 text-white px-4 py-2 rounded-lg"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="animate-slide-up space-y-4" style={{ animationDelay: '0.1s' }}>
        <OptimizedActivityTable
          activities={activities}
          isLoading={isLoading}
          error={error}
          onRefresh={refetch}
          showUserColumn={true}
          showAmountColumn={true}
          showDAOColumn={false}
          showActionColumn={false}
          maxRows={undefined}
          showingCountText={
            pagination?.totalItems > 0
              ? `Showing ${(page - 1) * PAGE_LIMIT + Math.min(PAGE_LIMIT, activities.length)} of ${pagination.totalItems} activities`
              : undefined
          }
          hasNextPage={Boolean(pagination?.hasNextPage)}
          hasPrevPage={Boolean(pagination?.hasPreviousPage)}
          onNextPage={() => setPage(p => p + 1)}
          onPrevPage={() => setPage(p => Math.max(1, p - 1))}
          title="Recent Activity"
        />
      </div>

      {/* Member Profile Card Popup (admin profile) */}
      {selectedMember && (
        <MemberProfileCard
          address={selectedMember.address}
          shortAddress={selectedMember.shortAddress}
          memberNumber={1}
          isOpen={isProfileCardOpen}
          onClose={() => setIsProfileCardOpen(false)}
          anchorRef={selectedMember.ref}
        />
      )}
    </div>
  );
};

export default DAOHome;