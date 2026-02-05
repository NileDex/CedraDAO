// Membership system - manages who can join the DAO based on staking requirements and tracks member status
module anchor_addrx::membership {
    use anchor_addrx::staking;

    // Staking type constants
    // LEGACY: These are now managed in staking.move
    // const STAKING_TYPE_MOVE: u8 = 1;
    // const STAKING_TYPE_FA: u8 = 2;

    public fun initialize(account: &signer) {
        initialize_with_min_stake(account, 1000000000) // Default to 10 MOVE
    }

    public fun initialize_with_min_stake(account: &signer, min_stake_to_join: u64) {
        let min_stake_to_propose = 600000000; // Default: 6 tokens
        initialize_with_stake_requirements(account, min_stake_to_join, min_stake_to_propose)
    }

    public fun initialize_with_stake_requirements(account: &signer, min_stake_to_join: u64, min_stake_to_propose: u64) {
        staking::setup_membership(account, min_stake_to_join, min_stake_to_propose)
    }

    public fun initialize_with_staking_type(
        account: &signer,
        min_stake_to_join: u64,
        min_stake_to_propose: u64,
        _staking_type: u8,
        _fa_metadata_address: address
    ) {
        staking::setup_membership(account, min_stake_to_join, min_stake_to_propose)
    }

    /// DELEGATED: Join the DAO as a member
    public entry fun join(account: &signer, anchor_addrx: address) {
        staking::join(account, anchor_addrx);
    }

    /// DELEGATED: Leave the DAO
    public entry fun leave(account: &signer, anchor_addrx: address) {
        staking::leave(account, anchor_addrx);
    }

    #[view]
    public fun is_member(anchor_addrx: address, member: address): bool {
        staking::is_member(anchor_addrx, member)
    }

    #[view]
    public fun get_voting_power(anchor_addrx: address, member: address): u64 {
        staking::get_staker_amount(anchor_addrx, member)
    }

    #[view]
    public fun total_members(anchor_addrx: address): u64 {
        staking::total_members(anchor_addrx)
    }

    #[view]
    public fun total_voting_power(anchor_addrx: address): u64 {
        staking::get_total_staked(anchor_addrx)
    }

    public entry fun update_voting_power(_account: &signer) {
        // No-op since voting power is dynamically calculated in staking
    }

    // Administrative function to remove members who no longer meet stake requirements
    public entry fun remove_inactive_member(
        admin: &signer, 
        anchor_addrx: address, 
        member: address
    ) {
        staking::remove_inactive_member(admin, anchor_addrx, member);
    }

    public entry fun update_min_stake(
        admin: &signer,
        anchor_addrx: address,
        new_min_stake: u64
    ) {
        staking::update_min_stake(admin, anchor_addrx, new_min_stake);
    }

    public entry fun update_min_proposal_stake(
        admin: &signer,
        anchor_addrx: address,
        new_min_proposal_stake: u64
    ) {
        staking::update_min_proposal_stake(admin, anchor_addrx, new_min_proposal_stake);
    }

    public entry fun set_proposal_stake_multiplier(
        admin: &signer,
        anchor_addrx: address,
        multiplier: u64
    ) {
        let min_stake = staking::get_min_stake(anchor_addrx);
        let new_min_proposal_stake = min_stake * multiplier;
        staking::update_min_proposal_stake(admin, anchor_addrx, new_min_proposal_stake);
    }

    // View function to get current minimum stake requirement
    #[view]
    public fun get_min_stake(anchor_addrx: address): u64 {
        staking::get_min_stake(anchor_addrx)
    }

    // View function to get current minimum proposal stake requirement
    #[view]
    public fun get_min_proposal_stake(anchor_addrx: address): u64 {
        staking::get_min_proposal_stake(anchor_addrx)
    }

    // Check if membership system is initialized for a DAO
    #[view]
    public fun is_membership_initialized(anchor_addrx: address): bool {
        staking::is_membership_initialized(anchor_addrx)
    }

    // View function to get the current proposal stake multiplier
    #[view]
    public fun get_proposal_stake_multiplier(anchor_addrx: address): u64 {
        let min_stake = staking::get_min_stake(anchor_addrx);
        let min_proposal_stake = staking::get_min_proposal_stake(anchor_addrx);
        if (min_stake == 0) return 1;
        min_proposal_stake / min_stake
    }

    // Check if a member can create proposals based on stake requirements
    #[view]
    public fun can_create_proposal(anchor_addrx: address, member: address): bool {
        staking::can_create_proposal(anchor_addrx, member)
    }

    // Get all member addresses (for snapshot purposes)
    #[view]
    public fun get_all_member_addresses(anchor_addrx: address): vector<address> {
        staking::get_all_member_addresses(anchor_addrx)
    }
}