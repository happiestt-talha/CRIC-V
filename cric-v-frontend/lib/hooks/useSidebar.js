'use client'

import { useState, useEffect } from 'react'

// Lightweight global store for Sidebar state
const listeners = new Set();

let globalState = {
  isCollapsed: false,
  isMobileOpen: false,
  initialized: false,
};

function dispatch(newState) {
  globalState = { ...globalState, ...newState };
  listeners.forEach(listener => listener(globalState));
}

export const useSidebar = () => {
  const [state, setState] = useState(globalState);

  useEffect(() => {
    // Initialize from localStorage only once on client
    if (typeof window !== 'undefined' && !globalState.initialized) {
      globalState.initialized = true;
      const saved = localStorage.getItem('cric-v-sidebar-collapsed');
      if (saved === 'true') {
        dispatch({ isCollapsed: true });
      }
    }

    listeners.add(setState);
    return () => listeners.delete(setState);
  }, []);

  const toggle = () => {
    const next = !globalState.isCollapsed;
    localStorage.setItem('cric-v-sidebar-collapsed', String(next));
    dispatch({ isCollapsed: next });
  };

  const closeMobile = () => dispatch({ isMobileOpen: false });
  const openMobile = () => dispatch({ isMobileOpen: true });

  return { 
    isCollapsed: state.isCollapsed, 
    isMobileOpen: state.isMobileOpen, 
    toggle, 
    closeMobile, 
    openMobile 
  };
};
