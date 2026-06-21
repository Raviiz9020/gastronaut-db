
'use client';

import { storage } from './firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export function compressImage(sourceUrl: string, maxWidth: number = 1200, quality: number = 0.8): Promise<{ compressedDataUrl: string, blurDataUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // Handle CORS for images from other domains
    img.src = sourceUrl;
    img.onload = () => {
      // Main compressed image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Failed to get canvas context'));

      let { width, height } = img;
      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

      // Blurry placeholder
      const blurCanvas = document.createElement('canvas');
      const blurCtx = blurCanvas.getContext('2d');
      if (!blurCtx) return reject(new Error('Failed to get blur canvas context'));
      
      const blurWidth = 20;
      const blurHeight = (blurWidth / img.width) * img.height;
      blurCanvas.width = blurWidth;
      blurCanvas.height = blurHeight;
      blurCtx.filter = 'blur(1px)';
      blurCtx.drawImage(img, 0, 0, blurWidth, blurHeight);
      const blurDataUrl = blurCanvas.toDataURL('image/png');

      resolve({ compressedDataUrl, blurDataUrl });
    };
    img.onerror = (error) => {
      reject(error);
    };
  });
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
