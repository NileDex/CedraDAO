import React, { useEffect, useState } from 'react';
import { FaCheckCircle } from 'react-icons/fa';
import Avatar from 'boring-avatars';
import { OptimizedActivityTracker, Activity } from '../../useServices/useOptimizedActivityTracker';
import { truncateAddress } from '../../utils/addressUtils';

interface ProposalDetailsProps {
  title?: string;
  description?: string;
  proposer?: string; // full address
  endsAt?: string;   // ISO date string or friendly text
  votingStart?: string; // ISO date string for voting start
  votingEnd?: string;   // ISO date string for voting end
  quorumCurrentPercent?: number;
  quorumRequiredPercent?: number;
  category?: string;
  votesFor?: number;
  votesAgainst?: number;
  votesAbstain?: number;
  status?: string;
  proposalId?: string;
  createdAt?: string;
  daoName?: string; // Actual DAO name
  onVote?: (voteType: number) => void;
  onStartVoting?: () => void;
  onFinalize?: () => void;
  canVote?: boolean;
  hasVoted?: boolean;
  canStartVoting?: boolean; // true if user is proposer or admin
  canFinalize?: boolean; // true if user can finalize proposals (admin or member with proposal creation rights)
  userAddress?: string;
  userIsAdmin?: boolean;
  userIsCouncil?: boolean;
  userIsMember?: boolean;
  daoAddress?: string;
}



const toDateTimeString = (value?: string) => {
  if (!value) return '';
  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) return value; // assume already friendly
  return asDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'text-blue-400 bg-blue-500/20';
    case 'passed': return 'text-green-400 bg-green-500/20';
    case 'rejected': return 'text-red-400 bg-red-500/20';
    case 'executed': return 'text-purple-400 bg-purple-500/20';
    case 'cancelled': return 'text-white/40 bg-gray-500/20';
    default: return 'text-white/40 bg-gray-500/20';
  }
};



const VoteDistributionBar: React.FC<{ forVotes: number; againstVotes: number; abstainVotes: number; total: number }>
  = ({ forVotes, againstVotes, total }) => {
    const forPct = total > 0 ? (forVotes / total) * 100 : 0;
    const againstPct = total > 0 ? (againstVotes / total) * 100 : 0;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="professional-card bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Yes Votes</span>
            <span className="text-2xl font-bold text-green-400">{forPct.toFixed(0)}%</span>
            <span className="text-xs text-white/20 mt-1">{forVotes} votes</span>
          </div>
          <div className="professional-card bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-wider text-white/40 mb-1">No Votes</span>
            <span className="text-2xl font-bold text-red-400">{againstPct.toFixed(0)}%</span>
            <span className="text-xs text-white/20 mt-1">{againstVotes} votes</span>
          </div>
        </div>

        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden flex">
          <div className="bg-green-500 h-1.5 transition-all duration-500" style={{ width: `${forPct}%` }} />
          <div className="bg-red-500 h-1.5 transition-all duration-500" style={{ width: `${againstPct}%` }} />
        </div>

        <div className="flex justify-between text-[10px] font-medium uppercase tracking-widest text-white/20 px-1">
          <span>Results Summary</span>
          <span>Total: {total} weight</span>
        </div>
      </div>
    );
  };

