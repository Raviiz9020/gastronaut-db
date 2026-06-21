'use client';

import type { SpecialMenu, Vendor, MenuItem as MenuItemType, Category } from '@/types';
import { VendorStatus } from '@/types';
import { VendorStatusManager, isItemInStock } from '@/lib/vendorStatusManager';
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/header';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import {
  Loader2,
  ArrowLeft,
  Utensils,
  Gift,
  Tag,
  Ban,
  Star,
  Plus,
  Minus,
  Clock,
  Download,
  Trash2,
  LogIn,
  ChevronDown,
  ChevronUp,
  Package as PackageIcon,
  Hand,
  Bike,
  Sparkles,
  Info,
  MapPin,
  Phone,
  Search,
  X,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useMenu } from '@/context/menu-context';
import { useOrder } from '@/context/order-context';
import OrderCustomizationSheet from '@/components/order-customization-sheet';
import { useCart } from '@/context/cart-context';
import CartSheet from '@/components/cart-sheet';
import { createSlug, cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, getDoc, doc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useVendor as useAppVendor } from '@/context/vendor-context';
import { Textarea } from '@/components/ui/textarea';


type TableOrderItem = MenuItemType & { quantity: number; finalPrice: number };

const ZoomedImageOverlay = ({
  item,
  onClose,
}: {
  item: { id: string; image: string; name: string } | null;
  onClose: () => void;
}) => {
  useEffect(() => {
    if (item) {
      const timer = setTimeout(() => {
        onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [item, onClose]);

  if (!item) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-80 h-80 sm:w-96 sm:h-96"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          className="relative w-full h-full rounded-full overflow-hidden shadow-2xl"
          layoutId={item.id}
        >
          <Image
            src={item.image || ''}
            alt={item.name}
            fill
            className="object-cover"
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

const MenuItemRow = ({
  item,
  onImageClick,
  onRowClick,
  prefix,
  itemRef,
  vendor,
}: {
  item: MenuItemType;
  onImageClick: (item: MenuItemType, layoutId: string) => void;
  onRowClick: (item: MenuItemType) => void;
  prefix: string;
  itemRef?: React.Ref<HTMLDivElement>;
  vendor?: Vendor | null;
}) => {
  const hasDiscount =
    !!(item.isDiscountActive && item.discountPrice && item.discountPrice > 0);
  
  const isCustomizable = item.customizations && item.customizations.length > 0;
  const hasMandatoryCustomization = item.customizations?.some(c => Number(c.minSelect) > 0) ?? false;

  const startingPrice = useMemo(() => {
    if (!isCustomizable) {
      return hasDiscount ? item.discountPrice! : item.price;
    }

    const basePrice = hasMandatoryCustomization ? 0 : (hasDiscount ? item.discountPrice! : item.price);

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
        return minOptPrice;
      }
    }

    return calculatedPrice;
  }, [item, isCustomizable, hasMandatoryCustomization, hasDiscount]);

  const displayPrice = startingPrice || 0;
  const layoutId = `${prefix}-${item.id}`;
  const imageToDisplay = item.imageDataUrl || item.image;
  const hasMandatoryVariants = item.customizations?.some(c => Number(c.minSelect) > 0) ?? false;
  const isEffectivelyInStock = isItemInStock(item, vendor?.isInventory);

  const shopStatus = useMemo(() => {
    return vendor ? VendorStatusManager.getShopStatus(vendor) : null;
  }, [vendor]);

  const isShopOpen = !shopStatus || shopStatus.status === VendorStatus.OPEN;
  const isItemEffectivelyAvailable = item.isAvailable && isShopOpen && isEffectivelyInStock;

  return (
    <div ref={itemRef} className={cn("flex items-start gap-3 py-3 rounded-full -mx-2 px-2 transition-colors duration-200 relative", isItemEffectivelyAvailable ? 'cursor-pointer hover:bg-muted/50' : 'opacity-50 grayscale cursor-not-allowed')} onClick={() => isItemEffectivelyAvailable && onRowClick(item)}>

      {!isItemEffectivelyAvailable && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-full">
          <p className="text-foreground font-bold text-sm text-center px-4">
            {!isShopOpen ? (shopStatus?.msg || 'Closed') : (!isEffectivelyInStock ? 'Out of Stock' : 'Not available')}
          </p>
        </div>
      )}

      <motion.div
        layoutId={layoutId}
        className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onImageClick(item, layoutId);
        }}
      >
        <Image
          src={imageToDisplay || 'https://placehold.co/100x100.png'}
          alt={item.name}
          fill
          className="object-cover"
          data-ai-hint={item.aiHint}
          placeholder={item.blurDataUrl ? 'blur' : 'empty'}
          blurDataURL={item.blurDataUrl}
        />
      </motion.div>
      <div className="flex-1">
        <h4 className="font-semibold text-sm sm:text-base">{item.name}</h4>
        <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
        <div className="flex justify-between items-center mt-2">
          <div>
            <p className="text-sm sm:text-base">
              {isCustomizable && <span className="text-[10px] block text-muted-foreground font-normal -mb-0.5">From</span>}
              ₹{displayPrice.toFixed(0)}
            </p>
            {hasDiscount && item.price > 0 && (
              <p className="text-xs text-muted-foreground line-through">
                ₹{item.price.toFixed(2)}
              </p>
            )}
            {typeof item.stock === 'number' && item.stock > 0 && !item.customizations?.length && (vendor?.isInventory || vendor?.category === 'Bakery' || item.stock <= 5) && (
              <p className={cn(
                "text-xs font-semibold mt-1",
                item.stock <= 5 ? "text-destructive" : "text-amber-600"
              )}>
                {item.stock} available
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const CombinedMenuItemRow = ({
  items,
  onImageClick,
  onRowClick,
  prefix,
  itemRef,
  vendor
}: {
  items: MenuItemType[];
  onImageClick: (item: MenuItemType, layoutId: string) => void;
  onRowClick: (items: MenuItemType[]) => void;
  prefix: string;
  itemRef?: React.Ref<HTMLDivElement>;
  vendor?: Vendor | null;
}) => {
  const primaryItem = items[0]; // Use the first item for common details
  const layoutId = `${prefix}-${primaryItem.id}`;
  const imageToDisplay = primaryItem.imageDataUrl || primaryItem.image;
  const baseName = primaryItem.name.replace(/\s+(full|half)$/i, '').trim();
  const shopStatus = useMemo(() => {
    return vendor ? VendorStatusManager.getShopStatus(vendor) : null;
  }, [vendor]);

  const isShopOpen = !shopStatus || shopStatus.status === VendorStatus.OPEN;

  const isEffectivelyAvailable = items.some(item => isItemInStock(item, vendor?.isInventory)) && isShopOpen;

  const halfPortion = items.find(item => item.name.toLowerCase().includes('half'));
  const fullPortion = items.find(item => item.name.toLowerCase().includes('full'));

  const halfPrice = halfPortion ? (halfPortion.isDiscountActive && halfPortion.discountPrice ? halfPortion.discountPrice : halfPortion.price) : null;
  const fullPrice = fullPortion ? (fullPortion.isDiscountActive && fullPortion.discountPrice ? fullPortion.discountPrice : fullPortion.price) : null;

  const halfStock = halfPortion?.stock;
  const fullStock = fullPortion?.stock;


  return (
    <div ref={itemRef} className={cn("flex items-start gap-3 py-3 rounded-full -mx-2 px-2 transition-colors duration-200 relative", !isEffectivelyAvailable ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer hover:bg-muted/50')} onClick={() => isEffectivelyAvailable && onRowClick(items)}>

      {!isEffectivelyAvailable && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-full">
          <p className="text-foreground font-bold text-sm text-center px-4">
            {!isShopOpen ? (shopStatus?.msg || 'Closed') : 'Out of Stock'}
          </p>
        </div>
      )}

      <motion.div
        layoutId={layoutId}
        className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onImageClick(primaryItem, layoutId);
        }}
      >
        <Image
          src={imageToDisplay || 'https://placehold.co/100x100.png'}
          alt={baseName}
          fill
          className="object-cover"
          data-ai-hint={primaryItem.aiHint}
          placeholder={primaryItem.blurDataUrl ? 'blur' : 'empty'}
          blurDataURL={primaryItem.blurDataUrl}
        />
      </motion.div>
      <div className="flex-1">
        <h4 className="font-semibold text-sm sm:text-base">{baseName}</h4>
        <p className="text-xs text-muted-foreground mt-1">{primaryItem.description}</p>
        <div className="flex justify-between items-center mt-2">
          <p className="text-sm sm:text-base">
            {halfPrice !== null && `Half: ₹${halfPrice.toFixed(0)}`}
            {halfPrice !== null && fullPrice !== null && ' / '}
            {fullPrice !== null && `Full: ₹${fullPrice.toFixed(0)}`}
          </p>
        </div>
        <div className="text-xs text-destructive font-semibold mt-1">
          {typeof halfStock === 'number' && halfStock > 0 && (vendor?.isInventory || vendor?.category === 'Bakery' || halfStock <= 5) && <span>{halfStock} half available. </span>}
          {typeof fullStock === 'number' && fullStock > 0 && (vendor?.isInventory || vendor?.category === 'Bakery' || fullStock <= 5) && <span>{fullStock} full available.</span>}
        </div>
      </div>
    </div>
  );
};


function VendorMenuContent({ categories }: { categories: Category[] }) {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const identifier = params.username as string;
  const targetItemId = searchParams.get('item');
  const orderIdToEdit = searchParams.get('edit_order');

  const { orders, updateOrderItems, addOrder } = useOrder();
  const { cartItems, addToCart, getCartItemCount } = useCart();
  const { vendor: loggedInVendor, vendors: allAppVendors, fetchAllVendors } = useAppVendor();

  const [vendorMenuItems, setVendorMenuItems] = useState<MenuItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [selectedItem, setSelectedItem] = useState<MenuItemType | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isTableOrderSheetVisible, setIsTableOrderSheetVisible] = useState(false);
  const [isTableOrderSheetMinimized, setIsTableOrderSheetMinimized] = useState(false);
  const [tableOrderItems, setTableOrderItems] = useState<TableOrderItem[]>([]);
  const [tableId, setTableId] = useState('');
  const [dineInNotes, setDineInNotes] = useState('');

  const [zoomedItem, setZoomedItem] = useState<{
    id: string;
    image: string;
    name: string;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [portionSelectItems, setPortionSelectItems] = useState<MenuItemType[] | null>(null);
  const [isPlacingTableOrder, setIsPlacingTableOrder] = useState(false);

  const [selfPickupDialogState, setSelfPickupDialogState] = useState<{
    open: boolean;
    item: MenuItemType | null;
    items: MenuItemType[] | null;
    selectedOptions: Record<string, string | string[]>;
    quantity: number;
  }>({ open: false, item: null, items: null, selectedOptions: {}, quantity: 1 });
  const [deliveryChoiceForPortionSelect, setDeliveryChoiceForPortionSelect] = useState<'yes' | 'no' | null>(null);

  const { toast } = useToast();

  const vendor = useMemo(() => {
    return allAppVendors.find(v => v.slug === identifier || v.username === identifier) || null;
  }, [identifier, allAppVendors]);

  const isVendorOwner = useMemo(() => {
    return !!(loggedInVendor && vendor && loggedInVendor.username === vendor.username);
  }, [loggedInVendor, vendor]);


  useEffect(() => {
    if (allAppVendors.length === 0) {
      fetchAllVendors();
    }
  }, [allAppVendors, fetchAllVendors]);


  // Effect to handle "Edit Order" mode
  useEffect(() => {
    if (orderIdToEdit) {
      const fetchOrder = async () => {
        const orderRef = doc(db, 'orders', orderIdToEdit);
        const orderSnap = await getDoc(orderRef);
        if (orderSnap.exists()) {
          const orderData = orderSnap.data();
          const itemsFromOrder: TableOrderItem[] = orderData.items.map((item: any) => ({
            ...item,
            finalPrice: item.price,
          }));
          setTableOrderItems(itemsFromOrder);
          setDineInNotes(orderData.customNotes || ''); // Load existing notes
          setIsTableOrderSheetVisible(true);
          setIsTableOrderSheetMinimized(false); // Ensure sheet is visible
        } else {
          toast({ title: "Order not found", variant: "destructive" });
          router.replace(`/vendor/${identifier}`);
        }
      };
      fetchOrder();
    }
  }, [orderIdToEdit, router, toast, identifier]);

  const handleTableOrderQuantityChange = (itemId: string, change: number) => {
    setTableOrderItems(prev => {
      const existingItem = prev.find(item => item.id === itemId);
      if (existingItem) {
        const newQuantity = existingItem.quantity + change;
        if (newQuantity <= 0) {
          return prev.filter(item => item.id !== itemId);
        }
        return prev.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item);
      }
      return prev;
    });
  };

  useEffect(() => {
    // Keep sheet open in edit mode unless manually closed
    if (orderIdToEdit) return;

    if (tableOrderItems.length === 0 && isTableOrderSheetVisible) {
      setIsTableOrderSheetVisible(false);
    }
  }, [tableOrderItems, isTableOrderSheetVisible, orderIdToEdit]);

  const handlePlaceOrUpdateOrder = async () => {
    if (!vendor || tableOrderItems.length === 0) return;
    setIsPlacingTableOrder(true);

    try {
      if (orderIdToEdit) {
        await updateOrderItems(orderIdToEdit, tableOrderItems as any, dineInNotes);
        router.push('/admin/dashboard/orders/live');
      } else {
        if (!tableId.trim()) {
          toast({ title: "Table number required", variant: "destructive" });
          setIsPlacingTableOrder(false);
          return;
        }

        const notesForOrder: Record<string, string> = {};
        if (dineInNotes.trim()) {
          notesForOrder[vendor.username] = dineInNotes.trim();
        }

        await addOrder({
          cartItems: tableOrderItems as any,
          customer: {},
          allVendors: [vendor],
          paymentMethod: 'Pay at Counter',
          deliveryOption: 'Dine-In',
          tableId: tableId,
          customNotes: notesForOrder,
        } as any);

        toast({ title: "Order Placed!", description: `Order for Table ${tableId} has been sent to the kitchen.` });
        setTableOrderItems([]);
        setTableId('');
        setDineInNotes('');
        setIsTableOrderSheetVisible(false);
        setIsTableOrderSheetMinimized(false);
      }
    } catch (e) {
      // Errors are toasted from the context
    } finally {
      setIsPlacingTableOrder(false);
    }
  };


  useEffect(() => {
    if (!vendor) {
      if (allAppVendors.length > 0) setLoading(false);
      return;
    };

    setLoading(true);

    const menuItemsRef = collection(db, 'menuItems');
    const menuQuery = query(menuItemsRef, where('vendorUsername', '==', vendor.username));

    const menuUnsubscribe = onSnapshot(menuQuery, (menuSnapshot) => {
      const items = menuSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItemType));
      setVendorMenuItems(items);
      setLoading(false);
    }, (error) => {
      console.error("Menu listener error:", error);
      setLoading(false);
    });

    return () => {
      menuUnsubscribe();
    };
  }, [vendor, allAppVendors]);

  useEffect(() => {
    if (targetItemId && vendorMenuItems.length > 0) {
      const itemElement = itemRefs.current[targetItemId];
      if (itemElement) {
        setTimeout(() => {
          const yOffset = -150; // Account for sticky header and category bar
          const y = itemElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }, 300);
      }
    }
  }, [targetItemId, vendorMenuItems]);

  const handleOpenCustomization = useCallback((item: MenuItemType) => {
    setSelectedItem(item);
  }, []);

  const handleAddToCartWithDialogCheck = (item: MenuItemType, selectedOptions = {}, quantity = 1, forceSelfPickup?: boolean) => {
    if (forceSelfPickup !== undefined) {
      addToCart(item, selectedOptions, quantity, forceSelfPickup);
      toast({ title: "Item Added!", description: `${quantity}x ${item.name} added to your cart.` });
      return;
    }

    const isSelfPickupVendor = vendor?.deliveryType === 'Self Pickup Only';
    const isFirstItemFromThisVendor = cartItems.every(cartItem => cartItem.vendorUsername !== item.vendorUsername);
    const isCartEmpty = cartItems.length === 0;

    if (isSelfPickupVendor && (isCartEmpty || isFirstItemFromThisVendor)) {
      setSelfPickupDialogState({ open: true, item, selectedOptions, quantity, items: null });
    } else {
      addToCart(item, selectedOptions, quantity);
      toast({ title: "Item Added!", description: `${quantity}x ${item.name} added to your cart.` });
    }
  };

  const handleSelfPickupDialogClose = (decision: 'yes' | 'no' | 'cancel') => {
    const { item, items, selectedOptions, quantity } = selfPickupDialogState;
    if (decision !== 'cancel') {
      const forceSelfPickup = decision === 'yes';
      if (item) {
        addToCart(item, selectedOptions, quantity, forceSelfPickup);
        toast({ title: "Item Added!", description: `${quantity}x ${item.name} added to your cart.` });
      } else if (items) {
        setDeliveryChoiceForPortionSelect(decision);
        setPortionSelectItems(items);
      }
    }
    setSelfPickupDialogState({ open: false, item: null, items: null, selectedOptions: {}, quantity: 1 });
  };


  const handleAddToTableOrder = useCallback((item: MenuItemType, quantity: number) => {
    const finalPrice = item.isDiscountActive && item.discountPrice ? item.discountPrice : item.price;
    setTableOrderItems(prevItems => {
      const existingItem = prevItems.find(i => i.id === item.id);
      if (existingItem) {
        return prevItems.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prevItems, { ...item, quantity, finalPrice }];
    });

    if (!isTableOrderSheetVisible) {
      setIsTableOrderSheetVisible(true);
    }
    // Always expand the sheet when a new item is added.
    setIsTableOrderSheetMinimized(false);
  }, [isTableOrderSheetVisible]);

  const handleItemRowClick = useCallback((item: MenuItemType) => {
    if (item.customizations && item.customizations.length > 0) {
      handleOpenCustomization(item);
      return;
    }

    if (isVendorOwner) {
      if (vendor?.canAcceptDineIn) {
        handleAddToTableOrder(item, 1);
      } else {
        toast({
          title: "Dine-In Disabled",
          description: "This feature has been disabled by the administrator.",
          variant: "destructive",
        });
      }
    } else {
      if (getCartItemCount(item.id) === 0) {
        handleAddToCartWithDialogCheck(item);
      }
    }
  }, [isVendorOwner, getCartItemCount, handleOpenCustomization, handleAddToTableOrder, toast, vendor]);

  const handleCombinedItemRowClick = useCallback((items: MenuItemType[]) => {
    const isSelfPickupVendor = vendor?.deliveryType === 'Self Pickup Only';
    const isFirstItemFromThisVendor = cartItems.every(cartItem => cartItem.vendorUsername !== items[0].vendorUsername);
    const isCartEmpty = cartItems.length === 0;

    if (isVendorOwner) {
      if (vendor?.canAcceptDineIn) {
        setPortionSelectItems(items);
      } else {
        toast({ title: "Dine-In Disabled", description: "This feature has been disabled by the administrator.", variant: "destructive" });
      }
    } else if (isSelfPickupVendor && (isCartEmpty || isFirstItemFromThisVendor)) {
      setSelfPickupDialogState({ open: true, items, item: null, selectedOptions: {}, quantity: 1 });
    } else {
      setPortionSelectItems(items);
    }
  }, [vendor, isVendorOwner, cartItems]);

  const handleCloseCustomization = useCallback((open: boolean) => {
    if (!open) {
      setSelectedItem(null);
    }
  }, []);

  const handleImageClick = (item: MenuItemType, layoutId: string) => {
    setZoomedItem({ id: layoutId, image: item.imageDataUrl || item.image, name: item.name });
  };

  const filteredMenuItems = useMemo(() => {
    if (!searchQuery) {
      return vendorMenuItems;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return vendorMenuItems.filter(item =>
      item.name.toLowerCase().includes(lowercasedQuery) ||
      item.description?.toLowerCase().includes(lowercasedQuery)
    );
  }, [vendorMenuItems, searchQuery]);

  const menuItemsByCategory = useMemo(() => {
    const getSortKey = (item: MenuItemType): string => {
      const lowerName = item.name.toLowerCase();
      if (lowerName.includes('rice')) return '0_rice';
      if (lowerName.includes('noodle')) return '1_noodles';
      if (lowerName.includes('soup')) return '2_soup';
      return '9_' + lowerName;
    };

    // Use filteredMenuItems here instead of vendorMenuItems
    const itemsToGroup = filteredMenuItems;

    // Group all items by category first
    const groupedByCategory = itemsToGroup.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, MenuItemType[]>);

    // Now, for each category, group by base name (for half/full) and sort the groups
    const finalGroupedStructure: Record<string, Array<MenuItemType[]>> = {};

    for (const category in groupedByCategory) {
      const itemsInCat = groupedByCategory[category];

      const groupedByName = itemsInCat.reduce((acc, item) => {
        const baseName = item.name.replace(/\s+(full|half)$/i, '').trim();
        if (!acc[baseName]) {
          acc[baseName] = [];
        }
        acc[baseName].push(item);
        return acc;
      }, {} as Record<string, MenuItemType[]>);

      const sortedGroups = Object.values(groupedByName).sort((groupA, groupB) => {
        const itemA = groupA[0];
        const itemB = groupB[0];

        // Primary sort: availability and stock
        const checkAvail = (item: MenuItemType) => isItemInStock(item, vendor?.isInventory);
        const aIsAvailable = checkAvail(itemA);
        const bIsAvailable = checkAvail(itemB);

        if (aIsAvailable && !bIsAvailable) return -1;
        if (!aIsAvailable && bIsAvailable) return 1;

        // Secondary sort: predefined keywords, then alphabetically
        const sortKeyA = getSortKey(itemA);
        const sortKeyB = getSortKey(itemB);
        if (sortKeyA !== sortKeyB) {
          return sortKeyA.localeCompare(itemA.name);
        }
        return itemA.name.localeCompare(itemB.name);
      });

      finalGroupedStructure[category] = sortedGroups;
    }

    return finalGroupedStructure;
  }, [filteredMenuItems]);

  const generatePdf = async () => {
    if (!vendor) return;

    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;

    const drawPageBorder = () => {
      doc.setDrawColor(101, 67, 33);
      doc.setLineWidth(1.5);
      doc.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin);

      doc.setDrawColor(184, 134, 11); // Golden color
      doc.setLineWidth(0.5);
      doc.rect(margin / 2 + 2, margin / 2 + 2, pageWidth - margin - 4, pageHeight - margin - 4);
    };

    const drawHeader = (pageNumber: number) => {
      doc.setFont('times', 'bold');
      doc.setFontSize(28);
      doc.setTextColor(88, 41, 33);
      doc.text(vendor.shopName || 'Menu', pageWidth / 2, margin + 10, { align: 'center' });
    };

    const drawFooter = () => {
      const footerY = pageHeight - margin + 2;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        'Please scan QR code to check item availability.',
        pageWidth / 2,
        footerY,
        { align: 'center' }
      );
    };

    const sortedCategories = Object.keys(menuItemsByCategory).sort();

    autoTable(doc, {
      body: [], // Empty body to start
      startY: 30, // Start table below the header
      didDrawPage: (data) => {
        drawPageBorder();
        drawHeader(data.pageNumber);
        drawFooter();
      },
      margin: { top: 30, bottom: 20 },
    });


    for (const categoryName of sortedCategories) {
      const itemGroups = menuItemsByCategory[categoryName];
      if (itemGroups.length === 0) continue;

      const tableBody = itemGroups.map(group => {
        const primaryItem = group[0];
        const baseName = primaryItem.name.replace(/\s+(full|half)$/i, '').trim();

        let priceText = '';
        if (group.length > 1) { // half/full case
          const half = group.find(i => i.name.toLowerCase().includes('half'));
          const full = group.find(i => i.name.toLowerCase().includes('full'));

          const halfPrice = (half && half.isAvailable) ? `${Math.round(half.price)}` : '-';
          const fullPrice = (full && full.isAvailable) ? `${Math.round(full.price)}` : '-';

          if (half && full) priceText = `Rs. ${halfPrice}/${fullPrice}`;
          else if (half) priceText = `Rs. ${halfPrice}/-`;
          else if (full) priceText = `Rs. -/${fullPrice}`;

        } else if (primaryItem.isAvailable) { // single item case
          priceText = `Rs. ${Math.round(primaryItem.price)}`;
        }

        // Combine name and price into one string for the first column
        const nameAndPrice = priceText ? `${baseName} - ${priceText}` : baseName;

        return [nameAndPrice];
      });

      autoTable(doc, {
        head: [[{ content: categoryName, styles: { halign: 'center', fontStyle: 'bold', fontSize: 16, textColor: [88, 41, 33], cellPadding: { top: 8, bottom: 4 } } }]],
        body: tableBody,
        theme: 'plain',
        styles: {
          font: 'times',
          fontSize: 14,
          fontStyle: 'bold',
          textColor: [88, 41, 33],
        },
        didDrawPage: (data) => {
          drawPageBorder();
          drawHeader(data.pageNumber);
          drawFooter();
        },
        pageBreak: 'avoid',
        headStyles: {
          // Add more space above the category name
          // `startY` can't be used here as it's a global option for the table.
          // We'll use a margin on the table itself.
        },
        // Add a margin to the top of each category table
        margin: { top: (doc as any).lastAutoTable.finalY > 30 ? 15 : 30 },
      });
    }

    doc.save(`${createSlug(vendor.shopName || 'menu')}.pdf`);
  };

  const handleCategoryClick = (category: string) => {
    const element = categoryRefs.current[category];
    if (element) {
      const yOffset = -150; // Accounts for sticky header and category bar
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const tableOrderTotal = useMemo(() => {
    return tableOrderItems.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
  }, [tableOrderItems]);

  const minAmount = vendor?.minOrderAmount || 0;

  const isUpdateDisabled = useMemo(() => {
    if (!orderIdToEdit) return false;
    if (tableOrderItems.length === 0) return true;

    // Find the original order to check its delivery type
    const originalOrder = orders.find(o => o.orderId === orderIdToEdit);
    // If the order is Dine-In OR Self Pickup, the minimum amount does not apply.
    if (originalOrder && (originalOrder.deliveryOption === 'Dine-In' || originalOrder.deliveryOption === 'Self Pickup')) {
      return false; // Never disable for these order types
    }

    // For other orders (like Home Delivery), check against minimum amount
    const isMinOrderMet = tableOrderTotal >= minAmount;
    return !isMinOrderMet;
  }, [orderIdToEdit, tableOrderItems, orders, minAmount, tableOrderTotal]);

  const showMinAmountWarning = useMemo(() => {
    if (!orderIdToEdit) return false;
    const originalOrder = orders.find(o => o.orderId === orderIdToEdit);
    if (originalOrder && (originalOrder.deliveryOption === 'Dine-In' || originalOrder.deliveryOption === 'Self Pickup')) {
      return false;
    }
    const isMinOrderMet = tableOrderTotal >= minAmount;
    return !isMinOrderMet;
  }, [orderIdToEdit, tableOrderItems, orders, minAmount, tableOrderTotal]);


  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!vendor || !vendor.isApproved) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center p-6 bg-muted/50 rounded-2xl">
          <CardHeader>
            <div className="mx-auto bg-destructive/10 text-destructive rounded-full h-16 w-16 flex items-center justify-center">
              <Ban className="h-8 w-8" />
            </div>
            <CardTitle className="text-destructive mt-4">
              Vendor Not Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              We apologize for the inconvenience. The vendor you are looking for
              is not available at the moment.
            </p>
            <p className="text-muted-foreground text-sm">
              Please check back later or go back to the main menu.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/menu">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to All Menus
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isVendorOwner && !vendor.canAcceptDineIn) {
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

  const discountedItems = vendorMenuItems.filter(
    (item) =>
      item.isDiscountActive && item.discountPrice && item.discountPrice > 0
  );

  const vendorCategories = Object.keys(menuItemsByCategory);
  const isSearching = searchQuery.length > 0;

  return (
    <>
      <AnimatePresence>
        {zoomedItem && (
          <ZoomedImageOverlay
            item={zoomedItem}
            onClose={() => setZoomedItem(null)}
          />
        )}
      </AnimatePresence>
      <div className="container mx-auto px-4 py-8">
        <div className="w-full max-w-5xl mx-auto">
          <div className="flex justify-center items-center mb-6">
            <div className="relative w-48 h-48 sm:w-56 sm:h-56">
              <div className="absolute inset-0 rounded-full overflow-hidden shadow-lg border-4 border-background">
                <Image
                  src={vendor.shopImage || 'https://placehold.co/224x224.png'}
                  alt={vendor.shopName || 'Vendor'}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 rounded-full overflow-hidden">
                  {[...Array(12)].map((_, i) => (
                    <Sparkles
                      key={i}
                      className="absolute top-1/2 left-1/2 h-5 w-5 animate-firework"
                      style={{
                        '--i': i + 1,
                        color: `hsl(${i * 30}, 90%, 60%)`,
                        animationDelay: `${(i * 0.1).toFixed(1)}s`
                      } as React.CSSProperties}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="flex justify-center items-center gap-2">
              <CardTitle className="font-headline text-4xl text-primary">
                {vendor.shopName}
              </CardTitle>
            </div>
            <CardDescription>{vendor.tagline || 'Full Menu'}</CardDescription>
            {/* Premium Status Badge */}
            {(() => {
              const statusInfo = VendorStatusManager.getShopStatus(vendor);
              const isOpen = statusInfo.status === VendorStatus.OPEN;
              const isTempClosed = statusInfo.status === VendorStatus.CLOSED_TEMP;
              
              let badgeColor = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
              let pulseColor = 'bg-emerald-500';
              
              if (isTempClosed) {
                badgeColor = 'bg-destructive/10 text-destructive border-destructive/20';
                pulseColor = 'bg-destructive';
              } else if (!isOpen) {
                badgeColor = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
                pulseColor = 'bg-amber-500';
              }

              return (
                <div className="flex justify-center items-center mt-3">
                  <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border shadow-sm backdrop-blur-sm", badgeColor)}>
                    <span className="relative flex h-2 w-2">
                      <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", pulseColor)}></span>
                      <span className={cn("relative inline-flex rounded-full h-2 w-2", pulseColor)}></span>
                    </span>
                    <span>{statusInfo.msg}</span>
                  </div>
                </div>
              );
            })()}
            {vendor.workingHours && (
              <div className="flex items-center justify-center gap-2 text-sm text-foreground font-bold mt-2">
                <Clock className="h-4 w-4" />
                <span className="whitespace-pre-line">{vendor.workingHours}</span>
              </div>
            )}
            <div className="flex justify-center items-center gap-2 mt-2">
              <p className="text-xs text-primary font-semibold">
                If you wish you can order from here , just click the menu
              </p>
              <Button onClick={generatePdf} size="icon" variant="outline" className="h-8 w-8">
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {vendor.address && (
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    <span>{vendor.address}</span>
                  </div>
                  {vendor.googleMapsUrl && (
                    <a href={vendor.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                      View on Google Maps <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}
              {vendor.contact && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${vendor.contact}`} className="hover:underline">{vendor.contact.replace('+91', '')}</a>
                </div>
              )}
              {vendor.minOrderAmount && vendor.minOrderAmount > 0 ? (
                <div className="flex items-center gap-1.5 font-semibold text-primary">
                  <Info className="h-4 w-4" />
                  <span>Minimum Order: ₹{vendor.minOrderAmount.toFixed(2)}</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-6 mb-4 max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search this vendor's menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 border-purple-500"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          </div>

          {!isSearching && vendorCategories.length > 0 && (
            <div className="sticky top-[65px] bg-background/90 backdrop-blur-sm z-40 py-2 my-4 -mx-2 px-2 overflow-x-auto hide-scrollbar group">
              <div className="flex w-max animate-scroll hover:animation-pause">
                {vendorCategories.map((category) => (
                  <Button
                    key={`${category}-1`}
                    variant="outline"
                    className="rounded-full shrink-0 mx-2"
                    onClick={() => handleCategoryClick(category)}
                  >
                    {category}
                  </Button>
                ))}
                {/* Duplicate for seamless loop */}
                {vendorCategories.map((category) => (
                  <Button
                    key={`${category}-2`}
                    variant="outline"
                    className="rounded-full shrink-0 mx-2"
                    onClick={() => handleCategoryClick(category)}
                    aria-hidden="true"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <CardContent className="mt-4">
            {isSearching ? (
              <>
                {Object.keys(menuItemsByCategory).length > 0 ? (
                  Object.entries(menuItemsByCategory).map(([category, itemGroups]) => (
                    <div key={category} className="mb-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        {itemGroups.map((group, index) => {
                          if (group.length > 1) {
                            return <CombinedMenuItemRow key={`${group[0].id}-${index}`} items={group} onImageClick={handleImageClick} onRowClick={() => handleCombinedItemRowClick(group)} prefix={'menu-item-image'} vendor={vendor} itemRef={el => { if (el) itemRefs.current[group[0].id] = el; }} />;
                          } else {
                            const item = group[0];
                            return <MenuItemRow key={item.id} item={item} onImageClick={handleImageClick} onRowClick={handleItemRowClick} prefix={'menu-item-image'} vendor={vendor} itemRef={el => { if (el) itemRefs.current[item.id] = el; }} />;
                          }
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No items match your search.</p>
                )}
              </>
            ) : (
              <>
                {discountedItems.length > 0 && (
                  <div className="mb-8">
                    <div className="flex justify-center my-6">
                      <div className="bg-destructive/10 rounded-full px-4 py-2 inline-flex items-center gap-3">
                        <Tag className="h-5 w-5 text-destructive" />
                        <h3 className="text-xl font-bold text-destructive">
                          Discounted Items
                        </h3>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                      {discountedItems.map((item) => (
                        <MenuItemRow
                          key={item.id}
                          item={item}
                          vendor={vendor}
                          onImageClick={handleImageClick}
                          onRowClick={handleItemRowClick}
                          prefix={'discount-item-image'}
                          itemRef={el => {
                            if (el) itemRefs.current[item.id] = el;
                          }}
                        />
                      ))}
                    </div>
                    <Separator className="my-6" />
                  </div>
                )}

                {Object.keys(menuItemsByCategory).length > 0 && (
                  <div className="flex justify-center my-6">
                    <div className="bg-destructive/10 rounded-full px-4 py-2 inline-flex items-center gap-3">
                      <Utensils className="h-5 w-5 text-destructive" />
                      <h3 className="text-xl font-bold text-destructive">
                        Menu
                      </h3>
                    </div>
                  </div>
                )}

                {Object.entries(menuItemsByCategory).map(([category, itemGroups]) => (
                  <div key={category} className="mb-8" ref={el => { if (el) categoryRefs.current[category] = el; }}>
                    <div className="flex justify-center my-6">
                      <Button
                        variant="outline"
                        className="rounded-full"
                        onClick={() => handleCategoryClick(category)}
                      >
                        <Utensils className="h-5 w-5 text-primary mr-2" />
                        <h3 className="text-xl font-bold text-primary">
                          {category}
                        </h3>
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                      {itemGroups.map((group, index) => {
                        if (group.length > 1) {
                          return (
                            <CombinedMenuItemRow
                              key={`${group[0].id}-${index}`}
                              items={group}
                              vendor={vendor}
                              onImageClick={handleImageClick}
                              onRowClick={() => handleCombinedItemRowClick(group)}
                              prefix={'menu-item-image'}
                              itemRef={el => {
                                if (el) itemRefs.current[group[0].id] = el;
                              }}
                            />
                          );
                        } else {
                          const item = group[0];
                          return (
                            <MenuItemRow
                              key={item.id}
                              item={item}
                              vendor={vendor}
                              onImageClick={handleImageClick}
                              onRowClick={handleItemRowClick}
                              prefix={'menu-item-image'}
                              itemRef={el => {
                                if (el) itemRefs.current[item.id] = el;
                              }}
                            />
                          );
                        }
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}


            {vendorMenuItems.length === 0 && !isSearching && (
              <p className="text-center text-muted-foreground py-8">
                This vendor has not added any menu items yet.
              </p>
            )}
          </CardContent>
        </div>
      </div>
      <OrderCustomizationSheet
        item={selectedItem}
        vendor={vendor}
        open={!!selectedItem}
        onOpenChange={handleCloseCustomization}
      />

      {isVendorOwner && (
        <AnimatePresence>
          {isTableOrderSheetVisible && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="fixed bottom-4 right-4 z-50 w-80"
            >
              <Card className="w-full shadow-2xl rounded-2xl bg-card/90 backdrop-blur-sm">
                <CardHeader
                  className={cn(
                    "flex flex-row items-center justify-between p-3",
                    "cursor-pointer" // Always allow clicking the header
                  )}
                  onClick={() => setIsTableOrderSheetMinimized(!isTableOrderSheetMinimized)}
                >
                  <CardTitle className="text-base">
                    {orderIdToEdit ? `Editing: #${orderIdToEdit.split('-')[1] || orderIdToEdit}` : 'New Table Order'}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTableOrderSheetMinimized(!isTableOrderSheetMinimized);
                    }}
                  >
                    {isTableOrderSheetMinimized ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CardHeader>
                {!isTableOrderSheetMinimized && (
                  <>
                    <CardContent className="px-3 space-y-4">
                      {!orderIdToEdit && (
                        <div className="space-y-2">
                          <Label htmlFor="table-id-selector" className="text-xs">Select Table</Label>
                          <div id="table-id-selector" className="flex flex-wrap gap-2">
                            {Array.from({ length: (vendor?.dineInTables ?? 6) + 1 }, (_, i) => i).map((number) => (
                              <Button
                                key={number}
                                type="button"
                                variant={tableId === `${number}` ? 'default' : 'outline'}
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                onClick={() => setTableId(`${number}`)}
                              >
                                {number}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="space-y-1">
                        <Label htmlFor="dine-in-notes" className="text-xs">Special Instructions</Label>
                        <Textarea
                          id="dine-in-notes"
                          placeholder="e.g., extra spicy, no onions..."
                          rows={2}
                          value={dineInNotes}
                          onChange={(e) => setDineInNotes(e.target.value)}
                        />
                      </div>
                      <ScrollArea className="h-40">
                        <div className="space-y-2 pr-4">
                          {tableOrderItems.length > 0 ? tableOrderItems.map((item) => (
                            <div key={item.id} className="flex justify-between items-center text-xs">
                              <span className="flex-1 break-words pr-2">{item.name}</span>
                              <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-6 w-6 rounded-full border-destructive text-destructive hover:bg-destructive hover:text-white" onClick={() => handleTableOrderQuantityChange(item.id, -1)}><Minus className="h-3 w-3" /></Button>
                                <span className="w-4 text-center font-bold">{item.quantity}</span>
                                <Button variant="outline" size="icon" className="h-6 w-6 rounded-full border-destructive text-destructive hover:bg-destructive hover:text-white" onClick={() => handleTableOrderQuantityChange(item.id, 1)}><Plus className="h-3 w-3" /></Button>
                              </div>
                              <span className="font-medium w-12 text-right">₹{(item.finalPrice * item.quantity).toFixed(2)}</span>
                              <Button variant="ghost" size="icon" className="h-5 w-5 ml-1" onClick={() => setTableOrderItems(prev => prev.filter(i => i.id !== item.id))}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          )) : <p className="text-center text-xs text-muted-foreground pt-8">No items added yet.</p>}
                        </div>
                      </ScrollArea>
                    </CardContent>
                    <CardFooter className="flex-col gap-2 p-3">
                      <div className="flex justify-between w-full font-bold text-sm">
                        <span>Total:</span>
                        <span>₹{tableOrderTotal.toFixed(2)}</span>
                      </div>
                      {showMinAmountWarning && (
                        <p className="text-xs text-destructive text-center">
                          The total must be at least ₹{minAmount.toFixed(2)} to update the order.
                        </p>
                      )}
                      <Button className="w-full h-9" onClick={handlePlaceOrUpdateOrder} disabled={isUpdateDisabled || tableOrderItems.length === 0 || (!orderIdToEdit && !tableId.trim()) || isPlacingTableOrder}>
                        {isPlacingTableOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : (orderIdToEdit ? 'Update Order' : 'Place Order')}
                      </Button>
                    </CardFooter>
                  </>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />
      <PortionSelectDialog
        items={portionSelectItems}
        open={!!portionSelectItems}
        isVendorOwner={!!isVendorOwner}
        onOpenChange={() => setPortionSelectItems(null)}
        onAddToCart={(item, quantity) => {
          const forceSelfPickup = deliveryChoiceForPortionSelect === 'yes';
          handleAddToCartWithDialogCheck(item, {}, quantity, forceSelfPickup);
          setDeliveryChoiceForPortionSelect(null);
        }}
        onAddToTableOrder={handleAddToTableOrder}
      />
      <Dialog open={selfPickupDialogState.open} onOpenChange={(open) => !open && handleSelfPickupDialogClose('cancel')}>
        <DialogContent className="sm:max-w-md sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl text-center">{selfPickupDialogState.item?.shopName || selfPickupDialogState.items?.[0]?.shopName} offers Self-Pickup only</DialogTitle>
            <DialogDescription className="text-center pt-2">
              This vendor does not provide home delivery through our platform. How would you like to proceed?
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div
              className="flex flex-col items-center p-4 border-2 rounded-2xl cursor-pointer hover:bg-primary/5 hover:border-primary transition-all"
              onClick={() => handleSelfPickupDialogClose('no')}
            >
              <Bike className="h-10 w-10 text-primary mb-2" />
              <h3 className="font-semibold text-center">Request Delivery</h3>
              <p className="text-xs text-muted-foreground text-center">A minimum order of ₹{vendor?.minOrderAmount || 0} is required.</p>
            </div>
            <div
              className="flex flex-col items-center p-4 border-2 rounded-2xl cursor-pointer hover:bg-green-500/5 hover:border-green-500 transition-all"
              onClick={() => handleSelfPickupDialogClose('yes')}
            >
              <Hand className="h-10 w-10 text-green-500 mb-2" />
              <h3 className="font-semibold text-center">I'll Pick It Up</h3>
              <p className="text-xs text-muted-foreground text-center">No minimum order amount applies.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

const PortionSelectDialog = ({
  items,
  open,
  onOpenChange,
  isVendorOwner,
  onAddToCart,
  onAddToTableOrder,
}: {
  items: MenuItemType[] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isVendorOwner?: boolean;
  onAddToCart?: (item: MenuItemType, quantity: number) => void;
  onAddToTableOrder?: (item: MenuItemType, quantity: number) => void;
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    if (open && items && items.length > 0) {
      // Default to the first available item, or just the first item
      const defaultItem = items.find(item => item.isAvailable) || items[0];
      setSelectedItemId(defaultItem.id);
      setQuantity(1);
    }
  }, [open, items]);

  if (!items || items.length === 0) return null;

  const primaryItem = items[0];
  const baseName = primaryItem.name.replace(/\s+(full|half)$/i, '').trim();

  const handleConfirmClick = () => {
    const selectedItem = items.find(item => item.id === selectedItemId);
    if (!selectedItem) {
      toast({ title: "Please select a portion.", variant: "destructive" });
      return;
    }

    if (isVendorOwner && onAddToTableOrder) {
      onAddToTableOrder(selectedItem, quantity);
    } else if (onAddToCart) {
      onAddToCart(selectedItem, quantity);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">{baseName}</DialogTitle>
          <DialogDescription>Select your desired portion size.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <RadioGroup value={selectedItemId} onValueChange={setSelectedItemId} className="space-y-2">
            {items.map(item => {
              const variation = item.name.match(/\s+(full|half)$/i)?.[1] || 'Portion';
              const price = (item.isDiscountActive && item.discountPrice) ? item.discountPrice : item.price;
              const isAvailable = isItemInStock(item, vendor?.isInventory);
              return (
                <Label
                  key={item.id}
                  htmlFor={item.id}
                  className={cn(
                    "flex items-center justify-between rounded-full border p-3 transition-colors",
                    isAvailable ? "cursor-pointer" : "opacity-50 cursor-not-allowed",
                    selectedItemId === item.id && "border-primary bg-primary/5"
                  )}
                >
                  <div>
                    <span className="font-semibold">{variation.charAt(0).toUpperCase() + variation.slice(1)}</span>
                    {!isAvailable && <span className="text-xs text-destructive ml-2">(Out of Stock)</span>}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground text-sm">₹{price.toFixed(2)}</span>
                    <RadioGroupItem value={item.id} id={item.id} disabled={!isAvailable} />
                  </div>
                </Label>
              );
            })}
          </RadioGroup>
        </div>
        <DialogFooter className="sm:justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
              <Minus className="h-4 w-4" />
            </Button>
            <span className="font-bold text-lg w-10 text-center">{quantity}</span>
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setQuantity(q => q + 1)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleConfirmClick} disabled={!selectedItemId}>
            Add to Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export default function VendorPublicMenuPage() {
  const { categories } = useMenu();
  const params = useParams();
  const identifier = params.username as string;
  const { vendors } = useAppVendor();
  const vendor = vendors.find(v => v.slug === identifier || v.username === identifier) || null;

  return (
    <div className="flex flex-col min-h-screen">
      <Header pageVendor={vendor} />
      <main className="flex-1">
        <VendorMenuContent categories={categories} />
      </main>
    </div>
  );
}
