'use client';

import type { Rider } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface RiderManagementContextType {
  riders: Rider[];
  fetchAllRiders: () => Promise<Rider[]>;
  updateRider: (id: string, data: Partial<Rider>) => Promise<void>;
  deleteRider: (id: string) => Promise<void>;
  toggleRiderApproval: (id: string, currentStatus: boolean) => Promise<void>;
  updateVerificationStatus: (id: string, status: 'approved' | 'rejected' | 'pending') => Promise<void>;
}

const RiderManagementContext = createContext<RiderManagementContextType | undefined>(undefined);

export const RiderManagementProvider = ({ children }: { children: ReactNode }) => {
  const [riders, setRiders] = useState<Rider[]>([]);
  const { toast } = useToast();

  const fetchAllRiders = useCallback(async (): Promise<Rider[]> => {
    try {
      const q = collection(db, 'riders');
      const querySnapshot = await getDocs(q);
      const fetchedRiders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rider));
      setRiders(fetchedRiders);
      return fetchedRiders;
    } catch (e) {
      console.error("Error fetching riders:", e);
      toast({ title: "Error", description: "Could not fetch rider data.", variant: "destructive" });
      return [];
    }
  }, [toast]);

  const updateRider = async (id: string, data: Partial<Rider>) => {
    try {
      const riderRef = doc(db, 'riders', id);
      await updateDoc(riderRef, data);
      setRiders(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
      toast({ title: "Success", description: "Rider updated successfully." });
    } catch (e) {
      console.error("Error updating rider:", e);
      toast({ title: "Error", description: "Could not update rider.", variant: "destructive" });
    }
  };

  const deleteRider = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'riders', id));
      setRiders(prev => prev.filter(r => r.id !== id));
      toast({ title: "Success", description: "Rider record removed." });
    } catch (e) {
      console.error("Error deleting rider:", e);
      toast({ title: "Error", description: "Could not delete rider.", variant: "destructive" });
    }
  };

  const toggleRiderApproval = async (id: string, currentStatus: boolean) => {
    await updateRider(id, { isApproved: !currentStatus });
  };

  const updateVerificationStatus = async (id: string, status: 'approved' | 'rejected' | 'pending') => {
    await updateRider(id, { verificationStatus: status });
  };

  return (
    <RiderManagementContext.Provider value={{ riders, fetchAllRiders, updateRider, deleteRider, toggleRiderApproval, updateVerificationStatus }}>
      {children}
    </RiderManagementContext.Provider>
  );
};

export const useRiderManagement = () => {
  const context = useContext(RiderManagementContext);
  if (context === undefined) {
    throw new Error('useRiderManagement must be used within a RiderManagementProvider');
  }
  return context;
};
