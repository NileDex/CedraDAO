import React, { useState } from 'react';
import Header from '../Header';
import Sidebar from '../Sidebar';
import { useNavigate } from 'react-router-dom';

interface OnboardLayoutProps {
  children: React.ReactNode;
}

const OnboardLayout: React.FC<OnboardLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleViewChange = (view: string) => {
    if (view === 'home') {
      navigate('/');
    } else if (view === 'create-new') {
      navigate('/');
      // You can add additional logic to trigger create DAO view
    } else if (view === 'trending') {
      navigate('/');
      // You can add additional logic to trigger trending view
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ color: '#ffffff' }}>
      <Header onMenuClick={() => setSidebarOpen(true)} disableTheme={true} />
      {/* Sidebar - Only mobile version will render */}
      <Sidebar
        currentView=""
        onViewChange={handleViewChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        mobileOnly={true}
      />
      <main className="flex-1" style={{ color: '#ffffff' }}>
        {children}
      </main>
    </div>
  );
};

export default OnboardLayout;
