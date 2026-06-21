
'use client';

import type { ExpenseCategory } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { createSlug } from '@/lib/utils';

interface ExpenseCategoryContextType {
  expenseCategories: ExpenseCategory[];
  addExpenseCategory: (category: Omit<ExpenseCategory, 'id'>) => Promise<void>;
  updateExpenseCategory: (category: ExpenseCategory) => Promise<void>;
  removeExpenseCategory: (categoryId: string) => Promise<void>;
}

const ExpenseCategoryContext = createContext<ExpenseCategoryContextType | undefined>(undefined);

export const ExpenseCategoryProvider = ({ children }: { children: ReactNode }) => {
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const { toast } = useToast();

  const fetchExpenseCategories = useCallback(async () => {
    try {
      const q = collection(db, 'expense-categories');
      const querySnapshot = await getDocs(q);
      const categories = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
      } as ExpenseCategory));
      setExpenseCategories(categories);
    } catch (error) {
      console.error("Error fetching expense categories: ", error);
      toast({
          title: "Error",
          description: "Could not fetch expense categories from the database.",
          variant: "destructive"
      });
    }
  }, [toast]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'expense-categories'), (snapshot) => {
        const categories = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
      } as ExpenseCategory));
      setExpenseCategories(categories);
    }, (error) => {
        console.error("Error with expense category listener: ", error);
    });

    return () => unsub();
  }, []);

  const addExpenseCategory = async (category: Omit<ExpenseCategory, 'id'>) => {
    const docId = createSlug(category.name);
    const categoryRef = doc(db, 'expense-categories', docId);
    try {
      await setDoc(categoryRef, category);
      toast({ title: 'Success', description: 'Expense category added.' });
    } catch (e) {
      console.error("Error adding expense category: ", e);
      toast({ title: 'Error', description: 'Could not add expense category.', variant: 'destructive' });
    }
  };

  const updateExpenseCategory = async (updatedCategory: ExpenseCategory) => {
    try {
      const categoryRef = doc(db, 'expense-categories', updatedCategory.id);
      const { id, ...dataToUpdate } = updatedCategory;
      await updateDoc(categoryRef, dataToUpdate);
      toast({ title: 'Success', description: 'Expense category updated.' });
    } catch (e) {
      console.error("Error updating expense category: ", e);
      toast({ title: 'Error', description: 'Could not update expense category.', variant: 'destructive' });
    }
  };

  const removeExpenseCategory = async (categoryId: string) => {
    try {
      await deleteDoc(doc(db, 'expense-categories', categoryId));
      toast({ title: 'Success', description: 'Expense category removed.' });
    } catch (e) {
      console.error("Error removing expense category: ", e);
      toast({ title: 'Error', description: 'Could not remove expense category.', variant: 'destructive' });
    }
  };

  return (
    <ExpenseCategoryContext.Provider value={{ expenseCategories, addExpenseCategory, updateExpenseCategory, removeExpenseCategory }}>
      {children}
    </ExpenseCategoryContext.Provider>
  );
};

export const useExpenseCategory = () => {
  const context = useContext(ExpenseCategoryContext);
  if (context === undefined) {
    throw new Error('useExpenseCategory must be used within an ExpenseCategoryProvider');
  }
  return context;
};
