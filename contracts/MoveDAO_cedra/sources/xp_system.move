// XP (Experience Points) System - Rewards users for DAO participation
// Awards 1 XP for most activities, excluding DAO creation, filtering, and featuring
module anchor_addrx::xp_system {
    use std::signer;
    use std::vector;
    use std::event;
    use std::table::{Self, Table};
    use cedra_framework::timestamp;
    use cedra_framework::object::{Self, Object};
    use anchor_addrx::errors;

    // XP reward amounts
    const XP_MEMBER_JOINED: u64 = 1;
    const XP_PROPOSAL_CREATED: u64 = 1;
    const XP_PROPOSAL_VOTED: u64 = 1;
    const XP_PROPOSAL_EXECUTED: u64 = 1;
    const XP_STAKE: u64 = 1;
    const XP_UNSTAKE: u64 = 1;
    const XP_TREASURY_DEPOSIT: u64 = 1;
    const XP_TREASURY_WITHDRAWAL: u64 = 1;
    const XP_LAUNCHPAD_CREATED: u64 = 1;
    const XP_LAUNCHPAD_INVESTMENT: u64 = 1;

    // Activities that do NOT award XP
    // - DAO_CREATED (excluded as per requirement)
    // - FILTER operations (excluded as per requirement)
    // - FEATURED operations (excluded as per requirement)

    // XP Event - emitted when a user earns XP
    #[event]
    struct XPEarned has drop, store {
        user_address: address,
        dao_address: address,
        activity_type: u8,
        xp_amount: u64,
        total_xp: u64,
        timestamp: u64,
    }

    // Level Up Event - emitted when a user reaches a new level
    #[event]
    struct LevelUp has drop, store {
        user_address: address,
        new_level: u64,
        total_xp: u64,
        timestamp: u64,
    }

    // User XP Profile
    struct UserXPProfile has store, drop, copy {
        user_address: address,
        total_xp: u64,
        level: u64,
        dao_xp_breakdown: vector<DAOXPRecord>, // XP earned per DAO
        last_activity_timestamp: u64,
        activities_count: u64,
    }

    // XP earned in a specific DAO
    struct DAOXPRecord has store, drop, copy {
        dao_address: address,
        xp_earned: u64,
        activities_count: u64,
    }

    // Global XP Store
    struct XPStore has key {
        user_profiles: Table<address, UserXPProfile>,
        dao_leaderboard: Table<address, vector<address>>, // DAO -> sorted user addresses by XP
        global_leaderboard: vector<address>, // Global sorted user addresses by XP
        total_users: u64,
        total_xp_distributed: u64,
    }

    // Global XP System
    struct GlobalXPSystem has key {
        xp_store: Object<XPStore>,
    }

    // Initialize the global XP system
    public fun initialize(account: &signer) {
        let addr = signer::address_of(account);
        assert!(!exists<GlobalXPSystem>(addr), errors::already_exists());

        let constructor_ref = object::create_object_from_account(account);
        let object_signer = object::generate_signer(&constructor_ref);
        
        let xp_store = XPStore {
            user_profiles: table::new(),
            dao_leaderboard: table::new(),
            global_leaderboard: vector::empty(),
            total_users: 0,
            total_xp_distributed: 0,
        };

        move_to(&object_signer, xp_store);
        
        let global_xp_system = GlobalXPSystem {
            xp_store: object::object_from_constructor_ref(&constructor_ref),
        };
        
        move_to(account, global_xp_system);
    }

    // Award XP to a user for an activity
    public fun award_xp(
        user_address: address,
        dao_address: address,
        activity_type: u8,
        xp_amount: u64,
    ) acquires XPStore, GlobalXPSystem {
        let global_system = borrow_global<GlobalXPSystem>(@anchor_addrx);
        let xp_store = borrow_global_mut<XPStore>(object::object_address(&global_system.xp_store));
        
        // Get or create user profile
        if (!table::contains(&xp_store.user_profiles, user_address)) {
            let new_profile = UserXPProfile {
                user_address,
                total_xp: 0,
                level: 1,
                dao_xp_breakdown: vector::empty(),
                last_activity_timestamp: timestamp::now_seconds(),
                activities_count: 0,
            };
            table::add(&mut xp_store.user_profiles, user_address, new_profile);
            xp_store.total_users = xp_store.total_users + 1;
        };

        let user_profile = table::borrow_mut(&mut xp_store.user_profiles, user_address);
        
        // Update total XP
        user_profile.total_xp = user_profile.total_xp + xp_amount;
        user_profile.last_activity_timestamp = timestamp::now_seconds();
        user_profile.activities_count = user_profile.activities_count + 1;

        // Update DAO-specific XP
        update_dao_xp_breakdown(user_profile, dao_address, xp_amount);

        // Check for level up
        let old_level = user_profile.level;
        let new_level = calculate_level(user_profile.total_xp);
        user_profile.level = new_level;

        // Update global stats
        xp_store.total_xp_distributed = xp_store.total_xp_distributed + xp_amount;

        // Emit XP earned event
        event::emit(XPEarned {
            user_address,
            dao_address,
            activity_type,
            xp_amount,
            total_xp: user_profile.total_xp,
            timestamp: timestamp::now_seconds(),
        });

        // Emit level up event if applicable
        if (new_level > old_level) {
            event::emit(LevelUp {
                user_address,
                new_level,
                total_xp: user_profile.total_xp,
                timestamp: timestamp::now_seconds(),
            });
        };
    }

