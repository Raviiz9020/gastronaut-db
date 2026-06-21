'use client';

import type { VendorCategory } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, getDocs, getDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { createSlug } from '@/lib/utils';

interface VendorCategoryContextType {
  vendorCategories: VendorCategory[];
  addVendorCategory: (category: Omit<VendorCategory, 'id'>) => Promise<void>;
  updateVendorCategory: (category: VendorCategory) => Promise<void>;
  removeVendorCategory: (categoryId: string) => Promise<void>;
}

const VendorCategoryContext = createContext<VendorCategoryContextType | undefined>(undefined);

export const VendorCategoryProvider = ({ children }: { children: ReactNode }) => {
  const [vendorCategories, setVendorCategories] = useState<VendorCategory[]>([]);
  const { toast } = useToast();

  const fetchVendorCategories = useCallback(async () => {
    try {
      const q = collection(db, 'vendor-categories');
      const querySnapshot = await getDocs(q);
      const categories = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
      } as VendorCategory));
      setVendorCategories(categories);
    } catch (error) {
      console.error("Error fetching vendor categories: ", error);
      toast({
          title: "Error",
          description: "Could not fetch vendor categories from the database.",
          variant: "destructive"
      });
    }
  }, [toast]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'vendor-categories'), (snapshot) => {
        const categories = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
      } as VendorCategory));
      setVendorCategories(categories);
    }, (error) => {
        console.error("Error with vendor category listener: ", error);
    });

    return () => unsub();
  }, []);

  const addVendorCategory = async (category: Omit<VendorCategory, 'id'>) => {
    const docId = createSlug(category.name);
    const categoryRef = doc(db, 'vendor-categories', docId);
    try {
      await setDoc(categoryRef, category);
      toast({ title: 'Success', description: 'Vendor category added.' });
    } catch (e) {
      console.error("Error adding vendor category: ", e);
      toast({ title: 'Error', description: 'Could not add vendor category.', variant: 'destructive' });
    }
  };

  const updateVendorCategory = async (updatedCategory: VendorCategory) => {
    try {
      const categoryRef = doc(db, 'vendor-categories', updatedCategory.id);
      const { id, ...dataToUpdate } = updatedCategory;
      await updateDoc(categoryRef, dataToUpdate);
      toast({ title: 'Success', description: 'Vendor category updated.' });
    } catch (e) {
      console.error("Error updating vendor category: ", e);
      toast({ title: 'Error', description: 'Could not update vendor category.', variant: 'destructive' });
    }
  };

  const removeVendorCategory = async (categoryId: string) => {
    try {
        const categoryRef = doc(db, 'vendor-categories', categoryId);
        const categorySnap = await getDoc(categoryRef);

        if(categorySnap.exists()) {
            const categoryData = categorySnap.data() as VendorCategory;
            if (categoryData.imageUrl && categoryData.imageUrl.includes('firebasestorage.googleapis.com')) {
                const imageRef = ref(storage, categoryData.imageUrl);
                await deleteObject(imageRef).catch((error) => {
                    if (error.code !== 'storage/object-not-found') {
                        console.error("Error deleting image from storage:", error);
                    }
                });
            }
        }
      
      await deleteDoc(categoryRef);
      toast({ title: 'Success', description: 'Vendor category removed.' });
    } catch (e) {
      console.error("Error removing vendor category: ", e);
      toast({ title: 'Error', description: 'Could not remove vendor category.', variant: 'destructive' });
    }
  };

  return (
    <VendorCategoryContext.Provider value={{ vendorCategories, addVendorCategory, updateVendorCategory, removeVendorCategory }}>
      {children}
    </VendorCategoryContext.Provider>
  );
};

export const useVendorCategory = () => {
  const context = useContext(VendorCategoryContext);
  if (context === undefined) {
    throw new Error('useVendorCategory must be used within a VendorCategoryProvider');
  }
  return context;
};
