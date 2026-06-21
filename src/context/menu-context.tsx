
'use client';

import type { MenuItem, Category } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo, useRef } from 'react';
import { useVendor } from './vendor-context';
import { useCustomer } from './customer-context';
import { useSuperAdmin } from './super-admin-context';
import { db, storage } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, limit, startAfter, getCountFromServer, orderBy, QueryDocumentSnapshot, DocumentData, setDoc, writeBatch, getDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { createSlug } from '@/lib/utils';


interface MenuContextType {
  menuItems: MenuItem[];
  categories: Category[];
  globalCategories: Category[];
  addMenuItem: (item: Omit<MenuItem, 'id' | 'shopName' | 'isAvailable'>) => Promise<void>;
  updateMenuItem: (item: MenuItem) => Promise<void>;
  removeMenuItem: (itemId: string) => Promise<void>;
  toggleMenuItemAvailability: (itemId: string, newStatus?: boolean) => void;
  toggleMenuItemPopularity: (itemId: string) => Promise<void>;
  setAllItemsAvailabilityInCategory: (categoryName: string, newStatus: boolean) => Promise<void>;
  setAllItemsVegStatusInCategory: (categoryName: string, newStatus: boolean) => Promise<void>;
  toggleMenuItemDiscount: (itemId: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'shopName'>, isGlobal?: boolean) => Promise<void>;
  updateCategory: (category: Category, isGlobal?: boolean) => Promise<void>;
  removeCategory: (categoryId: string, isGlobal?: boolean) => Promise<void>;
  fetchAllItems: () => Promise<void>;
  isFetchingItems: boolean;
  toggleMenuItemVegStatus: (itemId: string) => Promise<void>;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

// Singleton listener to prevent multiple real-time connections
let unsubscribeGlobalListener: (() => void) | null = null;
let hasListenerBeenActivated = false;

export const MenuProvider = ({ children }: { children: ReactNode }) => {
  const { vendor, vendors } = useVendor();
  const { customer } = useCustomer();
  const { toast } = useToast();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [globalCategories, setGlobalCategories] = useState<Category[]>([]);
  const [isFetchingItems, setIsFetchingItems] = useState(false);
  
  const unsubscribeMenuItemsRef = useRef<() => void | null>(null);

  const checkRestricted = useCallback(() => {
    if (vendor?.isMenuEditDisabled) {
      toast({
        title: "Action Restricted",
        description: "Menu management is disabled for this demo account to maintain platform integrity.",
        variant: "destructive"
      });
      return true;
    }
    return false;
  }, [vendor, toast]);

  const fetchCategories = useCallback(async () => {
    try {
      const categoriesCollection = collection(db, 'categories');
      const unsubscribe = onSnapshot(categoriesCollection, (snapshot) => {
        const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        setCategories(cats);
        setGlobalCategories(cats.filter(cat => cat.shopName === 'global'));
      });
      return unsubscribe;
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({ title: "Error", description: "Could not fetch menu categories.", variant: "destructive" });
    }
  }, [toast]);

  // Fetch categories once on mount and listen for real-time updates
  useEffect(() => {
    const unsub = fetchCategories();
    return () => {
      unsub.then(u => u && u()).catch(console.error);
    }
  }, [fetchCategories]);

  
  const fetchAllItems = useCallback(async () => {
    if (hasListenerBeenActivated) return; // Prevent re-activating the listener

    setIsFetchingItems(true);
    hasListenerBeenActivated = true; // Set flag immediately

    try {
        const menuItemsCollection = collection(db, 'menuItems');
        // This sets up the one and only real-time listener for the entire app session
        unsubscribeGlobalListener = onSnapshot(menuItemsCollection, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
            setMenuItems(items);
            setIsFetchingItems(false); // Stop loading indicator once data arrives
        }, (error) => {
            console.error("Error with global menu listener:", error);
            toast({ title: "Error", description: "Could not sync the menu in real-time.", variant: "destructive"});
            setIsFetchingItems(false);
        });
    } catch (error) {
        console.error("Error setting up global menu listener:", error);
        toast({ title: "Error", description: "Could not fetch the full menu.", variant: "destructive"});
        setIsFetchingItems(false);
        hasListenerBeenActivated = false; // Reset flag on error
    }
  }, [toast]);
  