const DAOProposalDetails: React.FC<ProposalDetailsProps> = ({
  title = 'Send funds to Development Fund SubDAO',
  description = 'Send funds from the treasury to our Development Fund SubDAO in order to continue funding development.',
  proposer = '0xe2bd7f4b6a2aa345c7b149ea',
  endsAt = new Date('2025-08-01').toISOString(),
  votingStart,
  votingEnd,
  quorumCurrentPercent = 20.65,
  quorumRequiredPercent = 15,
  votesFor = 100,
  votesAgainst = 0,
  votesAbstain = 0,
  status = 'draft',
  proposalId = '00015',
  createdAt,
  daoName,
  onVote,
  onStartVoting,
  onFinalize,
  hasVoted = false,
  canStartVoting = true,
  userAddress,
  userIsAdmin,
  userIsMember,
  daoAddress
}) => {
  const [isVoting, setIsVoting] = useState(false);
  const [voteActivities, setVoteActivities] = useState<Activity[]>([]);

  const total = (votesFor || 0) + (votesAgainst || 0) + (votesAbstain || 0);

  useEffect(() => {
    const fetchVotes = async () => {
      if (!proposalId) return;
      try {
        let activities: Activity[] = [];
        if (daoAddress) {
          const result = await OptimizedActivityTracker.getDAOActivities(daoAddress, { limit: 100 });
          activities = result.activities;
        } else {
          const result = await OptimizedActivityTracker.getGlobalActivities({ limit: 100 });
          activities = result.activities;
        }

        const votes = activities.filter(a =>
          a.type === 'proposal_voted' &&
          String(a.metadata?.proposalId) === String(proposalId)
        );
        setVoteActivities(votes);
      } catch (err) {
        console.warn('Failed to fetch individual votes:', err);
      }
    };
    fetchVotes();
  }, [proposalId, daoAddress]);

  const handleVoteClick = async (voteType: number) => {
    setIsVoting(true);
    try {
      await onVote?.(voteType);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Left sidebar info */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Status */}
          <div className="professional-card rounded-xl p-4">
            <h4 className="text-sm text-white/40 mb-2">Status</h4>
            <div className="text-sm text-white/40 mb-4">
              {status === 'active'
                ? `This proposal is currently active for voting with a turnout of ${quorumCurrentPercent.toFixed(1)}%.`
                : status === 'executed'
                  ? `This proposal is closed for voting with a turnout of ${quorumCurrentPercent.toFixed(1)}% and was executed.`
                  : status === 'passed'
                    ? `This proposal passed with a turnout of ${quorumCurrentPercent.toFixed(1)}% and is awaiting execution.`
                    : `This proposal is ${status} with a turnout of ${quorumCurrentPercent.toFixed(1)}%.`
              }
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">DAO</span>
                <span className="text-white">{daoName || 'Unknown DAO'}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">Creator</span>
                <div className="flex items-center gap-2">
                  <div className="rounded-full overflow-hidden border border-white/10">
                    <Avatar
                      name={proposer || 'unknown'}
                      variant="beam"
                      size={20}
                      colors={["#e1fd6a", "#a3e635", "#84cc16", "#65a30d", "#4d7c0f"]}
                    />
                  </div>
                  <span className="text-white">{proposer ? `${proposer.slice(0, 6)}...${proposer.slice(-4)}` : 'Unknown'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">Status</span>
                <span className={`capitalize ${getStatusColor(status || '')} px-2 py-1 rounded text-xs`}>
                  {status}
                </span>
              </div>

              {/* User roles */}
              {(userIsAdmin || userIsMember) && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {userIsAdmin && (
                    <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">Admin</span>
                  )}
                  {userIsMember && (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">Member</span>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/40">Start</span>
                  <span className="text-white text-xs">{toDateTimeString(votingStart || createdAt)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/40">End</span>
                  <span className="text-white text-xs">{toDateTimeString(votingEnd || endsAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:col-span-4 space-y-6">
          {/* Header */}
          <div className="professional-card rounded-xl p-6">
            <h1 className="text-3xl font-semibold text-white mb-4">{title}</h1>
            <p className="text-gray-300 mb-6">{description}</p>


          </div>
        </div>
      </div>

      {/* Vote Results - Full Width */}
      <div className="professional-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Ratio of votes</h3>
        <VoteDistributionBar
          forVotes={votesFor || 0}
          againstVotes={votesAgainst || 0}
          abstainVotes={votesAbstain || 0}
          total={total}
        />

        <div className="mt-6 space-y-4">

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/40">{quorumCurrentPercent}% turnout</span>
              <span className="text-white font-medium">{quorumRequiredPercent}% ✓</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${Math.min((quorumCurrentPercent / Math.max(quorumRequiredPercent || 0, 0.001)) * 100, 100)}%`,
                  backgroundColor: '#facc16'
                }}
              />
            </div>
            <div className="flex justify-between text-sm text-white/40">
              <span>Quorum</span>
            </div>
          </div>
        </div>

        {/* Start Voting button for draft proposals */}
        {status === 'draft' && canStartVoting && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
              <h4 className="text-blue-300 font-medium mb-2">Proposal is in Draft</h4>
              <p className="text-sm text-blue-200/80 mb-3">
                This proposal needs to be activated before voting can begin.
                {proposer === userAddress ? ' As the proposer, you can start voting.' : ' Only the proposer or an admin can start voting.'}
              </p>
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => onStartVoting?.()}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
              >
                Start Voting
              </button>
            </div>
          </div>
        )}

        {/* Voting buttons for active proposals */}
        {status === 'active' && userAddress && !hasVoted && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <h4 className="text-white font-medium mb-4">Cast your vote</h4>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleVoteClick(1)}
                disabled={isVoting}
                className="bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVoting ? 'Voting...' : 'Vote Yes'}
              </button>
              <button
                onClick={() => handleVoteClick(2)}
                disabled={isVoting}
                className="bg-red-600 hover:bg-red-700 text-white py-4 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVoting ? 'Voting...' : 'Vote No'}
              </button>
            </div>
          </div>
        )}

        {/* Draft status info for non-authorized users */}
        {status === 'draft' && !canStartVoting && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-4 text-center">
              <h4 className="text-gray-300 font-medium mb-2">Proposal is in Draft</h4>
              <p className="text-sm text-white/40">
                Waiting for the proposer or an admin to start voting.
              </p>
            </div>
          </div>
        )}

        {/* Finalization button for active proposals that have ended (Admin only) */}
        {status === 'active' && votingEnd && new Date() >= new Date(votingEnd) && userIsAdmin && onFinalize && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-4">
              <h4 className="text-orange-300 font-medium mb-2">Voting Period Has Ended</h4>
              <p className="text-sm text-orange-200/80 mb-3">
                The voting period for this proposal has ended. The proposal needs to be finalized to determine the outcome based on votes and quorum. As an admin, you can finalize this proposal.
              </p>
            </div>
            <button
              onClick={() => onFinalize?.()}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-medium transition-all"
            >
              Finalize Proposal
            </button>
          </div>
        )}

        {/* Status message for non-admins when voting has ended */}
        {status === 'active' && votingEnd && new Date() >= new Date(votingEnd) && !userIsAdmin && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-4 text-center">
              <h4 className="text-gray-300 font-medium mb-2">Voting Ended</h4>
              <p className="text-sm text-white/40">
                Awaiting finalization by admin
              </p>
            </div>
          </div>
        )}

        {hasVoted && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="text-center py-4">
              <FaCheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-green-400 font-medium">You have voted on this proposal</p>
            </div>
          </div>
        )}
      </div>

      {/* Votes cast section - Full Width */}
      <div className="professional-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Votes cast</h3>
        {voteActivities.length > 0 ? (
          <div className="divide-y divide-white/5">
            {voteActivities.map((vote, idx) => (
              <div key={idx} className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full overflow-hidden">
                    <Avatar
                      name={vote.user}
                      variant="beam"
                      size={32}
                      colors={["#e1fd6a", "#a3e635", "#84cc16", "#65a30d", "#4d7c0f"]}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{truncateAddress(vote.user)}</p>
                    <p className="text-[10px] text-white/40">{new Date(vote.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${vote.metadata?.voteChoice ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {vote.metadata?.voteChoice ? 'Yes' : 'No'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-white/40">
            <p className="text-sm font-medium">No individual votes to display</p>
            <p className="text-[10px] mt-1 italic">Voter list is populated from blockchain activities</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DAOProposalDetails;