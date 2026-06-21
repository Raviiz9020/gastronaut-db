
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { MenuItem, CustomizationOption, Vendor } from '@/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from './ui/scroll-area';
import Image from 'next/image';
import { Label } from './ui/label';
import { RadioGroup } from './ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { ShoppingBag, Plus, Minus, X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/cart-context';

interface OrderCustomizationSheetProps {
  item: MenuItem | null;
  vendor?: Vendor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd?: (item: MenuItem, selectedOptions: Record<string, string | string[]>, quantity: number) => void;
}

export default function OrderCustomizationSheet({ item, vendor, open, onOpenChange, onAdd }: OrderCustomizationSheetProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string | string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const { toast } = useToast();
  const { addToCart } = useCart();

  useEffect(() => {
    if (item) {
      setQuantity(1);
      const defaultOptions: Record<string, string | string[]> = {};
      item.customizations?.forEach(cust => {
        // Only set a default if it's a SINGLE select AND it's mandatory (minSelect > 0)
        if (cust.type === 'SINGLE' && Number(cust.minSelect) > 0) {
          const firstAvailable = cust.options.find(o => o.isAvailable !== false && (o.stock === undefined || o.stock === null || o.stock > 0));
          if (firstAvailable) {
            defaultOptions[cust.id] = firstAvailable.id;
          }
        }
      });
      setSelectedOptions(defaultOptions);
    }
  }, [item]);

  const handleSingleSelectChange = (customizationId: string, value: string) => {
    setSelectedOptions(prev => ({ ...prev, [customizationId]: value }));
  };

  const handleMultiSelectChange = (customizationId: string, optionId: string, checked: boolean) => {
    setSelectedOptions(prev => {
      const currentSelection = (prev[customizationId] as string[] | undefined) || [];
      if (checked) {
        if (currentSelection.includes(optionId)) return prev;
        return { ...prev, [customizationId]: [...currentSelection, optionId] };
      }
      return { ...prev, [customizationId]: currentSelection.filter(id => id !== optionId) };
    });
  };

  const isDiscountActive = item?.isDiscountActive ?? false;

  const { singleItemPrice, singleItemOriginalPrice } = useMemo(() => {
    if (!item) return { singleItemPrice: 0, singleItemOriginalPrice: 0 };

    const hasMandatoryCustomization = item.customizations?.some(c => Number(c.minSelect) === 1) ?? false;
    const basePrice = hasMandatoryCustomization ? 0 : (item.discountPrice && item.discountPrice > 0 ? item.discountPrice : item.price);
    const baseOriginalPrice = hasMandatoryCustomization ? 0 : item.price;

    let total = basePrice;
    let originalTotal = baseOriginalPrice;

    Object.entries(selectedOptions).forEach(([customizationId, selected]) => {
      const customization = item.customizations?.find(c => c.id === customizationId);
      if (!customization) return;

      if (Array.isArray(selected)) {
        const uniqueSelected = Array.from(new Set(selected));
        uniqueSelected.forEach(optionId => {
          const option = customization.options.find(o => o.id === optionId);
          if (option) {
            const effectivePrice = isDiscountActive ? option.price : (option.originalPrice || option.price);
            total += effectivePrice;
            originalTotal += (option.originalPrice || option.price);
          }
        });
      } else {
        const option = customization.options.find(o => o.id === selected);
        if (option) {
          const effectivePrice = isDiscountActive ? option.price : (option.originalPrice || option.price);
          total += effectivePrice;
          originalTotal += (option.originalPrice || option.price);
        }
      }
    });

    return { singleItemPrice: total, singleItemOriginalPrice: originalTotal };
  }, [item, selectedOptions, isDiscountActive]);

  const totalPrice = useMemo(() => singleItemPrice * quantity, [singleItemPrice, quantity]);
  const totalOriginalPrice = useMemo(() => singleItemOriginalPrice * quantity, [singleItemOriginalPrice, quantity]);

  const handleAddToOrder = () => {
    if (!item) return;

    const missingMandatoryGroups = item.customizations?.filter(cust => {
      if (cust.minSelect === 1) {
        const selection = selectedOptions[cust.id];
        return !selection || (Array.isArray(selection) && selection.length === 0);
      }
      return false;
    });

    if (missingMandatoryGroups && missingMandatoryGroups.length > 0) {
      toast({
        title: "Required Selection",
        description: `Please select an option for: ${missingMandatoryGroups[0].name}`,
        variant: "destructive"
      });
      return;
    }

    if (onAdd) {
      onAdd(item, selectedOptions, quantity);
      onOpenChange(false);
    } else {
      const wasAdded = addToCart(item, selectedOptions, quantity);
      if (wasAdded) {
        toast({
          title: `${quantity}x ${item.name} added!`,
          description: "Item(s) added to your order with selected customizations.",
        });
        onOpenChange(false);
      }
    }
  };

  if (!item) return null;

  const imageToShow = item.imageDataUrl || item.image;
  const showImage = imageToShow && !imageToShow.includes('placehold.co');
  const hasSaving = totalOriginalPrice > totalPrice;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] sm:max-w-md mx-auto rounded-t-[24px] p-0 flex flex-col border-none shadow-2xl bg-white overflow-hidden"
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />

        {/* Header */}
        <SheetHeader className="px-4 py-2 flex flex-row items-center gap-3 border-b border-slate-100 bg-white sticky top-0 z-10">
          {showImage && (
            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-slate-100 shadow-sm">
              <Image
                src={imageToShow}
                alt={item.name}
                width={48}
                height={48}
                className="object-cover w-full h-full"
                placeholder={item.blurDataUrl ? 'blur' : 'empty'}
                blurDataURL={item.blurDataUrl}
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <SheetTitle className="font-bold text-base text-slate-800 leading-tight truncate">{item.name}</SheetTitle>
            {item.description && (
              <SheetDescription className="line-clamp-1 text-[11px] text-slate-400 mt-0.5">{item.description}</SheetDescription>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex-shrink-0"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-3.5 w-3.5 text-slate-500" />
          </Button>
        </SheetHeader>

        {/* Scrollable Options */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-4 py-3 space-y-5">
            {item.customizations?.map(cust => (
              <div key={cust.id}>
                {/* Group header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-0.5 h-4 bg-primary rounded-full" />
                  <span className="font-bold text-[11px] text-slate-500 uppercase tracking-widest">{cust.name}</span>
                  {Number(cust.minSelect) === 1 ? (
                    <span className="text-[8px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide border border-red-100">
                      Required
                    </span>
                  ) : (
                    <span className="text-[8px] bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide border border-slate-100">
                      Optional
                    </span>
                  )}
                </div>

                {/* Options list */}
                <div className="rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-50 shadow-sm">
                  {cust.type === 'SINGLE' ? (
                    <RadioGroup
                      value={selectedOptions[cust.id] as string}
                      onValueChange={(value) => handleSingleSelectChange(cust.id, value)}
                    >
                      {cust.options.map(opt => {
                        const isSelected = selectedOptions[cust.id] === opt.id;
                        const displayPrice = isDiscountActive ? opt.price : (opt.originalPrice || opt.price);
                        const hasOptDiscount = isDiscountActive && opt.originalPrice && opt.originalPrice > opt.price;
                        const discountPct = hasOptDiscount
                          ? Math.round(((opt.originalPrice! - opt.price) / opt.originalPrice!) * 100)
                          : 0;
                        const isMandatory = Number(cust.minSelect) === 1;

                        const isAvailable = opt.isAvailable !== false && (opt.stock === null || opt.stock === undefined || isNaN(opt.stock as number) || opt.stock > 0);

                        return (
                          <div
                            key={opt.id}
                            className={cn(
                              "flex items-center justify-between px-3 py-2.5 transition-all",
                              isSelected
                                ? "bg-primary/5 border-l-2 border-l-primary"
                                : "bg-white hover:bg-slate-50/80 border-l-2 border-l-transparent",
                              !isAvailable ? "opacity-50 cursor-not-allowed grayscale-[0.5]" : "cursor-pointer"
                            )}
                            onClick={() => isAvailable && handleSingleSelectChange(cust.id, opt.id)}
                          >
                            {/* Left: indicator + name */}
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={cn(
                                "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                                isSelected ? "border-primary bg-primary" : "border-slate-300"
                              )}>
                                {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <Label className={cn(
                                  "font-medium text-sm text-slate-700 truncate",
                                  !isAvailable && "text-slate-400"
                                )}>
                                  {opt.name}
                                </Label>
                                 {!isAvailable ? (
                                  <span className="text-[8px] font-bold text-red-500 uppercase tracking-tight">Out of Stock</span>
                                ) : (
                                  typeof opt.stock === 'number' && (vendor?.isInventory || vendor?.category === 'Bakery' || opt.stock <= 10) && (
                                    <span className={cn(
                                        "text-[8px] font-bold uppercase tracking-tight",
                                        opt.stock <= 5 ? "text-destructive" : "text-amber-500"
                                    )}>
                                        {opt.stock} left
                                    </span>
                                  )
                                )}
                              </div>
                            </div>

                            {/* Right: price + discount */}
                            <div className="flex flex-col items-end flex-shrink-0 ml-2">
                              <div className="flex items-center gap-1.5">
                                {hasOptDiscount && (
                                  <span className="text-[9px] font-bold text-white bg-red-500 px-1 py-0.5 rounded-full leading-none">
                                    {discountPct}% OFF
                                  </span>
                                )}
                                {hasOptDiscount && (
                                  <span className="text-[10px] text-slate-400 line-through decoration-[1.5px] leading-none">
                                    {isMandatory ? '' : '+'}{opt.originalPrice!.toFixed(0)}
                                  </span>
                                )}
                                <span className={cn(
                                  "font-bold text-xs",
                                  isSelected ? "text-primary" : (hasOptDiscount ? "text-red-500" : "text-slate-600")
                                )}>
                                  ₹{displayPrice.toFixed(0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  ) : (
                    <>
                      {cust.options.map(opt => {
                        const isSelected = (selectedOptions[cust.id] as string[] || []).includes(opt.id);
                        const displayPrice = isDiscountActive ? opt.price : (opt.originalPrice || opt.price);
                        const hasOptDiscount = isDiscountActive && opt.originalPrice && opt.originalPrice > opt.price;
                        const discountPct = hasOptDiscount
                          ? Math.round(((opt.originalPrice! - opt.price) / opt.originalPrice!) * 100)
                          : 0;
                        const isMandatory = Number(cust.minSelect) === 1;

                        const isAvailable = opt.isAvailable !== false && (opt.stock === null || opt.stock === undefined || isNaN(opt.stock as number) || opt.stock > 0);

                        return (
                          <div
                            key={opt.id}
                            className={cn(
                              "flex items-center justify-between px-3 py-2.5 transition-all",
                              isSelected
                                ? "bg-primary/5 border-l-2 border-l-primary"
                                : "bg-white hover:bg-slate-50/80 border-l-2 border-l-transparent",
                              !isAvailable ? "opacity-50 cursor-not-allowed grayscale-[0.5]" : "cursor-pointer"
                            )}
                            onClick={() => isAvailable && handleMultiSelectChange(cust.id, opt.id, !isSelected)}
                          >
                            {/* Left: checkbox + name */}
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={cn(
                                "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all",
                                isSelected ? "border-primary bg-primary" : "border-slate-300"
                              )}>
                                {isSelected && <X className="h-2.5 w-2.5 text-white stroke-[4]" />}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <Label className={cn(
                                  "font-medium text-sm text-slate-700 truncate",
                                  !isAvailable && "text-slate-400"
                                )}>
                                  {opt.name}
                                </Label>
                                {!isAvailable ? (
                                  <span className="text-[8px] font-bold text-red-500 uppercase tracking-tight">Out of Stock</span>
                                ) : (
                                  typeof opt.stock === 'number' && (vendor?.isInventory || vendor?.category === 'Bakery' || opt.stock <= 10) && (
                                    <span className={cn(
                                        "text-[8px] font-bold uppercase tracking-tight",
                                        opt.stock <= 5 ? "text-destructive" : "text-amber-500"
                                    )}>
                                        {opt.stock} left
                                    </span>
                                  )
                                )}
                              </div>
                            </div>

                            {/* Right: price + discount */}
                            <div className="flex flex-col items-end flex-shrink-0 ml-2">
                              <div className="flex items-center gap-1.5">
                                {hasOptDiscount && (
                                  <span className="text-[9px] font-bold text-white bg-red-500 px-1 py-0.5 rounded-full leading-none">
                                    {discountPct}% OFF
                                  </span>
                                )}
                                {hasOptDiscount && (
                                  <span className="text-[10px] text-slate-400 line-through decoration-[1.5px] leading-none">
                                    +{opt.originalPrice!.toFixed(0)}
                                  </span>
                                )}
                                <span className={cn(
                                  "font-bold text-xs",
                                  isSelected ? "text-primary" : (hasOptDiscount ? "text-red-500" : "text-slate-600")
                                )}>
                                  +₹{displayPrice.toFixed(0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <SheetFooter className="px-4 py-3 bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgb(0,0,0,0.06)] sticky bottom-0 z-10">
          <div className="w-full flex items-center gap-3">
            {/* Quantity stepper */}
            <div className="flex items-center bg-slate-50 rounded-xl p-0.5 border border-slate-100 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-white transition-colors"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
              >
                <Minus className="h-3 w-3 text-slate-500" />
              </Button>
              <span className="font-bold text-sm w-7 text-center text-slate-700">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-white transition-colors"
                onClick={() => setQuantity(q => q + 1)}
              >
                <Plus className="h-3 w-3 text-slate-500" />
              </Button>
            </div>

            {/* Add to order CTA */}
            <Button
              size="lg"
              className="flex-1 h-12 rounded-xl font-bold text-sm shadow-md shadow-primary/20 group relative overflow-hidden"
              onClick={handleAddToOrder}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col items-start leading-tight">
                  {hasSaving && (
                    <span className="text-[9px] opacity-60 line-through decoration-[1.5px]">
                      ₹{totalOriginalPrice.toFixed(0)}
                    </span>
                  )}
                  <span className="text-sm font-extrabold leading-none">₹{totalPrice.toFixed(0)}</span>
                  {hasSaving && (
                    <span className="text-[9px] text-green-300 font-semibold leading-none mt-0.5">
                      Save ₹{(totalOriginalPrice - totalPrice).toFixed(0)} 🎉
                    </span>
                  )}
                </div>
                <span className="flex items-center gap-1.5 group-active:scale-95 transition-transform">
                  Add to Order
                  <ShoppingBag className="h-4 w-4" />
                </span>
              </div>
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
