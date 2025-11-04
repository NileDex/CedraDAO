// Script to initialize membership for your DAO
import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

const MODULE_ADDRESS = "0xca42c40b77b11054475a55e0c3ea5d2eeb722d6428ed8d7e45f3299dcfcadfca";

const config = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: "https://testnet.movementnetwork.xyz/v1",
  indexer: "https://hasura.testnet.movementnetwork.xyz/v1/graphql/v1/graphql"
});

const aptos = new Aptos(config);

async function initializeMembership() {
  console.log("=== INITIALIZING DAO MEMBERSHIP ===");
  
  // You need to provide your private key here
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("Please set PRIVATE_KEY environment variable");
    console.log("Run: export PRIVATE_KEY=your_private_key_here");
    process.exit(1);
  }
  
  const account = Account.fromPrivateKey({
    privateKey: new Ed25519PrivateKey(privateKey)
  });
  
  const daoAddress = "0xb4fcb0a96b5c8c4b7ffde9cd14e1a43a78b6ed23b7b9d3d9c7b8fbecc91e8543";
  
  console.log(`DAO Address: ${daoAddress}`);
  console.log(`Account Address: ${account.accountAddress}`);
  
  try {
    // Check if admin
    const isAdmin = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::admin::is_admin`,
        functionArguments: [daoAddress, account.accountAddress]
      }
    });
    
    console.log(`Is Admin: ${isAdmin[0]}`);
    
    if (!isAdmin[0]) {
      console.error("❌ You are not an admin of this DAO. Only admins can initialize membership.");
      process.exit(1);
    }
    
    // Check if membership already exists
    try {
      const membershipConfig = await aptos.getAccountResource({
        accountAddress: daoAddress,
        resourceType: `${MODULE_ADDRESS}::membership::MembershipConfig`
      });
      console.log("✅ Membership already initialized:", membershipConfig);
      return;
    } catch (error) {
      console.log("ℹ️ Membership not initialized yet, proceeding...");
    }
    
    // Initialize membership with reasonable defaults
    const minStakeToJoin = 100000000; // 1 MOVE token in octas
    const minStakeToPropose = 500000000; // 5 MOVE tokens in octas
    
    console.log(`Setting minimum stake to join: ${minStakeToJoin / 1e8} MOVE`);
    console.log(`Setting minimum stake to propose: ${minStakeToPropose / 1e8} MOVE`);
    
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${MODULE_ADDRESS}::membership::initialize_with_stake_requirements`,
        functionArguments: [minStakeToJoin, minStakeToPropose],
      },
    });
    
    const committedTxn = await aptos.signAndSubmitTransaction({
      signer: account,
      transaction,
    });
    
    await aptos.waitForTransaction({
      transactionHash: committedTxn.hash,
    });
    
    console.log("✅ Membership initialized successfully!");
    console.log(`Transaction: ${committedTxn.hash}`);
    
    // Verify initialization
    const membershipConfig = await aptos.getAccountResource({
      accountAddress: daoAddress,
      resourceType: `${MODULE_ADDRESS}::membership::MembershipConfig`
    });
    
    console.log("✅ Verification - MembershipConfig:", membershipConfig);
    
  } catch (error) {
    console.error("❌ Error initializing membership:", error);
  }
}

initializeMembership();