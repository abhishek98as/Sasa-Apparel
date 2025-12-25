'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface BrandSettings {
  brandName?: string;
  brandLogo?: string;
  favicon?: string;
}

interface BrandContextType {
  brandSettings: BrandSettings;
  isLoading: boolean;
  refreshBrandSettings: () => Promise<void>;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brandSettings, setBrandSettings] = useState<BrandSettings>({});
  const [isLoading, setIsLoading] = useState(true);

  const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/d6s8a2mzi';

  const updateFavicon = (faviconPath: string) => {
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (link) {
      link.href = `${urlEndpoint}${faviconPath}`;
    } else {
      const newLink = document.createElement('link');
      newLink.rel = 'icon';
      newLink.href = `${urlEndpoint}${faviconPath}`;
      document.head.appendChild(newLink);
    }
  };

  const updateDocumentTitle = (brandName: string) => {
    document.title = `${brandName} - Manufacturing Portal`;
  };

  const fetchBrandSettings = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/settings');
      const json = await res.json();
      if (json.success && json.data) {
        setBrandSettings(json.data);
        
        // Update favicon
        if (json.data.favicon) {
          updateFavicon(json.data.favicon);
        }
        
        // Update document title
        if (json.data.brandName) {
          updateDocumentTitle(json.data.brandName);
        }
      }
    } catch (error) {
      console.error('Failed to fetch brand settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBrandSettings();
  }, []);

  const refreshBrandSettings = async () => {
    await fetchBrandSettings();
  };

  return (
    <BrandContext.Provider value={{ brandSettings, isLoading, refreshBrandSettings }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
}
