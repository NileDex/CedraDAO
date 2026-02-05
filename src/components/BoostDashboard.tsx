import React, { useState } from 'react';
import { Rocket, Search, Zap, ArrowRight, Sparkles, Settings, Shield } from 'lucide-react';
import { useFetchCreatedDAOs } from '../useServices/useFetchDAOs';
import { DAO } from '../types/dao';
import DAOBoost from './dao/DAOBoost';

const StepIndicator: React.FC<{ activeStep: number }> = ({ activeStep }) => {
    const steps = [
        { icon: Sparkles, label: 'Explore' },
        { icon: Settings, label: 'Manage' },
        { icon: Shield, label: 'Boost' }
    ];

    return (
        <div className="flex items-center justify-center w-full max-w-md mx-auto mb-16 md:mb-24 relative px-4">
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
                                        : 'bg-[#1c1d21] text-white/20 border-white/5'
                                    }`}
                            >
                                <Icon size={18} className={isCurrent ? 'fill-current' : ''} />
                            </div>
                            <span className={`text-[10px] font-bold ${isCurrent ? 'text-white' : 'text-white/20'}`}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const BoostDashboard: React.FC = () => {
    const { daos, isLoading } = useFetchCreatedDAOs();
    const [selectedDAO, setSelectedDAO] = useState<DAO | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [manualAddress, setManualAddress] = useState('');

    const filteredDAOs = daos.filter(dao =>
        dao.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dao.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleManualProceed = () => {
        if (!manualAddress.startsWith('0x')) {
            alert('Please enter a valid address (starting with 0x)');
            return;
        }
        // Create a dummy DAO object to proceed to pricing
        const dummyDAO: DAO = {
            id: manualAddress,
            name: 'Custom Organization',
            description: 'Manually selected address',
            image: '',
            background: '',
            chain: 'Cedra',
            tokenName: 'DAO',
            tokenSymbol: 'DAO',
            tvl: '0',
            proposals: 0,
            members: 0,
            established: new Date().toLocaleDateString(),
            category: 'featured',
            isFollowing: false
        };
        setSelectedDAO(dummyDAO);
    };

    if (selectedDAO) {
        return (
            <div className="container mx-auto px-8 md:px-12 py-12 space-y-6">
                <button
                    onClick={() => setSelectedDAO(null)}
                    className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-[10px] font-bold"
                >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                    Back to Selection
                </button>
                <DAOBoost dao={selectedDAO} />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-8 md:px-12 py-12 space-y-8 md:space-y-12 animate-fade-in">
            <StepIndicator activeStep={1} />

            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#e1fd6a]/10 border border-[#e1fd6a]/20 text-[#e1fd6a] text-[10px] font-bold">
                    <Zap size={12} />
                    Promotion Hub
                </div>
                <h1 className="text-3xl md:text-5xl font-semibold text-white tracking-tight">Boost Your Organization</h1>
                <p className="text-white/40 max-w-2xl mx-auto font-medium text-sm md:text-base px-6">
                    Select an organization to manage its featured status and visibility.
                </p>
            </div>

            <div className="bg-[#1c1d21] border border-white/5 rounded-[24px] md:rounded-[32px] overflow-hidden shadow-2xl">
                <div className="p-6 md:p-8 border-b border-white/5 bg-white/[0.02] flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <h2 className="text-xl font-semibold text-white tracking-tight">Select Organization</h2>
                        <p className="text-[10px] font-medium text-white/30">Only admins can manage boost settings</p>
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input
                            type="text"
                            placeholder="Filter by name or address..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-xs font-medium text-white focus:border-[#e1fd6a]/30 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="p-4 md:p-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-10 h-10 border-2 border-[#e1fd6a]/20 border-t-[#e1fd6a] rounded-full animate-spin" />
                            <span className="text-[10px] font-medium text-white/30">Loading Ecosystem...</span>
                        </div>
                    ) : filteredDAOs.length === 0 ? (
                        <div className="text-center py-12 space-y-6">
                            <div className="space-y-2">
                                <p className="text-white/40 text-sm font-bold">No organizations found</p>
                                <p className="text-xs text-white/20">Enter a DAO address manually to proceed</p>
                            </div>

                            <div className="max-w-md mx-auto flex gap-2">
                                <input
                                    type="text"
                                    placeholder="0x..."
                                    value={manualAddress}
                                    onChange={(e) => setManualAddress(e.target.value)}
                                    className="flex-1 bg-[#0d0d10] border border-white/10 rounded-xl py-3 px-4 text-xs font-medium text-white focus:border-[#e1fd6a]/30 outline-none transition-all"
                                />
                                <button
                                    onClick={handleManualProceed}
                                    className="bg-[#e1fd6a] text-black px-6 py-3 rounded-xl text-[10px] font-black hover:scale-105 transition-all"
                                >
                                    Proceed
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredDAOs.map((dao) => (
                                <div
                                    key={dao.id}
                                    onClick={() => setSelectedDAO(dao)}
                                    className="group bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-[#e1fd6a]/30 rounded-[20px] md:rounded-[24px] p-5 md:p-6 transition-all cursor-pointer flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl overflow-hidden bg-white/5 border border-white/10 shrink-0">
                                            {dao.image ? (
                                                <img src={dao.image} alt={dao.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-lg md:text-xl font-black text-white bg-slate-800">
                                                    {dao.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-semibold text-white truncate group-hover:text-[#e1fd6a] transition-colors tracking-tight">
                                                {dao.name}
                                            </h3>
                                            <p className="text-[10px] font-medium text-white/30 truncate">{dao.id.slice(0, 10)}...</p>
                                        </div>
                                    </div>
                                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 group-hover:bg-[#e1fd6a]/20 group-hover:text-[#e1fd6a] transition-all">
                                        <Rocket size={16} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BoostDashboard;
