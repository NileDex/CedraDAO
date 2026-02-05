import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Zap, Rocket, Wallet, AlertTriangle, Crown, Star, Sparkles, Settings, Shield } from 'lucide-react';
import { DAO } from '../../types/dao';
import { useWallet } from '../../contexts/CedraWalletProvider';
import { useAlert } from '../alert/AlertContext';
import { cedraClient } from '../../cedra_service/cedra-client';
import { MODULE_ADDRESS } from '../../cedra_service/constants';
import { safeView } from '../../utils/rpcUtils';
import { BalanceService } from '../../useServices/useBalance';

interface DAOBoostProps {
    dao: DAO;
}

interface BadgeInfo {
    purchasedAt: number;
    expiresAt: number;
    durationMonths: number;
    isActive: boolean;
}

const StepIndicator: React.FC<{ activeStep: number }> = ({ activeStep }) => {
    const steps = [
        { icon: Sparkles, label: 'Explore' },
        { icon: Settings, label: 'Manage' },
        { icon: Shield, label: 'Boost' }
    ];

    return (
        <div className="flex items-center justify-center w-full max-w-md mx-auto mb-8 md:mb-12 relative px-4">
            <div className="absolute top-1/2 left-4 right-4 h-[1px] bg-white/10 -translate-y-1/2" />
            <div className="flex justify-between w-full relative z-10">
                {steps.map((step, i) => {
                    const Icon = step.icon;
                    const isActive = i <= activeStep;
                    const isCurrent = i === activeStep;

                    return (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <div
                                className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${isCurrent
                                    ? 'bg-[#e1fd6a] text-black border-[#e1fd6a] shadow-[0_0_20px_rgba(225,253,106,0.4)]'
                                    : isActive
                                        ? 'bg-[#1a1a1e] text-[#e1fd6a] border-[#e1fd6a]/30'
                                        : 'bg-[#0d0d10] text-slate-600 border-white/5'
                                    }`}
                            >
                                <Icon size={18} className={isCurrent ? 'fill-current' : ''} />
                            </div>
                            <span className={`text-[8px] font-black ${isCurrent ? 'text-white' : 'text-slate-600'}`}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const DAOBoost: React.FC<DAOBoostProps> = ({ dao }) => {
    const { account, signAndSubmitTransaction } = useWallet();
    const { showAlert } = useAlert();

    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
    const [isProcessing, setIsProcessing] = useState(false);
    const [badgeInfo, setBadgeInfo] = useState<BadgeInfo | null>(null);
    const [pricing, setPricing] = useState<{ monthly: number; yearly: number }>({ monthly: 50, yearly: 600 });
    const [isLoading, setIsLoading] = useState(true);

    const fetchBadgeData = useCallback(async () => {
        try {
            setIsLoading(true);
            console.log('Fetching badge pricing from:', `${MODULE_ADDRESS}::featured::get_badge_pricing`);
            const pricingRes = await safeView({
                function: `${MODULE_ADDRESS}::featured::get_badge_pricing`,
                functionArguments: []
            }, 'badge_pricing');

            console.log('Pricing result raw:', pricingRes);

            if (pricingRes && pricingRes.length >= 2) {
                const fetchedMonthly = Number(pricingRes[0]) / 1e8;
                const fetchedYearly = Number(pricingRes[1]) / 1e8;

                console.log('Calculated pricing:', { fetchedMonthly, fetchedYearly });

                // If values are extremely small (likely due to decimal mismatch), use defaults or raw values
                if (fetchedMonthly > 0) {
                    setPricing({
                        monthly: fetchedMonthly < 0.001 ? Number(pricingRes[0]) : fetchedMonthly,
                        yearly: fetchedYearly < 0.001 ? Number(pricingRes[1]) : fetchedYearly
                    });
                }
            }

            const infoRes = await safeView({
                function: `${MODULE_ADDRESS}::featured::get_badge_info`,
                functionArguments: [dao.id]
            }, `badge_info_${dao.id}`);

            if (infoRes && infoRes.length >= 4) {
                setBadgeInfo({
                    purchasedAt: Number(infoRes[0]),
                    expiresAt: Number(infoRes[1]),
                    durationMonths: Number(infoRes[2]),
                    isActive: Boolean(infoRes[3])
                });
            }
        } catch (error: unknown) {
            console.warn('Failed to fetch badge data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [dao.id]);

    useEffect(() => {
        fetchBadgeData();
    }, [fetchBadgeData]);

    const handleActivateBoost = async () => {
        if (!account || !signAndSubmitTransaction) {
            showAlert('Please connect your wallet first', 'error');
            return;
        }

        try {
            setIsProcessing(true);
            const isYearly = selectedPlan === 'yearly';
            const price = isYearly ? pricing.yearly : pricing.monthly;

            const balanceCheck = await BalanceService.hasSufficientBalance(account.address, price, 0.05);
            if (!balanceCheck.sufficient) {
                showAlert(`Insufficient balance. Required: ${price} CEDRA.`, 'error');
                setIsProcessing(false);
                return;
            }

            const payload = {
                function: `${MODULE_ADDRESS}::featured::purchase_featured_badge`,
                typeArguments: [],
                functionArguments: [dao.id, isYearly],
            };

            const tx = await signAndSubmitTransaction({ payload } as never);

            if (tx && (tx as { hash: string }).hash) {
                showAlert('Purchase transaction submitted!', 'success');
                await cedraClient.waitForTransaction({
                    transactionHash: (tx as { hash: string }).hash,
                    options: { checkSuccess: true }
                });
                showAlert('Successfully boosted your DAO!', 'success');
                await fetchBadgeData();
            }
        } catch (error: unknown) {
            const err = error as Error;
            console.error('Boost purchase failed:', err);
            showAlert(err.message || 'Failed to purchase boost', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const formatDate = (timestamp: number) => {
        if (timestamp === 0) return 'N/A';
        return new Date(timestamp * 1000).toLocaleDateString();
    };

    return (
        <div className="w-full max-w-5xl mx-auto space-y-8 md:space-y-12 py-4 md:py-8 animate-fade-in px-4">
            <StepIndicator activeStep={2} />

            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#e1fd6a]/10 border border-[#e1fd6a]/20 text-[#e1fd6a] text-[10px] font-black">
                    <Rocket size={12} />
                    Boost visibility
                </div>
                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight px-4 transition-all">
                    Grow Your Community
                </h1>
                <p className="text-slate-400 max-w-2xl mx-auto font-medium text-sm md:text-base px-6">
                    Get featured on the homepage to attract more members, proposals, and liquidity to your organization.
                </p>
            </div>

            <div className="nb-card !bg-[#131317] border-white/5 p-6 md:p-8 max-w-3xl mx-auto">
                {!account ? (
                    <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 text-center md:text-left">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                            <Wallet className="w-8 h-8 md:w-10 md:h-10 text-slate-500" />
                        </div>
                        <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 justify-center md:justify-start">
                                <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse" />
                                <span className="text-[10px] font-black text-slate-500">Disconnected</span>
                            </div>
                            <h3 className="text-xl md:text-2xl font-black text-white">Connect Wallet to Begin</h3>
                            <p className="text-slate-500 text-xs md:text-sm">Manage and boost your organizations from here.</p>
                        </div>
                        <div className="hidden md:block">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 opacity-50 select-none">
                                <Rocket className="w-12 h-12 text-slate-600" />
                            </div>
                        </div>
                    </div>
                ) : badgeInfo?.isActive ? (
                    <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 text-center md:text-left">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-[#e1fd6a]/10 flex items-center justify-center border border-[#e1fd6a]/20 shrink-0">
                            <Crown className="w-8 h-8 md:w-10 md:h-10 text-[#e1fd6a]" />
                        </div>
                        <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 justify-center md:justify-start">
                                <div className="w-2 h-2 rounded-full bg-[#e1fd6a] animate-pulse" />
                                <span className="text-[10px] font-black text-[#e1fd6a]">Featured active</span>
                            </div>
                            <h3 className="text-xl md:text-2xl font-black text-white">Your DAO is Currently Featured</h3>
                            <p className="text-slate-500 text-xs md:text-sm">Enjoy increased visibility until {formatDate(badgeInfo.expiresAt)}.</p>
                        </div>
                        <div className="w-full md:w-auto px-6 py-3 bg-[#e1fd6a]/10 border border-[#e1fd6a]/20 rounded-xl">
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] font-black text-[#e1fd6a]">Expires in</span>
                                <span className="text-lg font-black text-white transition-all">
                                    {Math.ceil((badgeInfo.expiresAt - Math.floor(Date.now() / 1000)) / 86400)} Days
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 text-center md:text-left">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                            <Zap className="w-8 h-8 md:w-10 md:h-10 text-blue-400" />
                        </div>
                        <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 justify-center md:justify-start">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-[10px] font-black text-blue-400">Ready to boost</span>
                            </div>
                            <h3 className="text-xl md:text-2xl font-black text-white">Select a Plan to Start</h3>
                            <p className="text-slate-500 text-xs md:text-sm">Choose the best visibility option for {dao.name}.</p>
                        </div>
                        <div className="relative hidden md:block">
                            <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                                <Rocket className="w-12 h-12 text-blue-400" />
                            </div>
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center border-4 border-[#131317]">
                                <Star size={10} className="text-white fill-current" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="text-center space-y-8 md:space-y-12">
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Standard plans</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto px-2">
                    {/* Monthly Plan */}
                    <div
                        onClick={() => setSelectedPlan('monthly')}
                        className={`relative group cursor-pointer transition-all duration-300 ${selectedPlan === 'monthly'
                            ? 'scale-100 md:scale-105 ring-2 ring-blue-500 ring-offset-4 md:ring-offset-8 ring-offset-[#0d0d10]'
                            : 'opacity-70 hover:opacity-100'
                            }`}
                    >
                        <div className="nb-card !bg-[#131317] border-white/5 p-8 md:p-10 h-full flex flex-col space-y-6 md:space-y-8 rounded-[32px] md:rounded-[40px]">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                <span className="text-xs font-black text-slate-400 text-left">Monthly plan</span>
                            </div>

                            <div className="flex items-baseline gap-2">
                                <span className="text-6xl md:text-7xl font-black text-white tracking-tighter">
                                    {isLoading ? '...' : (pricing.monthly || 50)}
                                </span>
                                <div className="flex flex-col">
                                    <span className="text-orange-400 text-sm md:text-base font-black italic tracking-tighter">CEDRA</span>
                                    <span className="text-[10px] md:text-xs font-black text-slate-500">/ mo</span>
                                </div>
                            </div>

                            <div className="space-y-3 md:space-y-4 pt-2 flex-1 text-left">
                                {[
                                    'Priority homepage listing',
                                    'Standard verified badge',
                                    'Flexible month-to-month',
                                    'Increased discovery rate'
                                ].map((feature, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-4 h-4 md:w-5 md:h-5 rounded-md bg-orange-500/10 flex items-center justify-center shrink-0">
                                            <Plus className="w-2.5 h-2.5 text-orange-500" />
                                        </div>
                                        <span className="text-xs md:text-sm font-bold text-slate-300">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <button className={`w-full py-4 md:py-5 rounded-2xl font-black text-xs transition-all ${selectedPlan === 'monthly' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'bg-white/5 text-slate-400 border border-white/10'
                                }`}>
                                {selectedPlan === 'monthly' ? 'Selected Plan' : 'Select Plan'}
                            </button>
                        </div>
                    </div>

                    {/* Yearly Plan */}
                    <div
                        onClick={() => setSelectedPlan('yearly')}
                        className={`relative group cursor-pointer transition-all duration-300 mt-4 md:mt-0 ${selectedPlan === 'yearly'
                            ? 'scale-100 md:scale-105 ring-2 ring-[#e1fd6a] ring-offset-4 md:ring-offset-8 ring-offset-[#0d0d10]'
                            : 'opacity-70 hover:opacity-100'
                            }`}
                    >
                        <div className="absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2 z-10 transition-transform group-hover:scale-110">
                            <div className="bg-[#e1fd6a] text-[#0d0d10] text-[8px] md:text-[9px] font-black px-3 md:px-4 py-1.5 rounded-full shadow-lg shadow-[#e1fd6a]/20">
                                Recommended plan
                            </div>
                        </div>

                        <div className="nb-card !bg-[#131317] border-white/5 p-8 md:p-10 h-full flex flex-col space-y-6 md:space-y-8 rounded-[32px] md:rounded-[40px]">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-[#e1fd6a] shadow-[0_0_10px_rgba(225,253,106,0.5)]" />
                                <span className="text-xs font-black text-slate-400 text-left">Best value plan</span>
                            </div>

                            <div className="flex items-baseline gap-2">
                                <span className="text-6xl md:text-7xl font-black text-white tracking-tighter">
                                    {isLoading ? '...' : (pricing.yearly || 600)}
                                </span>
                                <div className="flex flex-col">
                                    <span className="text-[#e1fd6a] text-sm md:text-base font-black italic tracking-tighter">CEDRA</span>
                                    <span className="text-[10px] md:text-xs font-black text-slate-500">/ yr</span>
                                </div>
                            </div>

                            <div className="space-y-3 md:space-y-4 pt-2 flex-1 text-left">
                                {[
                                    'Permanent homepage spot',
                                    'Premium gold badge',
                                    'Save over 15% yearly',
                                    '10x Discovery visibility',
                                    'Full verification status'
                                ].map((feature, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-4 h-4 md:w-5 md:h-5 rounded-md bg-[#e1fd6a]/10 flex items-center justify-center shrink-0">
                                            <Plus className="w-2.5 h-2.5 text-[#e1fd6a]" />
                                        </div>
                                        <span className="text-xs md:text-sm font-bold text-slate-300">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <button className={`w-full py-4 md:py-5 rounded-2xl font-black text-xs transition-all ${selectedPlan === 'yearly' ? 'bg-[#e1fd6a] text-black shadow-xl shadow-[#e1fd6a]/20' : 'bg-white/5 text-slate-400 border border-white/10'
                                }`}>
                                {selectedPlan === 'yearly' ? 'Selected Plan' : 'Select Plan'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-center gap-6 pt-8 md:pt-12 pb-12">
                <button
                    onClick={handleActivateBoost}
                    disabled={isProcessing || !account}
                    className="w-full max-w-sm py-4 md:py-6 bg-white text-black text-xs md:text-sm font-black rounded-2xl shadow-2xl hover:bg-[#edf6fb] transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isProcessing ? 'Processing...' : 'Activate Boost'}
                </button>

                {!account && (
                    <div className="flex items-center gap-2 text-slate-500">
                        <AlertTriangle size={14} />
                        <span className="text-[10px] font-bold">Wallet connection required</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const Plus = ({ className, size = 12 }: { className?: string, size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);

export default DAOBoost;
