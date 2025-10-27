import React from 'react';
import { Truck, Menu, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useSidebar } from '../contexts/SidebarContext';
import NotificationLink from './shared/NotificationLink';
import ConnectionStatus from './ConnectionStatus';
import RefreshButton from './RefreshButton';
import UserAvatarDropdown from './UserAvatarDropdown';

const Header: React.FC = () => {
  const { 
    isCollapsed, 
    toggleSidebar, 
    isMobileOpen, 
    toggleMobileMenu 
  } = useSidebar();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-neutral-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Mobile menu button */}
            <button
              onClick={toggleMobileMenu}
              className="lg:hidden p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
              aria-label="Toggle mobile menu"
              title="Toggle mobile menu"
            >
              {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            
            {/* Desktop sidebar toggle */}
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </button>
            
            <Truck className="h-8 w-8 text-primary-600" />
            <h1 className="text-2xl font-bold text-neutral-900">TruckLog</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Connection Status */}
            <ConnectionStatus size="md" variant="minimal" />
            
            {/* Refresh Button */}
            <RefreshButton />
            
            {/* Notification Link */}
            <NotificationLink variant="header" />
            
            {/* User Avatar Dropdown */}
            <UserAvatarDropdown />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;