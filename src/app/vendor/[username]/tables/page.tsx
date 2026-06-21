'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import {
  Loader2,
  PlusCircle,
  Trash2,
  Utensils,
  X,
  Check,
  Minus,
  Plus,
  IndianRupee,
  Receipt,
  Search,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Ban,
  Building,
  User,
  Phone,
  MapPin,
  Package,
  QrCode,
  Download,
  RefreshCw,
} from 'lucide-react';
import { useVendor } from '@/context/vendor-context';
import { useOrder } from '@/context/order-context';
import type { Vendor, Order, MenuItem, Category, OrderStatus } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import ConfirmationDialog from '@/components/confirmation-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format, isToday, parseISO } from 'date-fns';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDelivery } from '@/context/delivery-context';
import CancellationReasonDialog from '@/components/cancellation-reason-dialog';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { createSlug } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { collection, query, where, onSnapshot, getDocs, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { isItemInStock } from '@/lib/vendorStatusManager';
import OrderCustomizationSheet from '@/components/order-customization-sheet';


const statusColors: Record<OrderStatus, string> = {
  'Order Placed': 'bg-blue-500',
  'Accepted': 'bg-cyan-500',
  'Processing': 'bg-yellow-500',
  'Out for Delivery': 'bg-orange-500',
  'Delivered': 'bg-green-500',
  'Cancelled': 'bg-red-500',
  'Order Ready': 'bg-teal-500',
  'Picked Up': 'bg-green-500',
};


const playSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (!audioContext) return;

    const playTone = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(frequency, startTime);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);

      oscillator.start(startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.00001, startTime + duration);
      oscillator.stop(startTime + duration);
    }

    const now = audioContext.currentTime;
    playTone(880, now, 0.15);
    playTone(880, now + 0.2, 0.15);

  } catch (e) {
    console.error("Could not play sound", e);
  }
};

const generateCartItemId = (itemId: string, options: Record<string, string | string[]>) => {
  const optionKeys = Object.keys(options || {}).sort();
  const optionString = optionKeys.map(key => {
    const value = options[key];
    return `${key}:${Array.isArray(value) ? value.sort().join(',') : value}`;
  }).join('|');
  // Only add a hyphen if there are options, preventing a trailing hyphen
  return optionString ? `${itemId}-${optionString}` : itemId;
};

const getCustomizationsText = (item: any): string | null => {
  if (Array.isArray(item.customizations) && item.customizations.length > 0) {
    const customizationDetails = item.customizationDetails;
    if (customizationDetails && Object.keys(customizationDetails).length > 0) {
      const selectedTexts: string[] = [];
      item.customizations.forEach((group: any) => {
        const selectedValue = customizationDetails[group.id];
        if (!selectedValue) return;
        const selectedIds = Array.isArray(selectedValue) ? selectedValue : [selectedValue];
        const filteredOptions = group.options.filter((opt: any) => selectedIds.includes(opt.id));
        if (filteredOptions.length > 0) {
          const optionNames = filteredOptions.map((opt: any) => opt.name).join(', ');
          selectedTexts.push(`${group.name}: ${optionNames}`);
        }
      });
      if (selectedTexts.length > 0) {
        return selectedTexts.join(', ');
      }
      return Object.entries(customizationDetails)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join(', ');
    } else {
      return item.customizations
        .map((group: any) => {
          const optionNames = group.options.map((opt: any) => opt.name).join(', ');
          return `${group.name}: ${optionNames}`;
        })
        .join(', ');
    }
  }

  if (item.customizationDetails && Object.keys(item.customizationDetails).length > 0) {
    return Object.entries(item.customizationDetails)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join(', ');
  }

  return null;
};

type SelectedItem = {
  cartItemId: string;
  menuItem: MenuItem;
  quantity: number;
  customizationDetails: Record<string, string | string[]>;
  price: number;
};

