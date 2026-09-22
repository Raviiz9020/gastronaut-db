'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SpecialMenu, SpecialMenuType, MenuItem as MenuItemType } from '@/types';

export interface ActiveSpecialCategory {
  id: string;
  type: SpecialMenuType;
  title: string;
  categoryKey: string; // e.g. "special-xyz"
  items: MenuItemType[];
  itemCount: number;
}

/**
 * Hook to retrieve and subscribe to a vendor's active specials in real-time.
 * Strictly guarantees:
 * 1. Only specials with isActive === true are returned.
 * 2. Only dishes with isAvailable !== false are included.
 * 3. Empty specials (0 available items) are automatically omitted.
 */
export function useVendorSpecials(
  vendorUsername: string | undefined,
  vendorMenuItems: MenuItemType[]
) {
  const [rawSpecials, setRawSpecials] = useState<SpecialMenu[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!vendorUsername) {
      setRawSpecials([]);
      setLoading(false);
      return;
    }

    const specialsRef = collection(db, 'specialMenus');
    const q = query(specialsRef, where('vendorUsername', '==', vendorUsername));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SpecialMenu[];
        setRawSpecials(list);
        setLoading(false);
      },
      (error) => {
        console.error('Error syncing vendor specials:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [vendorUsername]);

  // Compute active specials matching available menu items
  const activeSpecials = useMemo<ActiveSpecialCategory[]>(() => {
    if (!rawSpecials.length || !vendorMenuItems.length) return [];

    const itemsMap = new Map<string, MenuItemType>();
    vendorMenuItems.forEach((item) => {
      itemsMap.set(item.id, item);
    });

    return rawSpecials
      .filter((special) => special.isActive === true && Array.isArray(special.itemIds) && special.itemIds.length > 0)
      .map((special) => {
        // Resolve only available items
        const items = special.itemIds
          .map((id) => itemsMap.get(id))
          .filter((item): item is MenuItemType => Boolean(item && item.isAvailable !== false));

        const title = special.title?.trim() || `${special.type} Special`;
        return {
          id: special.id,
          type: special.type,
          title,
          categoryKey: `special-${special.id}`,
          items,
          itemCount: items.length,
        };
      })
      .filter((special) => special.itemCount > 0);
  }, [rawSpecials, vendorMenuItems]);

  // Quick lookup dictionary by categoryKey
  const activeSpecialsByKey = useMemo(() => {
    const map: Record<string, ActiveSpecialCategory> = {};
    for (const s of activeSpecials) {
      map[s.categoryKey] = s;
    }
    return map;
  }, [activeSpecials]);

  return {
    activeSpecials,
    activeSpecialsByKey,
    loading,
  };
}