  const generateUniqueSlug = async (name: string, vendorUsername: string): Promise<string> => {
    let slug = createSlug(name);
    let isUnique = false;
    let counter = 1;
    while (!isUnique) {
      const q = query(
        collection(db, 'menuItems'),
        where('vendorUsername', '==', vendorUsername),
        where('slug', '==', slug)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        isUnique = true;
      } else {
        slug = `${createSlug(name)}-${counter}`;
        counter++;
      }
    }
    return slug;
  };

  const addMenuItem = async (item: Omit<MenuItem, 'id' | 'isAvailable' | 'shopName'>) => {
    if (checkRestricted()) return;
    if (!vendor || !vendor.shopName) {
        toast({ title: 'Error', description: 'Vendor information is incomplete. Please set a shop name.', variant: 'destructive'});
        return;
    };

    const slug = await generateUniqueSlug(item.name, vendor.username);

    const newItemData: Omit<MenuItem, 'id'> = { 
        ...item, 
        shopName: vendor.shopName,
        isAvailable: true,
        vendorUsername: vendor.username,
        slug: slug,
    };
    
    if (typeof newItemData.discountPrice !== 'number' || newItemData.discountPrice < 0) {
        delete (newItemData as Partial<MenuItem>).discountPrice;
    }

    const docId = `${createSlug(vendor.shopName)}-${createSlug(item.name)}`;
    const docRef = doc(db, 'menuItems', docId);

    await setDoc(docRef, newItemData);
  };

  const updateMenuItem = async (updatedItem: MenuItem) => {
    if (checkRestricted()) return;
    if (!vendor || !vendor.shopName) return;
    
    const dataToUpdate: Partial<MenuItem> = {
        ...updatedItem,
        shopName: vendor.shopName,
    };
    
    const currentItem = menuItems.find(item => item.id === updatedItem.id);
    if (currentItem && currentItem.name !== updatedItem.name) {
        dataToUpdate.slug = await generateUniqueSlug(updatedItem.name, vendor.username);
    }


    if (typeof dataToUpdate.discountPrice !== 'number' || dataToUpdate.discountPrice < 0) {
       delete dataToUpdate.discountPrice;
    }

    const itemRef = doc(db, 'menuItems', updatedItem.id);
    await updateDoc(itemRef, dataToUpdate);
  };

  const removeMenuItem = async (itemId: string) => {
    if (checkRestricted()) return;
    const itemToRemove = menuItems.find(item => item.id === itemId);
    if (!itemToRemove) {
      const itemRef = doc(db, 'menuItems', itemId);
      await deleteDoc(itemRef);
      return;
    };

    if (itemToRemove.image && itemToRemove.image.includes('firebasestorage.googleapis.com')) {
        try {
            const imageRef = ref(storage, itemToRemove.image);
            await deleteObject(imageRef);
        } catch (error: any) {
            if (error.code !== 'storage/object-not-found') {
                console.error("Error deleting image from storage:", error);
            }
        }
    }

    await deleteDoc(doc(db, 'menuItems', itemId));
  };

  const toggleMenuItemAvailability = async (itemId: string, newStatus?: boolean) => {
    if (checkRestricted()) return;
    const itemRef = doc(db, 'menuItems', itemId);
    const itemToToggle = menuItems.find(i => i.id === itemId);

    if (!itemToToggle) return;
    
    const finalStatus = typeof newStatus === 'boolean' ? newStatus : !itemToToggle.isAvailable;

    try {
        await updateDoc(itemRef, { isAvailable: finalStatus });
    } catch (error) {
        toast({
            title: 'Update Failed',
            description: 'Could not update item availability. Please try again.',
            variant: 'destructive',
        });
    }
  };
  
  const toggleMenuItemVegStatus = async (itemId: string) => {
    if (checkRestricted()) return;
    const itemRef = doc(db, 'menuItems', itemId);
    const itemToToggle = menuItems.find(i => i.id === itemId);

    if (!itemToToggle) return;

    try {
        await updateDoc(itemRef, { isVeg: !itemToToggle.isVeg });
    } catch (error) {
        toast({
            title: 'Update Failed',
            description: 'Could not update veg status. Please try again.',
            variant: 'destructive',
        });
    }
  };

