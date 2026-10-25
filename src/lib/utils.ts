
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { storage } from './firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Uploads a data URL to Firebase Storage and returns the public download URL
export const uploadImageToStorage = async (dataUrl: string, path: string): Promise<string> => {
    if (!dataUrl.startsWith('data:image')) {
        // If it's not a data URL, assume it's already a valid URL
        return dataUrl;
    }
    const storageRef = ref(storage, path);
    const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
    return await getDownloadURL(snapshot.ref);
};


// Helper to create a URL-friendly slug from a string
export const createSlug = (str: string) => {
    if (!str) return '';
    return str
        .toLowerCase()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/[^\w-]+/g, '') // Remove all non-word chars
        .replace(/--+/g, '-') // Replace multiple - with single -
        .replace(/^-+/, '') // Trim - from start of text
        .replace(/-+$/, ''); // Trim - from end of text
};

// Safely extracts customNotes whether stored as a string or a legacy vendor-keyed object
export const getOrderNotes = (notes: any, vendorUsername?: string): string => {
    if (!notes) return '';
    if (typeof notes === 'string') return notes.trim();
    if (typeof notes === 'object') {
        if (vendorUsername && notes[vendorUsername]) return String(notes[vendorUsername]).trim();
        const vals = Object.values(notes).filter((v) => typeof v === 'string' && v.trim());
        return vals.join(' | ').trim();
    }
    return String(notes).trim();
};
