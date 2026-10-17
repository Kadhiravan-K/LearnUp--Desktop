import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface NavigationState {
  pathname: string;
  searchParams: URLSearchParams;
  params: Record<string, string>;
  navigate: (url: string) => void;
}

export const NavigationContext = createContext<NavigationState>({
  pathname: '/dashboard',
  searchParams: new URLSearchParams(),
  params: {},
  navigate: () => {},
});

export function NavigationProvider({ children, initialUrl = '/dashboard' }: { children: ReactNode; initialUrl?: string }) {
  const [currentUrl, setCurrentUrl] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      return window.location.hash.replace(/^#/, '') || initialUrl;
    }
    return initialUrl;
  });

  const navigate = (url: string) => {
    setCurrentUrl(url);
    if (typeof window !== 'undefined') {
      window.location.hash = url;
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (hash) setCurrentUrl(hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [path, search] = currentUrl.split('?');
  const pathname = path || '/dashboard';
  const searchParams = new URLSearchParams(search || '');

  // Extract route params, e.g. /library/:id
  const params: Record<string, string> = {};
  if (pathname.startsWith('/library/')) {
    params.id = pathname.replace('/library/', '');
  }

  return (
    <NavigationContext.Provider value={{ pathname, searchParams, params, navigate }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useDesktopNavigation() {
  return useContext(NavigationContext);
}
