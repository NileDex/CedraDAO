# XP System Integration Guide

## Overview
The XP (Experience Points) system rewards users for their participation in DAO activities. Users earn **1 XP** for each qualifying activity, with the following exceptions:
- ❌ Creating a DAO (no XP)
- ❌ Filtering operations (no XP)
- ❌ Featured/Boost operations (no XP)

## Features

### 1. **XP Earning Activities** (1 XP each)
- Joining a DAO
- Creating a proposal
- Voting on a proposal
- Executing a proposal
- Staking tokens
- Unstaking tokens
- Depositing to treasury
- Withdrawing from treasury
- Claiming rewards
- Creating a launchpad
- Investing in a launchpad

### 2. **Level System**
- Level calculation: `level = (total_xp / 100) + 1`
- Level 1: 0-99 XP
- Level 2: 100-199 XP
- Level 3: 200-299 XP
- Max level: 100

### 3. **Per-DAO Tracking**
Each user's XP is tracked globally AND per-DAO, allowing you to see:
- Total XP across all DAOs
- XP earned in specific DAOs
- Activity count per DAO

## Integration Steps

### Step 1: Initialize XP System
Add to `dao_core.move` in the `init_module` function:

```move
// In init_module function, after activity_tracker initialization
use anchor_addrx::xp_system;

fun init_module(account: &signer) {
    // ... existing code ...
    
    // Initialize global activity tracker
    activity_tracker::initialize(account);
    
    // Initialize XP system
    xp_system::initialize(account);
}
```

### Step 2: Award XP in Activity Functions

#### In `membership.move` - Join DAO
```move
public entry fun join_dao(account: &signer, dao_address: address) acquires ... {
    // ... existing join logic ...
    
    // Award XP for joining
    xp_system::award_xp_member_joined(member_addr, dao_address);
}
```

#### In `proposal.move` - Create Proposal
```move
public entry fun create_proposal(...) acquires ... {
    // ... existing proposal creation logic ...
    
    // Award XP for creating proposal
    xp_system::award_xp_proposal_created(proposer, dao_address);
}
```

#### In `proposal.move` - Vote on Proposal
```move
public entry fun vote(...) acquires ... {
    // ... existing voting logic ...
    
    // Award XP for voting
    xp_system::award_xp_proposal_voted(voter, dao_address);
}
```

#### In `proposal.move` - Execute Proposal
```move
public entry fun execute_proposal(...) acquires ... {
    // ... existing execution logic ...
    
    // Award XP for executing
    xp_system::award_xp_proposal_executed(executor, dao_address);
}
```

#### In `staking.move` - Stake Tokens
```move
public entry fun stake(...) acquires ... {
    // ... existing staking logic ...
    
    // Award XP for staking
    xp_system::award_xp_stake(staker, dao_address);
}
```

#### In `staking.move` - Unstake Tokens
```move
public entry fun unstake(...) acquires ... {
    // ... existing unstaking logic ...
    
    // Award XP for unstaking
    xp_system::award_xp_unstake(staker, dao_address);
}
```

#### In `treasury.move` - Deposit
```move
public entry fun deposit(...) acquires ... {
    // ... existing deposit logic ...
    
    // Award XP for depositing
    xp_system::award_xp_treasury_deposit(depositor, dao_address);
}
```

#### In `treasury.move` - Withdraw
```move
public entry fun withdraw(...) acquires ... {
    // ... existing withdrawal logic ...
    
    // Award XP for withdrawing
    xp_system::award_xp_treasury_withdrawal(withdrawer, dao_address);
}
```

## Frontend Integration

### Query User XP
```typescript
import { useWallet } from '@aptos-labs/wallet-adapter-react';

// Get total XP
const userXP = await client.view({
  function: `${MODULE_ADDRESS}::xp_system::get_user_xp`,
  type_arguments: [],
  arguments: [userAddress]
});

// Get user level
const userLevel = await client.view({
  function: `${MODULE_ADDRESS}::xp_system::get_user_level`,
  type_arguments: [],
  arguments: [userAddress]
});

// Get XP in specific DAO
const daoXP = await client.view({
  function: `${MODULE_ADDRESS}::xp_system::get_user_dao_xp`,
  type_arguments: [],
  arguments: [userAddress, daoAddress]
});

// Get XP needed for next level
const xpToNextLevel = await client.view({
  function: `${MODULE_ADDRESS}::xp_system::get_xp_to_next_level`,
  type_arguments: [],
  arguments: [userAddress]
});

// Get full user profile
const userProfile = await client.view({
  function: `${MODULE_ADDRESS}::xp_system::get_user_profile`,
  type_arguments: [],
  arguments: [userAddress]
});
```

### Display XP in UI
```tsx
import { useState, useEffect } from 'react';

function UserXPDisplay({ userAddress }: { userAddress: string }) {
  const [xp, setXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [xpToNext, setXPToNext] = useState(100);

  useEffect(() => {
    async function fetchXP() {
      const userXP = await client.view({
        function: `${MODULE_ADDRESS}::xp_system::get_user_xp`,
        arguments: [userAddress]
      });
      
      const userLevel = await client.view({
        function: `${MODULE_ADDRESS}::xp_system::get_user_level`,
        arguments: [userAddress]
      });
      
      const nextLevel = await client.view({
        function: `${MODULE_ADDRESS}::xp_system::get_xp_to_next_level`,
        arguments: [userAddress]
      });

      setXP(Number(userXP[0]));
      setLevel(Number(userLevel[0]));
      setXPToNext(Number(nextLevel[0]));
    }

    fetchXP();
  }, [userAddress]);

  return (
    <div className="xp-display">
      <h3>Level {level}</h3>
      <p>{xp} XP</p>
      <div className="progress-bar">
        <div 
          className="progress" 
          style={{ width: `${((xp % 100) / 100) * 100}%` }}
        />
      </div>
      <p>{xpToNext} XP to next level</p>
    </div>
  );
}
```

## Events

The XP system emits two types of events:

### XPEarned Event
```move
struct XPEarned {
    user_address: address,
    dao_address: address,
    activity_type: u8,
    xp_amount: u64,
    total_xp: u64,
    timestamp: u64,
}
```

### LevelUp Event
```move
struct LevelUp {
    user_address: address,
    new_level: u64,
    total_xp: u64,
    timestamp: u64,
}
```

## Testing

### Test XP Initialization
```bash
aptos move test --named-addresses anchor_addrx=0xea7fb3f7cf8efcd569529520f6c7fe691c34658320b7cacc869b6a33551c6b07
```

### Manual Testing Flow
1. Initialize XP system (done automatically in init_module)
2. Join a DAO → Check XP = 1
3. Create a proposal → Check XP = 2
4. Vote on proposal → Check XP = 3
5. Stake tokens → Check XP = 4
6. Verify level increases at 100 XP

## Notes

- XP is **non-transferable** and tied to user addresses
- XP cannot be decreased or removed
- Level progression is automatic based on total XP
- Each DAO activity is tracked separately
- The system is gas-efficient with minimal storage overhead
