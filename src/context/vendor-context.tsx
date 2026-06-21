
'use client';

import type { Vendor, DeliveryType, GmbLocation } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { useSuperAdmin } from './super-admin-context';
import { useCustomer } from './customer-context';
import { db, auth, googleProvider } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, setDoc, getDoc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, linkWithPopup, GoogleAuthProvider, unlink, signInWithEmailAndPassword } from 'firebase/auth';
import { ensureAuthUser } from '@/lib/ensureAuth';
import { createSlug } from '@/lib/utils';
import { sendNewVendorEmail } from '@/ai/flows/send-new-vendor-email';

const formatPhoneNumber = (phoneNumber: string | undefined | null) => {
    if (!phoneNumber) return '';
    const trimmedNumber = phoneNumber.replace(/\s+/g, '');
    if (trimmedNumber.startsWith('+91')) {
        return trimmedNumber;
    }
    if (trimmedNumber.length === 10) {
        return `+91${trimmedNumber}`;
    }
    return phoneNumber;
};


interface VendorContextType {
  vendor: Vendor | null;
  vendors: Vendor[]; // Add vendors to the context
  allVendors: Vendor[];
  isAuthLoading: boolean; // To track initial auth check
  addVendorToContext: (vendor: Vendor) => void;
  fetchAllVendors: () => Promise<Vendor[]>;
  login: (username: string, password: string) => Promise<Vendor>;
  loginWithGoogle: () => Promise<Vendor>;
  loginAsDemo: () => Promise<Vendor>;
  linkNewGoogleAccount: () => Promise<void>;
  signup: (username: string, password: string, details?: Partial<Omit<Vendor, 'username' | 'password' | 'isApproved'>>) => Promise<Vendor>;
  updateDetails: (details: Partial<Vendor>) => Promise<void>;
  logout: () => void;
  removeVendor: (username: string) => Promise<void>;
  updateVendorBySuperAdmin: (vendorData: Partial<Vendor>) => Promise<void>;
  toggleVendorApproval: (username: string) => Promise<void>;
  toggleShopOpenStatus: (username: string, currentStatus: boolean) => Promise<void>;
  toggleVendorGbpStatus: (username: string, currentStatus: boolean) => Promise<void>;
  toggleVendorExpenseTracking: (username: string, currentStatus: boolean) => Promise<void>;
  toggleVendorOfferCreation: (username: string, currentStatus: boolean) => Promise<void>;
  toggleDineInStatus: (username: string, currentStatus: boolean) => Promise<void>;
  toggleAiAssistantStatus: (username: string, currentStatus: boolean) => Promise<void>;
  toggleAccountLinkingStatus: (username: string, currentStatus: boolean) => Promise<void>;
  toggleVendorRewards: (username: string, enable: boolean, config?: { spend: number; points: number; minRedemptionPoints?: number; }) => Promise<void>;
  toggleVendorDemoStatus: (username: string, currentStatus: boolean) => Promise<void>;
  toggleMenuEditRestriction: (username: string, currentStatus: boolean) => Promise<void>;
  toggleInventoryStatus: (username: string, currentStatus: boolean) => Promise<void>;
}

const VendorContext = createContext<VendorContextType | undefined>(undefined);

