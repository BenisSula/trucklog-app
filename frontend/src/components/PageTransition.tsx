import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Start transition
    setIsTransitioning(true);
    
    // End transition after a short delay
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div 
      key={location.pathname} // Force re-render on route change
      className={`transition-all duration-150 ease-in-out ${
        isTransitioning ? 'opacity-90 transform translate-y-1' : 'opacity-100 transform translate-y-0'
      }`}
    >
      {children}
    </div>
  );
};

export default PageTransition;