import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import { navigationRoutes } from '../config/routes';
import NotificationBadge from './shared/NotificationBadge';

const Sidebar: React.FC = () => {
  const { logout } = useAuth();
  const { isCollapsed, isMobileOpen, closeMobileMenu } = useSidebar();

  // Close mobile menu when clicking on a navigation item
  const handleNavClick = () => {
    closeMobileMenu();
  };

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen) {
        closeMobileMenu();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileOpen, closeMobileMenu]);

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`fixed top-16 left-0 bottom-0 bg-white shadow-sm border-r border-gray-200 z-40 transition-all duration-300 ease-in-out ${
        // Desktop: show/hide based on isCollapsed, Mobile: show/hide based on isMobileOpen
        `lg:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} ${
          isCollapsed ? 'w-16' : 'w-64'
        }`
      }`}>
      <nav className="p-4 pt-8 space-y-1 h-full overflow-y-auto">
        {/* Core Operations Section */}
        {!isCollapsed && (
          <div className="px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
            Operations
          </div>
        )}
        
        {/* Navigation Items */}
        {navigationRoutes.map((item, index) => (
          <div key={item.name}>
            {/* Personal Settings Section Header */}
            {index === 5 && !isCollapsed && (
              <div className="px-3 py-2 mt-6 text-xs font-bold text-gray-700 uppercase tracking-wider">
                Personal
              </div>
            )}
            
            <NavLink
              to={item.path}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? 'justify-center px-2' : 'space-x-3 px-3'} py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
              title={isCollapsed ? item.name : undefined}
            >
              <div className="relative">
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {item.name === 'Notifications' && (
                  <NotificationBadge className="absolute -top-1 -right-1" />
                )}
              </div>
              {!isCollapsed && (
                <div className="flex items-center justify-between w-full">
                  <span>{item.name}</span>
                  {item.name === 'Notifications' && (
                    <NotificationBadge className="ml-2" />
                  )}
                </div>
              )}
            </NavLink>
            
            {/* Add separator after Notifications (before Profile) */}
            {index === 4 && (
              <div className="my-4 border-t border-gray-200" />
            )}
          </div>
        ))}
        
        <div className="pt-6 mt-4 border-t border-gray-200">
          <button 
            onClick={logout}
            className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'space-x-3 px-3'} py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 w-full transition-colors`}
            title={isCollapsed ? 'Logout' : undefined}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </nav>
    </aside>
    </>
  );
};

export default Sidebar;