    // Award XP to a user (admin/internal trigger)
    public fun award_xp_manual(
        admin: &signer,
        user_address: address,
        dao_address: address,
        xp_amount: u64,
    ) acquires XPStore, GlobalXPSystem {
        let addr = signer::address_of(admin);
        assert!(addr == @anchor_addrx, errors::not_admin());
        award_xp(user_address, dao_address, 0, xp_amount); // activity_type 0 for manual
    }

    // Update DAO XP breakdown for a user
    fun update_dao_xp_breakdown(
        user_profile: &mut UserXPProfile,
        dao_address: address,
        xp_amount: u64,
    ) {
        let i = 0;
        let len = vector::length(&user_profile.dao_xp_breakdown);
        let found = false;

        while (i < len) {
            let dao_record = vector::borrow_mut(&mut user_profile.dao_xp_breakdown, i);
            if (dao_record.dao_address == dao_address) {
                dao_record.xp_earned = dao_record.xp_earned + xp_amount;
                dao_record.activities_count = dao_record.activities_count + 1;
                found = true;
                break
            };
            i = i + 1;
        };

        if (!found) {
            let new_record = DAOXPRecord {
                dao_address,
                xp_earned: xp_amount,
                activities_count: 1,
            };
            vector::push_back(&mut user_profile.dao_xp_breakdown, new_record);
        };
    }

    // Calculate level based on total XP
    // Level formula: level = floor(sqrt(total_xp / 100)) + 1
    // This means: Level 1 = 0-99 XP, Level 2 = 100-399 XP, Level 3 = 400-899 XP, etc.
    fun calculate_level(total_xp: u64): u64 {
        if (total_xp == 0) {
            return 1
        };

        // Simple level calculation: every 100 XP = 1 level
        let level = (total_xp / 100) + 1;
        
        // Cap at level 100 for reasonable limits
        if (level > 100) {
            level = 100;
        };

        level
    }

    // Helper functions to award XP for specific activities
    public fun award_xp_member_joined(
        user_address: address,
        dao_address: address,
    ) acquires XPStore, GlobalXPSystem {
        award_xp(user_address, dao_address, 2, XP_MEMBER_JOINED); // activity_type = 2
    }


    public fun award_xp_proposal_created(
        user_address: address,
        dao_address: address,
    ) acquires XPStore, GlobalXPSystem {
        award_xp(user_address, dao_address, 4, XP_PROPOSAL_CREATED); // activity_type = 4
    }

    public fun award_xp_proposal_voted(
        user_address: address,
        dao_address: address,
    ) acquires XPStore, GlobalXPSystem {
        award_xp(user_address, dao_address, 5, XP_PROPOSAL_VOTED); // activity_type = 5
    }

    public fun award_xp_proposal_executed(
        user_address: address,
        dao_address: address,
    ) acquires XPStore, GlobalXPSystem {
        award_xp(user_address, dao_address, 6, XP_PROPOSAL_EXECUTED); // activity_type = 6
    }

    public fun award_xp_stake(
        user_address: address,
        dao_address: address,
    ) acquires XPStore, GlobalXPSystem {
        award_xp(user_address, dao_address, 7, XP_STAKE); // activity_type = 7
    }

    public fun award_xp_unstake(
        user_address: address,
        dao_address: address,
    ) acquires XPStore, GlobalXPSystem {
        award_xp(user_address, dao_address, 8, XP_UNSTAKE); // activity_type = 8
    }

    public fun award_xp_treasury_deposit(
        user_address: address,
        dao_address: address,
    ) acquires XPStore, GlobalXPSystem {
        award_xp(user_address, dao_address, 9, XP_TREASURY_DEPOSIT); // activity_type = 9
    }

