

'use client';

import type { SiteReview } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface SiteReviewContextType {
  reviews: SiteReview[];
  addReview: (review: Omit<SiteReview, 'id' | 'createdAt'>) => Promise<void>;
}

const SiteReviewContext = createContext<SiteReviewContextType | undefined>(undefined);

export const SiteReviewProvider = ({ children }: { children: ReactNode }) => {
  const [reviews, setReviews] = useState<SiteReview[]>([]);
  const { toast } = useToast();

  const fetchReviews = useCallback(async () => {
    try {
      const reviewsRef = collection(db, 'siteReviews');
      const q = query(reviewsRef, orderBy('createdAt', 'desc'), limit(10)); // Get latest 10 reviews
      const snapshot = await getDocs(q);
      const allReviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SiteReview));
      setReviews(allReviews);
    } catch (error) {
      console.error("Error fetching site reviews:", error);
      toast({
        title: "Error",
        description: "Could not fetch site reviews.",
        variant: "destructive"
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const addReview = async (reviewData: Omit<SiteReview, 'id' | 'createdAt'>) => {
    try {
      const dataToSave = {
        ...reviewData,
        createdAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'siteReviews'), dataToSave);
      fetchReviews(); // Re-fetch reviews
      toast({
        title: "Review Submitted!",
        description: "Thank you for your feedback."
      });
    } catch (error) {
      console.error("Error adding site review:", error);
      toast({ title: "Error", description: "Could not submit your review.", variant: "destructive" });
      throw error;
    }
  };

  return (
    <SiteReviewContext.Provider value={{ reviews, addReview }}>
      {children}
    </SiteReviewContext.Provider>
  );
};

export const useSiteReview = () => {
  const context = useContext(SiteReviewContext);
  if (context === undefined) {
    throw new Error('useSiteReview must be used within a SiteReviewProvider');
  }
  return context;
};
