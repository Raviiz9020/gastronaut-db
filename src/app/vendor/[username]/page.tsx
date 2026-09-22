'use client';

import type { SpecialMenu, Vendor, MenuItem as MenuItemType, Category, Order } from '@/types';
import { VendorStatus } from '@/types';
import { VendorStatusManager, isItemInStock } from '@/lib/vendorStatusManager';
import React, { useEffect, useMemo, useState, useCallback, useRef, Suspense } from 'react';
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
  CheckCircle2,
  ChefHat,
  AlertCircle,
  ShieldCheck,
  Check,
  RefreshCw,
  ArrowRight,
  ShoppingBag,
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
import { verifyDineInLocation } from '@/lib/location-utils';
import { Badge } from '@/components/ui/badge';
import {
  ZoomedImageOverlay,
  PortionSelectDialog,
  UniversalTablePickerDialog,
  SelfPickupDialog,
  MenuItemRow,
  CombinedMenuItemRow,
  DineInFloatingBar,
  DineInTableOrderSheet,
  VendorCockpitHeader,
  LiveKitchenStatusCard,
  CategoryPillsBar,
  FloatingMenuChip,
  VendorSpecialsSection,
  useVendorSpecials,
  type TableOrderItem,
} from './components';


function VendorMenuContent({
  categories,
  tableId: propTableId,
  setTableId: propSetTableId
}: {
  categories: Category[];
  tableId?: string;
  setTableId?: (t: string) => void;
}) {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const identifier = params.username as string;
  const targetItemId = searchParams.get('item');
  const orderIdToEdit = searchParams.get('edit_order');

  const { orders, updateOrderItems, addOrder, addRoundToOrder } = useOrder();
  const { cartItems, addToCart, updateCartItemQuantity, getCartItemCount } = useCart();
  const { vendor: loggedInVendor, vendors: allAppVendors, fetchAllVendors } = useAppVendor();

  const [vendorMenuItems, setVendorMenuItems] = useState<MenuItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [selectedItem, setSelectedItem] = useState<MenuItemType | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isTableOrderSheetVisible, setIsTableOrderSheetVisible] = useState(false);
  const [tableOrderItems, setTableOrderItems] = useState<TableOrderItem[]>([]);

  const [internalTableId, setInternalTableId] = useState('');
  const activeTableId = propTableId !== undefined ? propTableId : internalTableId;
  const setTableId = propSetTableId || setInternalTableId;

  const [dineInNotes, setDineInNotes] = useState('');
  const [isUniversalPickerOpen, setIsUniversalPickerOpen] = useState(false);
  const [pendingItemToAdd, setPendingItemToAdd] = useState<{ item: MenuItemType; quantity: number } | null>(null);

  const [locationVerified, setLocationVerified] = useState<boolean | null>(null);
  const [isVerifyingLocation, setIsVerifyingLocation] = useState(false);

  const [graceSecondsLeft, setGraceSecondsLeft] = useState<number>(0);

  const [zoomedItem, setZoomedItem] = useState<{
    id: string;
    image: string;
    name: string;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const menuSectionsRef = useRef<HTMLDivElement>(null);
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

  // Real-time active specials for this vendor (e.g., Breakfast, Lunch, Dinner)
  const { activeSpecials, activeSpecialsByKey } = useVendorSpecials(
    vendor?.username,
    vendorMenuItems
  );

  const isVendorOwner = useMemo(() => {
    return !!(loggedInVendor && vendor && loggedInVendor.username === vendor.username);
  }, [loggedInVendor, vendor]);

  const isDineInMode = useMemo(() => {
    return Boolean(vendor?.canAcceptDineIn && (activeTableId || searchParams.get('table')));
  }, [vendor, activeTableId, searchParams]);

  // Auto-prompt Universal Table Picker on Standee QR scan (when visiting /vendor/[username] without a table)
  useEffect(() => {
    if (vendor && vendor.canAcceptDineIn && !activeTableId && !searchParams.get('table')) {
      const timer = setTimeout(() => {
        setIsUniversalPickerOpen(true);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [vendor, activeTableId, searchParams]);

  useEffect(() => {
    if (allAppVendors.length === 0) {
      fetchAllVendors();
    }
  }, [allAppVendors, fetchAllVendors]);

  // Non-blocking soft geofence check (300m max radius with 2.5s hard timeout)
  useEffect(() => {
    if (isDineInMode && vendor && locationVerified === null && !isVerifyingLocation) {
      setIsVerifyingLocation(true);
      verifyDineInLocation(vendor, 300)
        .then(res => {
          setLocationVerified(res.verified);
        })
        .catch(() => {
          setLocationVerified(false);
        })
        .finally(() => {
          setIsVerifyingLocation(false);
        });
    }
  }, [isDineInMode, vendor, locationVerified, isVerifyingLocation]);

  // Dine-In Table Session ID persistence
  const [tableSessionId, setTableSessionId] = useState<string>('');
  useEffect(() => {
    if (activeTableId && vendor) {
      let sess = sessionStorage.getItem(`dineInSession_${vendor.username}_${activeTableId}`);
      if (!sess) {
        sess = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem(`dineInSession_${vendor.username}_${activeTableId}`, sess);
      }
      setTableSessionId(sess);
    }
  }, [activeTableId, vendor]);

  // Active Dine-in Orders for this vendor
  const [activeDineInOrders, setActiveDineInOrders] = useState<Order[]>([]);
  const [isDineInOrdersLoaded, setIsDineInOrdersLoaded] = useState(false);

  useEffect(() => {
    if (!vendor?.username) {
      setActiveDineInOrders([]);
      setIsDineInOrdersLoaded(false);
      return;
    }
    const q = query(
      collection(db, 'orders'),
      where('vendorUsername', '==', vendor.username),
      where('deliveryOption', '==', 'Dine-In'),
      where('status', 'in', ['Order Placed', 'Processing', 'Out for Delivery'])
    );
    const unsub = onSnapshot(q, (snap) => {
      const orders = snap.docs.map(d => ({ orderId: d.id, ...d.data() } as Order));
      setActiveDineInOrders(orders);
      setIsDineInOrdersLoaded(true);
    }, (err) => {
      console.error('Error listening to active dine-in orders:', err);
      setIsDineInOrdersLoaded(true);
    });
    return () => unsub();
  }, [vendor?.username]);

  // Derive active order for current activeTableId
  const activeTableOrder = useMemo(() => {
    if (!activeTableId) return null;
    return activeDineInOrders.find(o => String(o.tableId) === String(activeTableId)) || null;
  }, [activeDineInOrders, activeTableId]);

  // Clean up localStorage when active order on this table is completed or cancelled
  useEffect(() => {
    if (isDineInOrdersLoaded && vendor && activeTableId && !activeTableOrder) {
      localStorage.removeItem(`dineInActiveOrderId_${vendor.username}_table_${activeTableId}`);
    }
  }, [isDineInOrdersLoaded, vendor, activeTableId, activeTableOrder]);

  // Derive occupied table IDs (all active tables for this vendor)
  const occupiedTableIds = useMemo(() => {
    const set = new Set<string>();
    activeDineInOrders.forEach(o => {
      if (o.tableId) set.add(String(o.tableId));
    });
    return set;
  }, [activeDineInOrders]);

  // Determine if current user is the "Table Host"
  const isTableHost = useMemo(() => {
    if (!activeTableId || !vendor) return true; // free to place first order
    if (!activeTableOrder) return true; // no active order exists on this table yet

    // An active order exists on this table. Check if this device is the one that owns/started it
    const savedOrderId = typeof window !== 'undefined' ? localStorage.getItem(`dineInActiveOrderId_${vendor.username}_table_${activeTableId}`) : null;
    if (savedOrderId && (savedOrderId === activeTableOrder.orderId || savedOrderId === (activeTableOrder as any).id)) {
      return true;
    }
    const savedSessionId = typeof window !== 'undefined' ? sessionStorage.getItem(`dineInSession_${vendor.username}_${activeTableId}`) : null;
    if (savedSessionId && activeTableOrder.tableSessionId && savedSessionId === activeTableOrder.tableSessionId) {
      return true;
    }
    return false;
  }, [activeTableId, vendor, activeTableOrder]);

  // 90-second self-reduction grace countdown
  useEffect(() => {
    if (!activeTableOrder || activeTableOrder.status !== 'Order Placed' || !activeTableOrder.createdAt) {
      setGraceSecondsLeft(0);
      return;
    }

    const calculateGrace = () => {
      const createdMs = new Date(activeTableOrder.createdAt).getTime();
      const elapsedSec = Math.floor((Date.now() - createdMs) / 1000);
      const remaining = Math.max(0, 90 - elapsedSec);
      setGraceSecondsLeft(remaining);
    };

    calculateGrace();
    const timer = setInterval(calculateGrace, 1000);
    return () => clearInterval(timer);
  }, [activeTableOrder]);

  const handleReduceActiveOrderItem = async (cartItemIdOrId: string) => {
    if (!isTableHost) {
      toast({
        title: "Action Not Permitted",
        description: "Only the table host can modify active order items.",
        variant: "destructive",
      });
      return;
    }
    if (!activeTableOrder) return;
    if (activeTableOrder.status !== 'Order Placed') {
      toast({ title: "Order Locked", description: "Food preparation has started. Please ask your server.", variant: "destructive" });
      return;
    }
    if (graceSecondsLeft <= 0) {
      toast({ title: "Grace Period Expired", description: "The 90-second modification window has expired.", variant: "destructive" });
      return;
    }

    try {
      const currentItems = [...activeTableOrder.items];
      const targetIdx = currentItems.findIndex(i => (i.cartItemId || i.id) === cartItemIdOrId);
      if (targetIdx === -1) return;

      const target = currentItems[targetIdx];
      if (target.quantity > 1) {
        currentItems[targetIdx] = { ...target, quantity: target.quantity - 1 };
      } else {
        currentItems.splice(targetIdx, 1);
      }

      await updateOrderItems(activeTableOrder.orderId, currentItems);
      toast({ title: "Item Reduced", description: `${target.name} quantity updated.` });
    } catch (err: any) {
      toast({ title: "Update Failed", description: err.message || "Failed to update item.", variant: "destructive" });
    }
  };

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
        if (!activeTableId.trim()) {
          toast({ title: "Table number required", variant: "destructive" });
          setIsUniversalPickerOpen(true);
          setIsPlacingTableOrder(false);
          return;
        }

        const notesForOrder: Record<string, string> = {};
        if (dineInNotes.trim()) {
          notesForOrder[vendor.username] = dineInNotes.trim();
        }

        if (!isTableHost) {
          toast({
            title: "Order Managed by Table Host",
            description: `An active order is already in progress for Table ${activeTableId}.`,
            variant: "destructive",
          });
          setIsPlacingTableOrder(false);
          return;
        }

        // If an active order already exists for this table, APPEND items as a new round
        if (activeTableOrder && activeTableOrder.status !== 'Delivered' && activeTableOrder.status !== 'Cancelled') {
          const nextRound = (activeTableOrder.orderRound || 1) + 1;
          await addRoundToOrder(activeTableOrder.orderId, tableOrderItems as any, dineInNotes);
          toast({
            title: `Round ${nextRound} Sent!`,
            description: `Items added to Table ${activeTableId} order.`,
          });
        } else {
          // Fresh table order (Round 1)
          const sessionId = tableSessionId || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          const createdOrderIds = await addOrder({
            cartItems: tableOrderItems as any,
            customer: {},
            allVendors: [vendor],
            paymentMethod: 'Pay at Counter',
            deliveryOption: 'Dine-In',
            tableId: activeTableId,
            customNotes: notesForOrder,
            locationVerified: locationVerified === true,
            tableSessionId: sessionId,
            orderRound: 1,
          } as any);

          if (createdOrderIds && createdOrderIds.length > 0) {
            const newId = createdOrderIds[0];
            localStorage.setItem(`dineInActiveOrderId_${vendor.username}_table_${activeTableId}`, newId);
          }

          toast({
            title: "Order Placed!",
            description: `Order for Table ${activeTableId} has been sent to the kitchen.`,
          });
        }

        setTableOrderItems([]);
        // Table ID remains active for the diner's entire meal session
        setDineInNotes('');
        setIsTableOrderSheetVisible(false);

        // Auto-scroll straight to top so customer immediately sees their placed order and live status
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
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
      return;
    }

    const isSelfPickupVendor = vendor?.deliveryType === 'Self Pickup Only';
    const isFirstItemFromThisVendor = cartItems.every(cartItem => cartItem.vendorUsername !== item.vendorUsername);
    const isCartEmpty = cartItems.length === 0;

    if (isSelfPickupVendor && (isCartEmpty || isFirstItemFromThisVendor)) {
      setSelfPickupDialogState({ open: true, item, selectedOptions, quantity, items: null });
    } else {
      addToCart(item, selectedOptions, quantity);
    }
  };

  const handleSelfPickupDialogClose = (decision: 'yes' | 'no' | 'cancel') => {
    const { item, items, selectedOptions, quantity } = selfPickupDialogState;
    if (decision !== 'cancel') {
      const forceSelfPickup = decision === 'yes';
      if (item) {
        addToCart(item, selectedOptions, quantity, forceSelfPickup);
      } else if (items) {
        setDeliveryChoiceForPortionSelect(decision);
        setPortionSelectItems(items);
      }
    }
    setSelfPickupDialogState({ open: false, item: null, items: null, selectedOptions: {}, quantity: 1 });
  };


  const handleAddToTableOrder = useCallback((item: MenuItemType, quantity: number, selectedOptions?: Record<string, string | string[]>) => {
    if (!isTableHost) {
      toast({
        title: "Order Managed by Table Host",
        description: `An active order is already in progress for Table ${activeTableId}. Items can be added from the device that started the order.`,
      });
      return;
    }

    let finalPrice = item.isDiscountActive && item.discountPrice ? item.discountPrice : item.price;
    let optionsText = '';
    if (selectedOptions && item.customizations) {
      item.customizations.forEach(cust => {
        const sel = selectedOptions[cust.id];
        if (sel) {
          if (Array.isArray(sel)) {
            sel.forEach(optId => {
              const opt = cust.options.find(o => o.id === optId);
              if (opt) {
                finalPrice += item.isDiscountActive ? opt.price : (opt.originalPrice || opt.price);
                optionsText += (optionsText ? ', ' : '') + opt.name;
              }
            });
          } else {
            const opt = cust.options.find(o => o.id === sel);
            if (opt) {
              finalPrice += item.isDiscountActive ? opt.price : (opt.originalPrice || opt.price);
              optionsText += (optionsText ? ', ' : '') + opt.name;
            }
          }
        }
      });
    }

    const cartItemId = `${item.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    setTableOrderItems(prevItems => {
      if (!selectedOptions || Object.keys(selectedOptions).length === 0) {
        const existingItem = prevItems.find(i => i.id === item.id && !i.customizationDetails);
        if (existingItem) {
          return prevItems.map(i =>
            (i.id === item.id && !i.customizationDetails) ? { ...i, quantity: i.quantity + quantity } : i
          );
        }
      }
      return [...prevItems, {
        ...item,
        cartItemId,
        quantity,
        finalPrice,
        customizationDetails: selectedOptions,
        selectedOptionsText: optionsText
      }];
    });
  }, [isTableHost, activeTableId, toast]);

  const handleItemRowClick = useCallback((item: MenuItemType) => {
    if ((isVendorOwner || isDineInMode) && !isTableHost) {
      toast({
        title: "Order Managed by Table Host",
        description: `An active order is in progress for Table ${activeTableId}. The menu is in view-only mode for your device.`,
      });
      return;
    }

    if (item.customizations && item.customizations.length > 0) {
      handleOpenCustomization(item);
      return;
    }

    if (isVendorOwner || isDineInMode) {
      if (vendor?.canAcceptDineIn) {
        if (!activeTableId) {
          setPendingItemToAdd({ item, quantity: 1 });
          setIsUniversalPickerOpen(true);
          return;
        }
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
  }, [isVendorOwner, isDineInMode, isTableHost, vendor, activeTableId, handleAddToTableOrder, getCartItemCount, handleAddToCartWithDialogCheck, handleOpenCustomization, toast]);

  const handleCombinedItemRowClick = useCallback((items: MenuItemType[]) => {
    if ((isVendorOwner || isDineInMode) && !isTableHost) {
      toast({
        title: "Order Managed by Table Host",
        description: `An active order is in progress for Table ${activeTableId}. The menu is in view-only mode for your device.`,
      });
      return;
    }

    const isSelfPickupVendor = vendor?.deliveryType === 'Self Pickup Only';
    const isFirstItemFromThisVendor = cartItems.every(cartItem => cartItem.vendorUsername !== items[0].vendorUsername);
    const isCartEmpty = cartItems.length === 0;

    if (isVendorOwner || isDineInMode) {
      if (vendor?.canAcceptDineIn) {
        if (!activeTableId) {
          setIsUniversalPickerOpen(true);
          return;
        }
        setPortionSelectItems(items);
      } else {
        toast({ title: "Dine-In Disabled", description: "This feature has been disabled by the administrator.", variant: "destructive" });
      }
    } else if (isSelfPickupVendor && (isCartEmpty || isFirstItemFromThisVendor)) {
      setSelfPickupDialogState({ open: true, items, item: null, selectedOptions: {}, quantity: 1 });
    } else {
      setPortionSelectItems(items);
    }
  }, [vendor, isVendorOwner, isDineInMode, isTableHost, activeTableId, cartItems, toast]);

  const isMatchingDish = useCallback((orderItem: any, targetId: string) => {
    return orderItem.id === targetId || orderItem.menuItemId === targetId || orderItem.cartItemId?.startsWith(targetId);
  }, []);

  const getItemCartState = useCallback((itemId: string) => {
    if (isVendorOwner || isDineInMode) {
      const draftItems = tableOrderItems.filter(i => isMatchingDish(i, itemId));
      const simpleItem = draftItems.find(i => !i.customizationDetails || Object.keys(i.customizationDetails).length === 0);
      const simpleQuantity = simpleItem?.quantity || 0;
      const totalQuantity = draftItems.reduce((sum, i) => sum + (i.quantity || 1), 0);

      const kitchenItems = activeTableOrder?.items ? activeTableOrder.items.filter(i => isMatchingDish(i, itemId)) : [];
      const kitchenQuantity = kitchenItems.reduce((sum, i) => sum + (i.quantity || 1), 0);
      const kitchenRound = kitchenItems[0]?.round || activeTableOrder?.orderRound || 1;

      return {
        simpleQuantity,
        totalQuantity,
        kitchenQuantity,
        kitchenRound,
      };
    } else {
      const matchingCartItems = cartItems.filter(i => isMatchingDish(i, itemId));
      const simpleItem = matchingCartItems.find(i => !i.customizationDetails || Object.keys(i.customizationDetails).length === 0);
      const simpleQuantity = simpleItem?.quantity || 0;
      const totalQuantity = matchingCartItems.reduce((sum, i) => sum + (i.quantity || 1), 0);

      return {
        simpleQuantity,
        totalQuantity,
        kitchenQuantity: 0,
        kitchenRound: 1,
      };
    }
  }, [isVendorOwner, isDineInMode, tableOrderItems, activeTableOrder, cartItems, isMatchingDish]);

  const handleItemQuantityChange = useCallback((item: MenuItemType, change: number) => {
    if ((isVendorOwner || isDineInMode) && !isTableHost) {
      toast({
        title: "Order Managed by Table Host",
        description: `An active order is in progress for Table ${activeTableId}. The menu is in view-only mode for your device.`,
      });
      return;
    }

    const isCustomizable = item.customizations && item.customizations.length > 0;

    if (isVendorOwner || isDineInMode) {
      if (vendor?.canAcceptDineIn) {
        if (!activeTableId) {
          setPendingItemToAdd({ item, quantity: 1 });
          setIsUniversalPickerOpen(true);
          return;
        }

        if (change > 0) {
          if (isCustomizable) {
            handleOpenCustomization(item);
          } else {
            handleAddToTableOrder(item, change);
          }
        } else {
          if (isCustomizable) {
            setTableOrderItems(prev => {
              const idx = prev.map(i => i.id).lastIndexOf(item.id);
              if (idx === -1) return prev;
              const target = prev[idx];
              if (target.quantity > 1) {
                return prev.map((it, i) => i === idx ? { ...it, quantity: it.quantity - 1 } : it);
              } else {
                return prev.filter((_, i) => i !== idx);
              }
            });
          } else {
            handleTableOrderQuantityChange(item.id, change);
          }
        }
      } else {
        toast({
          title: "Dine-In Disabled",
          description: "This feature has been disabled by the administrator.",
          variant: "destructive",
        });
      }
    } else {
      // Delivery mode
      if (change > 0) {
        if (isCustomizable) {
          handleOpenCustomization(item);
        } else {
          const simpleItem = cartItems.find(i => i.id === item.id && (!i.customizationDetails || Object.keys(i.customizationDetails).length === 0));
          if (simpleItem) {
            updateCartItemQuantity(simpleItem.cartItemId, simpleItem.quantity + 1);
          } else {
            handleAddToCartWithDialogCheck(item, {}, 1);
          }
        }
      } else {
        const matchingItems = cartItems.filter(i => i.id === item.id);
        if (matchingItems.length === 0) return;

        if (!isCustomizable) {
          const simpleItem = matchingItems.find(i => !i.customizationDetails || Object.keys(i.customizationDetails).length === 0);
          if (simpleItem) {
            updateCartItemQuantity(simpleItem.cartItemId, simpleItem.quantity - 1);
          }
        } else {
          const lastItem = matchingItems[matchingItems.length - 1];
          if (lastItem) {
            updateCartItemQuantity(lastItem.cartItemId, lastItem.quantity - 1);
          }
        }
      }
    }
  }, [
    isVendorOwner,
    isDineInMode,
    isTableHost,
    vendor,
    activeTableId,
    handleOpenCustomization,
    handleAddToTableOrder,
    handleTableOrderQuantityChange,
    cartItems,
    updateCartItemQuantity,
    handleAddToCartWithDialogCheck,
    toast,
  ]);

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
    if (searchQuery) setSearchQuery('');
    setActiveCategory(category);
    if (menuSectionsRef.current) {
      const rect = menuSectionsRef.current.getBoundingClientRect();
      if (rect.top < 60 || rect.top > 300) {
        const yOffset = -150;
        const y = rect.top + window.pageYOffset + yOffset;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      }
    }
  };

  const tableOrderTotal = useMemo(() => {
    return tableOrderItems.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
  }, [tableOrderItems]);

  const tableOrderTotalCount = useMemo(() => {
    return tableOrderItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [tableOrderItems]);

  const tableOrderThumbnails = useMemo(() => {
    const seen = new Set<string>();
    const thumbnails: { id: string; name: string; image: string }[] = [];

    for (let i = tableOrderItems.length - 1; i >= 0; i--) {
      const item = tableOrderItems[i];
      const imgUrl = (item as any).imageDataUrl || (item as any).image;
      if (imgUrl && !seen.has(imgUrl) && !imgUrl.includes('placehold.co')) {
        seen.add(imgUrl);
        thumbnails.push({ id: item.id || String(i), name: item.name, image: imgUrl });
      }
      if (thumbnails.length >= 3) break;
    }
    return thumbnails;
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

  const categoryItemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    vendorMenuItems.forEach(item => {
      if (item.category) {
        counts[item.category] = (counts[item.category] || 0) + 1;
      }
    });
    return counts;
  }, [vendorMenuItems]);

  const totalCategoryItemsCount = useMemo(() => {
    return vendorMenuItems.length;
  }, [vendorMenuItems]);

  const getCategoryThumbnail = useMemo(() => {
    const map = new Map<string, string>();
    // 1. Prefer global categories imageUrl
    categories.forEach(cat => {
      if (cat.name && cat.imageUrl && typeof cat.imageUrl === 'string' && cat.imageUrl.length > 5) {
        map.set(cat.name.trim().toLowerCase(), cat.imageUrl);
      }
    });
    // 2. Fallback to dish image in that category
    vendorMenuItems.forEach(item => {
      if (item.category && item.image && typeof item.image === 'string' && item.image.length > 5) {
        const key = item.category.trim().toLowerCase();
        if (!map.has(key)) {
          map.set(key, item.image);
        }
      }
    });
    return (catName: string) => map.get(catName.trim().toLowerCase());
  }, [categories, vendorMenuItems]);

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
      <div className={cn("container mx-auto px-4", isDineInMode ? "pt-2 pb-6 sm:py-6" : "py-6 sm:py-8")}>
        <div className="w-full max-w-5xl mx-auto">
          {/* Innovative Compact Restaurant Cockpit */}
          <VendorCockpitHeader
            vendor={vendor}
            isDineInMode={isDineInMode}
            activeTableId={activeTableId}
            locationVerified={locationVerified}
            onOpenTablePicker={() => setIsUniversalPickerOpen(true)}
            onDownloadPdf={generatePdf}
          />

          {/* Live Kitchen Status Widget */}
          {activeTableOrder && (
            <LiveKitchenStatusCard
              activeTableOrder={activeTableOrder}
              vendorUsername={vendor?.username}
              graceSecondsLeft={graceSecondsLeft}
              isTableHost={isTableHost}
              onReduceItem={handleReduceActiveOrderItem}
              onAddMoreItems={() => {
                toast({
                  title: `Menu open for Round ${(activeTableOrder.orderRound || 1) + 1}`,
                  description: "Select dishes from the menu below to add more items to your table.",
                });
                window.scrollBy({ top: 220, behavior: 'smooth' });
              }}
            />
          )}

          {/* Search Box */}
          <div className={cn("max-w-md mx-auto", isDineInMode ? "mb-2.5" : "mb-4")}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search this vendor's menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 text-xs rounded-2xl h-10 border-border/80 focus:border-primary shadow-xs"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          </div>

          {/* Sticky Interactive Category Pills Bar (like /menu page) */}
          {!isSearching && (vendorCategories.length > 0 || activeSpecials.length > 0) && (
            <CategoryPillsBar
              isDineInMode={isDineInMode}
              activeCategory={activeCategory}
              onSelectCategory={handleCategoryClick}
              vendorCategories={vendorCategories}
              categoryItemCounts={categoryItemCounts}
              totalCategoryItemsCount={totalCategoryItemsCount}
              discountedItemsCount={discountedItems.length}
              getCategoryThumbnail={getCategoryThumbnail}
              activeSpecials={activeSpecials}
            />
          )}

          {/* Menu Sections Grid */}
          <div className="mt-4" ref={menuSectionsRef}>
            {isSearching ? (
              <>
                {Object.keys(menuItemsByCategory).length > 0 ? (
                  Object.entries(menuItemsByCategory).map(([category, itemGroups]) => (
                    <div key={category} className="mb-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {itemGroups.map((group, index) => {
                          if (group.length > 1) {
                            const groupCartState = group.reduce((acc, it) => {
                              const state = getItemCartState(it.id);
                              return {
                                totalQuantity: acc.totalQuantity + state.totalQuantity,
                                kitchenQuantity: acc.kitchenQuantity + state.kitchenQuantity,
                                kitchenRound: state.kitchenRound || acc.kitchenRound,
                              };
                            }, { totalQuantity: 0, kitchenQuantity: 0, kitchenRound: 1 });
                            return (
                              <CombinedMenuItemRow
                                key={`${group[0].id}-${index}`}
                                items={group}
                                onImageClick={handleImageClick}
                                onRowClick={() => handleCombinedItemRowClick(group)}
                                prefix={'menu-item-image'}
                                vendor={vendor}
                                itemRef={el => { if (el) itemRefs.current[group[0].id] = el; }}
                                totalQuantity={groupCartState.totalQuantity}
                                kitchenQuantity={groupCartState.kitchenQuantity}
                                kitchenRound={groupCartState.kitchenRound}
                                onQuantityChange={handleItemQuantityChange}
                              />
                            );
                          } else {
                            const item = group[0];
                            const cartState = getItemCartState(item.id);
                            return (
                              <MenuItemRow
                                key={item.id}
                                item={item}
                                onImageClick={handleImageClick}
                                onRowClick={handleItemRowClick}
                                prefix={'menu-item-image'}
                                vendor={vendor}
                                itemRef={el => { if (el) itemRefs.current[item.id] = el; }}
                                simpleQuantity={cartState.simpleQuantity}
                                totalQuantity={cartState.totalQuantity}
                                kitchenQuantity={cartState.kitchenQuantity}
                                kitchenRound={cartState.kitchenRound}
                                onQuantityChange={handleItemQuantityChange}
                              />
                            );
                          }
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-12">No dishes match your search.</p>
                )}
              </>
            ) : (
              <>
                {/* Active Special Menu Section (When a special is selected) */}
                {activeSpecialsByKey[activeCategory] ? (
                  <VendorSpecialsSection
                    special={activeSpecialsByKey[activeCategory]}
                    vendor={vendor}
                    getItemCartState={getItemCartState}
                    onImageClick={handleImageClick}
                    onRowClick={handleItemRowClick}
                    onQuantityChange={handleItemQuantityChange}
                    onResetCategory={() => handleCategoryClick('all')}
                    itemRefs={itemRefs}
                  />
                ) : (
                  <>
                    {/* Discounted Items Section */}
                    {discountedItems.length > 0 && (activeCategory === 'all' || activeCategory === 'special-deals') && (
                      <div className="mb-8" ref={el => { if (el) categoryRefs.current['discounted-section'] = el; }}>
                        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-amber-500/30">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold">
                            <Tag className="h-4 w-4" />
                          </div>
                          <h3 className="text-lg font-bold font-headline text-foreground">
                            Special Deals & Offers
                          </h3>
                          <span className="text-xs text-muted-foreground font-semibold">({discountedItems.length})</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          {discountedItems.map((item) => {
                            const cartState = getItemCartState(item.id);
                            return (
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
                                simpleQuantity={cartState.simpleQuantity}
                                totalQuantity={cartState.totalQuantity}
                                kitchenQuantity={cartState.kitchenQuantity}
                                kitchenRound={cartState.kitchenRound}
                                onQuantityChange={handleItemQuantityChange}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Categorized Menu Sections */}
                    {Object.entries(menuItemsByCategory)
                      .filter(([category]) => activeCategory === 'all' || activeCategory === category)
                      .map(([category, itemGroups]) => (
                        <div key={category} className="mb-8" ref={el => { if (el) categoryRefs.current[category] = el; }}>
                          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border/60">
                            <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold">
                              <Utensils className="h-4 w-4" />
                            </div>
                            <h3 className="text-lg font-bold font-headline text-foreground">
                              {category}
                            </h3>
                            <span className="text-xs text-muted-foreground font-semibold">
                              ({itemGroups.reduce((sum, g) => sum + g.length, 0)} items)
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                            {itemGroups.map((group, index) => {
                              if (group.length > 1) {
                                const groupCartState = group.reduce((acc, it) => {
                                  const state = getItemCartState(it.id);
                                  return {
                                    totalQuantity: acc.totalQuantity + state.totalQuantity,
                                    kitchenQuantity: acc.kitchenQuantity + state.kitchenQuantity,
                                    kitchenRound: state.kitchenRound || acc.kitchenRound,
                                  };
                                }, { totalQuantity: 0, kitchenQuantity: 0, kitchenRound: 1 });
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
                                    totalQuantity={groupCartState.totalQuantity}
                                    kitchenQuantity={groupCartState.kitchenQuantity}
                                    kitchenRound={groupCartState.kitchenRound}
                                    onQuantityChange={handleItemQuantityChange}
                                  />
                                );
                              } else {
                                const item = group[0];
                                const cartState = getItemCartState(item.id);
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
                                    simpleQuantity={cartState.simpleQuantity}
                                    totalQuantity={cartState.totalQuantity}
                                    kitchenQuantity={cartState.kitchenQuantity}
                                    kitchenRound={cartState.kitchenRound}
                                    onQuantityChange={handleItemQuantityChange}
                                  />
                                );
                              }
                            })}
                          </div>
                        </div>
                      ))}

                    {activeCategory !== 'all' && activeCategory !== 'special-deals' && (!menuItemsByCategory[activeCategory] || menuItemsByCategory[activeCategory].length === 0) && (
                      <div className="text-center py-12">
                        <p className="text-sm text-muted-foreground">No dishes found in {activeCategory}.</p>
                        <Button variant="outline" size="sm" onClick={() => handleCategoryClick('all')} className="mt-3 rounded-full text-xs">
                          View All Dishes
                        </Button>
                      </div>
                    )}

                    {activeCategory === 'special-deals' && discountedItems.length === 0 && (
                      <div className="text-center py-12">
                        <p className="text-sm text-muted-foreground">No special deals currently active.</p>
                        <Button variant="outline" size="sm" onClick={() => handleCategoryClick('all')} className="mt-3 rounded-full text-xs">
                          View All Dishes
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {vendorMenuItems.length === 0 && !isSearching && (
              <p className="text-center text-muted-foreground py-12">
                This vendor has not added any menu items yet.
              </p>
            )}
          </div>
        </div>
      </div>
      <OrderCustomizationSheet
        item={selectedItem}
        vendor={vendor}
        open={!!selectedItem}
        onOpenChange={handleCloseCustomization}
        onAdd={(isVendorOwner || isDineInMode) ? (item, selectedOptions, quantity) => {
          handleAddToTableOrder(item, quantity, selectedOptions);
        } : undefined}
      />

      {/* Floating Bottom Dine-In Order Bar */}
      <DineInFloatingBar
        isVisible={!!((isVendorOwner || isDineInMode) && isTableHost && tableOrderItems.length > 0 && !isTableOrderSheetVisible)}
        activeTableId={activeTableId}
        activeTableOrder={activeTableOrder}
        tableOrderTotalCount={tableOrderTotalCount}
        tableOrderTotal={tableOrderTotal}
        tableOrderThumbnails={tableOrderThumbnails}
        onOpenSheet={() => setIsTableOrderSheetVisible(true)}
      />

      {/* Zomato-Style Left Floating Menu Chip */}
      <FloatingMenuChip
        vendorCategories={vendorCategories}
        activeCategory={activeCategory}
        onSelectCategory={handleCategoryClick}
        categoryItemCounts={categoryItemCounts}
        totalCategoryItemsCount={totalCategoryItemsCount}
        discountedItemsCount={discountedItems.length}
        getCategoryThumbnail={getCategoryThumbnail}
        hasBottomBar={!!((isVendorOwner || isDineInMode) && isTableHost && tableOrderItems.length > 0 && !isTableOrderSheetVisible)}
        activeSpecials={activeSpecials}
      />

      {/* Dine-In Order Sheet / Drawer */}
      <DineInTableOrderSheet
        isOpen={!!((isVendorOwner || isDineInMode) && isTableOrderSheetVisible)}
        onClose={() => setIsTableOrderSheetVisible(false)}
        orderIdToEdit={orderIdToEdit}
        activeTableOrder={activeTableOrder}
        activeTableId={activeTableId}
        vendor={vendor}
        onSelectTable={(tableNum) => setTableId(tableNum)}
        dineInNotes={dineInNotes}
        onDineInNotesChange={setDineInNotes}
        tableOrderItems={tableOrderItems}
        onQuantityChange={handleTableOrderQuantityChange}
        onRemoveItem={(item) => setTableOrderItems(prev => prev.filter(i => (i.cartItemId || i.id) !== (item.cartItemId || item.id)))}
        tableOrderTotal={tableOrderTotal}
        showMinAmountWarning={showMinAmountWarning}
        minAmount={minAmount}
        onPlaceOrUpdateOrder={handlePlaceOrUpdateOrder}
        isUpdateDisabled={isUpdateDisabled}
        isPlacingTableOrder={isPlacingTableOrder}
      />

      <UniversalTablePickerDialog
        open={isUniversalPickerOpen}
        onOpenChange={setIsUniversalPickerOpen}
        vendor={vendor}
        activeTableId={activeTableId}
        occupiedTableIds={occupiedTableIds}
        onSelectTable={(tableNum) => {
          setTableId(tableNum);
          setIsUniversalPickerOpen(false);
          toast({
            title: `Table ${tableNum} Selected`,
            description: "You can now add dishes to order directly to your table.",
          });
          if (pendingItemToAdd) {
            handleAddToTableOrder(pendingItemToAdd.item, pendingItemToAdd.quantity);
            setPendingItemToAdd(null);
          }
        }}
      />

      <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />
      <PortionSelectDialog
        items={portionSelectItems}
        open={!!portionSelectItems}
        isVendorOwner={!!isVendorOwner}
        isDineInMode={!!isDineInMode}
        vendor={vendor}
        onOpenChange={() => setPortionSelectItems(null)}
        onAddToCart={(item, quantity) => {
          const forceSelfPickup = deliveryChoiceForPortionSelect === 'yes';
          handleAddToCartWithDialogCheck(item, {}, quantity, forceSelfPickup);
          setDeliveryChoiceForPortionSelect(null);
        }}
        onAddToTableOrder={handleAddToTableOrder}
      />
      <SelfPickupDialog
        open={selfPickupDialogState.open}
        item={selfPickupDialogState.item}
        items={selfPickupDialogState.items}
        minOrderAmount={vendor?.minOrderAmount || 0}
        onClose={handleSelfPickupDialogClose}
      />
    </>
  );
}

function VendorPublicMenuPageInner() {
  const { categories } = useMenu();
  const params = useParams();
  const searchParams = useSearchParams();
  const identifier = params.username as string;
  const { vendors } = useAppVendor();
  const vendor = vendors.find(v => v.slug === identifier || v.username === identifier) || null;

  const urlTable = searchParams.get('table');
  const [tableId, setTableId] = useState<string>(urlTable || '');

  useEffect(() => {
    if (urlTable) {
      setTableId(urlTable);
      if (vendor) {
        localStorage.setItem(`dineInTable_${vendor.username}`, urlTable);
      }
    } else {
      // If there is no ?table in the URL, clear table context so online delivery customers aren't stuck on a past table
      setTableId('');
    }
  }, [urlTable, vendor]);

  const handleSetTableId = (newTable: string) => {
    setTableId(newTable);
    if (vendor) {
      if (newTable) {
        localStorage.setItem(`dineInTable_${vendor.username}`, newTable);
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.set('table', newTable);
          window.history.replaceState({}, '', url.pathname + url.search);
          window.dispatchEvent(new Event('dineintablechange'));
        }
      } else {
        localStorage.removeItem(`dineInTable_${vendor.username}`);
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('table');
          window.history.replaceState({}, '', url.pathname + (url.search || ''));
          window.dispatchEvent(new Event('dineintablechange'));
        }
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header pageVendor={vendor} tableId={tableId} />
      <main className="flex-1">
        <VendorMenuContent
          categories={categories}
          tableId={tableId}
          setTableId={handleSetTableId}
        />
      </main>
    </div>
  );
}

export default function VendorPublicMenuPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    }>
      <VendorPublicMenuPageInner />
    </Suspense>
  );
}
