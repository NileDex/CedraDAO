import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Plus, Minus, Clock, AlertTriangle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTreasury } from '../../hooks/useTreasury';
import { DAO } from '../../types/dao';
import { cedraClient } from '../../cedra_service/cedra-client';
import { MODULE_ADDRESS } from '../../cedra_service/constants';
import { BalanceService } from '../../useServices/useBalance';
import { truncateAddress } from '../../utils/addressUtils';
import { useWallet } from '../../contexts/CedraWalletProvider';
import { useAlert } from '../alert/AlertContext';
import VaultManager from '../VaultManager';
import { useSectionLoader } from '../../hooks/useSectionLoader';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../ui/table';

interface DAOTreasuryProps {
  dao: DAO;
}

const DAOTreasury: React.FC<DAOTreasuryProps> = ({ dao }) => {
  const { account } = useWallet();
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const { showAlert } = useAlert();
  const [isTogglingPublicDeposits, setIsTogglingPublicDeposits] = useState(false);
  const [cedraPrice, setCedraPrice] = useState<number | null>(null);
  const [totalStaked, setTotalStaked] = useState<number>(0);
  const [transactionPage, setTransactionPage] = useState(1);
  const [treasuryHistory, setTreasuryHistory] = useState<unknown[]>([]);
  const TRANSACTIONS_PER_PAGE = 10;
  const isWalletConnected = !!account?.address;

  // Session-based caching for API responses to avoid rate limits
  const treasurySessionCache = useMemo(() => {
    const win = window as unknown as { __treasuryCache?: Map<string, { cedraPrice?: number; totalStaked?: number; timestamp: number }> };
    if (!win.__treasuryCache) {
      win.__treasuryCache = new Map();
    }
    return win.__treasuryCache;
  }, []);

  const SESSION_TTL_MS = 5 * 60 * 1000;

  const sectionLoader = useSectionLoader();

  const {
    treasuryData,
    transactions,
    userBalance,
    isAdmin,
    deposit,
    withdraw,
    togglePublicDeposits,
    refreshData
  } = useTreasury(dao.id);

  useEffect(() => {
    const cached = treasurySessionCache.get(dao.id);
    const now = Date.now();
    if (cached && (now - cached.timestamp) < SESSION_TTL_MS) {
      if (typeof cached.cedraPrice === 'number') setCedraPrice(cached.cedraPrice);
      if (typeof cached.totalStaked === 'number') setTotalStaked(cached.totalStaked);
    }

    const loadTreasuryData = async () => {
      await refreshData();
      try {
        const corsProxy = 'https://api.allorigins.win/raw?url=';
        const apiUrl = encodeURIComponent('https://api.coingecko.com/api/v3/simple/price?ids=movement&vs_currencies=usd');
        const response = await fetch(corsProxy + apiUrl);
        const data = (await response.json()) as { movement?: { usd: number } };
        const price = data?.movement?.usd;
        if (price) {
          setCedraPrice(price);
          const existing = treasurySessionCache.get(dao.id) || { timestamp: Date.now() };
          treasurySessionCache.set(dao.id, { ...existing, cedraPrice: price, timestamp: Date.now() });
        }
      } catch (e) {
        console.warn('Coingecko price fetch error (falling back):', e);
        setCedraPrice(0.08566);
      }
    };

    sectionLoader.executeWithLoader(loadTreasuryData);
  }, [dao.id, account?.address, refreshData, sectionLoader, treasurySessionCache]);

  useEffect(() => {
    const fetchTotalStaked = async () => {
      try {
        const res = await cedraClient.view({
          payload: {
            function: `${MODULE_ADDRESS}::staking::get_total_staked`,
            functionArguments: [dao.id]
          }
        });
        const staked = BalanceService.octasToCedra(Number(Array.isArray(res) ? res[0] : 0));
        setTotalStaked(staked);
      } catch (e) {
        console.error('Error fetching total staked:', e);
      }
    };
    fetchTotalStaked();
  }, [dao.id]);

  useEffect(() => {
    const currentBalance = treasuryData.balance;
    const days = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push({
        date: d,
        label: d.toLocaleDateString('en-US', { weekday: 'short' })
      });
    }

    // Calculate historical balance by tracking cumulative changes
    const history = days.map((dayObj, i) => {
      const isToday = i === days.length - 1;

      // Always use actual balance for today
      if (isToday) {
        return {
          name: dayObj.label,
          value: parseFloat(currentBalance.toFixed(2))
        };
      }

      // For historical days, calculate balance at end of that day
      if (transactions.length > 0) {
        // Get all transactions up to and including this day
        const txUpToDate = transactions.filter(tx => {
          const txDate = new Date(tx.timestamp);
          return txDate <= dayObj.date;
        });

        // Calculate balance at that point in time
        let balanceAtDate = 0;
        txUpToDate.forEach(tx => {
          if (tx.type === 'deposit') {
            balanceAtDate += tx.amount;
          } else if (tx.type === 'withdrawal') {
            balanceAtDate -= tx.amount;
          }
        });

        return {
          name: dayObj.label,
          value: parseFloat(Math.max(0, balanceAtDate).toFixed(2))
        };
      } else {
        // Fallback: smooth ramp up to current balance if no transaction history
        const progress = i / 6;
        const val = currentBalance > 0 ? (currentBalance * (0.3 + Math.pow(progress, 2) * 0.7)) : 0;
        return {
          name: dayObj.label,
          value: parseFloat(val.toFixed(2))
        };
      }
    });

    setTreasuryHistory(history);
  }, [transactions, treasuryData.balance]);

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) return showAlert('Valid amount required', 'error');
    try {
      setIsDepositing(true);
      await deposit(parseFloat(amount));
      await refreshData(); // Refresh to update chart immediately
      showAlert('Successfully deposited', 'success');
      setShowDepositForm(false);
      setAmount('');
    } catch (e: any) {
      showAlert(e.message || 'Deposit failed', 'error');
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) return showAlert('Valid amount required', 'error');
    try {
      setIsWithdrawing(true);
      await withdraw(parseFloat(amount));
      await refreshData(); // Refresh to update chart immediately
      showAlert('Successfully withdrawn', 'success');
      setShowWithdrawForm(false);
      setAmount('');
    } catch (e: any) {
      showAlert(e.message || 'Withdraw failed', 'error');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleTogglePublicDeposits = async (allow: boolean) => {
    try {
      setIsTogglingPublicDeposits(true);
      await togglePublicDeposits(allow);
      showAlert(`Public deposits ${allow ? 'enabled' : 'disabled'}`, 'success');
    } catch (e: any) {
      showAlert(e.message || 'Toggle failed', 'error');
    } finally {
      setIsTogglingPublicDeposits(false);
    }
  };

  const renderOverview = () => (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-fade-in items-start">
      {/* Main Content Area: Valuation & Chart */}
      <div className="lg:col-span-3 space-y-10">
        {/* Valuation Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8 px-1">
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-[11px] font-bold text-white/30 tracking-tight">Vault valuation</p>
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
              <div className="text-5xl sm:text-6xl font-semibold text-white tracking-tighter">
                {`$${(treasuryData.balance * (cedraPrice || 0.08566)).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
              </div>
              <div className="text-md sm:text-lg font-medium text-[#e1fd6a]/40 tracking-tight mb-1">
                {treasuryData.balance.toFixed(0)} CEDRA
              </div>
            </div>
          </div>
          <div className="flex items-center justify-around sm:justify-end gap-6 bg-white/[0.03] px-6 py-4 rounded-3xl border border-white/5 backdrop-blur-md">
            <div className="text-center sm:text-right">
              <p className="text-[10px] text-white/20 mb-0.5 font-bold">Liquid</p>
              <p className="text-sm font-bold text-white tracking-tight">{treasuryData.balance.toFixed(2)}</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center sm:text-right">
              <p className="text-[10px] text-white/20 mb-0.5 font-bold">Staked</p>
              <p className="text-sm font-bold text-white/40 tracking-tight">{totalStaked.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="w-full h-[320px] animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center justify-between mb-6 px-2">
            <div>
              <h3 className="text-md font-semibold text-white">Asset growth</h3>
              <p className="text-[10px] text-white/30 tracking-wide font-medium">Aggregate value of all treasury deployments</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-[#e1fd6a]">${(treasuryData.balance * (cedraPrice || 0.08566)).toFixed(2)}</span>
              <p className="text-[10px] text-white/20 font-medium">Live TVL</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={treasuryHistory} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="treasuryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e1fd6a" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#e1fd6a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" hide={true} />
              <YAxis hide={true} domain={['dataMin - 10', 'auto']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(12, 12, 12, 0.9)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  fontSize: '11px',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}
                itemStyle={{ color: '#e1fd6a', fontWeight: 'bold' }}
                cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#e1fd6a"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#treasuryGradient)"
                animationDuration={1500}
                activeDot={{ r: 6, fill: '#e1fd6a', stroke: '#0c0c0c', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Right Column: Mini Control Card */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-8 flex flex-col gap-8 lg:sticky lg:top-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${treasuryData.allowsPublicDeposits ? 'bg-[#e1fd6a] animate-pulse' : 'bg-red-500'}`} />
              <h4 className="text-sm font-semibold text-white tracking-tight">
                {treasuryData.allowsPublicDeposits ? 'Public access' : 'Restricted'}
              </h4>
            </div>
            <p className="text-[11px] text-white/40 leading-relaxed font-medium">
              {isAdmin
                ? (treasuryData.allowsPublicDeposits ? 'Anyone can contribute liquidity' : 'Authenticated members only')
                : 'Treasury permissions are managed by administrators.'
              }
            </p>
          </div>

          <div className="space-y-3">
            {isWalletConnected && (treasuryData.allowsPublicDeposits || isAdmin) && (
              <button
                onClick={() => setShowDepositForm(true)}
                className="w-full py-4 bg-[#e1fd6a] hover:bg-[#d4f05a] text-black rounded-2xl font-bold text-sm transition-all active:scale-[0.97] flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                <span>Initialize deposit</span>
              </button>
            )}

            <div className="flex items-center gap-3">
              {isWalletConnected && isAdmin && (
                <button
                  onClick={() => setShowWithdrawForm(true)}
                  className="flex-1 py-4 bg-white/5 hover:bg-red-500/10 text-red-400 border border-white/5 rounded-2xl transition-all flex items-center justify-center"
                  title="Withdraw Funds"
                >
                  <Minus size={18} />
                </button>
              )}

              {isAdmin && (
                <div className="flex-1 bg-black/40 p-1 rounded-2xl border border-white/5 flex">
                  {[true, false].map(val => (
                    <button
                      key={String(val)}
                      onClick={() => handleTogglePublicDeposits(val)}
                      disabled={treasuryData.allowsPublicDeposits === val || isTogglingPublicDeposits}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-tighter transition-all ${treasuryData.allowsPublicDeposits === val
                        ? 'bg-white/10 text-white shadow-inner'
                        : 'text-white/20 hover:text-white/40'
                        }`}
                    >
                      {val ? 'Public' : 'Priv'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Micro Stats in Card */}
          <div className="pt-4 border-t border-white/5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-white/20 font-medium">Asset</span>
              <span className="text-[10px] text-white/40 font-mono">Cedra Coin</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-white/20 font-medium">Network</span>
              <span className="text-[10px] text-white/40 font-mono">Movement Network</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTransactions = () => {
    const startIndex = (transactionPage - 1) * TRANSACTIONS_PER_PAGE;
    const paginatedTransactions = transactions.slice(startIndex, startIndex + TRANSACTIONS_PER_PAGE);
    const totalPages = Math.ceil(transactions.length / TRANSACTIONS_PER_PAGE);

    return (
      <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-6 sm:p-8 w-full animate-slide-up">
        <div className="flex items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#e1fd6a]/10 text-[#e1fd6a] rounded-xl border border-[#e1fd6a]/20">
              <Clock size={20} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-xl font-semibold text-white tracking-tighter leading-none mb-1">Recent Transactions</h3>
              <p className="text-[10px] font-medium text-white/30">Protocol level liquidity</p>
            </div>
          </div>
          {transactions.length > TRANSACTIONS_PER_PAGE && (
            <div className="flex items-center gap-2">
              <button onClick={() => setTransactionPage(p => Math.max(1, p - 1))} disabled={transactionPage === 1} className="p-2 rounded-lg border border-white/10 text-white disabled:opacity-30"><ChevronLeft size={16} /></button>
              <span className="text-xs text-gray-400">Page {transactionPage} of {totalPages}</span>
              <button onClick={() => setTransactionPage(p => p + 1)} disabled={transactionPage >= totalPages} className="p-2 rounded-lg border border-white/10 text-white disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-white/[0.02]">
              <TableRow className="hover:bg-transparent border-white/5">
                <TableHead className="py-5 px-8 text-[10px] font-bold text-white/30 tracking-tight">Type</TableHead>
                <TableHead className="py-5 text-right text-[10px] font-bold text-white/30 tracking-tight">Amount</TableHead>
                <TableHead className="py-5 text-right text-[10px] font-bold text-white/30 tracking-tight">Address</TableHead>
                <TableHead className="py-5 text-right pr-8 text-[10px] font-bold text-white/30 tracking-tight">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-40 text-center text-white/20">No transactions recorded</TableCell></TableRow>
              ) : (
                paginatedTransactions.map((tx, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="flex items-center gap-3"><div className={`p-2 rounded-full ${tx.type === 'deposit' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{tx.type === 'deposit' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}</div><span className="capitalize text-xs font-medium text-white">{tx.type}</span></div></TableCell>
                    <TableCell className="text-right">
                      <span className={`text-xs font-bold ${tx.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.type === 'deposit' ? '+' : '-'}{tx.amount.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-[11px] font-mono text-white/30">{truncateAddress(tx.type === 'deposit' ? tx.from || '' : tx.to || '')}</span>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <span className="text-[11px] text-white/20 font-mono tracking-tighter">{new Date(tx.timestamp).toLocaleDateString()}</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-full space-y-12 animate-fade-in px-1">
      {renderOverview()}
      <VaultManager daoId={dao.id} treasuryObject={treasuryData.treasuryObject ?? undefined} />
      {renderTransactions()}

      {/* Reverted Deposit Modal Style */}
      {showDepositForm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60" onClick={() => setShowDepositForm(false)}>
          <div
            className="w-full max-w-md bg-[#101010] border border-white/10 rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Deposit tokens</h3>
              <XCircle className="text-white/20 cursor-pointer hover:text-white" onClick={() => setShowDepositForm(false)} />
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-medium">
                  <span className="text-white/30">Amount to deposit</span>
                  <span className="text-[#e1fd6a] cursor-pointer" onClick={() => setAmount(userBalance.toString())}>Max: {userBalance.toLocaleString()}</span>
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white text-lg font-medium outline-none focus:border-[#e1fd6a]/50"
                  placeholder="0.00"
                />
              </div>

              <button
                onClick={handleDeposit}
                disabled={!amount || parseFloat(amount) <= 0 || isDepositing}
                className="w-full bg-[#e1fd6a] text-black font-bold py-4 rounded-xl disabled:opacity-30 transition-all active:scale-[0.98]"
              >
                {isDepositing ? 'Processing...' : 'Confirm deposit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reverted Withdraw Modal Style */}
      {showWithdrawForm && isAdmin && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60" onClick={() => setShowWithdrawForm(false)}>
          <div
            className="w-full max-w-md bg-[#101010] border border-white/10 rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Withdraw assets</h3>
              <XCircle className="text-white/20 cursor-pointer hover:text-white" onClick={() => setShowWithdrawForm(false)} />
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-medium">
                  <span className="text-white/30">Amount to withdraw</span>
                  <span className="text-red-400 cursor-pointer" onClick={() => setAmount(treasuryData.balance.toString())}>Max: {treasuryData.balance.toLocaleString()}</span>
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white text-lg font-medium outline-none focus:border-red-500/50"
                  placeholder="0.00"
                />
              </div>

              <button
                onClick={handleWithdraw}
                disabled={!amount || parseFloat(amount) <= 0 || isWithdrawing}
                className="w-full bg-white/5 border border-white/10 text-red-400 font-bold py-4 rounded-xl disabled:opacity-30 transition-all active:scale-[0.98]"
              >
                {isWithdrawing ? 'Processing...' : 'Confirm withdrawal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {treasuryData.error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 flex items-start space-x-4">
          <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1"><h3 className="text-red-300 font-bold text-lg mb-1">Error</h3><p className="text-red-200/60 text-sm">{treasuryData.error}</p></div>
        </div>
      )}
    </div>
  );
};

export default DAOTreasury;