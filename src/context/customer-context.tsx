'use client';

import type { Customer, EmailPreferences, SavedAddress } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef, Dispatch, SetStateAction } from 'react';
import { db, auth, googleProvider } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, onSnapshot, addDoc, orderBy, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { signInWithPopup, onAuthStateChanged, signOut, User as FirebaseAuthUser, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { sendNewCustomerEmail } from '@/ai/flows/send-new-customer-email';
import { differenceInDays, parseISO } from 'date-fns';

interface CustomerContextType {
  customer: Customer | null;
  setCurrentCustomer: Dispatch<SetStateAction<Customer | null>>; // Expose setter
  isAuthLoading: boolean; // To track initial auth check
  fetchAllCustomers: () => Promise<Customer[]>;
  fetchCustomer: (username: string) => Promise<void>;
  login: (username: string, password: string) => Promise<Customer>;
  loginWithGoogle: () => Promise<Customer>;
  loginAsDemo: () => Promise<Customer>;
  signup: (username: string, password: string) => Promise<Customer>;
  updateDetails: (details: { name: string; contact: string; address?: string; termsAccepted?: boolean; emailPreferences?: EmailPreferences; latitude?: number; longitude?: number; }) => Promise<void>;
  addSavedAddress: (address: Omit<SavedAddress, 'id' | 'createdAt'>) => Promise<SavedAddress>;
  updateSavedAddress: (id: string, updates: Partial<SavedAddress>) => Promise<void>;
  deleteSavedAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;
  logout: () => void;
  updateCustomerBySuperAdmin: (username: string, customerData: Partial<Customer>) => Promise<void>;
  removeCustomer: (username: string) => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

const formatPhoneNumber = (phoneNumber: string | undefined | null) => {
    if (!phoneNumber) return '';
    const trimmedNumber = phoneNumber.replace(/\s+/g, '');
    if (trimmedNumber.startsWith('+91')) {
        return trimmedNumber;
    }
    if (trimmedNumber.length === 10) {
        return `+91${trimmedNumber}`;
    }
    // Return original if it doesn't match expected formats, to avoid breaking existing data.
    return phoneNumber;
};

const ensureSavedAddresses = (customerData: Customer): Customer => {
    if ((!customerData.savedAddresses || customerData.savedAddresses.length === 0) && customerData.address && customerData.latitude && customerData.longitude) {
        const initialHome: SavedAddress = {
            id: 'addr_default_home',
            tag: 'Home',
            label: 'Home',
            address: customerData.address,
            areaLocality: '',
            latitude: customerData.latitude,
            longitude: customerData.longitude,
            recipientName: customerData.name || '',
            recipientContact: customerData.contact || '',
            isDefault: true,
            hasCompletedOrder: true,
            createdAt: customerData.createdAt || new Date().toISOString(),
        };
        return {
            ...customerData,
            savedAddresses: [initialHome],
            defaultAddressId: initialHome.id,
        };
    }
    return customerData;
};

export const CustomerProvider = ({ children }: { children: ReactNode }) => {
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const { toast } = useToast();

   useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // A user is logged in via Firebase Auth. Now, check if they are a customer.
        const userRef = doc(db, 'customers', firebaseUser.uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
             let customerData = { username: docSnap.id, ...docSnap.data() } as Customer;

            // Check for expired points
            if (customerData.lastActivityDate && customerData.hyperPoints && Object.keys(customerData.hyperPoints).length > 0) {
                const daysSinceLastActivity = differenceInDays(new Date(), parseISO(customerData.lastActivityDate));
                if (daysSinceLastActivity > 60) {
                    await updateDoc(userRef, { hyperPoints: {} });
                    customerData.hyperPoints = {};
                    toast({
                        title: "HyperPoints Expired",
                        description: "Your points have expired due to 60 days of inactivity.",
                        variant: "destructive"
                    });
                }
            }

            customerData = ensureSavedAddresses(customerData);
            setCurrentCustomer(customerData);
        } else {
            // No customer document exists for this Firebase user.
            if(currentCustomer && currentCustomer.authUid === firebaseUser.uid) {
                // Do nothing, a vendor might be logged in. The vendor context will handle them.
            } else {
                setCurrentCustomer(null);
            }
        }
      } else {
        // User is signed out from Firebase Auth, clear all local state
        setCurrentCustomer(null);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isContactUnique = async (contact: string, currentUsername: string): Promise<boolean> => {
    if (!contact) return true; // Empty contact is fine (e.g. for Google sign-in before updating details)
    const formattedContact = formatPhoneNumber(contact);
    const q = query(collection(db, 'customers'), where('contact', '==', formattedContact));
    const querySnapshot = await getDocs(q);
    
    // It's unique if no other customer has this contact number
    return querySnapshot.empty || querySnapshot.docs.every(d => d.id === currentUsername);
  };

  const fetchAllCustomers = useCallback(async (): Promise<Customer[]> => {
     try {
        const q = collection(db, 'customers');
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ensureSavedAddresses({ username: doc.id, ...doc.data() } as Customer));
    } catch(e) {
        console.error("Error fetching all customers:", e);
        toast({ title: "Error", description: "Could not fetch customer data." });
        return [];
    }
  }, [toast]);
  
  const fetchCustomer = useCallback(async (username: string): Promise<void> => {
     try {
        const userRef = doc(db, 'customers', username);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
             let customerData = { username: docSnap.id, ...docSnap.data() } as Customer;
             customerData = ensureSavedAddresses(customerData);
             setCurrentCustomer(customerData);
        } else {
            throw new Error("Customer data not found.");
        }
    } catch(e: any) {
        console.error("Error fetching customer:", e);
        toast({ title: "Error", description: e.message || "Could not fetch customer data." });
    }
  }, [toast]);

  const login = async (username: string, password: string): Promise<Customer> => {
    const q = query(collection(db, 'customers'), where('username', '==', username), where('password', '==', password));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        throw new Error("Invalid username or password.");
    }
    
    const userDoc = querySnapshot.docs[0];
    let user = { username: userDoc.id, ...userDoc.data() } as Customer;
    user = ensureSavedAddresses(user);

    setCurrentCustomer(user);
    return user;
  };

  const loginWithGoogle = async (): Promise<Customer> => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const firebaseUser = result.user;

        const customerRef = doc(db, "customers", firebaseUser.uid);
        const docSnap = await getDoc(customerRef);

        let customerData: Customer;

        if (!docSnap.exists()) {
            const newCustomerData = {
                authUid: firebaseUser.uid,
                name: firebaseUser.displayName || 'Valued Customer',
                email: firebaseUser.email || '',
                imageUrl: firebaseUser.photoURL || '',
                contact: '',
                address: '',
                termsAccepted: false,
                phoneVerified: false,
                createdAt: new Date().toISOString(),
                emailPreferences: { campaigns: true },
            };
            await setDoc(customerRef, newCustomerData);
            customerData = { username: firebaseUser.uid, ...newCustomerData } as Customer;
            
            if (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL) {
              sendNewCustomerEmail({
                customerName: customerData.name,
                customerEmail: customerData.email,
                superAdminEmail: process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL,
              }).catch(console.error);
            }
        } else {
            customerData = { username: firebaseUser.uid, ...docSnap.data() } as Customer;
        }

        customerData = ensureSavedAddresses(customerData);
        setCurrentCustomer(customerData);
        localStorage.removeItem('hyperdelivery-vendor');
        return customerData;

    } catch (error: any) {
        console.error("Google Sign-In Error:", error);
        toast({
            title: "Sign-In Failed",
            description: error.message || "An error occurred during Google sign-in.",
            variant: "destructive"
        });
        throw error;
    }
  };

  const loginAsDemo = async (): Promise<Customer> => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, 'demo.customer@hyperplate.app', 'demo123456');
        const firebaseUser = userCredential.user;

        const customerRef = doc(db, "customers", firebaseUser.uid);
        const docSnap = await getDoc(customerRef);

        let customerData: Customer;

        if (!docSnap.exists()) {
            const newDemoData = {
                authUid: firebaseUser.uid,
                name: 'Demo Customer',
                email: 'demo.customer@hyperplate.app',
                contact: '+919999999999',
                address: '123 Demo Street, Foodie City, 411057',
                isDemoCustomer: true,
                termsAccepted: false,
                phoneVerified: false,
                createdAt: new Date().toISOString(),
                emailPreferences: { campaigns: true },
                lastActivityDate: new Date().toISOString(),
            };
            await setDoc(customerRef, newDemoData);
            customerData = { username: firebaseUser.uid, ...newDemoData } as Customer;
        } else {
            customerData = { username: firebaseUser.uid, ...docSnap.data() } as Customer;
        }

        customerData = ensureSavedAddresses(customerData);
        setCurrentCustomer(customerData);
        localStorage.removeItem('hyperdelivery-vendor');
        return customerData;

    } catch (error: any) {
        console.error("Demo Customer Login Error:", error);
        toast({
            title: "Demo Login Failed",
            description: error.message || "An error occurred during demo login.",
            variant: "destructive"
        });
        throw error;
    }
  };

  const signup = async (username: string, password: string): Promise<Customer> => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, `${username}@hyperplate.app`, password);
        const firebaseUser = userCredential.user;
        
        const newCustomerData = {
            authUid: firebaseUser.uid,
            password,
            name: username,
            email: firebaseUser.email || '',
            contact: '',
            address: '',
            termsAccepted: false,
            phoneVerified: false,
            createdAt: new Date().toISOString(),
            emailPreferences: { campaigns: true },
        };
        await setDoc(doc(db, "customers", firebaseUser.uid), newCustomerData);
        
        const newUser = { username: firebaseUser.uid, ...newCustomerData } as Customer;
        
        if (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL) {
          sendNewCustomerEmail({
            customerName: newUser.name,
            customerEmail: newUser.email,
            superAdminEmail: process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL,
          }).catch(console.error);
        }

        return new Promise((resolve) => {
            setCurrentCustomer(newUser);
            resolve(newUser);
        });

    } catch(error: any) {
        if (error.code === 'auth/email-already-in-use') {
            throw new Error("Username already exists. Please choose another one.");
        }
        console.error("Signup Error:", error);
        throw new Error("Could not create account. Please try again.");
    }
  };

  const updateDetails = async (details: { name: string; contact: string; address?: string; termsAccepted?: boolean; emailPreferences?: EmailPreferences; latitude?: number; longitude?: number; }) => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not logged in");
    if (!currentCustomer) throw new Error("Customer data not loaded yet.");

    const userRef = doc(db, "customers", user.uid);
    const formattedContact = formatPhoneNumber(details.contact);

    const dataToUpdate: any = {
      name: details.name,
      termsAccepted: details.termsAccepted,
      emailPreferences: details.emailPreferences,
      updatedAt: new Date().toISOString(),
    };

    if (details.address !== undefined) {
      dataToUpdate.address = details.address;
    }
    if (details.latitude !== undefined) {
      dataToUpdate.latitude = details.latitude;
    }
    if (details.longitude !== undefined) {
      dataToUpdate.longitude = details.longitude;
    }
    
    if(currentCustomer.contact !== formattedContact) {
        dataToUpdate.contact = formattedContact;
        dataToUpdate.phoneVerified = false;
    }

    // Sync/update or create default 'Home' in savedAddresses
    const existingAddresses = currentCustomer.savedAddresses || [];
    let updatedAddresses = [...existingAddresses];

    if (details.address && details.latitude && details.longitude) {
        const homeIndex = updatedAddresses.findIndex(a => a.tag === 'Home' || a.id === currentCustomer.defaultAddressId || a.id === 'addr_default_home');
        const homeAddressObj: SavedAddress = {
            id: homeIndex >= 0 ? updatedAddresses[homeIndex].id : 'addr_default_home',
            tag: 'Home',
            label: 'Home',
            address: details.address,
            areaLocality: '',
            latitude: details.latitude,
            longitude: details.longitude,
            recipientName: details.name,
            recipientContact: formattedContact,
            isDefault: true,
            hasCompletedOrder: true,
            createdAt: homeIndex >= 0 ? updatedAddresses[homeIndex].createdAt : new Date().toISOString(),
        };

        if (homeIndex >= 0) {
            updatedAddresses[homeIndex] = homeAddressObj;
        } else {
            updatedAddresses.unshift(homeAddressObj);
        }
        dataToUpdate.savedAddresses = updatedAddresses;
        dataToUpdate.defaultAddressId = homeAddressObj.id;
    }
    
    await updateDoc(userRef, dataToUpdate);

    setCurrentCustomer(prev => {
        if (!prev) return null;
        return { ...prev, ...dataToUpdate };
    });
  };

  const addSavedAddress = async (addressData: Omit<SavedAddress, 'id' | 'createdAt'>): Promise<SavedAddress> => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not logged in");
    if (!currentCustomer) throw new Error("Customer data not loaded yet.");

    const userRef = doc(db, "customers", user.uid);
    const id = `addr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newAddress: SavedAddress = {
        ...addressData,
        id,
        createdAt: new Date().toISOString(),
        hasCompletedOrder: addressData.hasCompletedOrder ?? false,
    };

    const existingAddresses = currentCustomer.savedAddresses || [];
    let updatedAddresses = [...existingAddresses];

    if (newAddress.isDefault || updatedAddresses.length === 0) {
        newAddress.isDefault = true;
        updatedAddresses = updatedAddresses.map(a => ({ ...a, isDefault: false }));
    }
    updatedAddresses.push(newAddress);

    const dataToUpdate: Partial<Customer> = {
        savedAddresses: updatedAddresses,
        ...(newAddress.isDefault ? {
            address: newAddress.address,
            latitude: newAddress.latitude,
            longitude: newAddress.longitude,
            defaultAddressId: newAddress.id,
        } : {})
    };

    await updateDoc(userRef, dataToUpdate);

    setCurrentCustomer(prev => {
        if (!prev) return null;
        return {
            ...prev,
            ...dataToUpdate
        };
    });

    toast({ title: "Address Saved", description: `Added "${newAddress.label || newAddress.tag}" to your saved addresses.` });
    return newAddress;
  };

  const updateSavedAddress = async (id: string, updates: Partial<SavedAddress>): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not logged in");
    if (!currentCustomer) throw new Error("Customer data not loaded yet.");

    const userRef = doc(db, "customers", user.uid);
    const existingAddresses = currentCustomer.savedAddresses || [];
    
    let isTargetDefault = false;
    let targetAddress: SavedAddress | undefined;

    const updatedAddresses = existingAddresses.map(addr => {
        if (addr.id === id) {
            const isCoordChanged = (updates.latitude !== undefined && updates.latitude !== addr.latitude) ||
                                  (updates.longitude !== undefined && updates.longitude !== addr.longitude) ||
                                  (updates.address !== undefined && updates.address !== addr.address);

            const updated: SavedAddress = {
                ...addr,
                ...updates,
                hasCompletedOrder: isCoordChanged ? false : (updates.hasCompletedOrder ?? addr.hasCompletedOrder),
            };
            targetAddress = updated;
            if (updated.isDefault) isTargetDefault = true;
            return updated;
        }
        return addr;
    });

    if (updates.isDefault) {
        updatedAddresses.forEach(a => {
            if (a.id !== id) a.isDefault = false;
        });
    }

    const dataToUpdate: Partial<Customer> = {
        savedAddresses: updatedAddresses,
        ...(isTargetDefault && targetAddress ? {
            address: targetAddress.address,
            latitude: targetAddress.latitude,
            longitude: targetAddress.longitude,
            defaultAddressId: targetAddress.id,
        } : {})
    };

    await updateDoc(userRef, dataToUpdate);

    setCurrentCustomer(prev => {
        if (!prev) return null;
        return {
            ...prev,
            ...dataToUpdate
        };
    });

    toast({ title: "Address Updated", description: "Your saved address has been updated." });
  };

  const deleteSavedAddress = async (id: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not logged in");
    if (!currentCustomer) throw new Error("Customer data not loaded yet.");

    const userRef = doc(db, "customers", user.uid);
    const existingAddresses = currentCustomer.savedAddresses || [];
    const deletedAddr = existingAddresses.find(addr => addr.id === id);
    let updatedAddresses = existingAddresses.filter(addr => addr.id !== id);

    // Gap 7: If deleting the default address, auto-promote the first remaining
    const wasDefault = deletedAddr?.isDefault;
    if (wasDefault && updatedAddresses.length > 0) {
        updatedAddresses = updatedAddresses.map((addr, idx) => ({
            ...addr,
            isDefault: idx === 0
        }));
    }

    const promoted = wasDefault ? updatedAddresses.find(a => a.isDefault) : undefined;

    const dataToUpdate: Partial<Customer> = {
        savedAddresses: updatedAddresses,
        ...(promoted ? {
            address: promoted.address,
            latitude: promoted.latitude,
            longitude: promoted.longitude,
            defaultAddressId: promoted.id,
        } : {}),
    };

    // Optimistic: update UI first
    setCurrentCustomer(prev => {
        if (!prev) return null;
        return { ...prev, ...dataToUpdate };
    });

    await updateDoc(userRef, dataToUpdate);

    toast({ title: "Address Removed", description: promoted ? `"${promoted.label || promoted.tag}" is now your default.` : "Address removed from saved list." });
  };

  const setDefaultAddress = async (id: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not logged in");
    if (!currentCustomer) throw new Error("Customer data not loaded yet.");

    const userRef = doc(db, "customers", user.uid);
    const existingAddresses = currentCustomer.savedAddresses || [];
    let selected: SavedAddress | undefined;

    const updatedAddresses = existingAddresses.map(addr => {
        if (addr.id === id) {
            selected = addr;
            return { ...addr, isDefault: true };
        }
        return { ...addr, isDefault: false };
    });

    if (!selected) return;

    const dataToUpdate: Partial<Customer> = {
        savedAddresses: updatedAddresses,
        address: selected.address,
        latitude: selected.latitude,
        longitude: selected.longitude,
        defaultAddressId: selected.id,
    };

    // Optimistic: update UI instantly (0ms latency)
    setCurrentCustomer(prev => {
        if (!prev) return null;
        return { ...prev, ...dataToUpdate };
    });

    // Then persist to Firestore
    await updateDoc(userRef, dataToUpdate);

    toast({ title: "Default Address Set", description: `"${selected.label || selected.tag}" is now your default delivery address.` });
  };

  const updateCustomerBySuperAdmin = async (username: string, customerData: Partial<Customer>) => {
     try {
        const docRef = doc(db, 'customers', username);
        const dataToUpdate = { ...customerData };
        
        const formattedContact = formatPhoneNumber(dataToUpdate.contact);
        if(formattedContact) {
           const uniqueContact = await isContactUnique(formattedContact, username);
            if (!uniqueContact) {
                throw new Error("This contact number is already in use by another account.");
            }
        }
        
        if (dataToUpdate.password === '') {
            delete dataToUpdate.password;
        }

        const finalData = { ...dataToUpdate, contact: formattedContact };
        
        await updateDoc(docRef, finalData);
        toast({ title: 'Success', description: 'Customer updated.' });
     } catch(e: any) {
        console.error("Error updating customer: ", e);
        toast({ title: 'Error', description: e.message || 'Could not update customer.', variant: 'destructive' });
        throw e;
     }
  };

  const removeCustomer = async (username: string) => {
    try {
        await deleteDoc(doc(db, 'customers', username));
        toast({ title: 'Success', description: 'Customer record removed.' });
    } catch (e: any) {
        console.error("Error removing customer: ", e);
        toast({ title: 'Error', description: e.message || 'Could not remove customer record.', variant: 'destructive' });
        throw e;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
    setCurrentCustomer(null);
  };
  
  return (
    <CustomerContext.Provider value={{ 
        customer: currentCustomer, 
        setCurrentCustomer, 
        isAuthLoading, 
        fetchAllCustomers, 
        fetchCustomer, 
        login, 
        loginWithGoogle, 
        loginAsDemo, 
        signup, 
        updateDetails, 
        addSavedAddress,
        updateSavedAddress,
        deleteSavedAddress,
        setDefaultAddress,
        logout, 
        updateCustomerBySuperAdmin, 
        removeCustomer 
    }}>
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomer = () => {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
};
