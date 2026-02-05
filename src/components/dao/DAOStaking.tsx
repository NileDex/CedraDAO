import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock,
  Shield
} from 'lucide-react';
import { DAO } from '../../types/dao';
import { useWallet } from '../../contexts/CedraWalletProvider';
import { cedraClient } from '../../cedra_service/cedra-client';
import { MODULE_ADDRESS } from '../../cedra_service/constants';
import { useDAOMembership, useDAOPortfolio } from '../../hooks/useDAOMembership';
import { BalanceService } from '../../useServices/useBalance';
import { useWalletBalance } from '../../hooks/useWalletBalance';
import { useTreasury } from '../../hooks/useTreasury';
import { useAlert } from '../alert/AlertContext';
import { Card, CardContent } from '../ui/card';

interface DAOStakingProps {
  dao: DAO;
  sidebarCollapsed?: boolean;
}

const DAOStaking: React.FC<DAOStakingProps> = ({ dao }) => {
  const [activeTab, setActiveTab] = useState<'stake' | 'unstake' | 'membership'>('stake');
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const { showAlert } = useAlert();
  const [totalStakedInDAO, setTotalStakedInDAO] = useState(0);
  const [totalStakers, _setTotalStakers] = useState(0);
  const [independentMinStake, setIndependentMinStake] = useState<number | null>(null);
  const [minStakeFetchAttempted, setMinStakeFetchAttempted] = useState(false);

  const { account, signAndSubmitTransaction } = useWallet();
  const { membershipData, refresh: refreshMembership } = useDAOMembership(dao);
  const [userStakedDirect, setUserStakedDirect] = useState<number | null>(null);
  const { walletBalance } = useDAOPortfolio();
  const { balance: hookBalance } = useWalletBalance();
  const { treasuryData: _treasuryData } = useTreasury(dao.id);

  const toCEDRA = (u64: number): number => BalanceService.octasToCedra(u64);

  const fetchMinStakeIndependently = useCallback(async () => {
    if (minStakeFetchAttempted) return;
    setMinStakeFetchAttempted(true);
    try {
      const minStakeRes = await cedraClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::membership::get_min_stake`,
          functionArguments: [dao.id]
        }
      });
      // Standardize to 8 decimals (1e8) for consistency across the entire protocol
      const minStakeValue = Array.isArray(minStakeRes) ? Number(minStakeRes[0] || 0) : 0;
      const minStake = minStakeValue / 100000000;
      setIndependentMinStake(minStake);
    } catch (_error) {
      setIndependentMinStake(7);
    }
  }, [dao.id, minStakeFetchAttempted]);

  const daoStakingData = useMemo(() => ({
    daoAddress: dao.id,
    daoName: dao.name,
    minStakeRequired: independentMinStake !== null ? independentMinStake : (membershipData?.minStakeRequired || 0),
    totalStakedInDAO: totalStakedInDAO,
    totalStakers: totalStakers,
    userBalance: Math.max(0, (hookBalance || walletBalance || 0)),
    userDaoStaked: userStakedDirect !== null ? userStakedDirect : (membershipData?.stakedAmount || 0),
    userVotingPower: userStakedDirect !== null ? userStakedDirect : (membershipData?.votingPower || 0),
    isMember: membershipData?.isMember || false,
    isStaker: (userStakedDirect !== null ? userStakedDirect > 0 : (membershipData?.stakedAmount || 0) > 0)
  }), [dao, independentMinStake, membershipData, totalStakedInDAO, totalStakers, hookBalance, walletBalance, userStakedDirect]);

  const handleStake = async () => {
    setIsStaking(true);
    try {
      if (!account || !signAndSubmitTransaction) throw new Error('Wallet not connected');
      const raw = parseFloat(stakeAmount);
      const amountOctas = BalanceService.cedraToOctas(raw);
      const payload = {
        function: `${MODULE_ADDRESS}::staking::stake`,
        typeArguments: [],
        functionArguments: [dao.id, amountOctas],
      };

      const tx = await signAndSubmitTransaction({
        payload,
        options: { max_gas_amount: "200000", gas_unit_price: "100" }
      } as never);

      if (tx && (tx as { hash: string }).hash) {
        await cedraClient.waitForTransaction({ transactionHash: (tx as { hash: string }).hash, options: { checkSuccess: true } });
        showAlert(`Successfully staked ${raw.toFixed(2)} CEDRA!`, 'success');
        setStakeAmount('');
        refreshOnChain();
      }
    } catch (error: unknown) {
      const err = error as Error;
      showAlert(err.message || 'Staking failed', 'error');
    } finally {
      setIsStaking(false);
    }
  };

  const handleUnstake = async () => {
    setIsUnstaking(true);
    try {
      if (!account || !signAndSubmitTransaction) throw new Error('Wallet not connected');
      const raw = parseFloat(unstakeAmount);
      const amountOctas = BalanceService.cedraToOctas(raw);
      const payload = {
        function: `${MODULE_ADDRESS}::staking::unstake`,
        typeArguments: [],
        functionArguments: [dao.id, amountOctas],
      };

      const tx = await signAndSubmitTransaction({
        payload,
        options: { max_gas_amount: "200000", gas_unit_price: "100" }
      } as never);

      if (tx && (tx as { hash: string }).hash) {
        await cedraClient.waitForTransaction({ transactionHash: (tx as { hash: string }).hash, options: { checkSuccess: true } });
        showAlert(`Successfully unstaked ${raw.toFixed(2)} CEDRA!`, 'success');
        setUnstakeAmount('');
        refreshOnChain();
      }
    } catch (error: unknown) {
      const err = error as Error;
      showAlert(err.message || 'Unstaking failed', 'error');
    } finally {
      setIsUnstaking(false);
    }
  };

  const refreshOnChain = useCallback(async () => {
    if (!dao.id) return;
    try {
      console.log('Starting refreshOnChain for DAO:', dao.id, 'Account:', account?.address);

      // 1. Get total staked in the DAO vault
      const totalStakedRes = await cedraClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::staking::get_total_staked`,
          functionArguments: [dao.id]
        }
      });
      const totalStaked = toCEDRA(Number(Array.isArray(totalStakedRes) ? totalStakedRes[0] : 0));
      setTotalStakedInDAO(totalStaked);
      console.log('Total staked in DAO:', totalStaked, 'CEDRA');

      // 2. Get user's stake directly from contract
      if (account?.address) {
        try {
          const userStakedRes = await cedraClient.view({
            payload: {
              function: `${MODULE_ADDRESS}::staking::get_staker_amount`,
              functionArguments: [dao.id, account.address]
            }
          });

          const userStake = toCEDRA(Number(Array.isArray(userStakedRes) ? userStakedRes[0] : 0));
          setUserStakedDirect(userStake);
          console.log('✅ User stake fetched successfully:', userStake, 'CEDRA');
        } catch (err) {
          console.error('❌ Failed to fetch user stake:', err);
          setUserStakedDirect(0);
        }
      }

      // 3. Refresh membership data in background
      refreshMembership();
    } catch (e) {
      console.error('On-chain refresh failed:', e);
    }
  }, [dao.id, account?.address, refreshMembership, toCEDRA]);

  useEffect(() => {
    console.log('DAOStaking useEffect triggered - dao.id:', dao.id, 'account:', account?.address);
    refreshOnChain();
    fetchMinStakeIndependently();
  }, [dao.id, account?.address, refreshOnChain, fetchMinStakeIndependently]);

  // Debug logging for state changes
  useEffect(() => {
    console.log('State update - userStakedDirect:', userStakedDirect, 'membershipData:', membershipData);
    console.log('Computed userVotingPower:', daoStakingData.userVotingPower);
  }, [userStakedDirect, membershipData]);

  return (
    <div className="w-full animate-fade-in py-12 px-4">
      <div className="max-w-[1000px] mx-auto">
        <Card className="bg-[#151618] border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
          <div className="flex flex-col md:flex-row min-h-[540px]">

            {/* Left Sidebar Navigation */}
            <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/5 p-8 space-y-8 bg-black/10 shrink-0">
              <div className="space-y-6">
                {(['stake', 'unstake', 'membership'] as const).map((tab) => {
                  const active = activeTab === tab;
                  const label = tab === 'membership' ? (daoStakingData.isMember ? 'Identity' : 'Access') : tab.charAt(0).toUpperCase() + tab.slice(1);
                  return (
                    <div
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className="cursor-pointer group flex items-center gap-3 transition-all"
                    >
                      <span className={`text-[15px] font-medium transition-all ${active ? 'text-[#abb970]' : 'text-white/20 group-hover:text-white/40'
                        }`}>
                        {label}
                      </span>
                      {active && <div className="w-1.5 h-1.5 rounded-full bg-[#abb970]" />}
                    </div>
                  );
                })}
              </div>

              <div className="pt-8 border-t border-white/5 space-y-4">
                <div className="bg-[#1a1b1e] border border-white/5 rounded-2xl p-4 flex justify-between items-center group hover:border-white/10 transition-all cursor-default">
                  <span className="text-xs font-bold text-white/60">Staking</span>
                  <div className="text-right">
                    <p className="text-sm font-black text-white leading-none">${(daoStakingData.userDaoStaked * 0.0857).toFixed(2)}</p>
                    <p className="text-[10px] font-bold text-white/20 mt-1">{daoStakingData.userDaoStaked.toFixed(0)} <span className="text-[#abb970]">●</span></p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <p className="text-[10px] font-bold text-white/10 uppercase tracking-widest mb-1.5">Total staked</p>
                  <p className="text-lg font-black text-white leading-none">
                    {totalStakedInDAO.toLocaleString()} <span className="text-[10px] text-white/5 font-medium ml-1">CEDRA</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Right Side Content Area */}
            <CardContent className="flex-1 p-10 flex flex-col justify-center">

              {activeTab === 'stake' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="text-center space-y-1">
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-[11px] text-white/30 font-medium">Estimated voting weight</p>
                      <button
                        onClick={() => {
                          console.log('Manual refresh clicked');
                          refreshOnChain();
                        }}
                        className="px-2 py-1 text-[9px] bg-white/5 hover:bg-white/10 rounded text-white/40"
                      >
                        REFRESH
                      </button>
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">
                      {daoStakingData.userVotingPower.toFixed(2)} CEDRA
                    </h2>
                    <p className="text-[9px] text-white/20 font-mono">
                      Debug: direct={userStakedDirect?.toFixed(2) || 'null'} | membership={membershipData?.votingPower?.toFixed(2) || '0'}
                    </p>
                  </div>

                  <div className="bg-[#1a1b1e] border border-white/5 rounded-2xl p-6 space-y-6">
                    <div className="flex justify-between items-center text-[11px] font-medium">
                      <span className="text-white/60">Staking</span>
                      <div className="flex items-center gap-3">
                        <span className="text-white/20">{daoStakingData.userBalance.toFixed(4)} CEDRA</span>
                        <div className="flex gap-1">
                          <button onClick={() => setStakeAmount((daoStakingData.userBalance * 0.5).toFixed(2))} className="px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded text-[9px] text-white/40">HALF</button>
                          <button onClick={() => setStakeAmount(daoStakingData.userBalance.toFixed(2))} className="px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded text-[9px] text-white/40">MAX</button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center gap-4 py-2">
                      <input
                        type="number"
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        placeholder="0.00"
                        className="flex-1 bg-transparent text-left text-3xl font-medium text-white outline-none placeholder:text-white/5 no-spinner"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleStake}
                    disabled={isStaking || !stakeAmount}
                    className="w-full py-5 bg-[#abb970] hover:bg-[#b8c67e] text-[#111113] rounded-2xl font-bold text-base transition-all active:scale-[0.98] disabled:opacity-30"
                  >
                    {isStaking ? 'Synchronizing...' : 'Initialize allocation'}
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div className="flex items-center gap-3 text-xs text-white/30">
                      <Shield size={14} className="text-[#abb970]/30" />
                      <span>Security verified</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/30">
                      <Clock size={14} className="text-[#abb970]/30" />
                      <span>1h Unlock window</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'unstake' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="text-center space-y-1">
                    <p className="text-[11px] text-white/30 font-medium">Currently staked</p>
                    <h2 className="text-3xl font-bold text-white tracking-tight">
                      {daoStakingData.userDaoStaked.toFixed(2)} CEDRA
                    </h2>
                  </div>

                  <div className="bg-[#1a1b1e] border border-white/5 rounded-2xl p-6 space-y-6">
                    <div className="flex justify-between items-center text-[11px] font-medium">
                      <span className="text-white/60">Unstaking</span>
                      <div className="flex items-center gap-3">
                        <span className="text-white/20">{daoStakingData.userDaoStaked.toFixed(4)} CEDRA</span>
                        <button onClick={() => setUnstakeAmount(daoStakingData.userDaoStaked.toString())} className="px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded text-[9px] text-white/40">MAX</button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center gap-4 py-2">
                      <input
                        type="number"
                        value={unstakeAmount}
                        onChange={(e) => setUnstakeAmount(e.target.value)}
                        placeholder="0.00"
                        className="flex-1 bg-transparent text-left text-3xl font-medium text-white outline-none placeholder:text-white/5 no-spinner"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleUnstake}
                    disabled={isUnstaking || !unstakeAmount}
                    className="w-full py-5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-2xl font-bold text-base transition-all active:scale-[0.98] disabled:opacity-30"
                  >
                    Confirm unstaking
                  </button>

                  <div className="flex items-start gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <Clock size={16} className="text-white/20 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-white/40 leading-relaxed">Safety window is active. Tokens will be released to your wallet after the verification period (approx. 1 hour).</p>
                  </div>
                </div>
              )}

              {activeTab === 'membership' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xl font-bold text-white">Membership</h3>
                    <p className="text-xs text-white/40">Protocol identity status</p>
                  </div>

                  <div className="bg-[#1a1b1e] border border-white/5 rounded-2xl p-8 space-y-10">
                    <p className="text-sm text-white/80 leading-relaxed font-normal">
                      {daoStakingData.isMember
                        ? `You are an active member of ${dao.name}. Your cryptographically verified identity is established, providing governance power and helping secure the network.`
                        : `Identify yourself in ${dao.name}. To establish your protocol identity and gain voting power, you must obtain and stake the required CEDRA amount.`
                      }
                    </p>

                    <div className="flex justify-between items-start pt-8 border-t border-white/5">
                      <span className="text-[10px] font-bold text-white/10 uppercase tracking-widest">Balances</span>
                      <div className="flex flex-col items-end gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-black text-[#5eead4] tracking-tight leading-none">{daoStakingData.userBalance.toFixed(2)}</span>
                          <span className="text-[10px] font-bold text-white/20 uppercase">Available</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-black text-white tracking-tight leading-none">{daoStakingData.userDaoStaked.toFixed(2)}</span>
                          <span className="text-[10px] font-bold text-white/20 uppercase">Staked</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab('stake')}
                      className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl font-bold text-xs transition-all border border-white/5 mt-2"
                    >
                      {daoStakingData.userDaoStaked > 0 ? 'Stake more' : 'Stake CEDRA'}
                    </button>
                  </div>
                </div>
              )}

            </CardContent>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DAOStaking;