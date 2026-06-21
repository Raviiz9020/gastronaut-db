
'use server';

/**
 * @fileOverview A Genkit flow for searching both vendors and menu items.
 * This file is currently a placeholder and the search logic has been removed.
 *
 */

import { ai } from '@/ai/config';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import type { MenuItem, Vendor, SearchResult } from '@/types';

const SearchInputSchema = z.string();
type SearchInput = z.infer<typeof SearchInputSchema>;

export async function searchItemsAndVendors(input: SearchInput): Promise<SearchResult[]> {
    if (!input || input.trim().length < 3) {
        return [];
    }

    const lowercasedInput = input.trim().toLowerCase();
    const results: SearchResult[] = [];

    try {
        // Search Menu Items
        const itemsQuerySnapshot = await getDocs(collection(db, 'menuItems'));
        itemsQuerySnapshot.forEach(doc => {
            const item = { id: doc.id, ...doc.data() } as MenuItem;
            if (item.name.toLowerCase().includes(lowercasedInput)) {
                results.push({
                    id: item.id,
                    name: item.name,
                    type: 'item',
                    vendorUsername: item.vendorUsername,
                    item: item,
                });
            }
        });

    } catch (error) {
        console.error("Error searching database:", error);
        // Optionally, re-throw or handle the error as needed
        // For now, we'll return an empty array on error.
        return [];
    }
    
    return results;
}
