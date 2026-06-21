'use client';

import type { SiteSettings } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface SiteSettingsContextType {
  logoUrl: string | null;
  updateLogo: (logoUrl: string) => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined);

export const SiteSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    try {
      const settingsRef = doc(db, 'site-settings', 'logo');
      const docSnap = await getDoc(settingsRef);
      if (docSnap.exists()) {
        const settings = docSnap.data() as SiteSettings;
        setLogoUrl(settings.logoUrl);
      }
    } catch (error) {
      console.error("Error fetching site settings:", error);
      toast({
        title: "Error",
        description: "Could not fetch site settings.",
        variant: "destructive"
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateLogo = async (newLogoUrl: string) => {
    try {
      const settingsRef = doc(db, 'site-settings', 'logo');
      await setDoc(settingsRef, { logoUrl: newLogoUrl }, { merge: true });
      fetchSettings(); // Re-fetch settings
      toast({ title: "Logo Updated!", description: "Your new site logo has been saved." });
    } catch (error) {
      console.error("Error updating logo:", error);
      toast({ title: "Error", description: "Could not save the new logo.", variant: "destructive" });
      throw error;
    }
  };

  return (
    <SiteSettingsContext.Provider value={{ logoUrl, updateLogo }}>
      {children}
    </SiteSettingsContext.Provider>
  );
};

export const useSiteSettings = () => {
  const context = useContext(SiteSettingsContext);
  if (context === undefined) {
    throw new Error('useSiteSettings must be used within a SiteSettingsProvider');
  }
  return context;
};
