import React, { useState, useEffect } from 'react';
import { Edit3, Settings, X, AlertCircle, Loader2, Calendar } from 'lucide-react';
import { useWallet } from '../../contexts/CedraWalletProvider';
import {
  useCreateProfile,
  useUpdateProfile,
  useGetProfile,
  useProfileExists,
  getDisplayNameOrAddress
} from '../../useServices/useProfile';
import { useUserDAOs } from '../../useServices/useUserDAOs';

// Use a placeholder avatar URL
const defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';

interface UserProfileProps {
  className?: string;
}

const UserProfile: React.FC<UserProfileProps> = ({ className = '' }) => {
  const { account } = useWallet();

  // Modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // DAO filter state
  const [daoFilter, setDaoFilter] = useState<'all' | 'created' | 'joined'>('all');

  // Form state for settings modal only
  const [formData, setFormData] = useState({
    displayName: '',
    avatar: ''
  });

  // Profile hooks
  const { data: profileData, isLoading: profileLoading, refetch: refetchProfile } = useGetProfile(account?.address || null);
  const { exists: profileExists, isLoading: existsLoading } = useProfileExists(account?.address || null);
  const { createProfile, isPending: isCreating, error: createError } = useCreateProfile();
  const { updateProfile, isPending: isUpdating, error: updateError } = useUpdateProfile();

  // DAO hooks - Use the proper hook that fetches from blockchain
  const { userDAOs, isLoading: daosLoading, error: daosError } = useUserDAOs();

  // Loading and error states
  const isLoading = profileLoading || existsLoading;
  const isPending = isCreating || isUpdating;
  const error = createError || updateError;


  // Initialize form data only when opening modal (not on every data change)
  useEffect(() => {
    if (showSettingsModal) {
      if (profileData) {
        // Initialize with existing profile data
        setFormData({
          displayName: profileData.displayName || '',
          avatar: profileData.avatarUrl || ''
        });
      } else {
        // Initialize with empty data for new profile
        setFormData({
          displayName: '',
          avatar: ''
        });
      }
    }
    // Only run when modal opens, not when data changes
  }, [showSettingsModal]);

  // Handle form submit
  const handleSaveProfile = async () => {
    if (!formData.displayName.trim()) {
      alert('Please enter a display name');
      return;
    }

    try {
      if (profileExists) {
        // Update existing profile
        await updateProfile(formData.displayName, formData.avatar);
      } else {
        // Create new profile
        await createProfile(formData.displayName, formData.avatar);
      }

      // Refresh profile data and close modal
      await refetchProfile();
      setShowSettingsModal(false);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      // Error is already handled by the hooks
    }
  };

  // Get display data with fallbacks
  const getDisplayData = () => {
    if (profileData) {
      return {
        displayName: profileData.displayName || getDisplayNameOrAddress(null, account?.address || ''),
        avatar: profileData.avatarUrl || defaultAvatar,
        hasProfile: true
      };
    }

    return {
      displayName: account?.address ? getDisplayNameOrAddress(null, account.address) : 'Connect Wallet',
      avatar: defaultAvatar,
      hasProfile: false
    };
  };

  const displayData = getDisplayData();

  // Simple modal render without complex state dependencies
  const renderModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="professional-card rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Profile Settings
          </h2>
          <button
            onClick={() => setShowSettingsModal(false)}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Display Name Section */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
              Display Name *
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
              className="professional-input w-full px-4 py-3 rounded-xl"
              placeholder="Enter your display name"
              maxLength={50}
            />
          </div>

          {/* Profile Picture Section */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
              Profile Picture URL
            </label>
            <input
              type="text"
              value={formData.avatar}
              onChange={(e) => setFormData(prev => ({ ...prev, avatar: e.target.value }))}
              className="professional-input w-full px-4 py-3 rounded-xl"
              placeholder="Enter profile image URL (optional)"
            />

            {/* Avatar Preview */}
            {(formData.avatar || formData.displayName) && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-sm" style={{ color: 'var(--text-dim)' }}>Preview:</span>
                <div className="relative">
                  {formData.avatar ? (
                    <>
                      <img
                        src={formData.avatar}
                        alt="Preview"
                        className="w-12 h-12 rounded-lg object-cover shadow-md"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white text-sm font-bold">
                        {formData.displayName.charAt(0).toUpperCase()}
                      </div>
                    </>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white text-sm font-bold">
                      {formData.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex gap-3 p-6 border-t border-white/10">
          <button
            onClick={() => setShowSettingsModal(false)}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text)'
            }}
            className="flex-1 px-4 py-2 rounded-xl font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveProfile}
            style={{
              background: '#252527',
              border: '1px solid var(--border)',
              color: '#ffffff'
            }}
            className="flex-1 px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
            disabled={!formData.displayName.trim()}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`container mx-auto px-8 md:px-12 py-12 ${className}`}>
      {/* Profile Header */}
      <div className="text-center mb-12">
        {/* Loading State */}
        {isLoading && account?.address && (
          <div className="flex items-center justify-center mb-4">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            <span className="ml-2 text-white/40">Loading profile...</span>
          </div>
        )}

        {/* Profile Avatar and Edit Button */}
        <div className="relative inline-block mb-4">
          <img
            src={displayData.avatar}
            alt={displayData.displayName}
            className="w-24 h-24 rounded-xl object-cover shadow-lg border border-white/5"
          />

          {account?.address && (
            <button
              onClick={() => setShowSettingsModal(true)}
              className={`absolute -bottom-1 -right-1 p-2 rounded-full shadow-lg transition-colors hover:bg-gray-800`}
              style={{ backgroundColor: '#141416' }}
              disabled={isLoading}
            >
              <Edit3 className={`w-4 h-4 text-white`} />
            </button>
          )}
        </div>

        {/* Profile Name and Status */}
        <div className="mb-2">
          <h1 className="text-2xl font-semibold text-white mb-1">{displayData.displayName}</h1>
          {account?.address && (
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="text-white/40">{account.address.slice(0, 6)}...{account.address.slice(-4)}</span>
              {displayData.hasProfile && (
                <span className="text-green-400 text-xs bg-green-900/30 px-2 py-1 rounded-full">✓ Profile Active</span>
              )}
            </div>
          )}

          {!account?.address && (
            <p className="text-white/40 text-sm">Please connect your wallet to view profile</p>
          )}
        </div>
      </div>

      {/* Feed Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white tracking-tight">Feed</h2>
          <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <p className="text-white/40 text-sm font-medium uppercase tracking-widest">
          {account?.address
            ? 'Open proposals in the DAOs you follow will show up here.'
            : 'Connect your wallet to see DAO activity.'}
        </p>
      </div>

      {/* Your DAOs Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white tracking-tight">Your Organizations</h2>
          {userDAOs.all.length > 0 && (
            <div className="flex items-center gap-4 text-[10px] font-medium uppercase tracking-widest text-white/40">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                {userDAOs.created.length} Created
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                {userDAOs.joined.length} Joined
              </span>
            </div>
          )}
        </div>

        <p className="text-white/40 text-sm font-medium uppercase tracking-widest">
          {account?.address
            ? 'DAOs you have created or joined are shown below.'
            : 'Connect your wallet to see your DAO memberships.'}
        </p>

        {/* Filter Tabs */}
        {!daosLoading && userDAOs.all.length > 0 && (
          <div className="flex gap-2 py-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setDaoFilter('all')}
              className={`px-4 py-2 rounded-xl font-medium text-xs transition-all whitespace-nowrap border ${daoFilter === 'all' ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-white/40 hover:text-white'}`}
            >
              All DAOs ({userDAOs.all.length})
            </button>
            <button
              onClick={() => setDaoFilter('created')}
              className={`px-4 py-2 rounded-xl font-medium text-xs transition-all whitespace-nowrap border ${daoFilter === 'created' ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-white/40 hover:text-white'}`}
            >
              👑 Created ({userDAOs.created.length})
            </button>
            <button
              onClick={() => setDaoFilter('joined')}
              className={`px-4 py-2 rounded-xl font-medium text-xs transition-all whitespace-nowrap border ${daoFilter === 'joined' ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-white/40 hover:text-white'}`}
            >
              ✓ Joined ({userDAOs.joined.length})
            </button>
          </div>
        )}

        {/* Loading State */}
        {daosLoading && account?.address && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-white/20" />
          </div>
        )}

        {/* Error State */}
        {daosError && (
          <div className="flex items-center gap-2 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-sm mb-6">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{daosError}</span>
          </div>
        )}

        {/* DAOs Grid */}
        {!daosLoading && userDAOs.all.length > 0 && (() => {
          // Filter DAOs based on selected tab
          const filteredDAOs = daoFilter === 'all'
            ? userDAOs.all
            : daoFilter === 'created'
              ? userDAOs.created
              : userDAOs.joined;

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDAOs.map((dao) => {
                const isCreator = userDAOs.created.some(d => d.address === dao.address);

                // Convert logo data to image URL if needed
                const getImageUrl = () => {
                  if (dao.logo?.is_url) return dao.logo.url;
                  if (dao.logo?.data?.length) {
                    try {
                      const bytes = new Uint8Array(dao.logo.data);
                      const text = new TextDecoder().decode(bytes);
                      return text.startsWith('http') ? text : null;
                    } catch { return null; }
                  }
                  return null;
                };

                return (
                  <div key={dao.address} className="nb-card !p-5 hover:border-white/20 transition-all group">
                    {/* DAO Header with Logo and Name */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative">
                        {getImageUrl() ? (
                          <>
                            <img
                              src={getImageUrl()!}
                              alt={dao.name || 'DAO'}
                              className="w-12 h-12 rounded-xl object-cover border border-white/10"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                if (fallback) fallback.classList.remove('hidden');
                              }}
                            />
                            <div className="hidden w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white text-lg font-semibold">
                              {(dao.name || 'D').charAt(0).toUpperCase()}
                            </div>
                          </>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white text-lg font-semibold">
                            {(dao.name || 'D').charAt(0).toUpperCase()}
                          </div>
                        )}

                        {/* Role Badge */}
                        <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-lg border border-white/10 ${isCreator ? 'bg-indigo-500' : 'bg-green-500'
                          }`}>
                          <span className="text-[10px]">{isCreator ? '👑' : '✓'}</span>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate group-hover:text-[#e1fd6a] transition-colors uppercase tracking-tight">{dao.name || 'Unnamed DAO'}</h3>
                        <p className="text-[10px] font-medium text-white/30 uppercase tracking-widest mt-0.5">
                          {isCreator ? 'Creator' : 'Member'}
                          {dao.subname && <span className="ml-2 text-white/20">@{dao.subname}</span>}
                        </p>
                      </div>
                    </div>

                    {/* DAO Stats */}
                    <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-widest text-white/30 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {dao.created_at
                            ? new Date(dao.created_at * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                            : 'N/A'
                          }
                        </span>
                      </div>
                      <span className="font-mono text-white/20">
                        {dao.address.slice(0, 6)}...{dao.address.slice(-4)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Empty State */}
        {!daosLoading && !daosError && userDAOs.all.length === 0 && account?.address && (
          <div className="py-24 text-center nb-card border-dashed">
            <div className="w-16 h-16 bg-white/5 rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white/10" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Organizations Found</h3>
            <p className="text-white/40 text-sm font-medium uppercase tracking-widest mb-8">
              You haven't created or joined any organizations yet.
            </p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'create' }))}
              className="nb-button"
            >
              Initialize Your First DAO
            </button>
          </div>
        )}

        {/* No Wallet Connected State */}
        {!account?.address && (
          <div className="py-24 text-center nb-card border-dashed">
            <h3 className="text-lg font-semibold text-white mb-2 uppercase tracking-tight">Wallet Connection Required</h3>
            <p className="text-white/40 text-sm font-medium uppercase tracking-widest">
              Please authenticate to view your decentralized profile.
            </p>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettingsModal && renderModal()}
    </div>
  );
};

export default UserProfile;