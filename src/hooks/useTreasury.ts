import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from '../contexts/CedraWalletProvider';
import { cedraClient } from '../cedra_service/cedra-client';
import { safeView } from '../utils/rpcUtils';
import { MODULE_ADDRESS } from '../cedra_service/constants';

interface TreasuryData {
  balance: number;
  dailyWithdrawalLimit: number;
  dailyWithdrawn: number;
  remainingDaily: number;
  lastWithdrawalDay: number;
  isLoading: boolean;
  error: string | null;
  treasuryObject?: string | null; // Store the treasury object address for object-based operations
  allowsPublicDeposits?: boolean;
}

interface TreasuryTransaction {
  type: 'deposit' | 'withdrawal';
  amount: number;
  from?: string;
  to?: string;
  timestamp: string;
  txHash: string;
}

export const useTreasury = (daoId: string) => {
  const { account, signAndSubmitTransaction } = useWallet();
  // Session cache with TTL + SWR (similar to Members)
  // Session cache with TTL + SWR (similar to Members)
  const treasurySessionCache = useMemo(() => {
    const win = window as unknown as { __treasuryHookCache?: Map<string, { data: unknown; timestamp: number }> };
    if (!win.__treasuryHookCache) {
      win.__treasuryHookCache = new Map();
    }
    return win.__treasuryHookCache;
  }, []);

  // const TREASURY_TTL_MS = 5 * 60 * 1000; // 5 minutes fresh
  const TREASURY_MAX_STALE_MS = 10 * 60 * 1000; // 10 minutes allowable stale
  const cacheBaseKey = `dao_${daoId}`;
  const cacheUserKey = `${cacheBaseKey}_user_${account?.address || 'guest'}`;

  const getCached = useCallback(<T,>(key: string): T | null => {
    const cached = treasurySessionCache.get(key);
    if (!cached) return null;
    const age = Date.now() - (cached.timestamp || 0);
    if (age < TREASURY_MAX_STALE_MS) return cached.data as T;
    return null;
  }, [treasurySessionCache]);

  const [treasuryData, setTreasuryData] = useState<TreasuryData>(() => {
    const cached = getCached<TreasuryData>(`${cacheBaseKey}_treasuryData`);
    if (cached) {
      return { ...cached, isLoading: false, error: null } as TreasuryData;
    }
    return {
      balance: 0,
      dailyWithdrawalLimit: 0,
      dailyWithdrawn: 0,
      remainingDaily: 0,
      lastWithdrawalDay: 0,
      isLoading: true,
      error: null
    };
  });

  const [transactions, setTransactions] = useState<TreasuryTransaction[]>(() => {
    const cached = getCached<TreasuryTransaction[]>(`${cacheBaseKey}_transactions`);
    return cached || [];
  });

  const [userBalance, setUserBalance] = useState<number>(() => {
    const cached = getCached<number>(`${cacheUserKey}_balance`);
    return typeof cached === 'number' ? cached : 0;
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const cached = getCached<boolean>(`${cacheUserKey}_isAdmin`);
    return typeof cached === 'boolean' ? cached : false;
  });

  // Convert OCTAS to CEDRA - using 1e8 (100,000,000) as per Cedra blockchain standard
  const toCEDRA = useCallback((octas: number): number => octas / 1e8, []);
  const fromCEDRA = useCallback((cedra: number): number => Math.floor(cedra * 1e8), []);

  // Fetch user CEDRA balance - exact same approach as DAOStaking
  const fetchUserBalance = useCallback(async () => {
    if (!account?.address) {
      setUserBalance(0);
      return;
    }

    try {
      const fetchWalletBalanceCEDRA = async (): Promise<number> => {
        if (!account?.address) return 0;
        try {
          const res = await cedraClient.getAccountResource({
            accountAddress: account.address,
            resourceType: `0x1::coin::CoinStore<0x1::cedra_coin::CedraCoin>`,
          }) as { data: { coin: { value: string } } };
          const raw = Number(res?.data?.coin?.value ?? 0);
          const mv = raw / 1e8;
          if (mv > 0) return mv;
        } catch { }
        // 2) Try generic scan of resources for any CoinStore with non-zero value
        try {
          const resources = await (cedraClient as unknown as { getAccountResources: (p: { accountAddress: string }) => Promise<Array<{ type: string; data: { coin?: { value: string } } }>> }).getAccountResources({ accountAddress: account.address });
          if (Array.isArray(resources)) {
            for (const r of resources) {
              if (typeof r?.type === 'string' && r.type.startsWith('0x1::coin::CoinStore<') && r.data?.coin?.value) {
                const rawVal = Number(r.data.coin.value || 0);
                if (rawVal > 0) return rawVal / 1e8;
              }
            }
          }
        } catch (_err) { }
        // 3) Last fallback: view function
        try {
          const balRes = await cedraClient.view({
            payload: {
              function: `0x1::coin::balance`,
              typeArguments: ["0x1::cedra_coin::CedraCoin"],
              functionArguments: [account.address],
            },
          });
          const balVal = Array.isArray(balRes) ? Number(balRes[0] || 0) : 0;
          return balVal / 1e8;
        } catch (_err) { }
        return 0;
      };

      const walletBalance = await fetchWalletBalanceCEDRA();
      setUserBalance(walletBalance);
      // cache user balance
      treasurySessionCache.set(`${cacheUserKey}_balance`, { data: walletBalance, timestamp: Date.now() });
    } catch (error) {
      console.error('Failed to fetch user balance:', error);
      setUserBalance(0);
    }
  }, [account?.address, cacheUserKey, treasurySessionCache]);

  // Check if user is admin
  const checkAdminStatus = useCallback(async () => {
    if (!account?.address || !daoId) return;

    try {
      const result = await cedraClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::admin::is_admin`,
          functionArguments: [daoId, account.address]
        }
      });
      const admin = Array.isArray(result) ? Boolean(result[0]) : false;
      setIsAdmin(admin);
      treasurySessionCache.set(`${cacheUserKey}_isAdmin`, { data: admin, timestamp: Date.now() });
    } catch (error) {
      console.warn('Failed to check admin status:', error);
      setIsAdmin(false);
    }
  }, [account?.address, daoId, cacheUserKey, treasurySessionCache]);

  // Fetch treasury transactions from activity tracker contract
  const fetchTreasuryTransactions = useCallback(async () => {
    try {
      if (!daoId) {
        setTransactions([]);
        return;
      }

      // Get DAO activity IDs from activity tracker
      const activityIdsRes = await safeView({
        function: `${MODULE_ADDRESS}::activity_tracker::get_dao_activities`,
        functionArguments: [daoId]
      });

      if (!activityIdsRes || !Array.isArray(activityIdsRes[0])) {
        setTransactions([]);
        return;
      }

      const activityIds = activityIdsRes[0] as number[];
      const txs: TreasuryTransaction[] = [];

      // Fetch each activity and filter for treasury-related ones
      for (const id of activityIds) {
        try {
          const activityRes = await safeView({
            function: `${MODULE_ADDRESS}::activity_tracker::get_activity_by_id`,
            functionArguments: [id]
          });

          if (!activityRes) continue;

          interface ActivityData {
            activity_type?: string | number;
            amount?: string | number;
            timestamp?: string | number;
            user_address?: string;
            transaction_hash?: string | string[];
          }
          const data = activityRes[0] as ActivityData;
          const activityType = Number(data?.activity_type || 0);

          // Filter for treasury activities (9 = deposit, 10 = withdrawal)
          if (activityType === 9 || activityType === 10) {
            const amount = Number(data?.amount || 0);
            const timestamp = Number(data?.timestamp || 0);
            const user = String(data?.user_address || '');
            const txHash = data?.transaction_hash ?
              (Array.isArray(data.transaction_hash) ? '' : String(data.transaction_hash)) : '';

            if (amount > 0) {
              txs.push({
                type: activityType === 9 ? 'deposit' : 'withdrawal',
                amount: toCEDRA(amount),
                from: activityType === 9 ? user : undefined,
                to: activityType === 10 ? user : undefined,
                timestamp: new Date(timestamp * 1000).toISOString(),
                txHash: txHash,
              });
            }
          }
        } catch (_err) {
          // Skip failed activity fetches
          continue;
        }
      }

      // Sort by timestamp (newest first)
      txs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setTransactions(txs);
      treasurySessionCache.set(`${cacheBaseKey}_transactions`, { data: txs, timestamp: Date.now() });
    } catch (err) {
      console.warn(' Failed to fetch treasury transactions:', err);
      setTransactions([]);
    }
  }, [daoId, toCEDRA, cacheBaseKey, treasurySessionCache]);

  // Fetch treasury data from blockchain
  const fetchTreasuryData = useCallback(async () => {
    if (!daoId) return;

    try {
      setTreasuryData(prev => ({ ...prev, isLoading: true, error: null }));
      // Fire object lookup and legacy balance in parallel for fastest first paint
      const [treasuryObjectRes, legacyBalanceRes] = await Promise.allSettled([
        safeView({ function: `${MODULE_ADDRESS}::dao_core_file::get_treasury_object`, functionArguments: [daoId] }, `treasury_obj_${daoId}`),
        safeView({ function: `${MODULE_ADDRESS}::treasury::get_balance`, functionArguments: [daoId] }, `treasury_legacy_${daoId}`),
      ]);

      let balance = 0;
      let treasuryObject: string | null = null;
      let dailyWithdrawalLimit = 0;
      let lastWithdrawalDay = 0;
      let dailyWithdrawn = 0;
      let allowsPublicDeposits = false;

      // If legacy balance is available and > 0, paint it immediately for faster UI feedback
      if (legacyBalanceRes.status === 'fulfilled') {
        const legacyVal = legacyBalanceRes.value as unknown[];
        const quickBalanceRaw = legacyVal?.[0];
        const quickBalance = Number(quickBalanceRaw || 0) / 1e8;
        if (quickBalance > 0) {
          setTreasuryData(prev => ({
            ...prev,
            balance: quickBalance,
            isLoading: false,
            error: null,
          }));
        }
      }

      // Use treasury object if available
      if (treasuryObjectRes.status === 'fulfilled' && treasuryObjectRes.value) {
        interface TreasuryObjWrapper {
          inner?: string;
          value?: string;
          address?: string;
        }
        const rawObj = (treasuryObjectRes.value as TreasuryObjWrapper[])?.[0];
        // Normalize to the underlying object address string (handles { inner, value, address } shapes)
        const objectAddress = typeof rawObj === 'string'
          ? rawObj
          : (rawObj?.inner || rawObj?.value || rawObj?.address || String(rawObj));
        treasuryObject = objectAddress;
        try {
          // Prefer full info when object is known - use the raw object directly
          const infoRes = await safeView({ function: `${MODULE_ADDRESS}::treasury::get_treasury_info`, functionArguments: [objectAddress] }, `treasury_info_${daoId}`);
          if (Array.isArray(infoRes) && infoRes.length >= 6) {
            balance = Number(infoRes[0] || 0) / 1e8;
            dailyWithdrawalLimit = Number(infoRes[1] || 0) / 1e8;
            lastWithdrawalDay = Number(infoRes[2] || 0);
            dailyWithdrawn = Number(infoRes[3] || 0) / 1e8;
            allowsPublicDeposits = Boolean(infoRes[5]);
          } else {
            // Fallback to balance-only view if needed
            const balanceResult = await safeView({ function: `${MODULE_ADDRESS}::treasury::get_balance_from_object`, functionArguments: [objectAddress] }, `treasury_obj_balance_${daoId}`);
            balance = Number(balanceResult[0] || 0) / 1e8;
          }
        } catch (_error: unknown) {
          // Silent fallback to legacy
        }
      }

      // Use legacy balance if object approach failed or unavailable
      if (balance === 0 && legacyBalanceRes.status === 'fulfilled') {
        const legacyVal = legacyBalanceRes.value as unknown[];
        const legacy = Number(legacyVal?.[0] || 0) / 1e8;
        balance = legacy;
      }

      // Fallbacks if object path unavailable
      if (dailyWithdrawalLimit === 0) {
        dailyWithdrawalLimit = 10; // default in CEDRA tokens: 10 CEDRA
      }
      const currentDay = Math.floor(Date.now() / 1000 / 86400);
      const remainingDaily = dailyWithdrawalLimit - (lastWithdrawalDay === currentDay ? dailyWithdrawn : 0);

      const newTreasuryData = {
        balance: balance > 0 ? balance : (treasuryData.balance || 0),
        dailyWithdrawalLimit,
        dailyWithdrawn,
        remainingDaily,
        lastWithdrawalDay: currentDay,
        isLoading: false,
        error: null,
        treasuryObject, // Store the treasury object for future use
        allowsPublicDeposits
      };
      setTreasuryData(prev => ({ ...prev, ...newTreasuryData }));
      treasurySessionCache.set(`${cacheBaseKey}_treasuryData`, { data: { ...newTreasuryData }, timestamp: Date.now() });

    } catch (error: unknown) {
      // Set reasonable defaults for missing treasury data
      setTreasuryData({
        balance: 0,
        dailyWithdrawalLimit: 10,
        dailyWithdrawn: 0,
        remainingDaily: 10,
        lastWithdrawalDay: Math.floor(Date.now() / 1000 / 86400),
        isLoading: false,
        error: null, // Don't show error, just display 0 balance
        allowsPublicDeposits: true
      });
    }
  }, [daoId, treasuryData.balance, cacheBaseKey, treasurySessionCache]);

  // Deposit tokens to treasury
  const deposit = useCallback(async (amount: number): Promise<boolean> => {
    if (!account || !signAndSubmitTransaction || !daoId) {
      throw new Error('Wallet not connected or DAO ID missing');
    }

    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (amount > userBalance) {
      throw new Error(`Insufficient balance. You have ${userBalance.toFixed(3)} CEDRA available`);
    }

    try {
      const amountOctas = Math.floor(amount * 1e8);

      // Ensure user has CedraCoin store
      // Some networks/wallets do not expose an entry function for coin registration.
      // In such cases, receiving any amount of CEDRA auto-creates the store.
      try {
        await cedraClient.getAccountResource({
          accountAddress: account.address,
          resourceType: `0x1::coin::CoinStore<0x1::cedra_coin::CedraCoin>`,
        });
      } catch (e) {
        console.log('CedraCoin store not found; skipping in-app registration.');
      }

      // Get treasury object
      let treasuryObject = treasuryData.treasuryObject;

      if (!treasuryObject) {
        try {
          const objectResult = await cedraClient.view({
            payload: {
              function: `${MODULE_ADDRESS}::dao_core_file::get_treasury_object`,
              functionArguments: [daoId]
            }
          });
          treasuryObject = Array.isArray(objectResult) ? String(objectResult[0]) : null;
          if (treasuryObject) {
            setTreasuryData(prev => ({ ...prev, treasuryObject }));
          }
        } catch (_error) {
          console.error('Failed to fetch treasury object:', _error);
        }
      }

      // Use object-based deposit if treasury object is available
      let payload;
      if (treasuryObject) {
        const objectAddress = typeof treasuryObject === 'string'
          ? treasuryObject
          : (treasuryObject as { inner?: string; value?: string }).inner || (treasuryObject as { inner?: string; value?: string }).value || String(treasuryObject);

        payload = {
          function: `${MODULE_ADDRESS}::treasury::deposit_to_object_typed`,
          type_arguments: ['0x1::cedra_coin::CedraCoin'],
          typeArguments: ['0x1::cedra_coin::CedraCoin'],
          functionArguments: [objectAddress, amountOctas.toString()],
          arguments: [objectAddress, amountOctas.toString()],
        };
      } else {
        payload = {
          function: `${MODULE_ADDRESS}::treasury::deposit`,
          typeArguments: [],
          functionArguments: [daoId, amountOctas.toString()],
        };
      }

      const tx = await signAndSubmitTransaction({ payload } as never);
      if (!tx || !(tx as { hash: string }).hash) {
        throw new Error('Transaction cancelled by user');
      }
      if (tx && (tx as { hash: string }).hash) {
        await cedraClient.waitForTransaction({
          transactionHash: (tx as { hash: string }).hash,
          options: { checkSuccess: true }
        });
      }

      await Promise.all([fetchTreasuryData(), fetchUserBalance(), fetchTreasuryTransactions()]);
      return true;

    } catch (error: unknown) {
      const err = error as Error;
      console.error('Deposit failed:', err);

      if (err.message?.includes('User rejected')) {
        throw new Error('Transaction cancelled by user');
      } else if (err.message?.includes('not an entry function')) {
        throw new Error('Wallet error: attempted to call a non-entry function. Please try again.');
      } else if (err.message?.includes('insufficient') || err.message?.includes('0x6507')) {
        throw new Error('Insufficient CEDRA balance for transaction and gas fees');
      } else if (err.message?.includes('0x97') || err.message?.includes('not_member')) {
        const publicDepositsStatus = treasuryData.allowsPublicDeposits ? 'enabled' : 'disabled';
        throw new Error(`Deposit denied: You must be a DAO member or admin to deposit. Public deposits are currently ${publicDepositsStatus}. ${treasuryData.allowsPublicDeposits ? 'This may be a contract bug - public deposits should allow anyone to deposit.' : 'Ask a DAO admin to enable public deposits or join as a member first.'}`);
      } else if (err.message?.includes('0xa') || err.message?.includes('already_exists')) {
        throw new Error('Object or resource already exists. This may be due to an invalid treasury object format or a duplicate registration.');
      } else if (err.message?.includes('0x8') || err.message?.includes('not_found')) {
        throw new Error('Treasury not found. This DAO may use a newer treasury system that requires different deposit methods.');
      } else if (err.message?.includes('0x1') || err.message?.includes('not_admin')) {
        throw new Error('Permission denied. You may not have the required permissions to deposit to this treasury.');
      } else {
        throw new Error(err.message || 'Deposit transaction failed');
      }
    }
  }, [account, signAndSubmitTransaction, daoId, userBalance, fetchTreasuryData, fetchUserBalance]);

  // Withdraw tokens from treasury (admin only)
  const withdraw = useCallback(async (amount: number): Promise<boolean> => {
    if (!account || !signAndSubmitTransaction || !daoId) {
      throw new Error('Wallet not connected or DAO ID missing');
    }

    if (!isAdmin) {
      throw new Error('Only DAO admins can withdraw from treasury');
    }

    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (amount > treasuryData.balance) {
      throw new Error(`Insufficient treasury balance. Available: ${treasuryData.balance.toFixed(3)} CEDRA`);
    }

    if (amount > treasuryData.remainingDaily) {
      throw new Error(`Exceeds daily withdrawal limit. Remaining today: ${treasuryData.remainingDaily.toFixed(3)} CEDRA`);
    }

    try {
      const amountOctas = Math.floor(amount * 1e8);

      // Use object-based withdraw function
      let payload;
      if (treasuryData.treasuryObject) {
        const objectAddress = typeof treasuryData.treasuryObject === 'string'
          ? treasuryData.treasuryObject
          : (treasuryData.treasuryObject as { inner?: string; value?: string }).inner || (treasuryData.treasuryObject as { inner?: string; value?: string }).value || String(treasuryData.treasuryObject);

        payload = {
          function: `${MODULE_ADDRESS}::treasury::withdraw_from_object`,
          typeArguments: [],
          functionArguments: [daoId, objectAddress, amountOctas.toString()],
        };
      } else {
        payload = {
          function: `${MODULE_ADDRESS}::treasury::withdraw`,
          typeArguments: [],
          functionArguments: [daoId, amountOctas.toString()],
        };
      }

      const tx = await signAndSubmitTransaction({ payload } as never);
      if (!tx || !(tx as { hash: string }).hash) {
        throw new Error('Transaction cancelled by user');
      }
      if (tx && (tx as { hash: string }).hash) {
        await cedraClient.waitForTransaction({
          transactionHash: (tx as { hash: string }).hash,
          options: { checkSuccess: true }
        });
      }

      // Refresh data
      await Promise.all([fetchTreasuryData(), fetchUserBalance(), fetchTreasuryTransactions()]);
      return true;

    } catch (error: unknown) {
      const err = error as Error;
      console.error('Withdrawal failed:', err);

      if (err.message?.includes('User rejected')) {
        throw new Error('Transaction cancelled by user');
      } else if (err.message?.includes('not_admin') || err.message?.includes('0x1')) {
        throw new Error('Only DAO admins can withdraw from treasury');
      } else if (err.message?.includes('withdrawal_limit_exceeded')) {
        throw new Error('Daily withdrawal limit exceeded');
      } else if (err.message?.includes('insufficient_treasury')) {
        throw new Error('Insufficient treasury balance');
      } else if (err.message?.includes('0x8') || err.message?.includes('not_found')) {
        throw new Error('Treasury not found. This DAO may use a newer treasury system that requires different withdrawal methods.');
      } else {
        throw new Error(err.message || 'Withdrawal transaction failed');
      }
    }
  }, [account, signAndSubmitTransaction, daoId, isAdmin, treasuryData.balance, treasuryData.remainingDaily, fetchTreasuryData, fetchUserBalance]);

  // Initialize data fetching with timeout protection
  useEffect(() => {
    if (daoId) {
      // Always fetch treasury data - this includes balance and basic info
      const basicTasks = [fetchTreasuryData(), fetchTreasuryTransactions()];

      // Add wallet-specific tasks only if connected
      const allTasks = account?.address
        ? [...basicTasks, fetchUserBalance(), checkAdminStatus()]
        : basicTasks;

      // Add timeout to prevent hanging on slow network (increased to 15 seconds)
      Promise.race([
        Promise.all(allTasks),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Treasury data fetch timeout')), 15000))
      ]).catch(() => {
        // Silent - data will still be available even if some requests timeout
      });
    }
  }, [daoId, account?.address, fetchTreasuryData, fetchUserBalance, checkAdminStatus, fetchTreasuryTransactions]);

  // Refresh data every 60 seconds
  useEffect(() => {
    if (!daoId) return;

    const interval = setInterval(() => {
      // Always refresh treasury data and transactions
      const basicTasks = [fetchTreasuryData(), fetchTreasuryTransactions()];

      // Add wallet-specific refresh only if connected
      const allTasks = account?.address
        ? [...basicTasks, fetchUserBalance(), checkAdminStatus()]
        : basicTasks;

      Promise.all(allTasks);
    }, 60000);

    return () => clearInterval(interval);
  }, [daoId, account?.address, fetchTreasuryData, fetchUserBalance, checkAdminStatus, fetchTreasuryTransactions]);

  // Toggle public deposits (admin only)
  const togglePublicDeposits = useCallback(async (allow: boolean): Promise<boolean> => {
    if (!account || !signAndSubmitTransaction || !daoId) {
      throw new Error('Wallet not connected or DAO ID missing');
    }

    if (!isAdmin) {
      throw new Error('Only DAO admins can change public deposit settings');
    }

    try {
      // Fetch treasury object if not available
      let treasuryObject = treasuryData.treasuryObject;

      if (!treasuryObject) {
        try {
          const objectResult = await safeView(
            { function: `${MODULE_ADDRESS}::dao_core_file::get_treasury_object`, functionArguments: [daoId] },
            `treasury_obj_refresh_${daoId}`
          );
          treasuryObject = Array.isArray(objectResult) ? String(objectResult[0]) : null;
          if (treasuryObject) {
            setTreasuryData(prev => ({ ...prev, treasuryObject }));
          }
        } catch (_error) {
          // Silent fail, will throw error below if still not found
        }
      }

      if (!treasuryObject) {
        throw new Error('Treasury object not found. The DAO may not have a treasury initialized yet.');
      }

      const objectAddress = typeof treasuryObject === 'string'
        ? treasuryObject
        : (treasuryObject as { inner?: string; value?: string }).inner || (treasuryObject as { inner?: string; value?: string }).value || String(treasuryObject);

      const payload = {
        function: `${MODULE_ADDRESS}::treasury::set_public_deposits`,
        typeArguments: [],
        functionArguments: [daoId, objectAddress, allow],
      };

      const tx = await signAndSubmitTransaction({ payload } as never);
      if (tx && (tx as { hash: string }).hash) {
        await cedraClient.waitForTransaction({
          transactionHash: (tx as { hash: string }).hash,
          options: { checkSuccess: true }
        });
      }

      // Refresh treasury data to get updated public deposits setting
      await fetchTreasuryData();
      return true;

    } catch (error: unknown) {
      const err = error as Error;
      console.error('Toggle public deposits failed:', err);

      if (err.message?.includes('User rejected')) {
        throw new Error('Transaction cancelled by user');
      } else if (err.message?.includes('not_admin') || err.message?.includes('0x1')) {
        throw new Error('Only DAO admins can change public deposit settings');
      } else if (err.message?.includes('0x8') || err.message?.includes('not_found')) {
        throw new Error('Treasury not found. Cannot update public deposit settings.');
      } else {
        throw new Error(err.message || 'Failed to update public deposit settings');
      }
    }
  }, [account, signAndSubmitTransaction, daoId, isAdmin, treasuryData.treasuryObject, fetchTreasuryData]);

  // Vault-related functions
  const depositToDAOVault = useCallback(async (vaultAddress: string, amount: number): Promise<boolean> => {
    if (!account || !signAndSubmitTransaction || !treasuryData.treasuryObject) {
      throw new Error('Wallet not connected or treasury not available');
    }

    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    try {
      const amountRaw = Math.floor(amount * 1e6);

      const objectAddress = typeof treasuryData.treasuryObject === 'string'
        ? treasuryData.treasuryObject
        : (treasuryData.treasuryObject as { inner?: string; value?: string }).inner || (treasuryData.treasuryObject as { inner?: string; value?: string }).value || String(treasuryData.treasuryObject);

      const payload = {
        function: `${MODULE_ADDRESS}::treasury::user_deposit_to_vault`,
        typeArguments: [],
        functionArguments: [objectAddress, vaultAddress, amountRaw.toString()],
      };

      const tx = await signAndSubmitTransaction({ payload } as never);
      if (tx && (tx as { hash: string }).hash) {
        await cedraClient.waitForTransaction({
          transactionHash: (tx as { hash: string }).hash,
          options: { checkSuccess: true }
        });
      }

      return true;

    } catch (error: unknown) {
      const err = error as Error;
      console.error('Vault deposit failed:', err);

      if (err.message?.includes('User rejected')) {
        throw new Error('Transaction cancelled by user');
      } else if (err.message?.includes('not_member')) {
        throw new Error('You must be a DAO member to deposit to vaults');
      } else if (err.message?.includes('insufficient')) {
        throw new Error('Insufficient token balance');
      } else {
        throw new Error(err.message || 'Vault deposit failed');
      }
    }
  }, [account, signAndSubmitTransaction, treasuryData.treasuryObject]);

  const getDAOVaults = useCallback(async (): Promise<string[]> => {
    if (!treasuryData.treasuryObject) return [];

    try {
      const result = await cedraClient.view({
        payload: {
          function: `${MODULE_ADDRESS}::treasury::get_dao_vaults`,
          functionArguments: [treasuryData.treasuryObject]
        }
      });
      return (result[0] as string[]) || [];
    } catch (error) {
      console.warn('Failed to fetch DAO vaults:', error);
      return [];
    }
  }, [treasuryData.treasuryObject]);

  const refreshData = useCallback(() => Promise.all([fetchTreasuryData(), fetchUserBalance(), checkAdminStatus(), fetchTreasuryTransactions()]), [fetchTreasuryData, fetchUserBalance, checkAdminStatus, fetchTreasuryTransactions]);

  return {
    treasuryData,
    transactions,
    userBalance,
    isAdmin,
    deposit,
    withdraw,
    togglePublicDeposits,
    depositToDAOVault,
    getDAOVaults,
    refreshData,
    toCEDRA,
    fromCEDRA
  };
};