import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SidebarContextType {
  // Desktop state
  isCollapsed: boolean;
  toggleSidebar: () => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;
  
  // Mobile state
  isMobileOpen: boolean;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
  openMobileMenu: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

interface SidebarProviderProps {
  children: ReactNode;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Desktop sidebar functions
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const collapseSidebar = () => {
    setIsCollapsed(true);
  };

  const expandSidebar = () => {
    setIsCollapsed(false);
  };

  // Mobile menu functions
  const toggleMobileMenu = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileOpen(false);
  };

  const openMobileMenu = () => {
    setIsMobileOpen(true);
  };

  return (
    <SidebarContext.Provider
      value={{
        // Desktop state
        isCollapsed,
        toggleSidebar,
        collapseSidebar,
        expandSidebar,
        
        // Mobile state
        isMobileOpen,
        toggleMobileMenu,
        closeMobileMenu,
        openMobileMenu,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};
