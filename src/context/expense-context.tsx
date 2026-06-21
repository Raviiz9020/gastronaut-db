
'use client';

import type { Expense, ExpenseCategory } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { useVendor } from './vendor-context';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useExpenseCategory } from './expense-category-context';

interface ExpenseContextType {
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
  expenseIngredients: string[];
  isLoading: boolean;
  addExpense: (expense: Omit<Expense, 'id' | 'vendorUsername'>) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  removeExpense: (expenseId: string) => Promise<void>;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export const ExpenseProvider = ({ children }: { children: ReactNode }) => {
  const { vendor } = useVendor();
  const { expenseCategories } = useExpenseCategory(); // Use the new context
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseIngredients, setExpenseIngredients] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const unsubscribeRef = useRef<() => void | null>(null);

  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
        if (unsubscribeRef.current) {
            unsubscribeRef.current(); // Unsubscribe from previous listener
        }

        if (user) {
            const vendorIsLoaded = vendor && vendor.username === user.uid;
            if (vendorIsLoaded && vendor.isExpenseTrackingEnabled) {
                setIsLoading(true);
                const q = query(collection(db, 'expenses'), where('vendorUsername', '==', user.uid));

                unsubscribeRef.current = onSnapshot(q, (snapshot) => {
                    const fetchedExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
                    setExpenses(fetchedExpenses);
                    
                    // Derive ingredients from descriptions
                    const ingredients = new Set<string>();
                    fetchedExpenses.forEach(exp => {
                        // Simple split by comma for now, can be improved
                        exp.description.split(',').forEach(d => {
                            const trimmed = d.trim();
                            if(trimmed) ingredients.add(trimmed);
                        });
                    });
                    setExpenseIngredients(Array.from(ingredients));

                    setIsLoading(false);
                }, (error) => {
                    console.error("Error fetching expenses: ", error);
                    toast({ title: 'Error', description: 'Could not fetch expenses.', variant: 'destructive' });
                    setIsLoading(false);
                });
            } else {
                 setExpenses([]);
                 setIsLoading(false);
            }
        } else {
            // User logged out
            setExpenses([]);
            setIsLoading(false);
        }
    });

    return () => {
        authUnsubscribe();
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
        }
    };
  }, [vendor, toast]);
  

  const addExpense = async (expense: Omit<Expense, 'id' | 'vendorUsername'>) => {
    if (!vendor) {
        toast({ title: 'Error', description: 'You must be logged in to add an expense.', variant: 'destructive'});
        return;
    }
    const newExpense = {
        ...expense,
        vendorUsername: vendor.username,
    };
    await addDoc(collection(db, 'expenses'), newExpense);
    toast({ title: 'Expense Added!', description: 'Your new expense has been recorded.' });
  };

  const updateExpense = async (expense: Expense) => {
    const docRef = doc(db, 'expenses', expense.id);
    await updateDoc(docRef, expense);
    toast({ title: 'Expense Updated!', description: 'Your expense record has been updated.' });
  };

  const removeExpense = async (expenseId: string) => {
    await deleteDoc(doc(db, 'expenses', expenseId));
    toast({ title: 'Expense Deleted', description: 'The expense record has been removed.' });
  };

  return (
    <ExpenseContext.Provider value={{ expenses, isLoading, addExpense, updateExpense, removeExpense, expenseCategories, expenseIngredients }}>
      {children}
    </ExpenseContext.Provider>
  );
};

export const useExpense = () => {
  const context = useContext(ExpenseContext);
  if (context === undefined) {
    throw new Error('useExpense must be used within an ExpenseProvider');
  }
  return context;
};
