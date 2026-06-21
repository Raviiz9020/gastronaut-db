
'use client';

import type { Offer, Vendor } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { db, storage } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, getDoc, collection, addDoc, writeBatch, query, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { createSlug } from '@/lib/utils';
import { useVendor } from './vendor-context';
import { useCustomer } from './customer-context';
import { sendOfferNotificationEmail } from '@/ai/flows/send-offer-notification';

interface OfferContextType {
  offers: Offer[];
  fetchAllOffers: () => Promise<void>;
  saveOffer: (offerData: Offer) => Promise<void>;
  addOffer: (offerData: Omit<Offer, 'id' | 'isActive'>) => Promise<void>;
  toggleOfferStatus: (offerId: string, currentStatus: boolean) => Promise<void>;
  updateOfferSchedule: (offerId: string, startDate: Date, endDate: Date) => Promise<void>;
  removeOffer: (offerId: string) => Promise<void>;
}

const OfferContext = createContext<OfferContextType | undefined>(undefined);

export const OfferProvider = ({ children }: { children: ReactNode }) => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const { toast } = useToast();
  const { vendor, vendors } = useVendor();
  const { customer } = useCustomer();

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

  const fetchAllOffers = useCallback(async () => {
    try {
      const offersRef = collection(db, 'offers');
      const snapshot = await getDocs(offersRef);
      const allOffers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Offer));
      setOffers(allOffers);
    } catch (error) {
      console.error("Error fetching offers:", error);
      toast({
        title: "Error",
        description: "Could not fetch offer data.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const addOffer = async (offerData: Omit<Offer, 'id' | 'isActive'>) => {
    if (checkRestricted()) return;
    try {
        const docId = createSlug(`${offerData.vendorName || 'promo'}-${offerData.title}`);
        const offerRef = doc(db, 'offers', docId);

        const newOfferData = {
            ...offerData,
            isActive: false, // Always inactive on creation
        };
        await setDoc(offerRef, newOfferData);
        fetchAllOffers(); // Re-fetch offers
    } catch (error) {
        console.error("Error adding offer:", error);
        toast({ title: "Error", description: "Could not add the offer.", variant: "destructive" });
        throw error;
    }
  };

  const saveOffer = async (offerData: Offer) => {
    if (checkRestricted()) return;
    try {
      const offerRef = doc(db, 'offers', offerData.id);
      await setDoc(offerRef, offerData, { merge: true });
      fetchAllOffers(); // Re-fetch offers
    } catch (error) {
      console.error("Error saving offer:", error);
      toast({
        title: "Error",
        description: "Could not save the offer.",
        variant: "destructive"
      });
      throw error; // Re-throw to be caught in the component
    }
  };
  
  const toggleOfferStatus = async (offerId: string, currentStatus: boolean) => {
    if (checkRestricted()) return;
    const offerRef = doc(db, 'offers', offerId);
    try {
      await updateDoc(offerRef, { isActive: !currentStatus });
      fetchAllOffers(); // Re-fetch offers
      toast({ title: 'Success', description: `Offer has been ${!currentStatus ? 'activated' : 'deactivated'}.` });
    } catch (e) {
      console.error("Error toggling offer status:", e);
      toast({ title: "Error", description: "Could not update offer status.", variant: "destructive" });
    }
  };
  
  const updateOfferSchedule = async (offerId: string, startDate: Date, endDate: Date) => {
    if (checkRestricted()) return;
    const offerRef = doc(db, 'offers', offerId);
    try {
        const startOfDay = new Date(startDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);

        await updateDoc(offerRef, {
            isActive: true,
            startDate: startOfDay.toISOString(),
            endDate: endOfDay.toISOString(),
        });
        
        fetchAllOffers();
        toast({ title: 'Offer Activated!', description: 'The offer is now scheduled and active.' });

        // Send notification to super admin
        const offer = offers.find(o => o.id === offerId);
        
        if (offer && vendor && process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL) {
            const offerWithDates = { ...offer, startDate: startOfDay.toISOString(), endDate: endOfDay.toISOString() };
            sendOfferNotificationEmail({
                offer: JSON.parse(JSON.stringify(offerWithDates)),
                vendorName: vendor.shopName || vendor.name,
                superAdminEmail: process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL
            }).catch(console.error);
        }

    } catch (e) {
        console.error("Error activating offer:", e);
        toast({ title: "Activation Failed", description: "Could not schedule and activate the offer.", variant: "destructive" });
    }
  };


  const removeOffer = async (offerId: string) => {
    if (checkRestricted()) return;
    const offerToDelete = offers.find(o => o.id === offerId);
    if (!offerToDelete) return;
    
    // Authorization check
    if (offerToDelete.vendorUsername && offerToDelete.vendorUsername !== vendor?.username) {
        toast({ title: 'Unauthorized', description: "You can't delete another vendor's offer.", variant: 'destructive'});
        return;
    }

    try {
        await deleteDoc(doc(db, 'offers', offerId));
        
        if (offerToDelete.imageUrl && offerToDelete.imageUrl.includes('firebasestorage.googleapis.com')) {
            const imageRef = ref(storage, offerToDelete.imageUrl);
            await deleteObject(imageRef).catch((error) => {
                if (error.code !== 'storage/object-not-found') {
                    console.error("Error deleting offer image from storage:", error);
                }
            });
        }
        
        toast({ title: 'Offer Deleted', description: `"${offerToDelete.title}" has been removed.` });
        fetchAllOffers(); // Re-fetch
    } catch (e: any) {
        console.error("Error removing offer: ", e);
        toast({ title: 'Error', description: e.message || 'Could not remove the offer.', variant: 'destructive' });
        throw e;
    }
  };

  const filteredOffers = useMemo(() => {
    if (customer?.isDemoCustomer) {
      const demoVendorUsernames = new Set(vendors.map(v => v.username));
      return offers.filter(o => !o.vendorUsername || demoVendorUsernames.has(o.vendorUsername));
    }
    return offers;
  }, [offers, customer, vendors]);


  return (
    <OfferContext.Provider value={{ offers: filteredOffers, fetchAllOffers, saveOffer, addOffer, toggleOfferStatus, updateOfferSchedule, removeOffer }}>
      {children}
    </OfferContext.Provider>
  );
};

export const useOffer = () => {
  const context = useContext(OfferContext);
  if (context === undefined) {
    throw new Error('useOffer must be used within an OfferProvider');
  }
  return context;
};
