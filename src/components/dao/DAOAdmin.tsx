import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Shield, Users, Plus, Trash2, Edit, RefreshCw, Lock } from 'lucide-react';
import { DAO } from '../../types/dao';
import { useGetProfile } from '../../useServices/useProfile';
import Avatar from 'boring-avatars';
import { useWallet } from '../../contexts/CedraWalletProvider';
import { cedraClient } from '../../cedra_service/cedra-client';
import { MODULE_ADDRESS } from '../../cedra_service/constants';
import { safeView } from '../../utils/rpcUtils';
import { useAlert } from '../alert/AlertContext';
import { truncateAddress } from '../../utils/addressUtils';

interface AdminProps {
  dao: DAO;
}

interface Admin {
  address: string;
  role: 'super' | 'standard' | 'temporary';
  addedAt: string;
  expiresAt?: string;
  status: 'active' | 'expired';
}

const DAOAdmin: React.FC<AdminProps> = ({ dao }) => {
  const [_activeSection, _setActiveSection] = useState('overview');
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({
    address: '',
    role: 'standard' as 'super' | 'standard' | 'temporary',
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
  });

  const [stakeSettings, setStakeSettings] = useState({
    minStakeToJoin: 0,
    minStakeToPropose: 0,
    isLoading: false
  });
  const [showEditStake, setShowEditStake] = useState(false);
  const [_newStakeForm, _setNewStakeForm] = useState({
    minStakeToJoin: 0,
    minStakeToPropose: 0
  });
  const [newMinStake, setNewMinStake] = useState<string>('');
  const [newMinProposalStake, setNewMinProposalStake] = useState<string>('');
  const [_errors, _setErrors] = useState<{ [key: string]: string }>({});

  const { account, signAndSubmitTransaction } = useWallet();
  const { showAlert } = useAlert();
  const { data: _profileData } = useGetProfile(account?.address || null);

  const MEMBERSHIP_DECIMALS = 1e6;

  const toCEDRA = (u64: number): number => {
    if (u64 === 0) return 0;
    return u64 / MEMBERSHIP_DECIMALS;
  };
  const fromCEDRA = (val: number): number => Math.floor(val * MEMBERSHIP_DECIMALS);

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentRole, setCurrentRole] = useState<'super' | 'standard' | 'temporary' | 'none'>('none');
  const [isRefreshingAdmins, setIsRefreshingAdmins] = useState(false);

  const adminSessionCache = useMemo(() => {
    const win = window as unknown as { __adminSessionCache?: Map<string, { admins: Admin[]; isAdmin: boolean; currentRole: 'super' | 'standard' | 'temporary' | 'none'; timestamp: number }> };
    if (!win.__adminSessionCache) {
      win.__adminSessionCache = new Map();
    }
    return win.__adminSessionCache;
  }, []);
  const SESSION_TTL_MS = 10 * 60 * 1000;

  const ROLE_SUPER_ADMIN = 255;
  const ROLE_STANDARD = 100;
  const ROLE_TEMPORARY = 50;

  const mapRole = (roleNum: number): 'super' | 'standard' | 'temporary' => {
    if (roleNum === ROLE_SUPER_ADMIN) return 'super';
    if (roleNum === ROLE_STANDARD) return 'standard';
    return 'temporary';
  };



  const getDaoCreatorFromEvents = async (daoAddress: string): Promise<string | null> => {
    try {
      const events = await cedraClient.getModuleEventsByEventType({
        eventType: `${MODULE_ADDRESS}::dao_core_file::DAOCreated`,
        minimumLedgerVersion: 0
      });
      interface DAOCreatedData {
        anchor_addrxess: string;
        creator: string;
      }
      interface DAOCreatedEvent {
        data: DAOCreatedData;
      }
      const ev = (events as unknown as DAOCreatedEvent[]).find((e) => e?.data?.anchor_addrxess === daoAddress);
      return ev?.data?.creator || null;
    } catch {
      return null;
    }
  };

  const fetchAdminData = useCallback(async (showSpinner: boolean = true) => {
    if (!dao?.id) return;
    try {
      if (showSpinner) setIsRefreshingAdmins(true);

      if (account?.address) {
        const adminResult = await safeView({
          function: `${MODULE_ADDRESS}::admin::is_admin`,
          functionArguments: [dao.id, account.address]
        });

        let adminNow = Boolean(adminResult?.[0]);
        let adminRole: 'super' | 'standard' | 'temporary' = 'standard';

        if (adminNow) {
          try {
            const roleResult = await safeView({
              function: `${MODULE_ADDRESS}::admin::get_admin_role`,
              functionArguments: [dao.id, account.address]
            });
            if (roleResult?.[0] !== undefined) {
              adminRole = mapRole(Number(roleResult[0]));
            }
          } catch (_e) {
            console.warn('Failed to fetch role', _e);
          }
        } else {
          const creator = await getDaoCreatorFromEvents(dao.id);
          if (creator && creator.toLowerCase() === account.address.toLowerCase()) {
            adminNow = true;
            adminRole = 'super';
          }
        }

        setIsAdmin(adminNow);
        setCurrentRole(adminNow ? adminRole : 'none');
      }

      const addrRes = await safeView({
        function: `${MODULE_ADDRESS}::admin::get_admins`,
        functionArguments: [dao.id]
      });

      const addrs: string[] = Array.isArray(addrRes?.[0]) ? addrRes[0] : [];
      const collected: Admin[] = [];

      for (const addr of addrs) {
        try {
          const roleRes = await safeView({
            function: `${MODULE_ADDRESS}::admin::get_admin_role`,
            functionArguments: [dao.id, addr]
          });
          const roleNum = Number(roleRes?.[0] || ROLE_STANDARD);
          collected.push({
            address: addr,
            role: mapRole(roleNum),
            addedAt: 'Active Member',
            status: 'active'
          });
        } catch (e) {
          collected.push({
            address: addr,
            role: 'standard',
            addedAt: 'Active Member',
            status: 'active'
          });
        }
      }

      setAdmins(collected);
      adminSessionCache.set(dao.id, {
        admins: collected,
        isAdmin: isAdmin,
        currentRole: currentRole,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Failed to fetch admin data', error);
    } finally {
      if (showSpinner) setIsRefreshingAdmins(false);
    }
  }, [dao.id, account?.address, isAdmin, currentRole, adminSessionCache]);

  useEffect(() => {
    const cached = adminSessionCache.get(dao.id);
    if (cached && (Date.now() - cached.timestamp) < SESSION_TTL_MS) {
      setAdmins(cached.admins);
      setIsAdmin(cached.isAdmin);
      setCurrentRole(cached.currentRole);
    }
    fetchAdminData(false);
  }, [dao.id, account?.address, SESSION_TTL_MS, adminSessionCache, fetchAdminData]);

  const handleAddAdmin = async () => {
    if (!account || !signAndSubmitTransaction) return;
    const addr = newAdminForm.address.trim();
    if (!addr.startsWith('0x')) {
      showAlert('Invalid address', 'error');
      return;
    }

    try {
      const roleNum = newAdminForm.role === 'super' ? ROLE_SUPER_ADMIN : (newAdminForm.role === 'standard' ? ROLE_STANDARD : ROLE_TEMPORARY);

      let expiresInSecs = 0;
      if (newAdminForm.role === 'temporary') {
        const start = new Date(newAdminForm.startDate).getTime();
        const end = new Date(newAdminForm.endDate).getTime();
        expiresInSecs = Math.max(0, Math.floor((end - start) / 1000));

        if (expiresInSecs === 0) {
          showAlert('End time must be after start time', 'error');
          return;
        }
      }

      const payload = {
        function: `${MODULE_ADDRESS}::admin::add_admin`,
        typeArguments: [],
        functionArguments: [dao.id, addr, roleNum, expiresInSecs]
      };

      const tx = await signAndSubmitTransaction({ payload } as never);
      if (tx) {
        showAlert('Admin added successfully', 'success');
        setShowAddAdmin(false);
        fetchAdminData();
      }
    } catch (e: unknown) {
      const err = e as Error;
      showAlert(err.message || 'Failed to add admin', 'error');
    }
  };

  const handleRemoveAdmin = async (addr: string) => {
    if (!account || !signAndSubmitTransaction) return;
    try {
      const payload = {
        function: `${MODULE_ADDRESS}::admin::remove_admin`,
        typeArguments: [],
        functionArguments: [dao.id, addr]
      };
      const tx = await signAndSubmitTransaction({ payload } as never);
      if (tx) {
        showAlert('Admin removed successfully', 'success');
        fetchAdminData();
      }
    } catch (e: unknown) {
      const err = e as Error;
      showAlert(err.message || 'Failed to remove admin', 'error');
    }
  };

  const fetchStakeSettings = useCallback(async () => {
    try {
      setStakeSettings(prev => ({ ...prev, isLoading: true }));
      const [joinRes, proposeRes] = await Promise.allSettled([
        cedraClient.view({ payload: { function: `${MODULE_ADDRESS}::membership::get_min_stake`, functionArguments: [dao.id] } }),
        cedraClient.view({ payload: { function: `${MODULE_ADDRESS}::membership::get_min_proposal_stake`, functionArguments: [dao.id] } })
      ]);

      const joinRaw = Number((joinRes.status === 'fulfilled' ? (joinRes.value as unknown[])[0] : 0) || 0);
      const proposeRaw = Number((proposeRes.status === 'fulfilled' ? (proposeRes.value as unknown[])[0] : 0) || 0);

      setStakeSettings({
        minStakeToJoin: toCEDRA(joinRaw),
        minStakeToPropose: toCEDRA(proposeRaw),
        isLoading: false
      });
    } catch (e) {
      setStakeSettings(prev => ({ ...prev, isLoading: false }));
    }
  }, [dao.id]);

  useEffect(() => {
    fetchStakeSettings();
  }, [fetchStakeSettings]);

  const handleUpdateStakeSettings = async () => {
    if (!account || !signAndSubmitTransaction) return;
    try {
      const joinVal = parseFloat(newMinStake);
      const proposeVal = parseFloat(newMinProposalStake);

      if (isNaN(joinVal) && isNaN(proposeVal)) {
        showAlert('Please enter at least one valid number', 'error');
        return;
      }

      let success = false;

      if (!isNaN(joinVal) && joinVal !== stakeSettings.minStakeToJoin) {
        const joinPayload = {
          function: `${MODULE_ADDRESS}::membership::update_min_stake`,
          typeArguments: [],
          functionArguments: [dao.id, fromCEDRA(joinVal)]
        };
        await signAndSubmitTransaction({ payload: joinPayload } as never);
        success = true;
      }

      if (!isNaN(proposeVal) && proposeVal !== stakeSettings.minStakeToPropose) {
        const proposePayload = {
          function: `${MODULE_ADDRESS}::membership::update_min_proposal_stake`,
          typeArguments: [],
          functionArguments: [dao.id, fromCEDRA(proposeVal)]
        };
        await signAndSubmitTransaction({ payload: proposePayload } as never);
        success = true;
      }

      if (success) {
        showAlert('Settings updated successfully', 'success');
        fetchStakeSettings();
        setShowEditStake(false);
      } else {
        showAlert('No changes detected', 'info');
      }
    } catch (e: unknown) {
      const err = e as Error;
      showAlert(err.message || 'Update failed', 'error');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in p-4 lg:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Shield className="text-[#e1fd6a]" />
            Organization Control
          </h2>
          <p className="text-slate-400 mt-1">Manage administrators and governance parameters</p>
        </div>
        <button
          onClick={() => fetchAdminData()}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10 text-[#e1fd6a]"
        >
          <RefreshCw className={isRefreshingAdmins ? 'animate-spin' : ''} size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white/5 border border-white/5 p-6 rounded-3xl shadow-none">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Users size={20} />
                Active Administrators
              </h3>
              {isAdmin && (
                <button
                  onClick={() => setShowAddAdmin(!showAddAdmin)}
                  className="p-2 bg-[#e1fd6a] text-black rounded-lg hover:bg-opacity-90 transition-all"
                >
                  <Plus size={18} />
                </button>
              )}
            </div>

            {showAddAdmin && (
              <div className="mb-8 p-6 bg-white/[0.03] rounded-3xl border border-white/10 space-y-6 animate-slide-up shadow-none">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Admin Address</label>
                  <input
                    type="text"
                    placeholder="0x..."
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#e1fd6a] outline-none transition-all"
                    value={newAdminForm.address}
                    onChange={(e) => setNewAdminForm({ ...newAdminForm, address: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Role Type</label>
                    <select
                      className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white outline-none cursor-pointer focus:border-[#e1fd6a] transition-all"
                      value={newAdminForm.role}
                      onChange={(e) => setNewAdminForm({ ...newAdminForm, role: e.target.value as any })}
                    >
                      <option value="standard">Standard Admin</option>
                      <option value="super">Super Admin</option>
                      <option value="temporary">Temporary Admin</option>
                    </select>
                  </div>

                  {newAdminForm.role === 'temporary' && (
                    <div className="space-y-1 animate-fade-in">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">End Time</label>
                      <input
                        type="datetime-local"
                        className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#e1fd6a]"
                        value={newAdminForm.endDate}
                        onChange={(e) => setNewAdminForm({ ...newAdminForm, endDate: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={() => setShowAddAdmin(false)}
                    className="flex-1 py-4 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddAdmin}
                    className="flex-[2] py-4 bg-[#e1fd6a] text-black font-black rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Configure Authorization
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {admins.map((adm) => (
                <div key={adm.address} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full overflow-hidden border border-white/10 shrink-0">
                      <Avatar
                        name={adm.address}
                        variant="beam"
                        size={32}
                        colors={["#e1fd6a", "#a3e635", "#84cc16", "#65a30d", "#4d7c0f"]}
                      />
                    </div>
                    <div>
                      <p className="text-white font-mono text-sm">{truncateAddress(adm.address)}</p>
                      <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full ${adm.role === 'super' ? 'bg-purple-500/10 text-purple-400' :
                        adm.role === 'temporary' ? 'bg-orange-500/10 text-orange-400' :
                          'bg-blue-500/10 text-blue-400'
                        }`}>
                        {adm.role} role
                      </span>
                    </div>
                  </div>
                  {isAdmin && currentRole === 'super' && adm.address.toLowerCase() !== account?.address?.toLowerCase() && (
                    <button
                      onClick={() => handleRemoveAdmin(adm.address)}
                      className="p-2 text-red-400/40 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white/5 border border-white/5 p-6 rounded-3xl shadow-none">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Lock size={20} />
              Governance Gate
            </h3>
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-tighter">Min membership stake</span>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-white">{stakeSettings.minStakeToJoin} <span className="text-slate-600 text-xs">CEDRA</span></span>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-tighter">Min proposal stake</span>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-white">{stakeSettings.minStakeToPropose} <span className="text-slate-600 text-xs">CEDRA</span></span>
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowEditStake(!showEditStake)}
                  className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <Edit size={14} />
                  Modify Parameters
                </button>
              )}
            </div>

            {showEditStake && (
              <div className="mt-6 p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-5 animate-slide-up shadow-none">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Join Requirement (CEDRA)</label>
                  <input
                    type="number"
                    placeholder={String(stakeSettings.minStakeToJoin)}
                    value={newMinStake}
                    onChange={(e) => setNewMinStake(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#e1fd6a] outline-none transition-all"
                  />
                  <p className="text-[9px] text-slate-500 italic">Leave empty or same to keep current</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Proposal Requirement (CEDRA)</label>
                  <input
                    type="number"
                    placeholder={String(stakeSettings.minStakeToPropose)}
                    value={newMinProposalStake}
                    onChange={(e) => setNewMinProposalStake(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#e1fd6a] outline-none transition-all"
                  />
                  <p className="text-[9px] text-slate-500 italic">Leave empty or same to keep current</p>
                </div>
                <button
                  onClick={handleUpdateStakeSettings}
                  className="w-full py-4 bg-[#e1fd6a] text-black font-black rounded-xl text-xs hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Update Selected Parameters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DAOAdmin;