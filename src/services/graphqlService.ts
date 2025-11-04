interface FungibleAssetInfo {
  symbol: string;
  name: string;
  decimals: number;
  asset_type: string;
}

interface GraphQLResponse {
  data: {
    fungible_asset_metadata: FungibleAssetInfo[];
  };
}

const GRAPHQL_ENDPOINT = 'https://graphql.cedra.dev/v1/graphql';

export const fetchFungibleAssetInfo = async (assetTypes: string[]): Promise<FungibleAssetInfo[]> => {
  const query = `
    query GetFungibleAssetInfo($in: [String!], $offset: Int) {
      fungible_asset_metadata(
        where: { asset_type: { _in: $in } }
        offset: $offset
        limit: 100
      ) {
        symbol
        name
        decimals
        asset_type
        __typename
      }
    }
  `;

  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          in: assetTypes,
          offset: 0
        }
      })
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status}`);
    }

    const result: GraphQLResponse = await response.json();
    return result.data.fungible_asset_metadata || [];
  } catch (error) {
    console.error('Failed to fetch fungible asset info:', error);
    return [];
  }
};

export const fetchSingleAssetInfo = async (assetType: string): Promise<FungibleAssetInfo | null> => {
  const results = await fetchFungibleAssetInfo([assetType]);
  return results.length > 0 ? results[0] : null;
};

/**
 * Fetch DAO creation events from Cedra GraphQL indexer
 * @param moduleAddress - The module address to filter events
 * @param eventType - The event type to filter (e.g., "DAOCreated")
 * @returns Array of DAO addresses from events
 */
export const fetchDAOCreationEvents = async (
  moduleAddress: string,
  eventType: string
): Promise<string[]> => {
  const query = `
    query GetDAOCreationEvents($eventType: String!) {
      events(
        where: { type: { _like: $eventType } }
        order_by: { transaction_version: desc }
        limit: 1000
      ) {
        data
        type
        transaction_version
      }
    }
  `;

  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          eventType: `%${moduleAddress}%${eventType}%`
        }
      })
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status}`);
    }

    const result = await response.json();

    if (!result.data || !result.data.events) {
      return [];
    }

    // Extract DAO addresses from event data
    // The event data structure should contain movedao_addrx field
    return result.data.events
      .map((event: any) => event.data?.movedao_addrx)
      .filter((addr: any) => addr != null);

  } catch (error) {
    console.error('Failed to fetch DAO creation events:', error);
    return [];
  }
};