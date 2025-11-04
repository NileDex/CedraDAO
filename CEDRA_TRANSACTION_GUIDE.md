# Cedra Transaction Guide for DAO Application

## Overview
This guide explains how to properly build, sign, and submit transactions using Cedra SDK patterns in your DAO application.

## Transaction Workflow

### 1. **Transaction Building**
```typescript
// Method 1: Using cedraClient.transaction.build.simple()
const transaction = await cedraClient.transaction.build.simple({
  sender: account.address,
  data: {
    function: `${MODULE_ADDRESS}::dao_core_file::create_dao`,
    functionArguments: [
      name,
      subname,
      description,
      logoBytes,
      backgroundBytes,
      minStakeToJoin,
      xLink,
      discordLink,
      telegramLink,
      website,
      category
    ],
  },
  options: {
    maxGasAmount: 500000,
    gasUnitPrice: 100,
  },
});
```

### 2. **Transaction Simulation (Optional but Recommended)**
```typescript
// Simulate to estimate gas before submission
const [simulationResult] = await cedraClient.transaction.simulate.simple({
  signerPublicKey: account.publicKey,
  transaction,
});

console.log('Gas used:', simulationResult.gas_used);
console.log('Success:', simulationResult.success);
```

### 3. **Transaction Signing**
```typescript
// Sign with wallet
const signedTx = await signTransaction(transaction);
```

### 4. **Transaction Submission**
```typescript
// Submit signed transaction
const pendingTx = await cedraClient.transaction.submit.simple(signedTx);

// Wait for confirmation
const committedTx = await cedraClient.waitForTransaction({
  transactionHash: pendingTx.hash,
  options: { checkSuccess: true }
});
```

## Current vs Cedra Pattern

### ❌ Current Pattern (Wallet-Dependent)
```typescript
const tx = await signAndSubmitTransaction({
  payload: {
    function: `${MODULE_ADDRESS}::dao_core_file::create_dao`,
    typeArguments: [],
    functionArguments: functionArgs,
  },
  options: {
    maxGasAmount: maxGasAmount,
    gasUnitPrice: 100
  }
});
```

### ✅ Cedra SDK Pattern (Recommended)
```typescript
// 1. Build transaction
const transaction = await cedraClient.transaction.build.simple({
  sender: account.address,
  data: {
    function: `${MODULE_ADDRESS}::dao_core_file::create_dao`,
    functionArguments: functionArgs,
  },
  options: {
    maxGasAmount: 500000,
    gasUnitPrice: 100,
  },
});

// 2. Sign with wallet
const signedTx = await signTransaction(transaction);

// 3. Submit to blockchain
const pendingTx = await cedraClient.transaction.submit.simple(signedTx);

// 4. Wait for confirmation
await cedraClient.waitForTransaction({
  transactionHash: pendingTx.hash,
  options: { checkSuccess: true, timeoutSecs: 30 }
});
```

## Key Differences

| Aspect | Current | Cedra Pattern |
|--------|---------|---------------|
| **Builder** | Wallet payload | `cedraClient.transaction.build.simple()` |
| **Control** | Wallet-dependent | Explicit build → sign → submit |
| **Simulation** | Not used | Can simulate before signing |
| **Gas Estimation** | Manual calculation | SDK provides estimation |
| **Error Handling** | Limited | Granular per step |
| **Type Safety** | Any types | Fully typed |

## Benefits of Cedra Pattern

1. **Better Control**: Separate build, sign, and submit steps
2. **Simulation**: Test transactions before submitting
3. **Type Safety**: Full TypeScript support
4. **Error Messages**: Clearer error at each step
5. **Gas Optimization**: SDK handles estimation
6. **Standard Compliance**: Follows Cedra best practices

## Implementation Strategy

### Phase 1: Update CedraWalletProvider
- Keep `signAndSubmitTransaction` for backward compatibility
- Add new `buildTransaction`, `signTransaction`, `submitTransaction` methods
- Add `simulateTransaction` for gas estimation

### Phase 2: Update Hooks
- Modify `useDAOCore.ts` to use new pattern
- Update other service hooks incrementally
- Add proper error handling per step

### Phase 3: Add Simulation
- Simulate all transactions before signing
- Show gas estimates to users
- Improve UX with better feedback

## Example: Complete DAO Creation Flow

```typescript
async function createDAO(params: CreateDAOParams) {
  try {
    // 1. Build transaction
    console.log('🔨 Building transaction...');
    const transaction = await cedraClient.transaction.build.simple({
      sender: account.address,
      data: {
        function: `${MODULE_ADDRESS}::dao_core_file::create_dao`,
        functionArguments: [/* ... */],
      },
    });

    // 2. Simulate (optional)
    console.log('🧪 Simulating transaction...');
    const [simulation] = await cedraClient.transaction.simulate.simple({
      signerPublicKey: account.publicKey,
      transaction,
    });

    if (!simulation.success) {
      throw new Error('Simulation failed: ' + simulation.vm_status);
    }
    console.log(`⛽ Estimated gas: ${simulation.gas_used}`);

    // 3. Sign
    console.log('✍️ Signing transaction...');
    const signedTx = await signTransaction(transaction);

    // 4. Submit
    console.log('📤 Submitting transaction...');
    const pending = await cedraClient.transaction.submit.simple(signedTx);

    // 5. Wait
    console.log('⏳ Waiting for confirmation...');
    const result = await cedraClient.waitForTransaction({
      transactionHash: pending.hash,
      options: { checkSuccess: true }
    });

    console.log('✅ Transaction successful!', result.hash);
    return result;

  } catch (error) {
    console.error('❌ Transaction failed:', error);
    throw error;
  }
}
```

## Error Handling

```typescript
try {
  // Transaction flow
} catch (error) {
  if (error.message.includes('INSUFFICIENT_BALANCE')) {
    throw new Error('Insufficient balance for gas fees');
  } else if (error.message.includes('SEQUENCE_NUMBER_TOO_OLD')) {
    throw new Error('Transaction expired, please retry');
  } else if (error.message.includes('rejected')) {
    throw new Error('User rejected the transaction');
  } else {
    throw new Error('Transaction failed: ' + error.message);
  }
}
```

## Next Steps

1. Update `CedraWalletProvider` with new methods
2. Create helper functions for common transaction patterns
3. Update `useDAOCore` as reference implementation
4. Gradually migrate other hooks
5. Add comprehensive error handling
6. Implement transaction simulation UI

## Resources

- [Cedra Transaction Docs](https://docs.cedra.network/getting-started/tx)
- [Move Contract Examples](https://github.com/cedra-labs/move-contract-examples)
- [TypeScript SDK](https://docs.cedra.network/sdks/typescript-sdk)
