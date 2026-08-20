'use client';

import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { compressImage, uploadImageToStorage } from '@/lib/client-utils';
import { useToast } from '@/hooks/use-toast';
import { SupportedImageModel } from '@/lib/ai/menu-image-prompt';

export interface QueuedDishItem {
  docId: string;
  name: string;
  category: string;
  description: string;
  vendorUsername: string;
  status: 'queued' | 'generating' | 'completed' | 'failed';
  previewUrl?: string;
  error?: string;
}

interface AiGenerationContextType {
  queuedItems: QueuedDishItem[];
  isGenerating: boolean;
  isPaused: boolean;
  isFinished: boolean;
  currentDishName: string;
  completedCount: number;
  failedCount: number;
  totalCount: number;
  selectedModel: SupportedImageModel;
  startBatchGeneration: (items: QueuedDishItem[], model: SupportedImageModel) => void;
  pauseGeneration: () => void;
  resumeGeneration: () => void;
  cancelGeneration: () => void;
  retryFailed: () => void;
  clearQueue: () => void;
}

const AiGenerationContext = createContext<AiGenerationContextType | undefined>(undefined);

export function AiGenerationProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [queuedItems, setQueuedItems] = useState<QueuedDishItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentDishName, setCurrentDishName] = useState('');
  const [selectedModel, setSelectedModel] = useState<SupportedImageModel>('gemini-2.5-flash-image');

  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);
  const activeLoopRef = useRef(false);

  const waitMs = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const runQueueLoop = async (itemsList: QueuedDishItem[], model: SupportedImageModel) => {
    if (activeLoopRef.current) return;
    activeLoopRef.current = true;
    setIsGenerating(true);
    isCancelledRef.current = false;
    isPausedRef.current = false;
    setIsPaused(false);

    const items = [...itemsList];
    const BATCH_SIZE = 3;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      if (isCancelledRef.current) break;

      while (isPausedRef.current && !isCancelledRef.current) {
        await waitMs(500);
      }

      const batch = items.slice(i, i + BATCH_SIZE);
      setCurrentDishName(batch.map((b) => b.name).join(', '));

      setQueuedItems((prev) =>
        prev.map((item) =>
          batch.some((b) => b.docId === item.docId && item.status !== 'completed')
            ? { ...item, status: 'generating' }
            : item
        )
      );

      await Promise.all(
        batch.map(async (dish) => {
          if (isCancelledRef.current) return;

          let retries = 0;
          let success = false;

          while (!success && retries < 2 && !isCancelledRef.current) {
            try {
              console.log(`[AI Gen] Step 1: Requesting image for "${dish.name}" (Model: ${model})...`);
              const response = await fetch('/api/ai/generate-menu-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  dishName: dish.name,
                  category: dish.category,
                  description: dish.description,
                  modelName: model,
                }),
              });

              if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const errMsg = errData?.error || `API returned status ${response.status}`;
                if (response.status === 429) {
                  console.warn(`[AI Gen] Rate limit on "${dish.name}". Backing off 6s...`);
                  await waitMs(6000);
                  retries++;
                  continue;
                }
                throw new Error(errMsg);
              }

              const data = await response.json();
              if (!data.imageDataUrl) throw new Error('No image returned by AI');

              console.log(`[AI Gen] Step 2: Compressing & generating blur for "${dish.name}"...`);
              let finalDataUrl = data.imageDataUrl;
              let blurDataUrl = '';

              try {
                const compressed = await compressImage(data.imageDataUrl);
                finalDataUrl = compressed.compressedDataUrl;
                blurDataUrl = compressed.blurDataUrl;
              } catch (compErr: any) {
                console.warn(`[AI Gen] Compression skipped for "${dish.name}", using raw data:`, compErr);
                finalDataUrl = data.imageDataUrl;
              }

              console.log(`[AI Gen] Step 3: Uploading to Firebase Storage for "${dish.name}"...`);
              const safeVendor = dish.vendorUsername || 'vendor';
              const storagePath = `menu-images/${safeVendor}/${Date.now()}_${dish.docId}.webp`;
              const downloadUrl = await uploadImageToStorage(finalDataUrl, storagePath);

              console.log(`[AI Gen] Step 4: Updating Firestore doc "${dish.docId}"...`);
              await updateDoc(doc(db, 'menuItems', dish.docId), {
                image: downloadUrl,
                blurDataUrl: blurDataUrl || '',
                aiHint: dish.name,
                imageGenStatus: 'completed',
              });

              setQueuedItems((prev) =>
                prev.map((it) =>
                  it.docId === dish.docId
                    ? { ...it, status: 'completed', previewUrl: downloadUrl, error: undefined }
                    : it
                )
              );

              console.log(`[AI Gen] ✅ Success for "${dish.name}"`);
              success = true;
            } catch (err: any) {
              console.error(`[AI Gen Failure for "${dish.name}"]`, err);
              retries++;
              if (retries >= 2) {
                const message = err?.message || 'Generation failed';
                setQueuedItems((prev) =>
                  prev.map((it) =>
                    it.docId === dish.docId
                      ? { ...it, status: 'failed', error: message }
                      : it
                  )
                );
                toast({
                  title: `Failed: ${dish.name}`,
                  description: message,
                  variant: 'destructive',
                });
              } else {
                await waitMs(2000);
              }
            }
          }
        })
      );

      if (i + BATCH_SIZE < items.length && !isCancelledRef.current) {
        await waitMs(1500);
      }
    }

    activeLoopRef.current = false;
    setIsGenerating(false);
    setCurrentDishName('');

    if (!isCancelledRef.current) {
      toast({
        title: '🎨 AI Generation Complete',
        description: 'All menu photos have been generated and updated.',
      });
    }
  };

  const startBatchGeneration = useCallback(
    (items: QueuedDishItem[], model: SupportedImageModel) => {
      setSelectedModel(model);
      setQueuedItems(items);
      runQueueLoop(items, model);
    },
    []
  );

  const pauseGeneration = useCallback(() => {
    isPausedRef.current = true;
    setIsPaused(true);
  }, []);

  const resumeGeneration = useCallback(() => {
    isPausedRef.current = false;
    setIsPaused(false);
  }, []);

  const cancelGeneration = useCallback(() => {
    isCancelledRef.current = true;
    setIsGenerating(false);
    activeLoopRef.current = false;
  }, []);

  const retryFailed = useCallback(() => {
    setQueuedItems((prev) => {
      const updated = prev.map((it) =>
        it.status === 'failed' ? { ...it, status: 'queued' as const, error: undefined } : it
      );
      runQueueLoop(updated, selectedModel);
      return updated;
    });
  }, [selectedModel]);

  const clearQueue = useCallback(() => {
    cancelGeneration();
    setQueuedItems([]);
    setCurrentDishName('');
  }, [cancelGeneration]);

  const completedCount = queuedItems.filter((i) => i.status === 'completed').length;
  const failedCount = queuedItems.filter((i) => i.status === 'failed').length;
  const totalCount = queuedItems.length;
  const isFinished = totalCount > 0 && completedCount + failedCount === totalCount;

  return (
    <AiGenerationContext.Provider
      value={{
        queuedItems,
        isGenerating,
        isPaused,
        isFinished,
        currentDishName,
        completedCount,
        failedCount,
        totalCount,
        selectedModel,
        startBatchGeneration,
        pauseGeneration,
        resumeGeneration,
        cancelGeneration,
        retryFailed,
        clearQueue,
      }}
    >
      {children}
    </AiGenerationContext.Provider>
  );
}

export function useAiGeneration() {
  const context = useContext(AiGenerationContext);
  if (!context) {
    throw new Error('useAiGeneration must be used within an AiGenerationProvider');
  }
  return context;
}
