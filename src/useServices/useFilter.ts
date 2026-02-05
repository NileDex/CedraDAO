import { useState, useEffect, useCallback } from 'react';
import { cedraClient } from '../cedra_service/cedra-client';
import { MODULE_ADDRESS } from '../cedra_service/constants';
import { DAO } from '../types/dao';

const FILTER_MODULE = `${MODULE_ADDRESS}::filter`;

export interface AdvancedFilterParams {
    query: string;
    category: string;
    sortBy: number; // 0=relevance, 1=newest, 2=oldest, 3=name
    minTimestamp: number;
    maxTimestamp: number;
}

export interface DAOSearchResult {
    address: string;
    name: string;
    description: string;
    category: string;
    logo: {
        is_url: boolean;
        url: string;
        data: string; // vector<u8> as hex string or similar
    };
    created_at: string;
    relevance_score: string;
}

export function useFilter() {
    const [categories, setCategories] = useState<string[]>(['All']);
    const [isLoadingCats, setIsLoadingCats] = useState(false);
    const [isFiltering, setIsFiltering] = useState(false);
    const [filteredDAOs, setFilteredDAOs] = useState<DAO[]>([]);

    const fetchCategories = useCallback(async () => {
        setIsLoadingCats(true);
        try {
            const result = await cedraClient.view({
                payload: {
                    function: `${FILTER_MODULE}::get_all_categories` as `${string}::${string}::${string}`,
                    functionArguments: [],
                },
            });
            if (Array.isArray(result[0])) {
                // Ensure 'All' is always there or added
                const cats = result[0] as string[];
                setCategories(['All', ...cats.filter(c => c !== 'All' && c.trim() !== '')]);
            }
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            // Fallback to defaults if contract fails
            setCategories(['All', 'DeFi', 'Gaming', 'Infrastructure', 'Social', 'NFTs']);
        } finally {
            setIsLoadingCats(false);
        }
    }, []);

    // Image processing helpers (Restored from useFetchDAOs logic)
    const hexToBytes = (hexLike: string): Uint8Array => {
        try {
            const hex = hexLike.startsWith('0x') ? hexLike.slice(2) : hexLike
            if (hex.length === 0) return new Uint8Array([])
            const out = new Uint8Array(Math.floor(hex.length / 2))
            for (let i = 0; i < out.length; i++) {
                out[i] = parseInt(hex.substr(i * 2, 2), 16)
            }
            return out
        } catch { return new Uint8Array([]) }
    };

    const toImageUrl = (maybeBytes: any): string => {
        if (!maybeBytes || maybeBytes.length === 0) return '';
        try {
            let bytes: Uint8Array;
            if (Array.isArray(maybeBytes)) {
                bytes = new Uint8Array(maybeBytes);
            } else if (typeof maybeBytes === 'string') {
                bytes = hexToBytes(maybeBytes);
            } else { return ''; }

            if (bytes.length === 0) return '';

            let mimeType = 'image/jpeg';
            if (bytes.length >= 4) {
                const header = Array.from(bytes.slice(0, 4));
                if (header[0] === 0xFF && header[1] === 0xD8) mimeType = 'image/jpeg';
                else if (header[0] === 0x89 && header[1] === 0x50) mimeType = 'image/png';
                else if (header[0] === 0x47 && header[1] === 0x46) mimeType = 'image/gif';
            }

            const binary = String.fromCharCode.apply(null, Array.from(bytes));
            return `data:${mimeType};base64,${btoa(binary)}`;
        } catch { return ''; }
    };

    const mapSearchResultToDAO = (res: any): DAO => ({
        id: res.address,
        name: res.name,
        description: res.description,
        category: res.category,
        image: res.logo.is_url ? res.logo.url : toImageUrl(res.logo.data),
        background: '',
        chain: 'Cedra',
        tvl: '0',
        proposals: 0,
        members: 0,
        established: new Date(parseInt(res.created_at) * 1000).toLocaleDateString(),
        isFollowing: false
    });

    const filterByCategory = useCallback(async (category: string): Promise<DAO[]> => {
        if (category === 'All') {
            setFilteredDAOs([]);
            return [];
        }

        setIsFiltering(true);
        try {
            const result = await cedraClient.view({
                payload: {
                    function: `${FILTER_MODULE}::filter_by_category` as `${string}::${string}::${string}`,
                    functionArguments: [category, "50"],
                },
            });

            const results = result[0] as any[];
            const mapped = results.map(mapSearchResultToDAO);
            setFilteredDAOs(mapped);
            return mapped;
        } catch (error) {
            console.error('Filtering failed:', error);
            return [];
        } finally {
            setIsFiltering(false);
        }
    }, []);

    const fetchFeaturedDAOs = useCallback(async () => {
        setIsFiltering(true);
        try {
            const result = await cedraClient.view({
                payload: {
                    function: `${FILTER_MODULE}::get_featured_dao_results` as `${string}::${string}::${string}`,
                    functionArguments: [],
                },
            });

            const results = result[0] as any[];
            setFilteredDAOs(results.map(mapSearchResultToDAO));
        } catch (error) {
            console.error('Featured fetch failed:', error);
        } finally {
            setIsFiltering(false);
        }
    }, []);

    const searchDAOs = useCallback(async (query: string, limit: string = "50"): Promise<DAO[]> => {
        if (!query.trim()) {
            setFilteredDAOs([]);
            return [];
        }

        setIsFiltering(true);
        try {
            const result = await cedraClient.view({
                payload: {
                    function: `${FILTER_MODULE}::search_daos` as `${string}::${string}::${string}`,
                    functionArguments: [query, limit],
                },
            });

            const results = result[0] as any[];
            const mapped = results.map(mapSearchResultToDAO);
            setFilteredDAOs(mapped);
            return mapped;
        } catch (error) {
            console.error('Search failed:', error);
            return [];
        } finally {
            setIsFiltering(false);
        }
    }, []);

    const advancedFilter = useCallback(async (params: AdvancedFilterParams, limit: string = "50") => {
        setIsFiltering(true);
        try {
            const result = await cedraClient.view({
                payload: {
                    function: `${FILTER_MODULE}::advanced_filter` as `${string}::${string}::${string}`,
                    functionArguments: [
                        params.query,
                        params.category === 'All' ? '' : params.category,
                        params.minTimestamp.toString(),
                        params.maxTimestamp.toString(),
                        params.sortBy.toString(),
                        limit
                    ],
                },
            });

            const results = result[0] as any[];
            setFilteredDAOs(results.map(mapSearchResultToDAO));
        } catch (error) {
            console.error('Advanced filter failed:', error);
        } finally {
            setIsFiltering(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    return {
        categories,
        isLoadingCats,
        isFiltering,
        filteredDAOs,
        filterByCategory,
        fetchFeaturedDAOs,
        searchDAOs,
        advancedFilter,
        refreshCategories: fetchCategories
    };
}