export const VendorProvider = ({ children }: { children: ReactNode }) => {
  const { superAdmin } = useSuperAdmin();
  const { customer } = useCustomer();
  const [currentVendor, setCurrentVendor] = useState<Vendor | null>(null);
  const [allVendors, setAllVendors] = useState<Vendor[]>([]); // State to hold all vendors
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const { toast } = useToast();

   useEffect(() => {
    // This effect runs once on initial load to check for a persisted session.
    try {
      const storedVendor = localStorage.getItem('hyperdelivery-vendor');
      if (storedVendor) {
        setCurrentVendor(JSON.parse(storedVendor));
      }
    } catch (error) {
      console.error("Failed to read vendor from localStorage", error);
    }
    // The onAuthStateChanged listener will handle Firebase-backed sessions.
    setIsAuthLoading(false);
  }, []);

   useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const vendorRef = doc(db, "vendors", firebaseUser.uid);
        const docSnap = await getDoc(vendorRef);
        if (docSnap.exists()) {
          const vendorData = { username: docSnap.id, ...docSnap.data() } as Vendor;
          setCurrentVendor(vendorData);
        } else {
          // Firebase user exists but is not a vendor, so log them out of the vendor context
          setCurrentVendor(null);
        }
      } else {
        setCurrentVendor(null);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);
  

  useEffect(() => {
    // Persist the currently logged-in vendor to localStorage
    try {
        if (currentVendor) {
            localStorage.setItem('hyperdelivery-vendor', JSON.stringify(currentVendor));
        } else {
            localStorage.removeItem('hyperdelivery-vendor');
        }
    } catch (error) {
        console.error("Failed to save vendor to localStorage", error);
    }
  }, [currentVendor]);

  const addVendorToContext = (vendor: Vendor) => {
    setAllVendors(prevVendors => {
        if (!prevVendors.some(v => v.username === vendor.username)) {
            return [...prevVendors, vendor];
        }
        return prevVendors;
    });
  };

  const fetchAllVendors = useCallback(async (): Promise<Vendor[]> => {
    try {
        const q = collection(db, 'vendors');
        const querySnapshot = await getDocs(q);
        const vendors = querySnapshot.docs.map(doc => ({ username: doc.id, ...doc.data() } as Vendor));
        setAllVendors(vendors); // Also update the state cache
        return vendors;
    } catch(e) {
        console.error("Error fetching all vendors:", e);
        toast({ title: "Error", description: "Could not fetch all vendor data." });
        return [];
    }
  }, [toast]);


  const isContactUnique = async (contact: string, currentUsername?: string) => {
    const formattedContact = formatPhoneNumber(contact);
    if (!formattedContact) return true;
    
    // A vendor is not allowed to query the customers collection.
    // This check is now limited to vendors only.
    const vendorQuery = query(collection(db, 'vendors'), where('contact', '==', formattedContact));

    const vendorSnap = await getDocs(vendorQuery);
    
    // Check for conflicting vendors, excluding the one being edited
    const conflictingVendor = vendorSnap.docs.find(doc => doc.id !== currentUsername);
    if (conflictingVendor) return false;
    
    return true;
  }

  const login = async (username: string, password: string): Promise<Vendor> => {
    // This function is for password-based login and needs to find the user document first.
    // As we move to UID-based documents, this method becomes less ideal.
    // We'll query by the custom `username` field for now.
    const q = query(collection(db, 'vendors'), where('username', '==', username));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error("Invalid username or password.");
    }
    
    const vendorDoc = querySnapshot.docs[0];
    const vendor = { username: vendorDoc.id, ...vendorDoc.data() } as Vendor;

     if (vendor.password !== password) {
      throw new Error("Invalid username or password.");
    }

    if (!vendor.isApproved) {
        toast({
            title: 'Approval Pending',
            description: "Your account is pending approval. Please contact the administrator.",
            duration: 5000,
        });
        throw new Error("APPROVAL_PENDING");
    }
    setCurrentVendor(vendor);
    return vendor;
  };
  
   const loginWithGoogle = async (): Promise<Vendor> => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const firebaseUser = result.user;
        const uid = firebaseUser.uid;
        let vendorData: Vendor;
        
        const vendorRef = doc(db, 'vendors', uid);
        const docSnap = await getDoc(vendorRef);

        if (docSnap.exists()) {
            // SCENARIO B: Existing vendor logging in.
            // Read data from Firestore as the source of truth. DO NOT write or "correct" the email here.
            vendorData = { username: uid, authUid: uid, ...docSnap.data() } as Vendor;
        } else {
            // SCENARIO A: This is a new vendor signing up with Google. Create their document.
            // THIS is the only time loginWithGoogle should write to the DB.
            const newVendorData: Omit<Vendor, 'username'> = {
                authUid: uid,
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || `vendor-${uid.substring(0, 5)}`,
                isApproved: false,
                isGbpEnabled: false,
                isExpenseTrackingEnabled: false,
                isOfferCreationEnabled: false,
                isAiAssistantEnabled: false,
                isAccountLinkingEnabled: true, // Enabled by default for new users
                canAcceptDineIn: true, 
                shopName: null,
                contact: formatPhoneNumber(firebaseUser.phoneNumber),
                address: null,
                category: null,
                termsAccepted: false,
                createdAt: new Date().toISOString(),
                imageUrl: firebaseUser.photoURL || undefined,
            };
            
            await setDoc(vendorRef, newVendorData);
            vendorData = { username: uid, ...newVendorData };
            
            if (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL) {
              sendNewVendorEmail({
                vendorName: vendorData.name,
                shopName: vendorData.shopName || undefined,
                superAdminEmail: process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL,
              }).catch(console.error);
            }
        }
        
        if (!vendorData.isApproved) {
            toast({
                title: 'Approval Pending',
                description: 'Please complete your details. Contact administrator for approval.',
                duration: 10000,
            });
        }
        
        setCurrentVendor(vendorData);
        localStorage.removeItem('hyperdelivery-customer');
        return vendorData;

    } catch (error: any) {
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
             toast({
                title: "Sign-in process cancelled",
                description: "You can try signing in again anytime.",
                variant: 'default',
            });
        } else if (error.message !== 'APPROVAL_PENDING') {
            toast({
                title: "Google Sign-In Failed",
                description: error.message || "Could not sign in with Google. Please try again.",
                variant: "destructive"
            });
        }
        throw error;
    }
  };

  const loginAsDemo = async (): Promise<Vendor> => {
    try {
        const email = process.env.NEXT_PUBLIC_DEMO_EMAIL;
        const password = process.env.NEXT_PUBLIC_DEMO_PASSWORD;

        if (!email || !password) {
            throw new Error("Demo credentials are not configured.");
        }

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        const vendorRef = doc(db, 'vendors', firebaseUser.uid);
        const docSnap = await getDoc(vendorRef);

        let vendorData: Vendor;

        if (!docSnap.exists()) {
            // Create a minimal profile if it doesn't exist so they can onboard
            const newDemoData: Omit<Vendor, 'username'> = {
                authUid: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: 'Demo Vendor',
                isApproved: false,
                isDemoAccount: true,
                isMenuEditDisabled: true, // Restricted by default
                canAcceptDineIn: true,
                isGbpEnabled: false,
                isExpenseTrackingEnabled: false,
                isOfferCreationEnabled: false,
                isAiAssistantEnabled: false,
                isAccountLinkingEnabled: false,
                shopName: null,
                contact: null,
                address: null,
                category: null,
                termsAccepted: false,
                createdAt: new Date().toISOString(),
            };
            await setDoc(vendorRef, newDemoData);
            vendorData = { username: firebaseUser.uid, ...newDemoData };
        } else {
            vendorData = { username: firebaseUser.uid, ...docSnap.data() } as Vendor;
        }

        setCurrentVendor(vendorData);
        localStorage.removeItem('hyperdelivery-customer');
        return vendorData;

    } catch (error: any) {
        console.error("Demo Login Error:", error);
        toast({
            title: "Demo Login Failed",
            description: error.message || "An error occurred during demo login.",
            variant: "destructive"
        });
        throw error;
    }
  };

  const linkNewGoogleAccount = async (): Promise<void> => {
    try {
        const user = await ensureAuthUser();
        
        const newProvider = new GoogleAuthProvider();
        const result = await linkWithPopup(user, newProvider);
        
        // This is the user object from the *newly linked* credential
        const newCredentialUser = result.user;
        const newEmail = newCredentialUser.email;

        if (!newEmail) {
            throw new Error("The new Google account does not have an email address.");
        }

        const vendorRef = doc(db, 'vendors', user.uid);
        await updateDoc(vendorRef, { email: newEmail });

        toast({
            title: "Account Linked Successfully!",
            description: "Please log out and sign back in with your new Google account to complete the change.",
            duration: 7000
        });

        await logout();

    } catch (error: any) {
        console.error("Error linking new Google account:", error);
        let description = "An unexpected error occurred. Please try again.";
        if (error.code === 'auth/credential-already-in-use') {
            description = "This Google account is already linked to another user. Please choose a different account.";
        } else if (error.code === 'auth/popup-blocked') {
            description = "The login popup was blocked by your browser. Please allow popups for this site and try again.";
        }
        toast({ title: "Linking Failed", description, variant: 'destructive' });
        throw error;
    }
  };

  const generateUniqueSlug = async (name: string): Promise<string> => {
    let slug = createSlug(name);
    let isUnique = false;
    let counter = 1;
    
    while (!isUnique) {
        const q = query(collection(db, 'vendors'), where('slug', '==', slug));
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


  const signup = async (username: string, password: string, details?: Partial<Omit<Vendor, 'username' | 'password' | 'isApproved'>>) => {
     try {
        const userCredential = await createUserWithEmailAndPassword(auth, `${username}@hyperplate.app`, password);
        const firebaseUser = userCredential.user;

        if (details?.contact) {
            const uniqueContact = await isContactUnique(details.contact);
            if (!uniqueContact) {
                throw new Error("This contact number is already in use by another account.");
            }
        }
        
        const slug = details?.shopName ? await generateUniqueSlug(details.shopName) : '';

        const newVendorData: Omit<Vendor, 'username'> = {
            authUid: firebaseUser.uid,
            password,
            name: details?.name || username,
            shopName: details?.shopName || null,
            contact: formatPhoneNumber(details?.contact),
            address: details?.address || null,
            category: details?.category || null,
            isApproved: false,
            isGbpEnabled: false,
            isExpenseTrackingEnabled: false,
            isOfferCreationEnabled: false,
            isAiAssistantEnabled: false,
            isAccountLinkingEnabled: false,
            canAcceptDineIn: true,
            minOrderAmount: details?.minOrderAmount || 0,
            about: details?.about || '',
            workingHours: details?.workingHours || '',
            termsAccepted: false,
            slug: slug,
            createdAt: details?.createdAt || new Date().toISOString(),
        };

        const newVendor = { ...newVendorData, username: firebaseUser.uid };

        await setDoc(doc(db, "vendors", firebaseUser.uid), newVendorData);
        fetchAllVendors(); // Re-fetch all vendors
        
        // Send email to Super Admin
        if (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL) {
          sendNewVendorEmail({
            vendorName: newVendor.name,
            shopName: newVendor.shopName || undefined,
            superAdminEmail: process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL,
          }).catch(console.error);
        }

        if (!superAdmin) {
           return new Promise((resolve) => {
              setCurrentVendor(newVendor);
              resolve(newVendor);
           });
        }
        return newVendor;
    } catch(error: any) {
         if (error.code === 'auth/email-already-in-use') {
            throw new Error("Username already exists. Please choose another one.");
        }
        console.error("Signup Error:", error);
        throw new Error("Could not create account. Please try again.");
    }
  };
  
  const updateDetails = async (details: Partial<Vendor>) => {
    const user = await ensureAuthUser();
    const uid = user.uid;

    const vendorRef = doc(db, 'vendors', uid);
    
    const payload: Record<string, any> = { ...details, updatedAt: new Date().toISOString() };

    if (details.contact) {
        const formattedContact = formatPhoneNumber(details.contact);
        const uniqueContact = await isContactUnique(formattedContact, uid);
        if (!uniqueContact) {
            throw new Error("This contact number is already in use by another account.");
        }
        payload.contact = formattedContact;
    }
    
    if (details.shopName) {
        const currentVendorSnap = await getDoc(vendorRef);
        if(currentVendorSnap.exists() && currentVendorSnap.data().shopName !== details.shopName) {
            payload.slug = await generateUniqueSlug(details.shopName);
        } else if (!currentVendorSnap.exists() || !currentVendorSnap.data().slug) {
            payload.slug = await generateUniqueSlug(details.shopName);
        }
    }
  
    try {
      await setDoc(vendorRef, payload, { merge: true });
      setCurrentVendor(prev => prev ? { ...prev, ...payload } as Vendor : null);
    } catch (e) {
      console.error("Error updating vendor details: ", e);
      throw new Error("Failed to update details.");
    }
  };

  const logout = async () => {
    try {
      await signOut(auth); // This will trigger the onAuthStateChanged listener, which clears state.
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const removeVendor = async (username: string) => {
    try {
        await deleteDoc(doc(db, 'vendors', username));
        fetchAllVendors(); // Re-fetch
        toast({ title: 'Success', description: 'Vendor removed.' });
    } catch (e) {
        console.error("Error removing vendor: ", e);
        toast({ title: 'Error', description: 'Could not remove vendor.', variant: 'destructive' });
    }
  };

  const updateVendorBySuperAdmin = async (vendorData: Partial<Vendor>) => {
     try {
        if (!vendorData.username) throw new Error("Vendor username (UID) is required.");
        const { username, ...dataToUpdate } = vendorData;
        
        const formattedContact = formatPhoneNumber(dataToUpdate.contact);
        if (formattedContact) {
           const uniqueContact = await isContactUnique(formattedContact, username);
            if (!uniqueContact) {
                throw new Error("This contact number is already in use by another account.");
            }
        }
        
        const vendorRef = doc(db, 'vendors', username);
        const currentVendorSnap = await getDoc(vendorRef);

        if (dataToUpdate.shopName && currentVendorSnap.exists() && currentVendorSnap.data().shopName !== dataToUpdate.shopName) {
            dataToUpdate.slug = await generateUniqueSlug(dataToUpdate.shopName);
        }
        
        if (dataToUpdate.password === '') {
            delete dataToUpdate.password;
        }


        const finalData = { ...dataToUpdate, contact: formattedContact };
        await updateDoc(vendorRef, finalData);
        
        fetchAllVendors(); // Re-fetch
        toast({ title: 'Success', description: 'Vendor updated successfully.' });
     } catch(e: any) {
        console.error("Error updating vendor: ", e);
        toast({ title: 'Error', description: e.message || 'Could not update vendor.', variant: 'destructive' });
        throw e;
     }
  }

  const toggleVendorApproval = async (username: string) => {
    const vendorRef = doc(db, 'vendors', username);
    const vendorSnap = await getDoc(vendorRef);
    if (!vendorSnap.exists()) return;

    const vendor = vendorSnap.data();
    try {
        await updateDoc(vendorRef, { isApproved: !vendor.isApproved });
        fetchAllVendors(); // Re-fetch
        toast({ title: 'Success', description: `Vendor approval status changed.` });
    } catch(e) {
        console.error("Error toggling vendor approval: ", e);
        toast({ title: 'Error', description: 'Could not change approval status.', variant: 'destructive' });
    }
  };

  const toggleShopOpenStatus = async (username: string, currentStatus: boolean) => {
    const vendorRef = doc(db, 'vendors', username);
    try {
        await updateDoc(vendorRef, { isShopOpen: !currentStatus });
        // Optimistically update the current vendor if it's the one being changed
        if (currentVendor?.username === username) {
            setCurrentVendor(prev => prev ? { ...prev, isShopOpen: !currentStatus } : null);
        }
        // For a non-snapshot approach, we would need to refetch:
        fetchAllVendors();
        toast({ title: 'Success', description: `Shop status has been updated.` });
    } catch(e) {
        console.error("Error toggling shop status: ", e);
        toast({ title: 'Error', description: 'Could not change shop status.', variant: 'destructive' });
    }
  };

  const toggleVendorGbpStatus = async (username: string, currentStatus: boolean) => {
    const vendorRef = doc(db, 'vendors', username);
    try {
        await updateDoc(vendorRef, { isGbpEnabled: !currentStatus });
        fetchAllVendors(); // Re-fetch
        toast({ title: 'Success', description: `GBP Feature status has been updated.` });
    } catch(e) {
        console.error("Error toggling GBP status: ", e);
        toast({ title: 'Error', description: 'Could not change GBP status.', variant: 'destructive' });
    }
  };

  const toggleVendorExpenseTracking = async (username: string, currentStatus: boolean) => {
    const vendorRef = doc(db, 'vendors', username);
    try {
        await updateDoc(vendorRef, { isExpenseTrackingEnabled: !currentStatus });
        fetchAllVendors();
        toast({ title: 'Success', description: `Expense Tracking feature status has been updated.` });
    } catch(e) {
        console.error("Error toggling expense tracking: ", e);
        toast({ title: 'Error', description: 'Could not change expense tracking status.', variant: 'destructive' });
    }
  };
  
  const toggleVendorOfferCreation = async (username: string, currentStatus: boolean) => {
    const vendorRef = doc(db, 'vendors', username);
    try {
        await updateDoc(vendorRef, { isOfferCreationEnabled: !currentStatus });
        fetchAllVendors();
        toast({ title: 'Success', description: `Offer Creation feature status has been updated.` });
    } catch(e) {
        console.error("Error toggling offer creation: ", e);
        toast({ title: 'Error', description: 'Could not change offer creation status.', variant: 'destructive' });
    }
  };

  const toggleDineInStatus = async (username: string, currentStatus: boolean) => {
    const vendorRef = doc(db, 'vendors', username);
    try {
        await updateDoc(vendorRef, { canAcceptDineIn: !currentStatus });
        fetchAllVendors();
        toast({ title: 'Success', description: `Dine-In feature status has been updated.` });
    } catch (e) {
        console.error("Error toggling dine-in status: ", e);
        toast({ title: 'Error', description: 'Could not change dine-in status.', variant: 'destructive' });
    }
  };
  
  const toggleAiAssistantStatus = async (username: string, currentStatus: boolean) => {
    const vendorRef = doc(db, 'vendors', username);
    try {
        await updateDoc(vendorRef, { isAiAssistantEnabled: !currentStatus });
        fetchAllVendors();
        toast({ title: 'Success', description: `AI Assistant feature status has been updated.` });
    } catch (e) {
        console.error("Error toggling AI Assistant status: ", e);
        toast({ title: 'Error', description: 'Could not change AI Assistant status.', variant: 'destructive' });
    }
  };

  const toggleAccountLinkingStatus = async (username: string, currentStatus: boolean) => {
    const vendorRef = doc(db, 'vendors', username);
    try {
        await updateDoc(vendorRef, { isAccountLinkingEnabled: !currentStatus });
        fetchAllVendors();
        toast({ title: 'Success', description: `Account Linking feature has been updated.` });
    } catch(e) {
        console.error("Error toggling Account Linking status: ", e);
        toast({ title: 'Error', description: 'Could not change Account Linking status.', variant: 'destructive' });
    }
  };
  
  const toggleVendorRewards = async (username: string, enable: boolean, config?: { spend: number, points: number, minRedemptionPoints?: number }) => {
    const vendorRef = doc(db, 'vendors', username);
    try {
      const updateData: Partial<Vendor> = { isRewardsEnabled: enable };
      if (enable && config) {
        updateData.rewardsConfig = config;
      }
      await updateDoc(vendorRef, updateData as any);
      fetchAllVendors(); // Re-fetch to update the UI
      toast({
        title: 'Success',
        description: `Rewards system for this vendor has been ${enable ? 'enabled' : 'disabled'}.`,
      });
    } catch (e) {
      console.error("Error toggling vendor rewards:", e);
      toast({ title: 'Error', description: 'Could not update rewards status.', variant: 'destructive' });
    }
  };

  const toggleVendorDemoStatus = async (username: string, currentStatus: boolean) => {
    const vendorRef = doc(db, 'vendors', username);
    try {
        await updateDoc(vendorRef, { isDemoAccount: !currentStatus });
        fetchAllVendors();
        toast({ title: 'Success', description: `Demo status updated.` });
    } catch(e) {
        console.error("Error toggling demo status: ", e);
        toast({ title: 'Error', description: 'Could not change demo status.', variant: 'destructive' });
    }
  };

  const toggleMenuEditRestriction = async (username: string, currentStatus: boolean) => {
    const vendorRef = doc(db, 'vendors', username);
    try {
        await updateDoc(vendorRef, { isMenuEditDisabled: !currentStatus });
        fetchAllVendors();
        toast({ title: 'Success', description: `Menu edit restriction updated.` });
    } catch(e) {
        console.error("Error toggling menu restriction: ", e);
        toast({ title: 'Error', description: 'Could not change menu restriction.', variant: 'destructive' });
    }
  };

  const toggleInventoryStatus = async (username: string, currentStatus: boolean) => {
    const vendorRef = doc(db, 'vendors', username);
    try {
        await updateDoc(vendorRef, { isInventory: !currentStatus });
        fetchAllVendors();
        toast({ title: 'Success', description: `Inventory management status updated.` });
    } catch(e) {
        console.error("Error toggling inventory status: ", e);
        toast({ title: 'Error', description: 'Could not change inventory status.', variant: 'destructive' });
    }
  };

  const filteredVendors = useMemo(() => {
    if (customer?.isDemoCustomer) {
      return allVendors.filter(v => v.isDemoAccount);
    }
    return allVendors.filter(v => !v.isDemoAccount);
  }, [allVendors, customer]);


  return (
    <VendorContext.Provider value={{ vendor: currentVendor, vendors: filteredVendors, allVendors, isAuthLoading, addVendorToContext, fetchAllVendors, login, loginWithGoogle, loginAsDemo, linkNewGoogleAccount, signup, updateDetails, logout, removeVendor, updateVendorBySuperAdmin, toggleVendorApproval, toggleShopOpenStatus, toggleVendorGbpStatus, toggleVendorExpenseTracking, toggleVendorOfferCreation, toggleDineInStatus, toggleAiAssistantStatus, toggleAccountLinkingStatus, toggleVendorRewards, toggleVendorDemoStatus, toggleMenuEditRestriction, toggleInventoryStatus }}>
      {children}
    </VendorContext.Provider>
  );
};

export const useVendor = () => {
  const context = useContext(VendorContext);
  if (context === undefined) {
    throw new Error('useVendor must be used within a VendorProvider');
  }
  return context;
};
