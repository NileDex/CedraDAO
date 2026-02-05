import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSectionLoader } from '../../hooks/useSectionLoader';
import { Users, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import Avatar from 'boring-avatars';
import { Member } from '../../types/dao';
import { DAO } from '../../types/dao';
import { useWallet } from '../../contexts/CedraWalletProvider';
import { MODULE_ADDRESS } from '../../cedra_service/constants';
import { safeView, safeGetModuleEventsByEventType } from '../../utils/rpcUtils';
import { useGetProfile } from '../../useServices/useProfile';
import MemberProfileCard from '../MemberProfileCard';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../ui/table';

interface DAOMembersProps {
  dao: DAO;
}

// Member Avatar Component with Boring Avatar - Clickable
const MemberAvatar: React.FC<{
  address: string;
  onClick: (_ref: React.RefObject<HTMLDivElement>) => void;
}> = ({ address, onClick }) => {
  const { data: _profileData } = useGetProfile(address || null);
  const avatarRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={avatarRef} onClick={() => onClick(avatarRef)} className="cursor-pointer">
      <div style={{ borderRadius: '50%', overflow: 'hidden' }} className="hover:ring-2 hover:ring-[#e1fd6a]/50 transition-all">
        <Avatar
          name={address}
          variant="beam"
          size={32}
          colors={["#e1fd6a", "#a3e635", "#84cc16", "#65a30d", "#4d7c0f"]}
        />
      </div>
    </div>
  );
};

