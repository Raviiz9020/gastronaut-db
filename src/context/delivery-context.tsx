

'use client';

import type { DeliveryBoy } from '@/types';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { db, auth } from '@/lib/firebase';
import {
  collection, onSnapshot, deleteDoc, doc, query, where, updateDoc, getDocs, setDoc, getDoc,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { createSlug } from '@/lib/utils';
import { onAuthStateChanged } from 'firebase/auth';

interface DeliveryContextType {
  deliveryTeam: DeliveryBoy[];
  addDeliveryBoy: (boy: Omit<DeliveryBoy, 'id' | 'vendorUsername'>) => Promise<void>;
  updateDeliveryBoy: (boyId: string, data: Partial<Omit<DeliveryBoy, 'id' | 'vendorUsername'>>) => Promise<void>;
  removeDeliveryBoy: (boyId: string) => Promise<void>;
  fetchAllDeliveryPersonnel: () => Promise<DeliveryBoy[]>;
  toggleRiderApproval: (boyId: string, currentStatus: boolean) => Promise<void>;
}

const DeliveryContext = createContext<DeliveryContextType | undefined>(undefined);

const formatPhoneNumber = (phoneNumber: string | undefined | null) => {
  if (!phoneNumber) return '';
  const trimmedNumber = phoneNumber.replace(/\s+/g, '');
  if (trimmedNumber.startsWith('+91')) return trimmedNumber;
  if (trimmedNumber.length === 10) return `+91${trimmedNumber}`;
  return phoneNumber;
};

export const DeliveryProvider = ({ children }: { children: React.ReactNode }) => {
  const { toast } = useToast();
  const [deliveryTeam, setDeliveryTeam] = useState<DeliveryBoy[]>([]);

  // keep handles to clean up correctly
  const unsubTeamRef = useRef<null | (() => void)>(null);
  const mountedRef = useRef(true);

  const stopTeamListener = () => {
    if (unsubTeamRef.current) {
      try { unsubTeamRef.current(); } catch {}
      unsubTeamRef.current = null;
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    const offAuth = onAuthStateChanged(auth, async (user) => {
      // always stop previous listener first
      stopTeamListener();

      if (!user) {
        // logged OUT: clear state and do NOT set up any listener
        setDeliveryTeam([]);
        return;
      }

      // verify this UID is a vendor (optional, but keeps intent)
      const vendorDoc = await getDoc(doc(db, 'vendors', user.uid));
      if (!vendorDoc.exists()) {
        setDeliveryTeam([]);
        return;
      }

      // attach vendor-scoped deliveryTeam listener
      const qVendorTeam = query(collection(db, 'deliveryTeam'), where('vendorUsername', '==', user.uid));

      const handleSnap = (snap: any) => {
        if (!mountedRef.current) return;
        const team = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as DeliveryBoy));
        setDeliveryTeam(team);
      };

      const handleErr = (err: any) => {
        // if a logout happens mid-flight, the listener will be stopped above anyway
        console.error('deliveryTeam listener error:', err?.code, err?.message);
        toast({ title: 'Error', description: 'Could not fetch delivery team data.', variant: 'destructive' });
      };

      unsubTeamRef.current = onSnapshot(qVendorTeam, handleSnap, handleErr);
    });

    return () => {
      mountedRef.current = false;
      stopTeamListener();
      offAuth();
    };
  }, [toast]);

  // ===== actions (guarded) =====

  const fetchAllDeliveryPersonnel = async (): Promise<DeliveryBoy[]> => {
    // This is a public fetch, no user guard needed here. Rules should allow reading all.
    try {
        const q = collection(db, 'deliveryTeam');
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as DeliveryBoy));
    } catch (e) {
        console.error("Error fetching all delivery personnel:", e);
        toast({ title: 'Error', description: 'Could not fetch delivery personnel data.', variant: 'destructive' });
        return [];
    }
  };

  const addDeliveryBoy = async (boy: Omit<DeliveryBoy, 'id' | 'vendorUsername'>) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not signed in');

    // unique username (collection-wide)
    const usernameSnap = await getDocs(query(collection(db, 'deliveryTeam'), where('username', '==', boy.username)));
    if (!usernameSnap.empty) throw new Error('This username is already taken by another rider.');

    const newBoy: DeliveryBoy = {
      ...boy,
      contact: formatPhoneNumber(boy.contact),
      vendorUsername: user.uid,
    } as any;

    const docId = `${createSlug(user.uid)}-${createSlug(boy.name)}`;
    await setDoc(doc(db, 'deliveryTeam', docId), newBoy);
    toast({ title: 'Success', description: `${boy.name} has been added to the team.` });
  };

  const updateDeliveryBoy = async (
    boyId: string,
    data: Partial<Omit<DeliveryBoy, 'id' | 'vendorUsername'>>
  ) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not signed in');

    // uniqueness if username changes
    if (data.username) {
      const currentSnap = await getDoc(doc(db, 'deliveryTeam', boyId));
      const current = currentSnap.data() as any;
      if (current?.username !== data.username) {
        const usernameSnap = await getDocs(query(collection(db, 'deliveryTeam'), where('username', '==', data.username)));
        if (!usernameSnap.empty) throw new Error('This username is already taken by another rider.');
      }
    }

    const finalData: any = { ...data };
    if (finalData.password === '') delete finalData.password;
    if (finalData.contact !== undefined) finalData.contact = formatPhoneNumber(finalData.contact);

    await updateDoc(doc(db, 'deliveryTeam', boyId), finalData);
    toast({ title: 'Success', description: 'Details have been updated.' });
  };

  const removeDeliveryBoy = async (boyId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not signed in');
    try {
      await deleteDoc(doc(db, 'deliveryTeam', boyId));
      setDeliveryTeam(prevTeam => prevTeam.filter(boy => boy.id !== boyId));
      toast({ title: 'Success', description: 'Delivery person removed.' });
    } catch(e: any) {
        console.error("Failed to remove delivery person: ", e);
        toast({ title: "Error", description: "Could not remove delivery person.", variant: 'destructive'});
    }
  };

  const toggleRiderApproval = async (boyId: string, currentStatus: boolean) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not signed in');
    await updateDoc(doc(db, 'deliveryTeam', boyId), { isApproved: !currentStatus });
    toast({ title: 'Success', description: 'Rider approval status has been updated.' });
  };

  return (
    <DeliveryContext.Provider
      value={{
        deliveryTeam,
        addDeliveryBoy,
        updateDeliveryBoy,
        removeDeliveryBoy,
        fetchAllDeliveryPersonnel,
        toggleRiderApproval,
      }}
    >
      {children}
    </DeliveryContext.Provider>
  );
};

export const useDelivery = () => {
  const ctx = useContext(DeliveryContext);
  if (!ctx) throw new Error('useDelivery must be used within a DeliveryProvider');
  return ctx;
};
