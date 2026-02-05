export const MODULE_ADDRESS = "0xea7fb3f7cf8efcd569529520f6c7fe691c34658320b7cacc869b6a33551c6b07";

export const CONTRACT_MODULE = "anchor_addrx";

// Cedra Network endpoints (testnet)
export const NETWORK_CONFIG = {
  // Primary testnet endpoint with timeout settings
  fullnode: "https://testnet.cedra.dev/v1",
  // GraphQL indexer endpoint
  indexer: "https://graphql.cedra.dev/v1/graphql",
  // Block explorer
  explorer: "https://cedrascan.com",
  // Network details
  chainId: 2,

  requestTimeout: 30000, // 30 seconds
  retryAttempts: 3
};