const DAOMembers: React.FC<DAOMembersProps> = ({ dao }) => {
  const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes
  const MAX_STALE_MS = 10 * 60 * 1000; // 10 minutes stale window
  // Professional cached approach
  const membersCache = useMemo(() => {
    const win = window as unknown as { __membersCache?: Map<string, { members: Member[]; timestamp: number }> };
    if (!win.__membersCache) {
      win.__membersCache = new Map();
    }
    return win.__membersCache;
  }, []);

  const summaryCache = useMemo(() => {
    const win = window as unknown as { __membersSummaryCache?: Map<string, { summary: { totalMembers: number; totalStakers: number; totalStaked: number; minStakeRequired: number; minProposalStake: number; userIsMember: boolean; userStake: number }; timestamp: number }> };
    if (!win.__membersSummaryCache) {
      win.__membersSummaryCache = new Map();
    }
    return win.__membersSummaryCache;
  }, []);
  const [membershipData, setMembershipData] = useState({
    totalMembers: 0,
    totalStakers: 0,
    totalStaked: 0,
    minStakeRequired: 1.0, // Default to 1 CEDRA minimum
    minProposalStake: 6.0, // Default to 6 CEDRA for proposals
    userIsMember: false,
    userStake: 0
  });
  const [actualMembers, setActualMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const sectionLoader = useSectionLoader();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const MEMBERS_PER_PAGE = 10;

  // Profile card popup state
  const [selectedMember, setSelectedMember] = useState<{ address: string; shortAddress: string; memberNumber: number; ref: React.RefObject<HTMLDivElement> } | null>(null);
  const [isProfileCardOpen, setIsProfileCardOpen] = useState(false);

  const handleAvatarClick = (member: Member, memberNumber: number, ref: React.RefObject<HTMLDivElement>) => {
    setSelectedMember({ address: member.address, shortAddress: member.shortAddress, memberNumber, ref });
    setIsProfileCardOpen(true);
  };

  const { account } = useWallet();


  const OCTAS = 1e8;
  const toCEDRA = useCallback((u64: number): number => u64 / OCTAS, [OCTAS]);

  // membershipData calculation

  const fetchActualMembers = useCallback(async () => {
    try {
      setIsLoadingMembers(true);
      const candidateAddresses = new Set<string>();

      // Query staking events to gather staker addresses for THIS DAO (they include anchor_addrx)
      const stakeType = `${MODULE_ADDRESS}::staking::StakeEvent` as `${string}::${string}::${string}`;
      const unstakeType = `${MODULE_ADDRESS}::staking::UnstakeEvent` as `${string}::${string}::${string}`;

      // Prefer module-level events (widely available), then filter by dao id
      const [stakeEvents, unstakeEvents] = await Promise.all([
        safeGetModuleEventsByEventType({ eventType: stakeType, options: { limit: 100 } }).catch(() => []),
        safeGetModuleEventsByEventType({ eventType: unstakeType, options: { limit: 100 } }).catch(() => []),
      ]);

      interface StakingData {
        anchor_addrx?: string;
        dao_address?: string;
        staker?: string;
      }
      interface StakingEvent {
        data: StakingData;
      }
      const pushIfForDAO = (ev: unknown) => {
        const d = (ev as StakingEvent)?.data || {};
        if ((d.anchor_addrx || d.dao_address) === dao.id && typeof d.staker === 'string') {
          candidateAddresses.add(d.staker);
        }
      };

      (stakeEvents as unknown[]).forEach(pushIfForDAO);
      (unstakeEvents as unknown[]).forEach(pushIfForDAO);

      // Include the connected account if present, to reflect immediate membership
      if (account?.address) candidateAddresses.add(account.address);

      // Validate membership and fetch stake per candidate (optimized for maximum speed)
      const addresses = Array.from(candidateAddresses);
      const batchSize = 30; // Much larger batch size for faster loading
      const collected: Member[] = [];

      for (let i = 0; i < addresses.length; i += batchSize) {
        const batch = addresses.slice(i, i + batchSize);
        const batchPromises = batch.map(async (addr) => {
          try {
            const [isMemberRes, stakeRes] = await Promise.all([
              safeView({ function: `${MODULE_ADDRESS}::membership::is_member`, functionArguments: [dao.id, addr] }).catch(() => [false]),
              safeView({ function: `${MODULE_ADDRESS}::staking::get_dao_stake_direct`, functionArguments: [dao.id, addr] }).catch(() => [0]),
            ]);
            const isMember = Boolean(isMemberRes?.[0]);
            const stakeAmount = toCEDRA(Number(stakeRes?.[0] || 0));
            if (isMember && stakeAmount > 0) {
              const member: Member = {
                id: addr,
                address: addr,
                shortAddress: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
                votingPower: stakeAmount,
                tokensHeld: stakeAmount,
                joinDate: '-',
                isActive: true,
              };
              collected.push(member);
            }
          } catch (_e) {
            // Ignore individual failures
          }
        });
        await Promise.allSettled(batchPromises);
        // No delay between batches for maximum speed
      }

      // Deduplicate by address
      const unique = new Map<string, Member>();
      collected.forEach((m) => unique.set(m.address, m));
      const members = Array.from(unique.values()).sort((a, b) => a.address.localeCompare(b.address));

      setActualMembers(members);
      // Save to cache
      membersCache.set(dao.id, { members, timestamp: Date.now() });
    } catch (error) {
      console.error('Failed to fetch actual members:', error);
      setActualMembers([]);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [account?.address, dao.id, membersCache, toCEDRA]);

  const fetchMembershipData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch DAO membership statistics
      const [
        totalMembersRes,
        totalStakedRes,
        minStakeRes,
        minProposalStakeRes
      ] = await Promise.all([
        safeView({ function: `${MODULE_ADDRESS}::membership::total_members`, functionArguments: [dao.id] }).catch(() => [0]),
        safeView({ function: `${MODULE_ADDRESS}::staking::get_total_staked`, functionArguments: [dao.id] }).catch(() => [0]),
        safeView({ function: `${MODULE_ADDRESS}::membership::get_min_stake`, functionArguments: [dao.id] }).catch(() => [0]),
        safeView({ function: `${MODULE_ADDRESS}::membership::get_min_proposal_stake`, functionArguments: [dao.id] }).catch(() => [0])
      ]);

      // Note: get_staker_count is not a view function, so we use total_members as a proxy
      // since members need to stake to join. In most cases, members = stakers
      const totalStakersRes = totalMembersRes;

      // Check current user's membership status and stake
      let userIsMember = false;
      let userStake = 0;

      if (account?.address) {
        try {
          const [isMemberRes, userStakeRes] = await Promise.all([
            safeView({ function: `${MODULE_ADDRESS}::membership::is_member`, functionArguments: [dao.id, account.address] }),
            safeView({ function: `${MODULE_ADDRESS}::staking::get_dao_staked_balance`, functionArguments: [dao.id, account.address] })
          ]);
          userIsMember = Boolean(isMemberRes[0]);
          userStake = toCEDRA(Number(userStakeRes[0] || 0));
        } catch (e) {
          console.warn('Failed to fetch user membership data:', e);
        }
      }

      // Handle min stake conversion - if it's 0 or very small, use a reasonable default
      const rawMinStake = Number(minStakeRes[0] || 0);
      const minStakeInCEDRA = rawMinStake > 0 ? toCEDRA(rawMinStake) : 1.0; // Default to 1 CEDRA if not set or too small

      const rawMinProposalStake = Number(minProposalStakeRes[0] || 0);
      const minProposalStakeInCEDRA = rawMinProposalStake > 0 ? toCEDRA(rawMinProposalStake) : 6.0; // Default to 6 CEDRA if not set

      const summary = {
        totalMembers: Number(totalMembersRes[0] || 0),
        totalStakers: Number(totalStakersRes[0] || 0),
        totalStaked: toCEDRA(Number(totalStakedRes[0] || 0)),
        minStakeRequired: minStakeInCEDRA,
        minProposalStake: minProposalStakeInCEDRA,
        userIsMember,
        userStake
      };
      setMembershipData(summary);
      // Save to cache
      summaryCache.set(dao.id, { summary, timestamp: Date.now() });

    } catch (error) {
      console.error('Failed to fetch membership data:', error);
      // Set reasonable defaults when API calls fail (rate limiting, network issues, etc.)
      setMembershipData(prev => ({
        ...prev,
        minStakeRequired: prev.minStakeRequired || 1.0, // Default to 1 CEDRA
        minProposalStake: prev.minProposalStake || 6.0, // Default to 6 CEDRA
        totalMembers: prev.totalMembers || 0,
        totalStakers: prev.totalStakers || 0,
        totalStaked: prev.totalStaked || 0,
        userIsMember: prev.userIsMember || false,
        userStake: prev.userStake || 0
      }));
    } finally {
      setIsLoading(false);
    }
  }, [account?.address, dao.id, summaryCache, toCEDRA]);

  // members list logic

  useEffect(() => {
    const now = Date.now();
    // Reset page when DAO changes
    setCurrentPage(1);

    const cachedMembers = membersCache.get(dao.id);
    const cachedSummary = summaryCache.get(dao.id);

    // Fresh session cache: hydrate instantly, no loader, no immediate fetch
    if (cachedMembers && now - cachedMembers.timestamp < SESSION_TTL_MS) {
      setActualMembers(cachedMembers.members);
      setIsLoadingMembers(false);
    }
    if (cachedSummary && now - cachedSummary.timestamp < SESSION_TTL_MS) {
      setMembershipData(cachedSummary.summary);
      setIsLoading(false);
    }

    // Stale but acceptable: show cached and refresh silently in background
    const isMembersStaleButAcceptable = cachedMembers && (now - cachedMembers.timestamp) >= SESSION_TTL_MS && (now - cachedMembers.timestamp) < MAX_STALE_MS;
    const isSummaryStaleButAcceptable = cachedSummary && (now - cachedSummary.timestamp) >= SESSION_TTL_MS && (now - cachedSummary.timestamp) < MAX_STALE_MS;
    if (isMembersStaleButAcceptable || isSummaryStaleButAcceptable) {
      if (cachedMembers) {
        setActualMembers(cachedMembers.members);
        setIsLoadingMembers(false);
      }
      if (cachedSummary) {
        setMembershipData(cachedSummary.summary);
        setIsLoading(false);
      }
      (async () => {
        try {
          await Promise.all([fetchMembershipData(), fetchActualMembers()]);
        } catch (_err) { /* ignore silent refresh errors */ }
      })();
      return;
    }

    // No cache or too old: show loader and fetch
    if (!cachedMembers || !cachedSummary ||
      (cachedMembers && now - cachedMembers.timestamp >= MAX_STALE_MS) ||
      (cachedSummary && now - cachedSummary.timestamp >= MAX_STALE_MS)) {
      sectionLoader.executeWithLoader(async () => {
        await Promise.all([fetchMembershipData(), fetchActualMembers()]);
      });
    }
  }, [dao.id, fetchActualMembers, fetchMembershipData, membersCache, sectionLoader, summaryCache, MAX_STALE_MS, SESSION_TTL_MS]); // Fetch on DAO change only; cache keeps view instant between tabs

  // Silent refresh on window focus if cache is stale
  useEffect(() => {
    const onFocus = () => {
      const now = Date.now();
      const cachedMembers = membersCache.get(dao.id);
      const cachedSummary = summaryCache.get(dao.id);
      const membersStale = !cachedMembers || (now - cachedMembers.timestamp) >= SESSION_TTL_MS;
      const summaryStale = !cachedSummary || (now - cachedSummary.timestamp) >= SESSION_TTL_MS;
      if ((membersStale || summaryStale) && (!cachedMembers || now - (cachedMembers?.timestamp || 0) < MAX_STALE_MS)) {
        (async () => {
          try {
            await Promise.all([fetchMembershipData(), fetchActualMembers()]);
          } catch (_err) { /* ignore focus refresh errors */ }
        })();
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [dao.id, fetchActualMembers, fetchMembershipData, MAX_STALE_MS, SESSION_TTL_MS, membersCache, summaryCache]);

  // Use actual members fetched from the blockchain
  const members = actualMembers;
  const filteredMembers = members; // No filtering since search was removed

  // Pagination logic
  const totalMembers = filteredMembers.length;
  const totalPages = Math.ceil(totalMembers / MEMBERS_PER_PAGE);
  const startIndex = (currentPage - 1) * MEMBERS_PER_PAGE;
  const endIndex = startIndex + MEMBERS_PER_PAGE;
  const paginatedMembers = filteredMembers.slice(startIndex, endIndex);

  // pagination components

  return (
    <div className="w-full px-2 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pl-4 sm:pl-8 xl:pl-0">
        <div>
          <h2 className="text-2xl font-semibold text-white tracking-tight mb-2">Member Directory</h2>
        </div>
        <div className="text-right">
          {sectionLoader.error && (
            <div className="text-xs text-red-300">Error loading members</div>
          )}
        </div>
      </div>


      {/* Stats removed per request */}

      {/* Member Directory */}
      <div className="border border-white/5 rounded-xl p-4 w-full max-w-full overflow-hidden relative min-h-[600px]">


        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white flex items-center gap-2 tracking-tight">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span>Registry</span>
              {filteredMembers.length > 0 && (
                <span className="text-xs sm:text-sm text-white/40 font-medium hidden sm:inline">({filteredMembers.length})</span>
              )}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                fetchMembershipData();
                fetchActualMembers();
              }}
              disabled={isLoading || isLoadingMembers}
              className="p-2 text-[#e1fd6a] hover:text-[#e1fd6a]/80 hover:bg-white/5 rounded-lg transition-all disabled:opacity-50"
              title="Refresh member data"
            >
              <RefreshCw className={`w-4 h-4 ${(isLoading || isLoadingMembers) ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block">
          <Table>
            <TableHeader className="bg-white/[0.02]">
              <TableRow className="hover:bg-transparent border-white/5">
                <TableHead className="py-5 px-8 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Authorized identity</TableHead>
                <TableHead className="py-5 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] text-right">Protocol stake</TableHead>
                <TableHead className="py-5 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] text-right">Status</TableHead>
                <TableHead className="py-5 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] text-right pr-8">Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMembers.length === 0 ? (
                sectionLoader.isLoading ? null : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-60 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Users className="w-12 h-12 text-white/10 mb-4" />
                        <p className="text-white/40 text-xs font-medium">No members found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              ) : (
                paginatedMembers.map((member, index) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <MemberAvatar
                          address={member.address}
                          onClick={(ref) => handleAvatarClick(member, startIndex + index + 1, ref)}
                        />
                        <span className="text-xs font-medium text-white/80">{member.shortAddress}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <span className="text-sm text-white font-medium">{member.tokensHeld.toFixed(3)}</span>
                        <span className="text-[10px] font-bold text-white/40 ml-1">CEDRA</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-semibold border ${member.isActive
                        ? 'text-green-400 border-green-500/10 bg-green-500/5'
                        : 'text-white/20 border-white/5 bg-white/5'
                        }`}>
                        {member.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex items-center justify-end space-x-1 text-white/40 text-[10px] font-medium font-mono uppercase tracking-tighter">
                        <span>{new Date().toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="sm:hidden">
          {paginatedMembers.length === 0 ? (
            sectionLoader.isLoading ? null : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-white text-sm">No members found</p>
                <p className="text-gray-500 text-xs mt-1">
                  {membershipData.totalMembers > 0
                    ? 'Try adjusting your search'
                    : 'No registered members yet'}
                </p>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {paginatedMembers.map((member, index) => (
                <div
                  key={member.id}
                  className="rounded-2xl p-5 bg-white/[0.02] border border-white/5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MemberAvatar
                        address={member.address}
                        onClick={(ref) => handleAvatarClick(member, startIndex + index + 1, ref)}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-white">{member.shortAddress}</span>
                        <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Identity</span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex-shrink-0 ${member.isActive
                      ? 'text-green-400 border-green-500/20 bg-green-500/5'
                      : 'text-gray-400 border-gray-500/20 bg-gray-500/5'
                      }`}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                    <div className="space-y-1">
                      <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Protocol Stake</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white">{member.tokensHeld.toFixed(3)}</span>
                        <span className="text-[10px] font-black text-[#e1fd6a]/40">CEDRA</span>
                      </div>
                    </div>
                    <div className="space-y-1 text-right">
                      <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Registered</span>
                      <p className="text-xs font-medium text-white/60">{new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalMembers > MEMBERS_PER_PAGE && (
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
            <div className="text-sm text-white">
              Showing {startIndex + 1} to {Math.min(endIndex, totalMembers)} of {totalMembers} members
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-white hover:text-white hover:bg-white/5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-white hover:text-white hover:bg-white/5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Member Profile Card Popup */}
      {selectedMember && (
        <MemberProfileCard
          address={selectedMember.address}
          shortAddress={selectedMember.shortAddress}
          memberNumber={selectedMember.memberNumber}
          isOpen={isProfileCardOpen}
          onClose={() => setIsProfileCardOpen(false)}
          anchorRef={selectedMember.ref}
        />
      )}
    </div>
  );
};

export default DAOMembers;