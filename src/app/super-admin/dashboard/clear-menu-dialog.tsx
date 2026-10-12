'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import type { Vendor, MenuItem } from '@/types';
import { collection, query, where, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  AlertTriangle,
  Loader2,
  Trash2,
  UtensilsCrossed,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClearMenuDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  vendor: Vendor | null;
  onSuccess?: () => void;
}

export default function ClearMenuDialog({
  isOpen,
  onOpenChange,
  vendor,
  onSuccess,
}: ClearMenuDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [confirmInput, setConfirmInput] = useState('');

  const targetStoreName = vendor?.shopName || vendor?.name || '';
  const vendorUsername = vendor?.username || '';

  // Fetch all menu items belonging to this specific vendor when dialog opens
  useEffect(() => {
    if (!isOpen || !vendorUsername) {
      setItems([]);
      setConfirmInput('');
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const fetchVendorItems = async () => {
      try {
        const q = query(
          collection(db, 'menuItems'),
          where('vendorUsername', '==', vendorUsername)
        );
        const snapshot = await getDocs(q);
        if (isMounted) {
          const loaded = snapshot.docs.map(
            (d) => ({ id: d.id, ...d.data() } as MenuItem)
          );
          setItems(loaded);
        }
      } catch (err: any) {
        console.error('Error fetching menu items for deletion:', err);
        if (isMounted) {
          toast({
            title: 'Failed to fetch items',
            description: err.message || 'Could not load menu items.',
            variant: 'destructive',
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchVendorItems();

    return () => {
      isMounted = false;
    };
  }, [isOpen, vendorUsername, toast]);

  // Derived stats
  const vegCount = useMemo(() => items.filter((i) => i.isVeg).length, [items]);
  const nonVegCount = useMemo(() => items.filter((i) => !i.isVeg).length, [items]);
  const categoriesCount = useMemo(
    () => new Set(items.map((i) => i.category).filter(Boolean)).size,
    [items]
  );

  // Failsafe confirmation: user must type either the store name or "DELETE"
  const isConfirmationMatched = useMemo(() => {
    const trimmedInput = confirmInput.trim().toLowerCase();
    const expectedName = targetStoreName.trim().toLowerCase();
    return trimmedInput === expectedName || trimmedInput === 'delete';
  }, [confirmInput, targetStoreName]);

  const handleDeleteAll = async () => {
    if (!vendorUsername || items.length === 0 || !isConfirmationMatched) return;

    setIsDeleting(true);
    try {
      let deletedCount = 0;
      const CHUNK_SIZE = 400; // Safe Firestore batch limit

      for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        const chunk = items.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);

        chunk.forEach((item) => {
          // Extra safety check: guarantee we only delete this vendor's items
          if (item.vendorUsername === vendorUsername) {
            const itemRef = doc(db, 'menuItems', item.id);
            batch.delete(itemRef);
            deletedCount++;
          }
        });

        await batch.commit();
      }

      toast({
        title: 'Menu Cleared!',
        description: `Permanently deleted ${deletedCount} menu items for ${targetStoreName}.`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error deleting menu items:', err);
      toast({
        title: 'Deletion Failed',
        description: err.message || 'Could not delete menu items.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl p-0 border border-destructive/30 bg-card shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-border/60 bg-destructive/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-destructive/15 flex items-center justify-center text-destructive shrink-0">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold font-headline text-foreground flex items-center gap-2">
                Clear Menu — {targetStoreName}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Bulk delete all menu items belonging exclusively to this store.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Store Identification Pill */}
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/70 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <Building className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="font-bold text-foreground truncate">{targetStoreName}</p>
                <p className="text-[10px] text-muted-foreground font-mono truncate">
                  UID: {vendorUsername}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] shrink-0 font-bold">
              {vendor?.category || 'Vendor'}
            </Badge>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Scanning menu items for this vendor...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center space-y-2 border border-dashed border-border/80 rounded-2xl bg-muted/20">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-bold text-foreground">Menu is Already Empty</p>
              <p className="text-[11px] text-muted-foreground">
                No menu items found in the database for {targetStoreName}.
              </p>
            </div>
          ) : (
            <>
              {/* Summary Counter */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  <span className="font-bold text-destructive">
                    {items.length} items will be permanently deleted
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground font-semibold">
                  {categoriesCount} categories • {vegCount} veg • {nonVegCount} non-veg
                </div>
              </div>

              {/* Visual Dish Preview Table (Proof of ownership) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">Dishes to be Deleted (Preview):</span>
                  <span className="text-[10px] text-muted-foreground">
                    Scroll to review all {items.length} dishes
                  </span>
                </div>

                <div className="rounded-2xl border border-border/80 overflow-hidden bg-background shadow-2xs">
                  <ScrollArea className="h-44 w-full">
                    <div className="divide-y divide-border/50 text-xs">
                      {items.map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-2.5 px-3 flex items-center justify-between hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                            <span className="text-[10px] text-muted-foreground w-5 shrink-0 font-mono">
                              #{idx + 1}
                            </span>
                            <span
                              className={cn(
                                "w-2 h-2 rounded-full shrink-0",
                                item.isVeg ? "bg-emerald-500" : "bg-rose-500"
                              )}
                              title={item.isVeg ? "Veg" : "Non-Veg"}
                            />
                            <span className="font-bold truncate text-foreground">
                              {item.name}
                            </span>
                            {item.category && (
                              <Badge
                                variant="secondary"
                                className="text-[9px] py-0 px-1.5 h-4 font-normal hidden sm:inline-flex"
                              >
                                {item.category}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-xs font-extrabold text-foreground">
                              ₹{item.price}
                            </span>
                            {typeof item.dineInPrice === 'number' && (
                              <span className="text-[10px] text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded font-bold">
                                Dine: ₹{item.dineInPrice}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* Failsafe Confirmation Input */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <label className="text-xs font-bold text-foreground block">
                  Safety Confirmation:
                </label>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  To prevent accidental deletion, type the store name{' '}
                  <strong className="text-foreground">"{targetStoreName}"</strong> or{' '}
                  <strong className="text-foreground">"DELETE"</strong> below:
                </p>
                <Input
                  type="text"
                  placeholder={`Type "${targetStoreName}" or "DELETE"`}
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  className="h-9 text-xs font-medium border-border/80"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border/60 bg-muted/20 flex-row sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
            className="rounded-full text-xs font-bold flex-1 sm:flex-initial"
          >
            Cancel
          </Button>

          {items.length > 0 && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={!isConfirmationMatched || isDeleting}
              onClick={handleDeleteAll}
              className="rounded-full text-xs font-bold gap-1.5 flex-1 sm:flex-initial shadow-md"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting {items.length} Items...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Permanently Delete All {items.length} Items
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
