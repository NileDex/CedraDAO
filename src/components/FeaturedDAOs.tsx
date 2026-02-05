import React, { useState } from 'react';
import { Search, Plus, RefreshCw, Star } from 'lucide-react';
import DAOCard from './DAOCard';
import { DAO } from '../types/dao';
import { useFetchCreatedDAOs } from '../useServices/useFetchDAOs';
import { useFilter } from '../contexts/FilterContext';

interface FeaturedDAOsProps {
  onDAOSelect: (_dao: DAO) => void;
  onCreateDAO?: () => void;
  sidebarCollapsed?: boolean;
}

const FeaturedDAOs: React.FC<FeaturedDAOsProps> = ({ onDAOSelect, onCreateDAO }) => {
  const { daos, isLoading: isLoadingAll, error, refetch } = useFetchCreatedDAOs();
  const {
    categories,
    filterByCategory,
    filteredDAOs,
    isFiltering,
    fetchFeaturedDAOs
  } = useFilter();

  const [selectedCategory, setSelectedCategory] = useState('All');

  const handleCategoryClick = (cat: string) => {
    setSelectedCategory(cat);
    if (cat === 'Featured') {
      fetchFeaturedDAOs();
    } else {
      filterByCategory(cat);
    }
  };

  const displayDAOs = selectedCategory === 'All' ? daos : filteredDAOs;
  const isLoading = isLoadingAll || isFiltering;

  // Add 'Featured' to categories if not already there, usually it's better as a separate button or special cat
  const allCategories = categories.includes('Featured') ? categories : ['All', 'Featured', ...categories.filter(c => c !== 'All')];

  return (
    <div className="mb-12 w-full">
      <div className="flex flex-col gap-5 mb-10 pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tighter text-white flex items-center gap-3">
              Explore Ecosystem
              {selectedCategory === 'Featured' && <Star size={20} className="text-[#e1fd6a] fill-[#e1fd6a]" />}
            </h2>
            <p className="text-xs font-medium text-white/30">Curated Organizations</p>
          </div>
          <button
            onClick={() => {
              refetch();
              if (selectedCategory !== 'All') handleCategoryClick(selectedCategory);
            }}
            disabled={isLoading}
            className="text-white/20 hover:text-white transition-colors p-2 bg-white/[0.02] border border-white/5 rounded-xl"
            title="Refresh DAO list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-8 overflow-x-auto no-scrollbar">
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={`text-[11px] font-semibold transition-all whitespace-nowrap pb-2 border-b-2 ${selectedCategory === cat
                ? 'text-[#e1fd6a] border-[#e1fd6a]'
                : 'text-white/30 border-transparent hover:text-white'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {isLoading && displayDAOs.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#e1fd6a]/20 border-t-[#e1fd6a] rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="mb-8 p-6 bg-red-400/10 border border-red-400/20 rounded-2xl">
          <div className="text-red-400 text-xs font-medium flex items-center gap-2">
            {error}
          </div>
        </div>
      ) : displayDAOs.length === 0 ? (
        <div className="text-center py-20 rounded-2xl">
          <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center">
            <Search className="w-8 h-8 text-white/20" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Void Detected</h3>
          <p className="text-white/40 text-xs font-medium mb-8 text-center">No organizations found in {selectedCategory === 'All' ? 'the ecosystem' : `the ${selectedCategory} sector`}.</p>
          {onCreateDAO && (
            <button onClick={onCreateDAO} className="nb-button">
              <Plus className="w-4 h-4" />
              <span>Create First DAO</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayDAOs.map((dao) => (
            <DAOCard
              key={dao.id}
              dao={dao}
              onClick={() => onDAOSelect(dao)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FeaturedDAOs;