const AddItemDialog = ({
  open,
  onOpenChange,
  onAddItems,
  menuItems,
  categories,
  vendor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddItems: (items: { menuItem: MenuItem; quantity: number, customizationDetails?: Record<string, string | string[]>, price?: number }[]) => void;
  menuItems: MenuItem[];
  categories: string[];
  vendor?: Vendor | null;
}) => {
  const [selectedCategory, setSelectedCategory] = useState(categories[0] || 'All');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedItems([]);
      setSelectedCategory(categories[0] || 'All');
      setSearchQuery('');
      setCustomizingItem(null);
    }
  }, [open, categories]);

  const filteredMenuItems = useMemo(() => {
    let items = menuItems.filter(
      (item) => isItemInStock(item, vendor?.isInventory)
    );

    if (searchQuery.trim()) {
      const lowercasedQuery = searchQuery.toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(lowercasedQuery)
      );
    } else if (selectedCategory !== 'All') {
      items = items.filter(item => item.category === selectedCategory);
    }

    return items;
  }, [menuItems, selectedCategory, searchQuery]);

  const handleSimpleQuantityChange = (menuItem: MenuItem, change: number | string) => {
    setSelectedItems(prev => {
      const existingIndex = prev.findIndex(i => i.menuItem.id === menuItem.id && Object.keys(i.customizationDetails).length === 0);

      let newQuantity = 0;
      if (typeof change === 'number') {
        const currentQuantity = existingIndex >= 0 ? prev[existingIndex].quantity : 0;
        newQuantity = Math.max(0, currentQuantity + change);
      } else {
        if (change === '') {
          return existingIndex >= 0 ? prev.filter((_, idx) => idx !== existingIndex) : prev;
        }
        newQuantity = parseInt(change, 10);
        if (isNaN(newQuantity) || newQuantity < 0) return prev;
      }

      if (newQuantity === 0) {
        return existingIndex >= 0 ? prev.filter((_, idx) => idx !== existingIndex) : prev;
      }

      if (existingIndex >= 0) {
        const newArr = [...prev];
        newArr[existingIndex].quantity = newQuantity;
        return newArr;
      } else {
        const price = menuItem.isDiscountActive && menuItem.discountPrice ? menuItem.discountPrice : menuItem.price;
        return [...prev, {
          cartItemId: Math.random().toString(),
          menuItem,
          quantity: newQuantity,
          customizationDetails: {},
          price
        }];
      }
    });
  };

  const handleCustomizedAdd = (menuItem: MenuItem, selectedOptions: Record<string, string | string[]>, quantity: number) => {
    const hasMandatoryCustomization = menuItem.customizations?.some(c => Number(c.minSelect) === 1) ?? false;
    const basePrice = hasMandatoryCustomization ? 0 : (menuItem.isDiscountActive && menuItem.discountPrice && menuItem.discountPrice > 0 ? menuItem.discountPrice : menuItem.price);

    let totalPrice = basePrice;
    Object.entries(selectedOptions).forEach(([customizationId, selected]) => {
      const customization = menuItem.customizations?.find(c => c.id === customizationId);
      if (!customization) return;

      if (Array.isArray(selected)) {
        selected.forEach(optionId => {
          const option = customization.options.find(o => o.id === optionId);
          if (option) {
            totalPrice += (menuItem.isDiscountActive ? option.price : (option.originalPrice || option.price));
          }
        });
      } else {
        const option = customization.options.find(o => o.id === selected);
        if (option) {
          totalPrice += (menuItem.isDiscountActive ? option.price : (option.originalPrice || option.price));
        }
      }
    });

    setSelectedItems(prev => [...prev, {
      cartItemId: Math.random().toString(),
      menuItem,
      quantity,
      customizationDetails: selectedOptions,
      price: totalPrice
    }]);
  };

  const handleRemoveSelectedItem = (cartItemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const handleCategoryClick = (category: string) => {
    setSearchQuery('');
    setSelectedCategory(category);
  }

  const handleAddClick = () => {
    if (selectedItems.length > 0) {
      onAddItems(selectedItems);
    }
    onOpenChange(false);
  };

  const summaryTotal = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [selectedItems]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-3xl h-[90vh] flex flex-col p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Add Items to Table</DialogTitle>
          </DialogHeader>
          <div className="flex-grow overflow-hidden flex flex-col pt-4 px-2 sm:px-6">
            <div className="relative mb-2 flex-shrink-0 mx-2 pr-8">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
            <Tabs value={selectedCategory} onValueChange={handleCategoryClick} className="h-full flex flex-col flex-1 overflow-hidden mt-2">
              <div className="flex-shrink-0 w-full overflow-x-auto hide-scrollbar group">
                <div className="flex w-max animate-scroll hover:animation-pause">
                  <TabsList className="bg-transparent p-0">
                    {['All', ...categories].map((cat) => (
                      <TabsTrigger key={`${cat}-1`} value={cat} className="rounded-full shrink-0">
                        {cat}
                      </TabsTrigger>
                    ))}
                    {['All', ...categories].map((cat) => (
                      <TabsTrigger key={`${cat}-2`} value={cat} className="rounded-full shrink-0" aria-hidden="true">
                        {cat}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
              </div>
              <ScrollArea className="flex-grow mt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 pr-4">
                  {filteredMenuItems.length > 0 ? filteredMenuItems.map((item) => {
                    const isCustomizable = item.customizations && item.customizations.length > 0;
                    const simpleQuantity = isCustomizable ? 0 : (selectedItems.find(i => i.menuItem.id === item.id && Object.keys(i.customizationDetails).length === 0)?.quantity || 0);

                    const hasMandatoryOptions = item.customizations?.some(c => Number(c.minSelect) > 0) ?? false;
                    let startingPrice = 0;

                    if (!isCustomizable) {
                      startingPrice = item.isDiscountActive && item.discountPrice ? item.discountPrice : item.price;
                    } else {
                      const basePrice = hasMandatoryOptions ? 0 : (item.isDiscountActive && item.discountPrice ? item.discountPrice : item.price);

                      let mandatoryCustomizationsPrice = 0;
                      item.customizations?.forEach(c => {
                        if (Number(c.minSelect) > 0) {
                          const groupMinOptionPrice = Math.min(...c.options.map(o => {
                            return item.isDiscountActive ? o.price : (o.originalPrice || o.price);
                          }));
                          if (groupMinOptionPrice !== Infinity) {
                            mandatoryCustomizationsPrice += groupMinOptionPrice;
                          }
                        }
                      });

                      const calculatedPrice = basePrice + mandatoryCustomizationsPrice;

                      if (calculatedPrice === 0) {
                        let minOptPrice = Infinity;
                        item.customizations?.forEach(group => {
                          group.options.forEach(o => {
                            const optPrice = item.isDiscountActive ? o.price : (o.originalPrice || o.price);
                            if (optPrice < minOptPrice) {
                              minOptPrice = optPrice;
                            }
                          });
                        });
                        if (minOptPrice !== Infinity) {
                          startingPrice = minOptPrice;
                        } else {
                          startingPrice = calculatedPrice;
                        }
                      } else {
                        startingPrice = calculatedPrice;
                      }
                    }

                    return (
                      <div key={item.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isCustomizable ? 'Starts at ' : ''}
                            ₹{startingPrice.toFixed(2)}
                          </p>
                          {typeof item.stock === 'number' && !isCustomizable && (vendor?.isInventory || vendor?.category === 'Bakery' || item.stock <= 5) && (
                            <p className={cn(
                              "text-xs font-semibold mt-1",
                              item.stock <= 5 ? "text-destructive" : "text-amber-500"
                            )}>
                              {item.stock} left
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {isCustomizable ? (
                            <Button size="sm" variant="outline" className="h-7 rounded-full px-3 text-xs" onClick={() => setCustomizingItem(item)}>
                              Customize
                            </Button>
                          ) : (
                            <>
                              <Button variant="outline" size="icon" className="h-7 w-7 rounded-full" onClick={() => handleSimpleQuantityChange(item, -1)}><Minus className="h-4 w-4" /></Button>
                              <Input
                                type="number"
                                value={simpleQuantity || 0}
                                onChange={(e) => handleSimpleQuantityChange(item, e.target.value)}
                                className="h-7 w-12 rounded-full text-center p-0 border-input"
                                onWheel={e => (e.target as HTMLElement).blur()}
                              />
                              <Button variant="outline" size="icon" className="h-7 w-7 rounded-full" onClick={() => handleSimpleQuantityChange(item, 1)}><Plus className="h-4 w-4" /></Button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  }) : (
                    <div className="text-center py-8 text-muted-foreground md:col-span-2">No items found.</div>
                  )}
                </div>
              </ScrollArea>
            </Tabs>
          </div>

          <DialogFooter className="p-6">
            <Collapsible className="w-full">
              <div className="flex justify-between items-center">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className={cn("flex items-center gap-2", selectedItems.length === 0 && "invisible")}>
                    <ShoppingCart className="h-5 w-5" />
                    <span>{selectedItems.reduce((acc, item) => acc + item.quantity, 0)} Items</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <Button onClick={handleAddClick} disabled={selectedItems.length === 0}>
                  Add Items
                </Button>
              </div>
              <CollapsibleContent>
                <div className="mt-4 p-4 border rounded-2xl max-h-40 overflow-y-auto">
                  <h4 className="text-sm font-semibold mb-2">Selected Items</h4>
                  <div className="space-y-2 text-xs">
                    {selectedItems.map(item => (
                      <div key={item.cartItemId} className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">{item.quantity} x {item.menuItem.name}</div>
                          {(() => {
                            const custText = getCustomizationsText({
                              customizations: item.menuItem.customizations,
                              customizationDetails: item.customizationDetails
                            });
                            return custText ? (
                              <div className="text-[10px] text-muted-foreground mt-0.5 max-w-[200px] line-clamp-2 italic">
                                {custText}
                              </div>
                            ) : null;
                          })()}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono mt-0.5">₹{(item.price * item.quantity).toFixed(2)}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-destructive hover:bg-destructive hover:text-white" onClick={() => handleRemoveSelectedItem(item.cartItemId)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {summaryTotal > 0 && (
                    <>
                      <Separator className="my-2" />
                      <div className="flex justify-between font-bold text-sm">
                        <span>Total</span>
                        <span className="font-mono">₹{summaryTotal.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <OrderCustomizationSheet
        item={customizingItem}
        open={!!customizingItem}
        onOpenChange={(open) => !open && setCustomizingItem(null)}
        onAdd={(item, options, quantity) => {
          handleCustomizedAdd(item, options, quantity);
          setCustomizingItem(null);
        }}
        vendor={vendor}
      />
    </>
  );
};


const QrCodeDialog = ({ order, vendor, open, onOpenChange }: { order: Order | null, vendor: Vendor | null, open: boolean, onOpenChange: (open: boolean) => void }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    if (open && vendor?.upiId && order) {
      const cleanUpiId = vendor.upiId.trim();
      const orderIdentifier = order.displayId || order.orderId;
      const transactionNote = `Order ${orderIdentifier}`;
      const upiString = `upi://pay?pa=${cleanUpiId}&pn=${encodeURIComponent(vendor.shopName || vendor.name)}&am=${order.totalPrice.toFixed(2)}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
      QRCode.toDataURL(upiString, { width: 256 })
        .then(url => {
          setQrCodeUrl(url);
        })
        .catch(err => {
          console.error('QR code generation failed:', err);
        });
    }
    if (!open) {
      setQrCodeUrl(''); // Reset QR code on close
    }
  }, [open, order, vendor]);

  if (!open || !order || !vendor?.upiId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center">Scan to Pay</DialogTitle>
          <DialogDescription className="text-center">
            <span className="font-bold text-lg text-foreground">₹{order.totalPrice.toFixed(2)}</span><br />
            to {vendor.shopName}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-4 gap-4">
          {qrCodeUrl ? (
            <Image src={qrCodeUrl} alt={`QR Code for Order #${order.displayId || order.orderId}`} width={256} height={256} />
          ) : (
            <p>Generating QR code...</p>
          )}
          <p className="text-xs text-muted-foreground text-center">Long press the QR code on your phone to pay.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const BillViewDialog = ({
  order,
  vendor,
  open,
  onOpenChange,
  onComplete,
}: {
  order: Order | null;
  vendor: Vendor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (orderId: string, takeAwayIdentifier?: string) => void;
}) => {
  if (!order || !vendor) return null;

  const generatePdfReceipt = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(vendor.shopName || 'Receipt', pageWidth / 2, 20, { align: 'center' });

    if (vendor.address) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(vendor.address, pageWidth / 2, 26, { align: 'center' });
    }

    doc.setFontSize(10);
    doc.text(`Order: #${order.displayId}`, 15, 35);
    doc.text(`Date: ${format(new Date(order.createdAt), 'dd/MM/yyyy hh:mm a')}`, pageWidth - 15, 35, { align: 'right' });

    doc.line(15, 40, pageWidth - 15, 40);

    // Table
    autoTable(doc, {
      startY: 42,
      head: [['Qty', 'Item', 'Price']],
      body: order.items.map(item => {
        const custText = getCustomizationsText(item);
        const itemName = custText ? `${item.name}\n(${custText})` : item.name;
        return [
          item.quantity.toString(),
          itemName,
          `Rs. ${(item.price * item.quantity).toFixed(2)}`
        ];
      }),
      theme: 'grid',
      headStyles: { fontStyle: 'bold', fillColor: [30, 144, 255] },
      columnStyles: {
        0: { halign: 'right', cellWidth: 15 },
        1: { halign: 'left' },
        2: { halign: 'right', cellWidth: 30 }
      },
      didDrawPage: (data) => {
        // You can add page numbers or other content on each page if needed
      }
    });

    // Total
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.line(15, finalY + 5, pageWidth - 15, finalY + 5);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', 15, finalY + 12);
    doc.text(`${order.totalPrice.toFixed(2)}`, pageWidth - 15, finalY + 12, { align: 'right' });

    // Footer
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for your visit!', pageWidth / 2, finalY + 22, { align: 'center' });

    doc.save(`receipt-${order.displayId}.pdf`);
  };

  const takeAwayIdentifier = order.customer.name.startsWith('Take Away') ? order.customer.name : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm sm:rounded-2xl">
        <DialogHeader className="text-center">
          <DialogTitle className="font-bold text-lg">{vendor.shopName}</DialogTitle>
          {vendor.address && <DialogDescription className="text-xs">{vendor.address}</DialogDescription>}
          <Separator className="my-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Order: #{order.displayId}</span>
            <span>{format(new Date(order.createdAt), 'dd/MM/yy hh:mm a')}</span>
          </div>
        </DialogHeader>

        <div className="max-h-60 overflow-y-auto pr-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left font-semibold pb-1 w-10">Qty</th>
                <th className="text-left font-semibold pb-1">Item</th>
                <th className="text-right font-semibold pb-1">Price</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => {
                const custText = getCustomizationsText(item);
                return (
                  <tr key={index} className="border-b last:border-none">
                    <td className="py-1 text-center align-top">{item.quantity}</td>
                    <td className="py-1">
                      <div>{item.name}</div>
                      {custText && <div className="text-[10px] text-muted-foreground italic">{custText}</div>}
                    </td>
                    <td className="text-right align-top">₹{(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Separator className="my-2" />

        <div className="flex justify-between items-center font-bold text-lg">
          <span>TOTAL</span>
          <span>₹{order.totalPrice.toFixed(2)}</span>
        </div>

        <p className="text-xs text-center text-muted-foreground">Thank you for your visit!</p>

        <DialogFooter className="mt-2 flex-row justify-center gap-2">
          <Button onClick={generatePdfReceipt} variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => onComplete(order.orderId, takeAwayIdentifier)}
            className="w-full flex-1 text-white bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600"
          >
            <Check className="mr-2 h-4 w-4" />
            Complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CustomerOrderCard = ({
  order,
  vendor,
  onStatusChange,
  onShowQrCode,
}: {
  order: Order;
  vendor?: Vendor | null;
  onStatusChange: (order: Order, status: OrderStatus, reason?: string) => void;
  onShowQrCode: (order: Order) => void;
}) => {
  const { deliveryTeam } = useDelivery();
  const { assignDeliveryBoyToOrder } = useOrder();

  const getStatusOptions = (deliveryOption: Order['deliveryOption']): OrderStatus[] => {
    switch (deliveryOption) {
      case 'Self Pickup': return ['Order Placed', 'Accepted', 'Order Ready', 'Picked Up', 'Cancelled'];
      case 'Home Delivery':
      default:
        return ['Order Placed', 'Accepted', 'Processing', 'Out for Delivery', 'Delivered', 'Cancelled'];
    }
  }

  return (
    <Card className="border-purple-500/20 rounded-2xl w-full">
      <CardHeader className="flex flex-row items-start justify-between gap-4 p-4">
        <div>
          <CardTitle className="text-lg">Order #{order.displayId}</CardTitle>
          <p className="text-xs text-muted-foreground">{format(new Date(order.createdAt), 'hh:mm a')}</p>
        </div>
        <p className="text-lg font-bold text-primary">₹{order.totalPrice.toFixed(2)}</p>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /> {order.customer.name}</div>
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {order.customer.address}</div>
          <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {order.customer.contact}</div>
        </div>
        <Separator className="my-3" />
        <div className="space-y-1">
          {order.items.map((item, index) => {
            const custText = getCustomizationsText(item);
            return (
              <div key={item.cartItemId || index} className="flex flex-col py-0.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{item.quantity}x {item.name}</span>
                  <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
                {custText && (
                  <span className="text-[10px] text-muted-foreground pl-1 italic">
                    {custText}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="p-4 flex flex-col gap-2">
        <div className="flex w-full items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => onShowQrCode(order)} disabled={!vendor?.upiId}>
            <QrCode className="h-4 w-4" />
          </Button>
          <Select
            value={order.status}
            onValueChange={(value: OrderStatus) => onStatusChange(order, value)}
          >
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full', statusColors[order.status])} />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {getStatusOptions(order.deliveryOption).map(status => (
                <SelectItem key={status} value={status}>
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', statusColors[status])} />
                    {status}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {order.deliveryOption === 'Home Delivery' && (
          <Select
            value={order.assignedDeliveryBoyId}
            onValueChange={(deliveryBoyId: string) => assignDeliveryBoyToOrder(order.orderId, deliveryBoyId, deliveryTeam)}
            disabled={deliveryTeam.length === 0}
          >
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4" />
                <SelectValue placeholder="Assign Delivery" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned" disabled>Unassigned</SelectItem>
              {deliveryTeam.map(boy => (
                <SelectItem key={boy.id} value={boy.id}>{boy.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardFooter>
    </Card>
  )
}

const TableCard = ({
  tableNumber,
  order,
  onAddItem,
  onViewBill,
  onShowQrCode,
  onItemQuantityChange,
  onRemoveItem,
}: {
  tableNumber: number | string;
  order: Order | null;
  onAddItem: (tableIdentifier: number | string) => void;
  onViewBill: (order: Order) => void;
  onShowQrCode: (order: Order) => void;
  onItemQuantityChange: (orderId: string, cartItemId: string, change: number) => void;
  onRemoveItem: (orderId: string, cartItemId: string) => void;
}) => {
  const isOccupied = !!order;
  const total = order?.totalPrice || 0;

  const isTakeAway = typeof tableNumber === 'string' && tableNumber.startsWith('Take Away');

  const cardClasses = cn(
    "w-full h-auto flex flex-col justify-between rounded-2xl transition-all",
    isTakeAway
      ? "bg-blue-500/10 border-blue-500/30"
      : (isOccupied ? "bg-red-500/10 border-red-500/30" : "bg-green-500/10 border-green-500/30")
  );

  const headerTextClasses = cn(
    "text-2xl font-bold flex items-center gap-2",
    isTakeAway
      ? "text-blue-600"
      : (isOccupied ? "text-red-600" : "text-green-600")
  );

  return (
    <Card className={cardClasses}>
      <CardHeader className="p-4 flex flex-row items-center justify-between">
        <span className={headerTextClasses}>
          <Utensils className="h-6 w-6" /> {tableNumber}
        </span>
        {isOccupied && <div className="font-bold text-lg text-foreground">₹{total.toFixed(2)}</div>}
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-grow">
        {isOccupied && order.items.length > 0 ? (
          <div className="text-xs text-muted-foreground space-y-1">
            {order.items.map((item, index) => {
              const custText = getCustomizationsText(item);
              return (
                <div key={item.cartItemId || index} className="flex flex-col py-1 border-b last:border-b-0 border-dashed">
                  <div className="flex justify-between items-center">
                    <span className="truncate pr-2 font-medium text-foreground">{item.quantity}x {item.name}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="outline" size="icon" className="h-5 w-5 rounded-full" onClick={() => onItemQuantityChange(order.orderId, item.cartItemId, -1)}><Minus className="h-3 w-3" /></Button>
                      <span className="w-4 text-center font-bold text-foreground">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-5 w-5 rounded-full" onClick={() => onItemQuantityChange(order.orderId, item.cartItemId, 1)}><Plus className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full" onClick={() => onRemoveItem(order.orderId, item.cartItemId)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  </div>
                  {custText && (
                    <span className="text-[10px] text-muted-foreground pl-1 italic">
                      {custText}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : !isTakeAway && (
          <p className="text-sm text-green-600">Available</p>
        )}
        {isTakeAway && !isOccupied && (
          <p className="text-sm text-blue-600">Ready for new order</p>
        )}
      </CardContent>
      <CardFooter className="p-2 bg-card/50 rounded-b-2xl flex-wrap justify-center gap-2">
        <Button className="flex-1" variant="outline" size="sm" onClick={() => onAddItem(tableNumber)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add
        </Button>
        {isOccupied && (
          <>
            <Button variant="outline" size="icon" onClick={() => onShowQrCode(order)}>
              <QrCode className="h-4 w-4" />
            </Button>
            <Button
              className="flex-1 text-white bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-[length:200%_auto] animate-gradient-move"
              size="sm"
              onClick={() => onViewBill(order)}
            >
              <IndianRupee className="mr-2 h-4 w-4" />
              Bill
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
};


export default function TableViewPage() {
  const params = useParams();
  const router = useRouter();
  const identifier = params.username as string;

  const { vendor: loggedInVendor, isAuthLoading: isVendorLoading, vendors, fetchAllVendors } = useVendor();
  const { addOrder, updateOrderItems, updateOrderStatus, removeOrder } = useOrder();
  const { toast } = useToast();

  const [vendorMenuItems, setVendorMenuItems] = useState<MenuItem[]>([]);
  const [allVendorOrders, setAllVendorOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [billOrder, setBillOrder] = useState<Order | null>(null);
  const [qrCodeOrder, setQrCodeOrder] = useState<Order | null>(null);
  const [addItemDialogState, setAddItemDialogState] = useState<{ open: boolean; tableNumber: number | string | null }>({ open: false, tableNumber: null });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [customerOrderToCancel, setCustomerOrderToCancel] = useState<Order | null>(null);
  const [todaysSales, setTodaysSales] = useState<number | null>(null);
  const [isFetchingSales, setIsFetchingSales] = useState(false);

  const vendor = useMemo(() => {
    return vendors.find(v => v.slug === identifier || v.username === identifier);
  }, [identifier, vendors]);

  const isPageVendorOwner = useMemo(() => {
    return loggedInVendor && vendor && loggedInVendor.username === vendor.username;
  }, [loggedInVendor, vendor]);

  useEffect(() => {
    if (vendors.length === 0) {
      fetchAllVendors();
    }
  }, [vendors, fetchAllVendors]);

  useEffect(() => {
    if (!isVendorLoading && !isPageVendorOwner) {
      const redirectUrl = encodeURIComponent(window.location.pathname);
      router.replace(`/admin/login?redirectUrl=${redirectUrl}`);
    }
  }, [isVendorLoading, isPageVendorOwner, router]);

  useEffect(() => {
    if (!vendor) {
      if (vendors.length > 0) setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const menuQuery = query(collection(db, 'menuItems'), where('vendorUsername', '==', vendor.username));
    const menuUnsubscribe = onSnapshot(menuQuery, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
      setVendorMenuItems(items);
    });

    const ordersQuery = query(collection(db, 'orders'), where('vendorUsername', '==', vendor.username));
    const ordersUnsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({ orderId: doc.id, ...doc.data() } as Order));
      setAllVendorOrders(fetchedOrders);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      toast({ title: 'Error', description: 'Could not fetch order data.', variant: 'destructive' });
      setIsLoading(false);
    });

    return () => {
      menuUnsubscribe();
      ordersUnsubscribe();
    };
  }, [vendor, vendors.length, toast]);

  const activeDineInOrders = useMemo(() => {
    if (!vendor) return [];
    return allVendorOrders.filter(o =>
      o.vendorUsername === vendor.username &&
      (o.deliveryOption === 'Dine-In' || o.deliveryOption === 'Self Pickup') &&
      o.status !== 'Delivered' && o.status !== 'Picked Up' &&
      o.status !== 'Cancelled'
    );
  }, [allVendorOrders, vendor]);

  const activeCustomerOrders = useMemo(() => {
    if (!vendor) return [];
    return allVendorOrders
      .filter(o =>
        o.vendorUsername === vendor.username &&
        (o.deliveryOption === 'Home Delivery' || (o.deliveryOption === 'Self Pickup' && !o.customer.name.startsWith("Take Away"))) &&
        o.status !== 'Delivered' && o.status !== 'Picked Up' && o.status !== 'Cancelled'
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [allVendorOrders, vendor]);

  const handleFetchTodaysSales = () => {
    if (!vendor) return;
    setIsFetchingSales(true);
    const completedToday = allVendorOrders.filter(o => {
      if (o.vendorUsername !== vendor.username) return false;
      if (o.status !== 'Delivered' && o.status !== 'Picked Up') return false;
      try {
        return isToday(parseISO(o.createdAt));
      } catch (e) {
        return false;
      }
    });
    const total = completedToday.reduce((sum, order) => sum + order.totalPrice, 0);
    setTimeout(() => { // Simulate fetch time
      setTodaysSales(total);
      setIsFetchingSales(false);
    }, 500);
  };

  const prevCustomerOrderCount = useRef(activeCustomerOrders.length);

  useEffect(() => {
    if (activeCustomerOrders.length > prevCustomerOrderCount.current) {
      playSound();
      setIsDrawerOpen(true);
    }
    prevCustomerOrderCount.current = activeCustomerOrders.length;
  }, [activeCustomerOrders]);

  const tableOrders = useMemo(() => {
    if (!vendor) return {};
    const tables: Record<string, Order | null> = {};
    const tableCount = vendor.dineInTables || 0;
    const takeAwayIdentifiers = ['Take Away'];

    for (let i = 1; i <= tableCount; i++) {
      const orderForTable = activeDineInOrders.find(o => o.customer.name === `Table ${i}`);
      tables[String(i)] = orderForTable || null;
    }
    for (const id of takeAwayIdentifiers) {
      const orderForTakeAway = activeDineInOrders.find(o => o.customer.name === id);
      tables[id] = orderForTakeAway || null;
    }
    return tables;
  }, [activeDineInOrders, vendor]);

  const vendorCategories = useMemo(() => {
    const cats = new Set(vendorMenuItems.map(item => item.category));
    return Array.from(cats);
  }, [vendorMenuItems]);

  const handleOpenAddItemDialog = (tableIdentifier: number | string) => {
    setAddItemDialogState({ open: true, tableNumber: tableIdentifier });
  };

  const handleItemQuantityChange = async (orderId: string, cartItemId: string, change: number) => {
    const order = activeDineInOrders.find(o => o.orderId === orderId);
    if (!order) return;

    const newItems = order.items.map(item => {
      if (item.cartItemId === cartItemId) {
        return { ...item, quantity: Math.max(0, item.quantity + change) };
      }
      return item;
    }).filter(item => item.quantity > 0);

    try {
      if (newItems.length > 0) {
        await updateOrderItems(orderId, newItems);
      } else {
        await updateOrderStatus(orderId, 'Cancelled', 'Vendor cleared all items from the table.');
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const onRemoveItem = async (orderId: string, cartItemId: string) => {
    const order = activeDineInOrders.find(o => o.orderId === orderId);
    if (!order) return;
    const newItems = order.items.filter(item => item.cartItemId !== cartItemId);
    try {
      if (newItems.length > 0) {
        await updateOrderItems(orderId, newItems);
      } else {
        await updateOrderStatus(orderId, 'Cancelled', 'Vendor cleared all items from the table.');
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  }

  const handleAddItemsToTable = async (itemsToAdd: { menuItem: MenuItem; quantity: number, customizationDetails?: Record<string, string | string[]>, price?: number }[]) => {
    if (!vendor || addItemDialogState.tableNumber === null) return;
    const tableIdentifier = String(addItemDialogState.tableNumber);
    const isTakeAway = tableIdentifier.startsWith('Take Away');
    const customerName = isTakeAway ? tableIdentifier : `Table ${tableIdentifier}`;
    const existingOrder = activeDineInOrders.find(o => o.customer.name === customerName);

    const cartItems = itemsToAdd.map(({ menuItem, quantity, customizationDetails, price }) => {
      const details = customizationDetails || {};
      const cartItemId = generateCartItemId(menuItem.id, details);
      return {
        ...menuItem,
        quantity,
        price: price ?? (menuItem.isDiscountActive && menuItem.discountPrice ? menuItem.discountPrice : menuItem.price),
        customizationDetails: details,
        cartItemId
      };
    });

    if (existingOrder) {
      const newItems = [...existingOrder.items];
      cartItems.forEach(cartItem => {
        const existingCartItemIndex = newItems.findIndex(i => {
          if (i.cartItemId && cartItem.cartItemId) {
            return i.cartItemId === cartItem.cartItemId;
          }
          const isSameItem = (i as any).menuItemId === cartItem.id || i.id === cartItem.id;
          const hasNoCust1 = !i.customizations || i.customizations.length === 0;
          const hasNoCust2 = !cartItem.customizationDetails || Object.keys(cartItem.customizationDetails).length === 0;
          return isSameItem && hasNoCust1 && hasNoCust2;
        });
        if (existingCartItemIndex > -1) {
          newItems[existingCartItemIndex].quantity += cartItem.quantity;
        } else {
          newItems.push(cartItem);
        }
      });

      try {
        await updateOrderItems(existingOrder.orderId, newItems);
        toast({ title: "Items Added", description: `Added items to ${customerName}.` });
      } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      }
    } else {
      try {
        await addOrder({
          cartItems: cartItems,
          customer: { username: vendor.username, name: customerName }, // use vendor username as customer for internal orders
          allVendors: [vendor],
          paymentMethod: 'Pay at Counter',
          deliveryOptions: { [vendor.username]: isTakeAway ? 'Self Pickup' : 'Dine-In' },
          tableId: isTakeAway ? undefined : String(tableIdentifier),
        });
        toast({ title: "Order Started", description: `${customerName} is now occupied.` });
      } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      }
    }
  };

  const handleCompleteOrder = async (orderId: string, takeAwayIdentifier?: string) => {
    try {
      await updateOrderStatus(orderId, 'Delivered');
      setBillOrder(null);
      toast({ title: "Order Completed", description: "The order has been marked as complete." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleCustomerStatusChange = (order: Order, newStatus: OrderStatus, reason?: string) => {
    if (newStatus === 'Cancelled') {
      setCustomerOrderToCancel(order);
    } else {
      updateOrderStatus(order.orderId, newStatus, reason);
    }
  };

  const handleCustomerCancellationConfirm = (reason: string) => {
    if (customerOrderToCancel) {
      updateOrderStatus(customerOrderToCancel.orderId, 'Cancelled', reason);
      setCustomerOrderToCancel(null);
    }
  };

  if (isLoading || isVendorLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!isPageVendorOwner) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <p>You are not authorized to view this page.</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p>Vendor not found.</p>
      </div>
    )
  }

  if (!vendor.canAcceptDineIn) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center p-6 bg-muted/50 rounded-2xl">
          <CardHeader>
            <div className="mx-auto bg-destructive/10 text-destructive rounded-full h-16 w-16 flex items-center justify-center">
              <Ban className="h-8 w-8" />
            </div>
            <CardTitle className="text-destructive mt-4">
              Dine-In Not Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              The Dine-In ordering feature for this vendor has been disabled by the administrator.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/admin/dashboard">
                Back to Dashboard
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const tableCount = vendor?.dineInTables || 0;
  const takeAwayTables = ['Take Away'];

  return (
    <div className="flex flex-col min-h-screen">
      <Header pageVendor={vendor} />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Collapsible open={isDrawerOpen} onOpenChange={setIsDrawerOpen} className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="rounded-full">
                <Package className="mr-2 h-4 w-4" />
                Active Customer Orders ({activeCustomerOrders.length})
                <ChevronDown className="ml-2 h-4 w-4 transition-transform data-[state=open]:rotate-180" />
              </Button>
            </CollapsibleTrigger>
            <div className="text-right">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                Today's Sales
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleFetchTodaysSales} disabled={isFetchingSales}>
                  {isFetchingSales ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </p>
              <p className="text-2xl font-bold text-green-600">
                {todaysSales !== null ? `₹${todaysSales.toFixed(2)}` : '₹--.--'}
              </p>
            </div>
          </div>
          <CollapsibleContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {activeCustomerOrders.length > 0 ? (
                activeCustomerOrders.map((order, index) => (
                  <CustomerOrderCard
                    key={order.orderId || index}
                    order={order}
                    vendor={vendor}
                    onStatusChange={handleCustomerStatusChange}
                    onShowQrCode={setQrCodeOrder}
                  />
                ))
              ) : (
                <p className="text-center text-muted-foreground col-span-full py-4">No active customer orders.</p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        <div className="text-center my-8">
          <h1 className="font-headline text-4xl text-primary">Dine-In Table View</h1>
          <p className="text-muted-foreground">{vendor?.shopName}</p>
        </div>

        {tableCount > 0 || takeAwayTables.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {Array.from({ length: tableCount }, (_, i) => i + 1).map((tableNum) => (
              <TableCard
                key={tableNum}
                tableNumber={tableNum}
                order={tableOrders[String(tableNum)] || null}
                onAddItem={handleOpenAddItemDialog}
                onViewBill={setBillOrder}
                onShowQrCode={setQrCodeOrder}
                onItemQuantityChange={handleItemQuantityChange}
                onRemoveItem={onRemoveItem}
              />
            ))}
            {takeAwayTables.map(id => (
              <TableCard
                key={id}
                tableNumber={id}
                order={tableOrders[id] || null}
                onAddItem={handleOpenAddItemDialog}
                onViewBill={setBillOrder}
                onShowQrCode={setQrCodeOrder}
                onItemQuantityChange={handleItemQuantityChange}
                onRemoveItem={onRemoveItem}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground">You have not configured any dine-in tables.</p>
            <Button variant="link" asChild><Link href="/admin/details">Go to settings to add tables</Link></Button>
          </div>
        )}
      </main>
      <BillViewDialog
        order={billOrder}
        vendor={vendor}
        open={!!billOrder}
        onOpenChange={() => setBillOrder(null)}
        onComplete={handleCompleteOrder}
      />
      <QrCodeDialog
        order={qrCodeOrder}
        vendor={vendor}
        open={!!qrCodeOrder}
        onOpenChange={() => setQrCodeOrder(null)}
      />
      <AddItemDialog
        open={addItemDialogState.open}
        onOpenChange={(open) => setAddItemDialogState({ ...addItemDialogState, open })}
        onAddItems={handleAddItemsToTable}
        menuItems={vendorMenuItems}
        categories={vendorCategories}
        vendor={vendor}
      />
      <CancellationReasonDialog
        isOpen={!!customerOrderToCancel}
        onOpenChange={() => setCustomerOrderToCancel(null)}
        onConfirm={handleCustomerCancellationConfirm}
      />
    </div>
  );
}
