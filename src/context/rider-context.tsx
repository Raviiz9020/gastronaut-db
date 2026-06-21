
'use client';

import type { DeliveryBoy } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot, query, where, collection, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface RiderContextType {
  rider: DeliveryBoy | null;
  isAuthLoading: boolean;
  login: (username: string, password: string) => Promise<DeliveryBoy>;
  logout: () => void;
}

const RiderContext = createContext<RiderContextType | undefined>(undefined);

export const RiderProvider = ({ children }: { children: ReactNode }) => {
  const [currentRider, setCurrentRider] = useState<DeliveryBoy | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let riderUnsub = () => {};

    const setupListeners = (riderId: string) => {
        const riderRef = doc(db, 'deliveryTeam', riderId);
        riderUnsub = onSnapshot(riderRef, (docSnap) => {
            if (docSnap.exists()) {
                const riderData = { id: docSnap.id, ...docSnap.data() } as DeliveryBoy;
                setCurrentRider(riderData);
            } else {
                logout();
            }
            setIsAuthLoading(false);
        }, () => setIsAuthLoading(false));
    }

    try {
      const storedRider = localStorage.getItem('hyperdelivery-rider');
      if (storedRider) {
        const riderData: DeliveryBoy = JSON.parse(storedRider);
        setupListeners(riderData.id);
      } else {
        setIsAuthLoading(false);
      }
    } catch (error) {
        console.error("Failed to access localStorage for rider", error);
        setIsAuthLoading(false);
    }

    return () => riderUnsub();
  }, []);

  useEffect(() => {
    try {
        if (currentRider) {
            localStorage.setItem('hyperdelivery-rider', JSON.stringify(currentRider));
        } else {
            localStorage.removeItem('hyperdelivery-rider');
        }
    } catch (error) {
        console.error("Failed to save rider to localStorage", error);
    }
  }, [currentRider]);

  const login = async (username: string, password: string): Promise<DeliveryBoy> => {
    const q = query(collection(db, 'deliveryTeam'), where('username', '==', username));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        throw new Error("Rider account not found.");
    }
    
    const riderDoc = querySnapshot.docs[0];
    const rider = { id: riderDoc.id, ...riderDoc.data() } as DeliveryBoy;

    if (rider.password !== password) {
        throw new Error("Invalid password.");
    }
    
    if (!rider.isApproved) {
        throw new Error("Your account is not approved. Please contact your manager.");
    }

    setCurrentRider(rider);
    return rider;
  };

  const logout = () => {
    try {
        localStorage.removeItem('hyperdelivery-rider');
    } catch (error) {
        console.error("Failed to remove rider from localStorage", error);
    }
    setCurrentRider(null);
  };

  return (
    <RiderContext.Provider value={{ rider: currentRider, isAuthLoading, login, logout }}>
      {children}
    </RiderContext.Provider>
  );
};

export const useRider = () => {
  const context = useContext(RiderContext);
  if (context === undefined) {
    throw new Error('useRider must be used within a RiderProvider');
  }
  return context;
};
