'use client';

import type { Customer, EmailPreferences } from '@/types';
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
  updateDetails: (details: { name: string; contact: string; address: string; termsAccepted?: boolean; emailPreferences?: EmailPreferences; latitude?: number; longitude?: number; }) => Promise<void>;
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
            // A customer document exists for this user, so set them as the current customer.
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

             setCurrentCustomer(customerData);
        } else {
            // No customer document exists for this Firebase user.
            // This can happen if they are a vendor, or if they haven't completed signup.
            // We clear any stale customer data from state.
            if(currentCustomer && currentCustomer.authUid === firebaseUser.uid) {
                // Do nothing, a vendor might be logged in. The vendor context will handle them.
            } else {
                 // Clear any previous customer state if the UID doesn't match
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


  useEffect(() => {
    try {
        if (currentCustomer) {
            localStorage.setItem('hyperdelivery-customer', JSON.stringify(currentCustomer));
        } else {
            localStorage.removeItem('hyperdelivery-customer');
        }
    } catch (error) {
        console.error("Failed to save customer to localStorage", error);
    }
  }, [currentCustomer]);
  
  const isContactUnique = async (contact: string, currentUsername?: string) => {
    if (!contact) return true; // Don't validate if contact is not provided
    const formattedContact = formatPhoneNumber(contact);
    const customerQuery = query(collection(db, 'customers'), where('contact', '==', formattedContact));
    const vendorQuery = query(collection(db, 'vendors'), where('contact', '==', formattedContact));

    const [customerSnap, vendorSnap] = await Promise.all([
        getDocs(customerQuery),
        getDocs(vendorQuery)
    ]);
    
    const conflictingCustomer = customerSnap.docs.find(doc => doc.id !== currentUsername);
    if (conflictingCustomer) return false;

    const conflictingVendor = vendorSnap.docs.find(doc => doc.id !== currentUsername);
    if (conflictingVendor) return false;
    
    return true;
  }

  const fetchAllCustomers = useCallback(async (): Promise<Customer[]> => {
     try {
        const q = collection(db, 'customers');
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ username: doc.id, ...doc.data() } as Customer));
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
             const customerData = { username: docSnap.id, ...docSnap.data() } as Customer;
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
    // This function is now for manual login only. Google login is separate.
    const q = query(collection(db, 'customers'), where('username', '==', username), where('password', '==', password));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        throw new Error("Invalid username or password.");
    }
    
    const userDoc = querySnapshot.docs[0];
    const user = { username: userDoc.id, ...userDoc.data() } as Customer;

    setCurrentCustomer(user);
    return user;
  };

  const loginWithGoogle = async (): Promise<Customer> => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const firebaseUser = result.user;
        let customerData: Customer;

        const userRef = doc(db, 'customers', firebaseUser.uid);
        const docSnap = await getDoc(userRef);
        
        if (docSnap.exists()) {
            // Customer document exists. Update name/image from Google.
            const existingData = docSnap.data();
            await updateDoc(userRef, {
                name: firebaseUser.displayName || existingData.name,
                imageUrl: firebaseUser.photoURL || existingData.imageUrl,
            });
            customerData = { username: docSnap.id, authUid: firebaseUser.uid, ...existingData, name: firebaseUser.displayName || existingData.name, imageUrl: firebaseUser.photoURL || existingData.imageUrl } as Customer;
        } else {
            // This is a new customer. Create their document.
            const newCustomerData = {
                authUid: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || `User-${firebaseUser.uid.substring(0, 5)}`,
                imageUrl: firebaseUser.photoURL || undefined,
                contact: '',
                address: '',
                termsAccepted: false,
                phoneVerified: false,
                createdAt: new Date().toISOString(),
                emailPreferences: { campaigns: true }, // Default to opt-in
                lastActivityDate: new Date().toISOString(),
            };
            await setDoc(userRef, newCustomerData);
            customerData = { username: firebaseUser.uid, ...newCustomerData } as Customer;
            
            // Send notification email
            if (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL) {
              sendNewCustomerEmail({
                customerName: customerData.name,
                customerEmail: customerData.email,
                superAdminEmail: process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL,
              }).catch(console.error);
            }
        }
        
        setCurrentCustomer(customerData);
        // Clear any lingering vendor session
        localStorage.removeItem('hyperdelivery-vendor');
        return customerData;

    } catch (error: any) {
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
            toast({
                title: "Sign-in process cancelled",
                description: "You can try signing in again anytime.",
                variant: 'default',
            });
        } else {
            console.error("Google Sign-In Error: ", error);
            toast({
                title: "Google Sign-In Failed",
                description: "Could not sign in with Google. Please try again.",
                variant: "destructive"
            });
        }
        throw error;
    }
  };

  const loginAsDemo = async (): Promise<Customer> => {
    try {
        const email = process.env.NEXT_PUBLIC_DEMO_CUSTOMER_EMAIL;
        const password = process.env.NEXT_PUBLIC_DEMO_CUSTOMER_PASSWORD;

        if (!email || !password) {
            throw new Error("Demo customer credentials are not configured.");
        }

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        const customerRef = doc(db, 'customers', firebaseUser.uid);
        const docSnap = await getDoc(customerRef);

        let customerData: Customer;

        if (!docSnap.exists()) {
            // Create a minimal profile if it doesn't exist
            const newDemoData = {
                authUid: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: 'Demo Customer',
                isDemoCustomer: true,
                contact: '',
                address: '',
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
        
        // Send notification email
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

  const updateDetails = async (details: { name: string; contact: string; address: string; termsAccepted?: boolean; emailPreferences?: EmailPreferences; latitude?: number; longitude?: number; }) => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not logged in");

    if (!currentCustomer) throw new Error("Customer data not loaded yet.");

    const userRef = doc(db, "customers", user.uid);

    const formattedContact = formatPhoneNumber(details.contact);

    const dataToUpdate: any = {
      name: details.name,
      address: details.address,
      termsAccepted: details.termsAccepted,
      emailPreferences: details.emailPreferences,
      latitude: details.latitude !== undefined ? details.latitude : null,
      longitude: details.longitude !== undefined ? details.longitude : null,
      updatedAt: new Date().toISOString(),
    };
    
    // Only update contact if it has changed to avoid triggering unnecessary OTP
    if(currentCustomer.contact !== formattedContact) {
        dataToUpdate.contact = formattedContact;
        dataToUpdate.phoneVerified = false; // Reset verification status on number change
    }
    
    await updateDoc(userRef, dataToUpdate);

     // Optimistically update local state to reflect changes immediately
     setCurrentCustomer(prev => {
        if (!prev) return null;
        return { ...prev, ...dataToUpdate };
    });
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
        
        // Don't save an empty password
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
  }

  const removeCustomer = async (username: string) => {
    try {
        // Note: This only deletes the Firestore record. Deleting the Firebase Auth user
        // requires a privileged backend environment (e.g., Cloud Functions).
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
      await signOut(auth); // Sign out from Firebase Auth
    } catch (error) {
      console.error("Error signing out: ", error);
    }
    setCurrentCustomer(null);
  };
  
  return (
    <CustomerContext.Provider value={{ customer: currentCustomer, setCurrentCustomer, isAuthLoading, fetchAllCustomers, fetchCustomer, login, loginWithGoogle, loginAsDemo, signup, updateDetails, logout, updateCustomerBySuperAdmin, removeCustomer }}>
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
