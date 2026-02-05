import React, { useState } from 'react';
import {
  ArrowLeft, Upload, Sparkles, Shield, Settings,
  CheckCircle2, AlertTriangle, Globe, Twitter,
  ExternalLink, ChevronRight, MessageSquare, Send
} from 'lucide-react';
import { useWallet } from '../contexts/CedraWalletProvider';
import { useCreateDAO, useCheckSubnameAvailability } from '../useServices/useDAOCore';
import { useAlert } from './alert/AlertContext';
import { uploadToPinata } from '../services/pinataService';

interface CreateDAOProps {
  onBack: () => void;
}

const CreateDAO: React.FC<CreateDAOProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    subname: '',
    description: '',
    chain: 'cedra',
    minimumStake: '6',
    logo: null as File | null,
    background: null as File | null,
    logoUrl: '',
    backgroundUrl: '',
    useUrls: false,
    xLink: '',
    discordLink: '',
    telegramLink: '',
    website: '',
    category: 'DeFi'
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  const { showAlert } = useAlert();
  const [showSuccessModal, setShowSuccessModal] = useState<null | { title: string; message: string }>(null);

  const { account } = useWallet();
  const { createDAO, createDAOWithUrls, isPending: isDAOPending } = useCreateDAO();
  const { checkSubname } = useCheckSubnameAvailability();


  const steps = [
    { id: 1, title: 'Identity', icon: Sparkles },
    { id: 2, title: 'Governance', icon: Settings },
    { id: 3, title: 'Finalize', icon: Shield },
  ];

  const fileToBytes = (file: File): Promise<number[]> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const bytes = Array.from(new Uint8Array(arrayBuffer));
        resolve(bytes);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileUpload = async (file: File, type: 'logo' | 'background') => {
    if (file.size > 10 * 1024 * 1024) {
      setErrors({ ...errors, [type]: 'Max 10MB allowed' });
      return;
    }
    try {
      showAlert(`Uploading ${type} to IPFS...`, 'info');
      const result = await uploadToPinata(file);
      if (!result.success) throw new Error(result.error || 'Upload failed');

      const urlField = type === 'logo' ? 'logoUrl' : 'backgroundUrl';
      setFormData({
        ...formData,
        [type]: file,
        [urlField]: result.ipfsUrl
      });
      setErrors({ ...errors, [type]: '' });
      showAlert(`${type} ready!`, 'success');
    } catch (error) {
      console.error('File upload error:', error);
      showAlert(`Upload failed`, 'error');
    }
  };

  const validateSubname = async (subname: string): Promise<string | null> => {
    if (!subname.trim()) return 'Subname required';
    if (!/^[a-zA-Z0-9-]+$/.test(subname)) return 'Letters, numbers, hyphens only';
    try {
      const result = await checkSubname(subname);
      return result.isAvailable ? null : 'Subname taken';
    } catch { return 'Verify Error'; }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (step === 1) {
      if (!formData.name.trim()) newErrors.name = 'Name required';
      if (!formData.subname.trim()) newErrors.subname = 'Subname required';
      if (!formData.description.trim()) newErrors.description = 'Description required';
      if (!formData.useUrls) {
        if (!formData.logoUrl) newErrors.logo = 'Logo required';
        if (!formData.backgroundUrl) newErrors.background = 'Banner required';
      } else {
        if (!formData.logoUrl) newErrors.logoUrl = 'Logo URL required';
        if (!formData.backgroundUrl) newErrors.backgroundUrl = 'Banner URL required';
      }
    } else if (step === 2) {
      const stake = parseFloat(formData.minimumStake);
      if (isNaN(stake) || stake < 6) newErrors.minimumStake = 'Min 6 CEDRA';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;
    if (!account) { showAlert('Connect Wallet', 'error'); return; }

    const subNameErr = await validateSubname(formData.subname);
    if (subNameErr) { setErrors({ ...errors, subname: subNameErr }); return; }

    setIsSubmitting(true);
    try {
      const commonParams = {
        name: formData.name.trim(),
        subname: formData.subname.trim(),
        description: formData.description.trim(),
        minStakeToJoin: Math.round(parseFloat(formData.minimumStake) * 1000000),
        xLink: formData.xLink,
        discordLink: formData.discordLink,
        telegramLink: formData.telegramLink,
        website: formData.website,
        category: formData.category
      };

      let result;
      if (formData.useUrls || formData.logoUrl) {
        result = await createDAOWithUrls({
          ...commonParams,
          logoUrl: formData.logoUrl,
          backgroundUrl: formData.backgroundUrl
        });
      } else {
        const logoBytes = await fileToBytes(formData.logo!);
        const bgBytes = await fileToBytes(formData.background!);
        result = await createDAO({
          ...commonParams,
          logo: new Uint8Array(logoBytes),
          background: new Uint8Array(bgBytes)
        });
      }

      const txHash = (result as { hash?: string; args?: { hash?: string } })?.hash ||
        (result as { hash?: string; args?: { hash?: string } })?.args?.hash || '';
      if (txHash) setTransactionHash(txHash);

      setShowSuccessModal({
        title: 'Deployment success',
        message: 'Your organization has been initialized on the Cedra Network.'
      });
    } catch (err) {
      console.error('Submit error:', err);
      showAlert('Deployment failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-slate-500">Organization name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`nb-input ${errors.name ? 'border-red-500' : ''}`}
                  placeholder="e.g. CEDRA FOUNDATION"
                />
                {errors.name && <p className="text-red-500 text-[10px] font-semibold">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-slate-500">Unique subname</label>
                <input
                  type="text"
                  value={formData.subname}
                  onChange={(e) => setFormData({ ...formData, subname: e.target.value })}
                  className={`nb-input ${errors.subname ? 'border-red-500' : ''}`}
                  placeholder="e.g. cedra-hq"
                />
                {errors.subname && <p className="text-red-500 text-[10px] font-semibold">{errors.subname}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-slate-500">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="nb-input"
                  placeholder="What is the primary goal of this organization?"
                />
                {errors.description && <p className="text-red-500 text-[10px] font-semibold">{errors.description}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-slate-500">Ecosystem category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="nb-input"
                  placeholder="e.g. DeFi, Gaming, Social"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold text-slate-500">Visual identity</label>
                  <div className="flex bg-white/5 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, useUrls: false })}
                      className={`px-3 py-1 text-[9px] font-bold rounded-md transition-all ${!formData.useUrls ? 'bg-[#e1fd6a] text-black shadow-lg' : 'text-slate-500'}`}
                    >
                      Upload files
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, useUrls: true })}
                      className={`px-3 py-1 text-[9px] font-bold rounded-md transition-all ${formData.useUrls ? 'bg-[#e1fd6a] text-black shadow-lg' : 'text-slate-500'}`}
                    >
                      Use links
                    </button>
                  </div>
                </div>

                {formData.useUrls ? (
                  <div className="space-y-3">
                    <input
                      type="url"
                      value={formData.logoUrl}
                      onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                      className={`nb-input text-xs ${errors.logoUrl ? 'border-red-500' : ''}`}
                      placeholder="Logo URL (IPFS or HTTPS)"
                    />
                    <input
                      type="url"
                      value={formData.backgroundUrl}
                      onChange={(e) => setFormData({ ...formData, backgroundUrl: e.target.value })}
                      className={`nb-input text-xs ${errors.backgroundUrl ? 'border-red-500' : ''}`}
                      placeholder="Banner URL"
                    />
                  </div>
                ) : (
                  <div className="flex gap-4">
                    <div
                      onClick={() => document.getElementById('logo')?.click()}
                      className={`flex-1 border border-dashed aspect-video flex flex-col items-center justify-center cursor-pointer rounded-2xl transition-all ${formData.logo ? 'bg-[#e1fd6a]/10 border-[#e1fd6a]' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                    >
                      {formData.logo ? <CheckCircle2 className="text-[#e1fd6a]" /> : <Upload size={18} className="text-slate-500" />}
                      <span className="text-[9px] font-bold mt-2 text-slate-400">{formData.logo ? 'Logo added' : 'Add logo'}</span>
                      <input id="logo" type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'logo')} />
                    </div>
                    <div
                      onClick={() => document.getElementById('bg')?.click()}
                      className={`flex-1 border border-dashed aspect-video flex flex-col items-center justify-center cursor-pointer rounded-2xl transition-all ${formData.background ? 'bg-[#e1fd6a]/10 border-[#e1fd6a]' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                    >
                      {formData.background ? <CheckCircle2 className="text-[#e1fd6a]" /> : <Upload size={18} className="text-slate-500" />}
                      <span className="text-[9px] font-bold mt-2 text-slate-400">{formData.background ? 'Banner added' : 'Add banner'}</span>
                      <input id="bg" type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'background')} />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-2">
                <label className="text-[10px] font-semibold text-slate-500">Social connections</label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 nb-input bg-white/[0.05] focus-within:border-[#e1fd6a]/30">
                    <Globe size={14} className="text-slate-500" />
                    <input type="url" placeholder="Website URL" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} className="bg-transparent border-none focus:outline-none text-xs flex-1" />
                  </div>
                  <div className="flex items-center gap-3 nb-input bg-white/[0.05] focus-within:border-[#e1fd6a]/30">
                    <Twitter size={14} className="text-slate-500" />
                    <input type="url" placeholder="X (Twitter) Profile" value={formData.xLink} onChange={(e) => setFormData({ ...formData, xLink: e.target.value })} className="bg-transparent border-none focus:outline-none text-xs flex-1" />
                  </div>
                  <div className="flex items-center gap-3 nb-input bg-white/[0.05] focus-within:border-[#e1fd6a]/30">
                    <MessageSquare size={14} className="text-slate-500" />
                    <input type="url" placeholder="Discord Server Link" value={formData.discordLink} onChange={(e) => setFormData({ ...formData, discordLink: e.target.value })} className="bg-transparent border-none focus:outline-none text-xs flex-1" />
                  </div>
                  <div className="flex items-center gap-3 nb-input bg-white/[0.05] focus-within:border-[#e1fd6a]/30">
                    <Send size={14} className="text-slate-500" />
                    <input type="url" placeholder="Telegram Group/Channel" value={formData.telegramLink} onChange={(e) => setFormData({ ...formData, telegramLink: e.target.value })} className="bg-transparent border-none focus:outline-none text-xs flex-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="p-4 bg-[#e1fd6a]/10 border border-[#e1fd6a]/20 rounded-2xl flex gap-4">
              <AlertTriangle className="text-[#e1fd6a] shrink-0" size={20} />
              <div>
                <h4 className="text-sm font-bold text-white mb-1 tracking-tight">Governance setup</h4>
                <p className="text-xs text-slate-400 font-medium">Define the minimum tokens a user must stake to become a voting member. This ensures long-term commitment and platform stability.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-slate-500">Minimum staking requirement</label>
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min="6"
                      value={formData.minimumStake}
                      onChange={(e) => setFormData({ ...formData, minimumStake: e.target.value })}
                      className="nb-input text-3xl font-bold h-16 pl-6 focus:border-[#e1fd6a]"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-black italic text-white">CEDRA</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="border-b border-white/5 pb-2">
              <h3 className="text-xl font-bold text-white tracking-tight">Final summary</h3>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-5 p-4 bg-white/5 rounded-2xl">
                <div className="w-16 h-16 rounded-xl bg-[#e1fd6a] flex items-center justify-center overflow-hidden shrink-0">
                  {formData.logoUrl ? (
                    <img src={formData.logoUrl} className="w-full h-full object-cover" alt="logo" />
                  ) : (
                    <span className="text-black font-black text-2xl">{formData.name.charAt(0)}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xl font-bold text-white truncate">{formData.name}</h4>
                  <p className="text-[#e1fd6a] text-[10px] font-bold">{formData.category}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="bg-white/5 border border-white/5 p-4 flex justify-between items-center rounded-2xl">
                  <span className="text-[10px] font-semibold text-slate-500">Stake to join</span>
                  <span className="font-bold text-white">{formData.minimumStake} CEDRA</span>
                </div>
                <div className="bg-white/5 border border-white/5 p-4 flex justify-between items-center rounded-2xl">
                  <span className="text-[10px] font-semibold text-slate-500">Subname handle</span>
                  <span className="font-bold text-[#e1fd6a]">@{formData.subname}</span>
                </div>
                <div className="bg-white/5 border border-white/5 p-4 flex justify-between items-center rounded-2xl">
                  <span className="text-[10px] font-semibold text-slate-500">Social channels</span>
                  <div className="flex gap-3">
                    {formData.website && <Globe size={14} className="text-[#e1fd6a]" />}
                    {formData.xLink && <Twitter size={14} className="text-[#e1fd6a]" />}
                    {formData.discordLink && <MessageSquare size={14} className="text-[#e1fd6a]" />}
                    {formData.telegramLink && <Send size={14} className="text-[#e1fd6a]" />}
                  </div>
                </div>
                <div className="bg-[#e1fd6a]/5 border border-[#e1fd6a]/10 p-4 flex justify-between items-center rounded-2xl">
                  <span className="text-[10px] font-semibold text-slate-500">Deployment fee</span>
                  <span className="font-bold text-[#e1fd6a]">100 CEDRA</span>
                </div>
              </div>

              <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-[11px] text-slate-400 italic">
                "{formData.description}"
              </div>
            </div>

            {transactionHash && (
              <div className="p-4 bg-[#10b981]/10 border border-[#10b981]/20 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-[#10b981] font-bold text-xs">
                  <CheckCircle2 size={16} /> Transaction broadcasted
                </div>
                <a
                  href={`https://explorer.cedra.network/txn/${transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-white flex items-center gap-2 hover:text-[#e1fd6a] transition-colors"
                >
                  View on explorer <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-20 px-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-medium text-white/40 hover:text-white transition-colors mb-8 group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
        Discard and Go Back
      </button>

      <div className="mb-10 text-center">
        <h1 className="text-3xl font-semibold text-white tracking-tight mb-2">Create Organization</h1>
      </div>

      <div className="flex justify-between items-center mb-10 relative px-4">
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10 -translate-y-1/2 z-0" />
        {steps.map((s) => {
          const Icon = s.icon;
          const isActive = currentStep === s.id;
          const isDone = currentStep > s.id;
          return (
            <div key={s.id} className="relative z-10 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 border ${isActive
                ? 'bg-[#e1fd6a] border-[#e1fd6a] text-black shadow-[0_0_20px_rgba(225,253,106,0.3)]'
                : isDone
                  ? 'bg-[#151618] border-[#e1fd6a]/50 text-[#e1fd6a]'
                  : 'bg-[#1c1d21] border-white/10 text-white/20'
                }`}>
                {isDone ? <CheckCircle2 size={18} /> : <Icon size={18} />}
              </div>
            </div>
          );
        })}
      </div>

      <div className="nb-card !bg-[#1c1d21] border-white/5 p-8 flex flex-col">
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="flex-1">
            {renderStepContent()}
          </div>

          <div className="mt-10 flex items-center justify-between gap-4 pt-8 border-t border-white/5">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-6 py-2.5 rounded-xl border border-white/5 text-white/40 text-xs font-medium hover:bg-white/5"
              >
                Back
              </button>
            )}
            <div className="flex-1" />
            <div className="flex items-center gap-4">
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={() => validateStep(currentStep) && setCurrentStep(currentStep + 1)}
                  className="px-10 py-2.5 rounded-xl bg-[#e1fd6a] text-black text-xs font-semibold hover:brightness-105 transition-all flex items-center gap-2"
                >
                  Next Step
                  <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || isDAOPending}
                  className="px-12 py-3 rounded-xl bg-[#e1fd6a] text-black text-sm font-semibold hover:brightness-105 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Initializing...' : 'Confirm Deployment'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#151618]/90 backdrop-blur-md">
          <div className="nb-card !bg-[#1c1d21] border-white/10 max-w-sm w-full text-center p-10 shadow-2xl">
            <div className="w-20 h-20 bg-[#e1fd6a] rounded-3xl mx-auto mb-8 flex items-center justify-center text-black">
              <CheckCircle2 size={40} />
            </div>
            <h3 className="text-2xl font-semibold text-white tracking-tight mb-2">{showSuccessModal.title}</h3>
            <p className="text-sm font-medium text-white/40 mb-10">{showSuccessModal.message}</p>
            <button
              onClick={() => { setShowSuccessModal(null); onBack(); }}
              className="w-full py-4 bg-[#e1fd6a] text-black font-semibold rounded-2xl hover:brightness-105"
            >
              Finish Setup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateDAO;