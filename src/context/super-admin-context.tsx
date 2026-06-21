

'use client';

import type { SuperAdmin } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { db, auth, googleProvider } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { signInWithPopup, signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

interface SuperAdminContextType {
  superAdmin: SuperAdmin | null;
  login: (username: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
}

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined);

export const SuperAdminProvider = ({ children }: { children: ReactNode }) => {
  const [currentSuperAdmin, setCurrentSuperAdmin] = useState<SuperAdmin | null>(null);
  const { toast } = useToast();

   useEffect(() => {
    try {
      const storedSuperAdmin = localStorage.getItem('hyperdelivery-superAdmin');
      if (storedSuperAdmin) {
        setCurrentSuperAdmin(JSON.parse(storedSuperAdmin));
      }
    } catch (error) {
        console.error("Failed to access localStorage for super admin", error);
    }
  }, []);

  useEffect(() => {
    try {
        if (currentSuperAdmin) {
            localStorage.setItem('hyperdelivery-superAdmin', JSON.stringify(currentSuperAdmin));
        } else {
            localStorage.removeItem('hyperdelivery-superAdmin');
        }
    } catch (error) {
        console.error("Failed to save super admin to localStorage", error);
    }
  }, [currentSuperAdmin]);

  const login = async (username: string, password: string) => {
    const adminRef = doc(db, 'superAdmins', username);
    const adminSnap = await getDoc(adminRef);

    if (!adminSnap.exists()) {
        throw new Error("Super admin account not found. Please seed the database first.");
    }
    
    const superAdminUser = { username: adminSnap.id, ...adminSnap.data() } as SuperAdmin;

    if (superAdminUser.password !== password) {
        throw new Error("Invalid password.");
    }

    setCurrentSuperAdmin(superAdminUser);
  };
  
  const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const firebaseUser = result.user;

        if (firebaseUser.email !== process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL) {
            toast({
                title: "Unauthorized",
                description: "This Google account is not authorized for super admin access.",
                variant: "destructive"
            });
            await signOut(auth); // Immediately sign out the unauthorized user
            throw new Error("Unauthorized user");
        }
        
        const superAdminRef = doc(db, 'superAdmins', firebaseUser.uid);
        const docSnap = await getDoc(superAdminRef);
        
        let superAdminData: SuperAdmin;

        if (docSnap.exists()) {
            // Admin document exists, just use it.
            superAdminData = { username: docSnap.id, ...docSnap.data() } as SuperAdmin;
            // Optionally, update name/email from Google profile if they've changed
            if (superAdminData.name !== firebaseUser.displayName || superAdminData.email !== firebaseUser.email) {
                await updateDoc(superAdminRef, {
                    name: firebaseUser.displayName,
                    email: firebaseUser.email,
                });
                superAdminData.name = firebaseUser.displayName || superAdminData.name;
                superAdminData.email = firebaseUser.email || superAdminData.email;
            }
        } else {
            // This is the very first login for this authorized email.
            // The security rules will allow this specific user to create their own document.
            const newAdminData = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || firebaseUser.email,
                email: firebaseUser.email,
                username: firebaseUser.email?.split('@')[0] || 'admin'
            };
            await setDoc(superAdminRef, newAdminData);
            superAdminData = { username: firebaseUser.uid, ...newAdminData } as SuperAdmin;
            toast({ title: "Welcome Super Admin!", description: "Your admin profile has been created." });
        }
        
        setCurrentSuperAdmin(superAdminData);

    } catch(error: any) {
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
             toast({
                title: "Sign-in process cancelled",
                description: "You can try signing in again anytime.",
                variant: 'default',
            });
        } else if (error.message !== 'Unauthorized user') {
             toast({
                title: "Google Sign-In Failed",
                description: error.message || "An error occurred during Google Sign-In. Please try again.",
                variant: "destructive"
            });
        }
        // Re-throw to be caught by the component if needed
        throw error;
    }
  };


  const logout = () => {
    try {
      localStorage.removeItem('hyperdelivery-superAdmin');
      // Also sign out from firebase if they logged in via Google
      signOut(auth).catch(e => console.error("Firebase sign out error on logout", e));
    } catch(e) {
       console.error("Could not clear superadmin from storage", e);
    }
    setCurrentSuperAdmin(null);
  };

  return (
    <SuperAdminContext.Provider value={{ superAdmin: currentSuperAdmin, login, loginWithGoogle, logout }}>
      {children}
    </SuperAdminContext.Provider>
  );
};

export const useSuperAdmin = () => {
  const context = useContext(SuperAdminContext);
  if (context === undefined) {
    throw new Error('useSuperAdmin must be used within a SuperAdminProvider');
  }
  return context;
};
