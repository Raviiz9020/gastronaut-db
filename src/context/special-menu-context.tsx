
'use client';

import type { SpecialMenu, MenuItem } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import { useVendor } from './vendor-context';
import { useCustomer } from './customer-context';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { createSlug } from '@/lib/utils';

interface SpecialMenuContextType {
  specialMenus: SpecialMenu[];
  activeSpecialMenus: SpecialMenu[];
  fetchAllSpecialMenus: () => Promise<void>;
  saveSpecialMenu: (
    specialMenuData: Partial<Omit<SpecialMenu, 'vendorUsername'>> &
      Pick<SpecialMenu, 'type' | 'itemIds' | 'isActive'> & { title?: string },
    menuItems: MenuItem[]
  ) => Promise<void>;
  toggleSpecialMenuStatus: (id: string, currentStatus: boolean) => Promise<void>;
  removeSpecialMenu: (id: string) => Promise<void>;
}

const SpecialMenuContext = createContext<SpecialMenuContextType | undefined>(undefined);

export const SpecialMenuProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { vendor, vendors } = useVendor();
  const { customer } = useCustomer();
  const { toast } = useToast();
  const [specialMenus, setSpecialMenus] = useState<SpecialMenu[]>([]);

  const checkRestricted = useCallback(() => {
    if (vendor?.isMenuEditDisabled) {
      toast({
        title: "Action Restricted",
        description: "Menu management is disabled for this demo account.",
        variant: "destructive"
      });
      return true;
    }
    return false;
  }, [vendor, toast]);

  // This listener is now intended for the admin context.
  // Public pages will use fetchAllSpecialMenus.
  useEffect(() => {
    if (!vendor) {
        // If not a logged-in vendor, don't attach a listener.
        // Data will be fetched on-demand.
        return;
    }
    const specialsRef = collection(db, 'specialMenus');
    const q = query(specialsRef, where('vendorUsername', '==', vendor.username));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const menus = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as SpecialMenu)
        );
        setSpecialMenus(menus);
      },
      (error) => {
        console.error('Error fetching special menus in real-time:', error);
        toast({
          title: 'Error',
          description: 'Could not sync special menus.',
          variant: 'destructive',
        });
      }
    );

    return () => unsubscribe();
  }, [vendor, toast]);
  
  const fetchAllSpecialMenus = useCallback(async () => {
    try {
        const specialsRef = collection(db, 'specialMenus');
        const snapshot = await getDocs(specialsRef);
        const menus = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SpecialMenu));
        setSpecialMenus(menus);
    } catch(e) {
        console.error("Error fetching all special menus: ", e);
    }
  }, []);

  const filteredSpecialMenus = useMemo(() => {
    if (customer?.isDemoCustomer) {
      const demoVendorUsernames = new Set(vendors.map(v => v.username));
      return specialMenus.filter(s => demoVendorUsernames.has(s.vendorUsername));
    }
    return specialMenus;
  }, [specialMenus, customer, vendors]);

  const activeSpecialMenus = useMemo(() => {
    return filteredSpecialMenus.filter((menu) => menu.isActive);
  }, [filteredSpecialMenus]);

  const saveSpecialMenu = async (
    specialMenuData: Partial<Omit<SpecialMenu, 'vendorUsername'>> &
      Pick<SpecialMenu, 'type' | 'itemIds' | 'isActive'> & { title?: string },
    menuItems: MenuItem[]
  ) => {
    if (checkRestricted()) return;
    if (!vendor) {
      throw new Error('You must be logged in as a vendor.');
    }

    const { id, ...data } = specialMenuData;

    // Check if all items in the special are unavailable
    const allItemsUnavailable = data.itemIds.every(itemId => {
        const item = menuItems.find(mi => mi.id === itemId);
        return item ? !item.isAvailable : true; // Treat missing items as unavailable
    });

    const isActive = allItemsUnavailable ? false : data.isActive;

    if (allItemsUnavailable && data.isActive) {
        toast({
            title: 'Special Deactivated',
            description: 'This special was made inactive because all of its items are currently unavailable.',
            variant: 'default',
        });
    }

    const dataToSave = {
      ...data,
      isActive, // Use the new status
      title: data.type,
      vendorUsername: vendor.username,
    };

    try {
      const docId = id || `${createSlug(vendor.username)}-${createSlug(dataToSave.title)}`;
      const specialMenuRef = doc(db, 'specialMenus', docId);
      await setDoc(specialMenuRef, dataToSave, { merge: true });
    } catch (e) {
      console.error('Error saving special menu: ', e);
      throw new Error('Failed to save special menu.');
    }
  };

  const toggleSpecialMenuStatus = async (id: string, currentStatus: boolean) => {
    if (checkRestricted()) return;
    const specialMenuRef = doc(db, 'specialMenus', id);
    try {
      await updateDoc(specialMenuRef, { isActive: !currentStatus });
      toast({ title: 'Success', description: 'Special menu status has been updated.' });
    } catch (e) {
      console.error('Error toggling special menu status:', e);
      toast({ title: 'Error', description: 'Could not change status.', variant: 'destructive' });
    }
  };

  const removeSpecialMenu = async (id: string) => {
    if (checkRestricted()) return;
    try {
      await deleteDoc(doc(db, 'specialMenus', id));
      toast({ title: 'Success', description: 'Special menu removed.' });
    } catch (e) {
      console.error('Error removing special menu:', e);
      toast({ title: 'Error', description: 'Could not remove special menu.', variant: 'destructive' });
    }
  };

  return (
    <SpecialMenuContext.Provider
      value={{
        specialMenus: filteredSpecialMenus,
        activeSpecialMenus,
        fetchAllSpecialMenus,
        saveSpecialMenu,
        toggleSpecialMenuStatus,
        removeSpecialMenu,
      }}
    >
      {children}
    </SpecialMenuContext.Provider>
  );
};

export const useSpecialMenu = () => {
  const context = useContext(SpecialMenuContext);
  if (context === undefined) {
    throw new Error('useSpecialMenu must be used within a SpecialMenuProvider');
  }
  return context;
};
