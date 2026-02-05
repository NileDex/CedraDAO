import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search, CornerDownLeft, Command, Hash, Loader2 } from 'lucide-react';
import { useFilter } from '../contexts/FilterContext';
import { DAO } from '../types/dao';

interface FilterProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect?: (_dao: DAO) => void;
}

const Filter: React.FC<FilterProps> = ({ isOpen, onClose, onSelect }) => {
    const { searchDAOs, isFiltering, categories } = useFilter();
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<DAO[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [activeCategory, setActiveCategory] = useState('All');

    const inputRef = useRef<HTMLInputElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // Fetch results as user types
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (isOpen) {
                const searchResults = await searchDAOs(searchQuery);
                // Filter by category if one is selected
                const filtered = activeCategory === 'All'
                    ? searchResults
                    : searchResults.filter(dao => dao.category === activeCategory);
                setResults(filtered || []);
                setSelectedIndex(0);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, activeCategory, isOpen, searchDAOs]);

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
            setSearchQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    const handleSelectDAO = useCallback((dao: DAO) => {
        if (onSelect) {
            onSelect(dao);
        }
        onClose();
        // Fire external navigate event if needed
        window.dispatchEvent(new CustomEvent('dao-selected', { detail: dao }));
    }, [onSelect, onClose]);

    // Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (results[selectedIndex]) {
                handleSelectDAO(results[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    }, [results, selectedIndex, handleSelectDAO, onClose]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal - Command Palette Style */}
            <div
                ref={modalRef}
                onKeyDown={handleKeyDown}
                className="relative w-full max-w-xl bg-[#1c1d21]/95 border border-white/10 rounded-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden animate-in zoom-in-95 slide-in-from-top-4 duration-200 backdrop-blur-xl"
            >
                {/* Search Bar */}
                <div className="flex items-center px-6 py-5 border-b border-white/5">
                    <Search className="w-5 h-5 text-white/40 mr-4" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search DAOs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none text-white text-lg placeholder:text-white/20 font-medium"
                    />
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/5 rounded-md text-white/40 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Filter Shortcuts (Categories) */}
                <div className="px-6 py-3 bg-white/[0.02] border-b border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <div className="text-[10px] font-medium text-white/30 mr-2 flex items-center gap-1">
                        <Hash size={10} /> Filters
                    </div>
                    {['All', ...categories].map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all border whitespace-nowrap ${activeCategory === cat
                                ? 'bg-[#e1fd6a]/10 border-[#e1fd6a]/20 text-[#e1fd6a]'
                                : 'bg-white/5 border-white/5 text-white/40 hover:text-white'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Results List */}
                <div className="max-h-[400px] overflow-y-auto py-2 no-scrollbar">
                    {isFiltering ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="w-8 h-8 text-[#e1fd6a] animate-spin" />
                            <span className="text-xs font-medium text-white/30">Searching registry...</span>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="px-2 space-y-1">
                            {results.map((dao, index) => (
                                <button
                                    key={dao.id}
                                    onClick={() => handleSelectDAO(dao)}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all text-left ${selectedIndex === index
                                        ? 'bg-white/[0.08] ring-1 ring-white/10 translate-x-1'
                                        : 'hover:bg-white/[0.03]'
                                        }`}
                                >
                                    <div className="w-12 h-12 rounded-xl border border-white/10 overflow-hidden bg-white/5 flex-shrink-0 relative group">
                                        <img
                                            src={dao.image}
                                            alt={dao.name}
                                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${dao.id}`;
                                            }}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-medium text-white truncate">{dao.name}</span>
                                            <span className="px-1.5 py-0.5 bg-white/5 rounded text-[9px] font-medium text-white/40">
                                                {dao.category}
                                            </span>
                                        </div>
                                        <p className="text-xs text-white/30 truncate font-normal">
                                            {dao.description || 'Decentralized organization on Anchor'}
                                        </p>
                                    </div>
                                    {selectedIndex === index && (
                                        <div className="p-2 text-white/60 bg-white/5 rounded-lg flex items-center gap-1">
                                            <span className="text-[10px] font-medium">Select</span>
                                            <CornerDownLeft size={12} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center">
                            <span className="text-sm font-medium text-white/30">
                                {searchQuery ? 'No results found' : 'Type to discover DAOs'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-black/40 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] text-white/60 font-medium">Esc</span>
                            <span className="text-[10px] text-white/40 font-medium">to close</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] text-white/60 font-medium">↵</span>
                            <span className="text-[10px] text-white/40 font-medium">to select</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-30 overflow-hidden">
                        <Command className="w-3 h-3 text-white/40" />
                        <span className="text-[9px] text-white/40 font-medium">Powered by Anchor Registry</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Filter;
