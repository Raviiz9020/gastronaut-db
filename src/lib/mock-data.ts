import type { Category, MenuItem } from '@/types';

// Default vendor for mock data
const defaultVendor = 'admin';

// This data is no longer used for categories and is now empty,
// as categories are fetched from Firestore.
export const categories: Category[] = [];

// This data is no longer used for menu items and is now empty,
// as menu items are fetched from Firestore.
export const menuItems: MenuItem[] = [];

export const userPreferences = {
  dietaryRestrictions: ['none'],
  likes: ['spicy', 'savory', 'burgers'],
  dislikes: ['fish'],
};

export const orderHistory: any[] = [];