  const toggleMenuItemPopularity = async (itemId: string) => {
    if (checkRestricted()) return;
    if (!vendor) return;

    const itemRef = doc(db, 'menuItems', itemId);
    const itemToToggle = menuItems.find(i => i.id === itemId);

    if (!itemToToggle) return;

    const popularPicksCount = menuItems.filter(item => 
        item.vendorUsername === vendor.username && item.isPopular
    ).length;

    // Check if trying to add a new popular pick when limit is reached
    if (!itemToToggle.isPopular && popularPicksCount >= 5) {
        toast({
            title: 'Limit Reached',
            description: 'You can only select up to 5 popular picks.',
            variant: 'destructive',
        });
        return;
    }
    
    try {
        await updateDoc(itemRef, { isPopular: !itemToToggle.isPopular });
    } catch (error) {
        toast({
            title: 'Update Failed',
            description: 'Could not update popular status. Please try again.',
            variant: 'destructive',
        });
    }
  };

  const setAllItemsAvailabilityInCategory = async (categoryName: string, newStatus: boolean) => {
    if (checkRestricted()) return;
    if (!vendor) return;

    try {
      const itemsToUpdateQuery = query(
        collection(db, 'menuItems'), 
        where('vendorUsername', '==', vendor.username),
        where('category', '==', categoryName)
      );

      const querySnapshot = await getDocs(itemsToUpdateQuery);
      
      if (querySnapshot.empty) {
        toast({ title: 'No items to update', description: 'There are no items in this category to change.' });
        return;
      }
      
      const batch = writeBatch(db);
      querySnapshot.forEach(doc => {
        batch.update(doc.ref, { isAvailable: newStatus });
      });
      
      await batch.commit();
      
      toast({
        title: 'Success!',
        description: `All items in ${categoryName} have been set to ${newStatus ? 'available' : 'unavailable'}.`
      });
    } catch (error) {
       console.error("Error updating category availability:", error);
       toast({
        title: 'Update Failed',
        description: 'Could not update all items in the category.',
        variant: 'destructive'
       });
    }
  };

  const setAllItemsVegStatusInCategory = async (categoryName: string, newStatus: boolean) => {
    if (checkRestricted()) return;
    if (!vendor) return;

    try {
      let itemsToUpdateQuery;
      if (categoryName === 'All') {
        itemsToUpdateQuery = query(
          collection(db, 'menuItems'),
          where('vendorUsername', '==', vendor.username)
        );
      } else {
        itemsToUpdateQuery = query(
          collection(db, 'menuItems'),
          where('vendorUsername', '==', vendor.username),
          where('category', '==', categoryName)
        );
      }

      const querySnapshot = await getDocs(itemsToUpdateQuery);

      if (querySnapshot.empty) return;

      const batch = writeBatch(db);
      querySnapshot.forEach(doc => {
        batch.update(doc.ref, { isVeg: newStatus });
      });

      await batch.commit();

      toast({
        title: "Success!",
        description: categoryName === 'All'
          ? `All menu items have been updated.`
          : `All items in ${categoryName} have been updated.`,
      });
    } catch (error) {
      console.error("Error updating category veg status:", error);
      toast({
        title: 'Update Failed',
        description: 'Could not update all items.',
        variant: 'destructive',
      });
    }
  };


  const toggleMenuItemDiscount = async (itemId: string) => {
    if (checkRestricted()) return;
    const itemRef = doc(db, 'menuItems', itemId);
    const itemToToggle = menuItems.find(i => i.id === itemId);

    if (!itemToToggle) return;
    
    const newStatus = !itemToToggle.isDiscountActive;

    try {
        await updateDoc(itemRef, { 
            isDiscountActive: newStatus,
            // If turning off, we might want to keep the prices but hide the badge.
            // However, for simple items, we reset discountPrice to avoid stale data.
            ...(newStatus === false && { discountPrice: 0 })
        });
        toast({
            title: newStatus ? "Discount Activated" : "Discount Deactivated",
            description: `The discount for ${itemToToggle.name} has been ${newStatus ? 'turned on' : 'turned off'}.`
        })
    } catch (error) {
        toast({
            title: 'Update Failed',
            description: 'Could not update discount status. Please try again.',
            variant: 'destructive',
        });
    }
  };
  
