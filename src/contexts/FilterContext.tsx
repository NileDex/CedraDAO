import React, { createContext, useContext } from 'react';
import { DAO } from '../types/dao';
import { useFilter as useFilterHook, AdvancedFilterParams } from '../useServices/useFilter';

interface FilterContextType {
    categories: string[];
    isLoadingCats: boolean;
    isFiltering: boolean;
    filteredDAOs: DAO[];
    filterByCategory: (category: string) => Promise<DAO[]>;
    fetchFeaturedDAOs: () => Promise<void>;
    searchDAOs: (query: string) => Promise<DAO[]>;
    advancedFilter: (params: AdvancedFilterParams) => Promise<void>;
    refreshCategories: () => Promise<void>;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const filterData = useFilterHook();

    return (
        <FilterContext.Provider value={filterData}>
            {children}
        </FilterContext.Provider>
    );
};

export const useFilter = () => {
    const context = useContext(FilterContext);
    if (context === undefined) {
        throw new Error('useFilter must be used within a FilterProvider');
    }
    return context;
};