    public fun award_xp_treasury_withdrawal(
        user_address: address,
        dao_address: address,
    ) acquires XPStore, GlobalXPSystem {
        award_xp(user_address, dao_address, 10, XP_TREASURY_WITHDRAWAL); // activity_type = 10
    }

    public fun award_xp_launchpad_created(
        user_address: address,
        dao_address: address,
    ) acquires XPStore, GlobalXPSystem {
        award_xp(user_address, dao_address, 12, XP_LAUNCHPAD_CREATED); // activity_type = 12
    }

    public fun award_xp_launchpad_investment(
        user_address: address,
        dao_address: address,
    ) acquires XPStore, GlobalXPSystem {
        award_xp(user_address, dao_address, 13, XP_LAUNCHPAD_INVESTMENT); // activity_type = 13
    }

    // Query functions
    #[view]
    public fun get_user_xp(user_address: address): u64 acquires XPStore, GlobalXPSystem {
        let global_system = borrow_global<GlobalXPSystem>(@anchor_addrx);
        let xp_store = borrow_global<XPStore>(object::object_address(&global_system.xp_store));
        
        if (table::contains(&xp_store.user_profiles, user_address)) {
            let profile = table::borrow(&xp_store.user_profiles, user_address);
            profile.total_xp
        } else {
            0
        }
    }

    #[view]
    public fun get_user_level(user_address: address): u64 acquires XPStore, GlobalXPSystem {
        let global_system = borrow_global<GlobalXPSystem>(@anchor_addrx);
        let xp_store = borrow_global<XPStore>(object::object_address(&global_system.xp_store));
        
        if (table::contains(&xp_store.user_profiles, user_address)) {
            let profile = table::borrow(&xp_store.user_profiles, user_address);
            profile.level
        } else {
            1
        }
    }

    #[view]
    public fun get_user_profile(user_address: address): UserXPProfile acquires XPStore, GlobalXPSystem {
        let global_system = borrow_global<GlobalXPSystem>(@anchor_addrx);
        let xp_store = borrow_global<XPStore>(object::object_address(&global_system.xp_store));
        
        assert!(table::contains(&xp_store.user_profiles, user_address), errors::not_found());
        *table::borrow(&xp_store.user_profiles, user_address)
    }

    #[view]
    public fun get_user_dao_xp(user_address: address, dao_address: address): u64 acquires XPStore, GlobalXPSystem {
        let global_system = borrow_global<GlobalXPSystem>(@anchor_addrx);
        let xp_store = borrow_global<XPStore>(object::object_address(&global_system.xp_store));
        
        if (!table::contains(&xp_store.user_profiles, user_address)) {
            return 0
        };

        let profile = table::borrow(&xp_store.user_profiles, user_address);
        let i = 0;
        let len = vector::length(&profile.dao_xp_breakdown);

        while (i < len) {
            let dao_record = vector::borrow(&profile.dao_xp_breakdown, i);
            if (dao_record.dao_address == dao_address) {
                return dao_record.xp_earned
            };
            i = i + 1;
        };

        0
    }

    #[view]
    public fun get_xp_to_next_level(user_address: address): u64 acquires XPStore, GlobalXPSystem {
        let global_system = borrow_global<GlobalXPSystem>(@anchor_addrx);
        let xp_store = borrow_global<XPStore>(object::object_address(&global_system.xp_store));
        
        if (!table::contains(&xp_store.user_profiles, user_address)) {
            return 100 // XP needed for level 2
        };

        let profile = table::borrow(&xp_store.user_profiles, user_address);
        let current_level = profile.level;
        
        if (current_level >= 100) {
            return 0 // Max level reached
        };

        let xp_for_next_level = current_level * 100;
        let current_xp = profile.total_xp;

        if (current_xp >= xp_for_next_level) {
            return 0
        };

        xp_for_next_level - current_xp
    }

    #[view]
    public fun get_total_xp_distributed(): u64 acquires XPStore, GlobalXPSystem {
        let global_system = borrow_global<GlobalXPSystem>(@anchor_addrx);
        let xp_store = borrow_global<XPStore>(object::object_address(&global_system.xp_store));
        xp_store.total_xp_distributed
    }

    #[view]
    public fun get_total_users(): u64 acquires XPStore, GlobalXPSystem {
        let global_system = borrow_global<GlobalXPSystem>(@anchor_addrx);
        let xp_store = borrow_global<XPStore>(object::object_address(&global_system.xp_store));
        xp_store.total_users
    }

    #[view]
    public fun is_initialized(): bool {
        exists<GlobalXPSystem>(@anchor_addrx)
    }

    // Test functions
    #[test_only]
    public entry fun test_init_module(sender: &signer) {
        initialize(sender);
    }
}
