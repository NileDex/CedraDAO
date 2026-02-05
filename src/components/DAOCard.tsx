import React, { useState } from 'react';
import { DAO } from '../types/dao';
import { Users, FileText, ChevronRight, Star } from 'lucide-react';

interface DAOCardProps {
  dao: DAO;
  onClick: () => void;
  sidebarCollapsed?: boolean;
}

const DAOCard: React.FC<DAOCardProps> = ({ dao, onClick }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Optimized image preloading
  React.useEffect(() => {
    if (dao.image) {
      const img = new Image();
      img.onload = () => setImageLoaded(true);
      img.onerror = () => setImageError(true);
      img.src = dao.image;
    } else {
      setImageError(true);
    }
  }, [dao.image]);

  return (
    <div
      onClick={onClick}
      className="nb-card !bg-transparent border-white/5 hover:border-[#e1fd6a]/20 cursor-pointer group animate-fade-in flex flex-col gap-5"
    >
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          {(!dao.image || imageError) ? (
            <div className="w-12 h-12 bg-[#e1fd6a] rounded-full flex items-center justify-center text-black font-semibold text-xl">
              {dao.name.charAt(0).toUpperCase()}
            </div>
          ) : (
            <img
              src={dao.image}
              alt={dao.name}
              className={`w-12 h-12 rounded-full object-cover border border-white/10 ${!imageLoaded ? 'animate-pulse bg-white/5' : ''}`}
            />
          )}
          {dao.subname && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#060607] rounded-full border border-white/10 flex items-center justify-center">
              <span className="text-[8px] font-medium text-[#e1fd6a]">{dao.subname.charAt(0)}</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-semibold text-lg truncate group-hover:text-[#e1fd6a] transition-colors tracking-tighter">
              {dao.name}
            </h3>
            {dao.category === 'featured' && (
              <Star size={14} className="text-[#e1fd6a] fill-[#e1fd6a] shrink-0" />
            )}
          </div>
          <p className="text-white/20 text-[9px] font-medium">{dao.chain || 'CEDRA'} / INFRASTRUCTURE</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Outcome-style rows */}
        <div className="flex items-center justify-between text-[11px] font-semibold px-1">
          <div className="flex items-center gap-2 text-white/20">
            <Users size={12} />
            <span>Identity Flow</span>
          </div>
          <span className="text-white">{dao.members?.toLocaleString() ?? 0}</span>
        </div>

        <div className="flex items-center justify-between text-[11px] font-semibold px-1">
          <div className="flex items-center gap-2 text-white/20">
            <FileText size={12} />
            <span>Governance</span>
          </div>
          <span className="text-white">{dao.proposals?.toLocaleString() ?? 0}</span>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between group/footer">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-white/40 group-hover/footer:text-white transition-colors">
          Show More <ChevronRight size={12} className="group-hover/footer:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
};

export default DAOCard;