  const addCategory = async (category: Omit<Category, 'id'| 'shopName'>, isGlobal = false) => {
    if (!isGlobal && checkRestricted()) return;
    const shopName = isGlobal ? 'global' : vendor?.shopName;
    if (!shopName) {
        toast({ title: 'Error', description: 'Vendor must have a shop name to create categories.', variant: 'destructive'});
        return;
    }

    const newCategory = { 
        ...category,
        shopName: shopName
    };
    
    const docId = `${createSlug(shopName)}-${createSlug(category.name)}`;
    const categoryRef = doc(db, 'categories', docId);

    try {
        await setDoc(categoryRef, newCategory);
        toast({ title: 'Success', description: 'Category added successfully.'});
    } catch (e) {
        console.error("Error adding category:", e);
        toast({ title: 'Error', description: 'Could not add category.', variant: 'destructive'});
    }
  };

  const updateCategory = async (updatedCategory: Category, isGlobal = false) => {
    if (!isGlobal && checkRestricted()) return;
    const shopName = isGlobal ? 'global' : vendor?.shopName;
    if (!shopName || updatedCategory.shopName !== shopName) {
        toast({ title: 'Error', description: 'Permission denied.', variant: 'destructive'});
        return;
    }
    
    try {
        const categoryRef = doc(db, 'categories', updatedCategory.id);
        const { id, ...dataToUpdate } = updatedCategory;
        await updateDoc(categoryRef, dataToUpdate);
        toast({ title: 'Success', description: 'Category updated successfully.'});
    } catch (e) {
        console.error("Error updating category:", e);
        toast({ title: 'Error', description: 'Could not update category.', variant: 'destructive'});
    }
  };
  
  const removeCategory = async (categoryId: string, isGlobal = false) => {
    if (!isGlobal && checkRestricted()) return;
    const categoryToRemove = categories.find(c => c.id === categoryId);
    if (!categoryToRemove) {
         toast({ title: 'Error', description: 'Category not found or permission denied.', variant: 'destructive'});
        return;
    }
    
    try {
        await deleteDoc(doc(db, 'categories', categoryId));
        toast({ title: 'Success', description: 'Category removed successfully.'});
    } catch (e) {
        console.error("Error removing category:", e);
        toast({ title: 'Error', description: 'Could not remove category.', variant: 'destructive'});
    }
  };

  const filteredMenuItems = useMemo(() => {
    if (customer?.isDemoCustomer) {
      const demoVendorUsernames = new Set(vendors.map(v => v.username));
      return menuItems.filter(item => demoVendorUsernames.has(item.vendorUsername));
    }
    return menuItems;
  }, [menuItems, customer, vendors]);

  const filteredCategories = useMemo(() => {
    if (customer?.isDemoCustomer) {
      const demoVendorShopNames = new Set(vendors.map(v => v.shopName).filter(Boolean));
      return categories.filter(cat => cat.shopName === 'global' || demoVendorShopNames.has(cat.shopName));
    }
    return categories;
  }, [categories, customer, vendors]);

  const filteredGlobalCategories = useMemo(() => {
    if (customer?.isDemoCustomer) {
        const demoItemCategories = new Set(filteredMenuItems.map(i => i.category));
        return globalCategories.filter(cat => demoItemCategories.has(cat.name));
    }
    return globalCategories;
  }, [globalCategories, customer, filteredMenuItems]);


  const value = {
    menuItems: filteredMenuItems,
    categories: filteredCategories,
    globalCategories: filteredGlobalCategories,
    addMenuItem,
    updateMenuItem,
    removeMenuItem,
    toggleMenuItemAvailability,
    toggleMenuItemPopularity,
    setAllItemsAvailabilityInCategory,
    toggleMenuItemDiscount,
    addCategory,
    updateCategory,
    removeCategory,
    fetchAllItems,
    isFetchingItems,
    toggleMenuItemVegStatus,
    setAllItemsVegStatusInCategory,
  };

  return (
    <MenuContext.Provider value={value}>
      {children}
    </MenuContext.Provider>
  );
};

export const useMenu = () => {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
};
