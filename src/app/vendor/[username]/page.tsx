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

type TableOrderItem = MenuItemType & {
  quantity: number;
  finalPrice: number;
  cartItemId?: string;
  customizationDetails?: Record<string, string | string[]>;
  selectedOptionsText?: string;
};

const getOrderNotes = (notes: any, vendorUsername?: string): string => {
  if (!notes) return '';
  if (typeof notes === 'string') return notes.trim();
  if (typeof notes === 'object') {
    if (vendorUsername && notes[vendorUsername]) return String(notes[vendorUsername]).trim();
    const vals = Object.values(notes).filter(Boolean);
    return vals.join(' | ').trim();
  }
  return '';
};

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
    <div
      ref={itemRef}
      className={cn(
        "flex items-start justify-between gap-3 p-3 sm:p-3.5 rounded-2xl border border-border/60 bg-card transition-all duration-200 relative group",
        isItemEffectivelyAvailable
          ? "cursor-pointer hover:border-primary/40 hover:shadow-xs hover:bg-card/95"
          : "opacity-60 grayscale-[0.5] cursor-not-allowed bg-muted/20"
      )}
      onClick={() => isItemEffectivelyAvailable && onRowClick(item)}
    >
      {/* Left: Dietary Icon, Dish Details & Pricing */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-1.5 mb-1">
          {/* Veg/Non-Veg icon */}
          <span
            className={cn(
              "w-3.5 h-3.5 rounded-xs border flex items-center justify-center bg-background shrink-0",
              item.isVeg ? "border-emerald-600" : "border-red-600"
            )}
            title={item.isVeg ? "Vegetarian" : "Non-Vegetarian"}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                item.isVeg ? "bg-emerald-600" : "bg-red-600"
              )}
            />
          </span>

          {hasDiscount && (
            <span className="text-[8px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              Offer
            </span>
          )}
        </div>

        <h4 className="font-bold text-xs sm:text-sm text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-1">
          {item.name}
        </h4>

        {item.description && (
          <p className="text-[11px] text-muted-foreground line-clamp-1 sm:line-clamp-2 mt-0.5 leading-relaxed">
            {item.description}
          </p>
        )}

        <div className="flex items-baseline gap-1.5 mt-1.5 flex-wrap">
          {isCustomizable && (
            <span className="text-[9px] text-muted-foreground font-semibold">From</span>
          )}
          <span className="text-sm sm:text-base font-extrabold text-foreground tracking-tight">
            ₹{displayPrice.toFixed(0)}
          </span>
          {hasDiscount && item.price > 0 && (
            <span className="text-[11px] text-muted-foreground line-through font-medium">
              ₹{item.price.toFixed(0)}
            </span>
          )}
        </div>

        {typeof item.stock === 'number' && item.stock > 0 && !item.customizations?.length && (vendor?.isInventory || vendor?.category === 'Bakery' || item.stock <= 5) && (
          <p className={cn(
            "text-[10px] font-bold mt-1",
            item.stock <= 5 ? "text-destructive" : "text-amber-600 dark:text-amber-400"
          )}>
            Only {item.stock} left!
          </p>
        )}
      </div>

      {/* Right: Food Thumbnail & Add Button */}
      <div className="flex flex-col items-center shrink-0">
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-muted/60 border border-border/50 shadow-2xs">
          <motion.div
            layoutId={layoutId}
            className="w-full h-full relative cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onImageClick(item, layoutId);
            }}
          >
            <Image
              src={imageToDisplay || 'https://placehold.co/100x100.png'}
              alt={item.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
              data-ai-hint={item.aiHint}
              placeholder={item.blurDataUrl ? 'blur' : 'empty'}
              blurDataURL={item.blurDataUrl}
            />
          </motion.div>

          {/* Sold Out / Unavailable Overlay */}
          {!isItemEffectivelyAvailable && (
            <div className="absolute inset-0 bg-background/85 backdrop-blur-xs flex items-center justify-center z-10 p-1">
              <span className="text-[9px] font-extrabold text-destructive text-center uppercase tracking-wider">
                {!isShopOpen ? (shopStatus?.msg || 'Closed') : (!isEffectivelyInStock ? 'Sold Out' : 'Out')}
              </span>
            </div>
          )}
        </div>

        {/* Tactile + ADD Button */}
        {isItemEffectivelyAvailable && (
          <div className="w-16 -mt-3.5 z-10 flex flex-col items-center">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 rounded-full border-2 border-primary text-primary font-extrabold text-[11px] bg-background hover:bg-primary hover:text-primary-foreground shadow-sm transition-all uppercase tracking-wider flex items-center justify-center gap-0.5 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onRowClick(item);
              }}
            >
              ADD {isCustomizable && <ChevronDown className="h-3 w-3" />}
            </Button>
            {isCustomizable && (
              <span className="text-[8px] text-muted-foreground text-center block mt-0.5 font-semibold">
                customisable
              </span>
            )}
          </div>
        )}
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
    <div
      ref={itemRef}
      className={cn(
        "flex items-start justify-between gap-3 p-3 sm:p-3.5 rounded-2xl border border-border/60 bg-card transition-all duration-200 relative group",
        isEffectivelyAvailable
          ? "cursor-pointer hover:border-primary/40 hover:shadow-xs hover:bg-card/95"
          : "opacity-60 grayscale-[0.5] cursor-not-allowed bg-muted/20"
      )}
      onClick={() => isEffectivelyAvailable && onRowClick(items)}
    >
      {/* Left: Dish Details & Portions */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-1.5 mb-1">
          <span
            className={cn(
              "w-3.5 h-3.5 rounded-xs border flex items-center justify-center bg-background shrink-0",
              primaryItem.isVeg ? "border-emerald-600" : "border-red-600"
            )}
            title={primaryItem.isVeg ? "Vegetarian" : "Non-Vegetarian"}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                primaryItem.isVeg ? "bg-emerald-600" : "bg-red-600"
              )}
            />
          </span>
          <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground border border-border/50">
            2 Portions
          </span>
        </div>

        <h4 className="font-bold text-xs sm:text-sm text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-1">
          {baseName}
        </h4>

        {primaryItem.description && (
          <p className="text-[11px] text-muted-foreground line-clamp-1 sm:line-clamp-2 mt-0.5 leading-relaxed">
            {primaryItem.description}
          </p>
        )}

        <div className="flex items-baseline gap-1.5 mt-1.5 text-xs sm:text-sm font-extrabold text-foreground flex-wrap">
          {halfPrice !== null && (
            <span className="bg-muted/80 px-2.5 py-0.5 rounded-full border border-border/50 text-[11px] font-bold">
              Half: ₹{halfPrice.toFixed(0)}
            </span>
          )}
          {fullPrice !== null && (
            <span className="bg-muted/80 px-2.5 py-0.5 rounded-full border border-border/50 text-[11px] font-bold">
              Full: ₹{fullPrice.toFixed(0)}
            </span>
          )}
        </div>

        <div className="text-[10px] text-destructive font-bold mt-1 space-x-1.5">
          {typeof halfStock === 'number' && halfStock > 0 && (vendor?.isInventory || vendor?.category === 'Bakery' || halfStock <= 5) && <span>Only {halfStock} half left! </span>}
          {typeof fullStock === 'number' && fullStock > 0 && (vendor?.isInventory || vendor?.category === 'Bakery' || fullStock <= 5) && <span>Only {fullStock} full left!</span>}
        </div>
      </div>

      {/* Right: Food Thumbnail & Add Button */}
      <div className="flex flex-col items-center shrink-0">
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-muted/60 border border-border/50 shadow-2xs">
          <motion.div
            layoutId={layoutId}
            className="w-full h-full relative cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onImageClick(primaryItem, layoutId);
            }}
          >
            <Image
              src={imageToDisplay || 'https://placehold.co/100x100.png'}
              alt={baseName}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
              data-ai-hint={primaryItem.aiHint}
              placeholder={primaryItem.blurDataUrl ? 'blur' : 'empty'}
              blurDataURL={primaryItem.blurDataUrl}
            />
          </motion.div>

          {!isEffectivelyAvailable && (
            <div className="absolute inset-0 bg-background/85 backdrop-blur-xs flex items-center justify-center z-10 p-1">
              <span className="text-[9px] font-extrabold text-destructive text-center uppercase tracking-wider">
                {!isShopOpen ? (shopStatus?.msg || 'Closed') : 'Sold Out'}
              </span>
            </div>
          )}
        </div>

        {isEffectivelyAvailable && (
          <div className="w-16 -mt-3.5 z-10 flex flex-col items-center">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 rounded-full border-2 border-primary text-primary font-extrabold text-[11px] bg-background hover:bg-primary hover:text-primary-foreground shadow-sm transition-all uppercase tracking-wider flex items-center justify-center gap-0.5 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onRowClick(items);
              }}
            >
              ADD <ChevronDown className="h-3 w-3" />
            </Button>
            <span className="text-[8px] text-muted-foreground text-center block mt-0.5 font-semibold">
              select portion
            </span>
          </div>
        )}
      </div>
    </div>
  );
};


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
          <div className={cn(
            "rounded-2xl border border-border/70 bg-card/95 backdrop-blur-md shadow-xs max-w-5xl mx-auto",
            isDineInMode ? "p-2.5 sm:p-3.5 mb-3" : "p-3.5 sm:p-4 mb-4"
          )}>
            {/* Top Row: Brand, Live Status, and Table/Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
              {/* Brand & Status */}
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="relative w-11 h-11 sm:w-13 sm:h-13 rounded-2xl overflow-hidden border border-border/60 shadow-xs bg-muted shrink-0">
                  <Image
                    src={vendor.shopImage || 'https://placehold.co/224x224.png'}
                    alt={vendor.shopName || 'Vendor'}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-headline text-base sm:text-xl font-black text-foreground tracking-tight truncate">
                      {vendor.shopName}
                    </h1>
                    {/* Live Status Badge */}
                    {(() => {
                      const statusInfo = VendorStatusManager.getShopStatus(vendor);
                      const isOpen = statusInfo.status === VendorStatus.OPEN;
                      const isTempClosed = statusInfo.status === VendorStatus.CLOSED_TEMP;

                      let badgeColor = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
                      let pulseColor = 'bg-emerald-500';

                      if (isTempClosed) {
                        badgeColor = 'bg-destructive/15 text-destructive border-destructive/30';
                        pulseColor = 'bg-destructive';
                      } else if (!isOpen) {
                        badgeColor = 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
                        pulseColor = 'bg-amber-500';
                      }

                      return (
                        <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold border shadow-2xs", badgeColor)}>
                          <span className="relative flex h-1.5 w-1.5">
                            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", pulseColor)} />
                            <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", pulseColor)} />
                          </span>
                          <span>{statusInfo.msg}</span>
                        </span>
                      );
                    })()}
                  </div>
                  {!isDineInMode && vendor.tagline && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {vendor.tagline}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Cluster: Dine-In Table Capsule + PDF Download */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                {vendor?.canAcceptDineIn && (
                  activeTableId ? (
                    <div className="inline-flex items-center gap-1.5 p-1 sm:p-1.5 rounded-full bg-primary/10 border border-primary/25 shadow-2xs">
                      <div className="flex items-center gap-1 px-2 text-xs font-extrabold text-foreground">
                        <Utensils className="h-3.5 w-3.5 text-primary" />
                        <span>Table {activeTableId}</span>
                      </div>
                      {locationVerified === true && (
                        <span title="In-store location verified" className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          <ShieldCheck className="h-3 w-3" /> Verified
                        </span>
                      )}
                      {locationVerified === false && (
                        <span title="Location unverified" className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          <AlertCircle className="h-3 w-3" /> Unverified
                        </span>
                      )}

                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs font-bold rounded-full border-primary/30 text-primary hover:bg-primary/10 gap-1 px-3"
                      onClick={() => setIsUniversalPickerOpen(true)}
                    >
                      <Utensils className="h-3 w-3" />
                      <span>Select Table</span>
                    </Button>
                  )
                )}

                <Button
                  onClick={generatePdf}
                  size="sm"
                  variant="outline"
                  className="h-7 sm:h-8 px-3 rounded-full text-xs font-bold gap-1 text-muted-foreground hover:text-foreground border-border/80 shadow-2xs"
                  title="Download Menu PDF"
                >
                  <Download className="h-3 w-3 text-primary" />
                  <span className="hidden md:inline">Menu PDF</span>
                </Button>
              </div>
            </div>

            {/* Bottom Metadata Strip: Address, Hours, Phone (Home Delivery only - Hidden for in-store Dine-In) */}
            {!isDineInMode && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2.5 mt-2.5 border-t border-border/40 text-[11px] sm:text-xs text-muted-foreground">
                {vendor.workingHours && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-primary shrink-0" />
                    <span>{vendor.workingHours}</span>
                  </div>
                )}
                {vendor.address && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-primary shrink-0" />
                    <span className="truncate max-w-[200px] sm:max-w-[320px]">{vendor.address}</span>
                    {vendor.googleMapsUrl && (
                      <a
                        href={vendor.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-0.5 font-bold"
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                )}
                {vendor.contact && (
                  <a
                    href={`tel:${vendor.contact}`}
                    className="flex items-center gap-1 hover:text-primary font-medium transition-colors"
                  >
                    <Phone className="h-3 w-3 text-primary shrink-0" />
                    <span>{vendor.contact.replace('+91', '')}</span>
                  </a>
                )}
                {vendor.minOrderAmount && vendor.minOrderAmount > 0 ? (
                  <div className="flex items-center gap-1 text-primary font-medium">
                    <Info className="h-3 w-3 shrink-0" />
                    <span>Min ₹{vendor.minOrderAmount}</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Live Kitchen Status Widget */}
          {activeTableOrder && (
            <div className="mb-4 max-w-5xl mx-auto">
              <Card className="rounded-2xl border-2 border-primary/40 bg-card shadow-lg overflow-hidden">
                <div className="p-3 sm:p-4 bg-primary/5 border-b border-border/60 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs shrink-0">
                      <ChefHat className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-sm sm:text-base text-foreground">
                          Kitchen Status • Table {activeTableOrder.tableId}
                        </h3>
                        <Badge variant="outline" className={cn(
                          "font-extrabold text-[10px] uppercase tracking-wider",
                          activeTableOrder.status === 'Processing' ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" :
                          activeTableOrder.status === 'Order Placed' ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" :
                          "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        )}>
                          {activeTableOrder.status === 'Order Placed' ? '⏳ Sent to Kitchen' :
                           activeTableOrder.status === 'Processing' ? '👨‍🍳 Cooking in Kitchen' :
                           activeTableOrder.status === 'Out for Delivery' ? '🍽️ Being Served' :
                           activeTableOrder.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Order #{activeTableOrder.displayId || activeTableOrder.orderId?.slice(-6)} • Round {activeTableOrder.orderRound || 1}
                      </p>
                    </div>
                  </div>

                  {activeTableOrder.status === 'Order Placed' && graceSecondsLeft > 0 ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold animate-pulse">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Edit Window: {Math.floor(graceSecondsLeft / 60)}:{(graceSecondsLeft % 60).toString().padStart(2, '0')}</span>
                    </div>
                  ) : activeTableOrder.status === 'Processing' ? (
                    <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                      <ChefHat className="h-3.5 w-3.5" /> Cooking in Progress
                    </div>
                  ) : null}
                </div>

                <CardContent className="p-3 sm:p-4 space-y-3">
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Dishes in this Order</div>
                    <div className="divide-y divide-border/40">
                      {activeTableOrder.items.map((item, idx) => {
                        const itemIdKey = item.cartItemId || item.id || `dish-${idx}`;
                        const itemPrice = typeof item.price === 'number' ? item.price : ((item as any).finalPrice ?? 0);
                        const itemTotal = itemPrice * (item.quantity || 1);
                        return (
                          <div key={itemIdKey} className="py-2.5 flex items-center justify-between text-xs sm:text-sm gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                              <span className="font-bold text-foreground shrink-0">{item.quantity}x</span>
                              <div className="min-w-0">
                                <span className="font-semibold text-foreground break-words">{item.name}</span>
                                {item.selectedOptionsText && (
                                  <p className="text-[10px] text-muted-foreground">{item.selectedOptionsText}</p>
                                )}
                                {(item.round || 1) > 1 || (activeTableOrder.orderRound && activeTableOrder.orderRound > 1) ? (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground border ml-1.5 inline-block">
                                    Round {item.round || 1}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                              <span className="font-bold text-foreground text-xs sm:text-sm whitespace-nowrap">
                                ₹{itemTotal.toFixed(2)}
                              </span>

                              {item.served ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 whitespace-nowrap">
                                  <CheckCircle2 className="h-3 w-3" /> Served
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 whitespace-nowrap">
                                  <ChefHat className="h-3 w-3" /> Cooking
                                </span>
                              )}

                              {isTableHost && activeTableOrder.status === 'Order Placed' && graceSecondsLeft > 0 && !item.served && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6 rounded-full border-destructive/40 text-destructive hover:bg-destructive hover:text-white shrink-0"
                                  title="Reduce quantity or remove dish"
                                  onClick={() => handleReduceActiveOrderItem(itemIdKey)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {(() => {
                    const notesText = getOrderNotes(activeTableOrder.customNotes, vendor?.username);
                    if (!notesText) return null;
                    return (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2 shadow-2xs">
                        <MessageSquare className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <span className="font-extrabold text-[11px] uppercase tracking-wider block text-amber-700 dark:text-amber-300">Special Instructions for Chef</span>
                          <span className="break-words font-medium">{notesText}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {activeTableOrder.status === 'Processing' && (
                    <p className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/50">
                      🔒 Dishes are currently cooking in the kitchen. To modify or cancel any dish, please notify your server.
                    </p>
                  )}

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/60">
                    <div className="text-xs">
                      <span className="text-muted-foreground">Order Total: </span>
                      <span className="font-extrabold text-foreground">₹{activeTableOrder.totalPrice.toFixed(2)}</span>
                      <span className="text-muted-foreground ml-2">(Pay at Counter)</span>
                    </div>

                    {isTableHost ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full text-xs font-bold border-primary text-primary hover:bg-primary hover:text-primary-foreground gap-1.5 shadow-2xs"
                        onClick={() => {
                          toast({
                            title: `Menu open for Round ${(activeTableOrder.orderRound || 1) + 1}`,
                            description: "Select dishes from the menu below to add more items to your table.",
                          });
                          window.scrollBy({ top: 220, behavior: 'smooth' });
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" /> Add More Items (Round {(activeTableOrder.orderRound || 1) + 1})
                      </Button>
                    ) : (
                      <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-3 py-1 rounded-full border border-border/40 flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Managed by Table Host
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
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

          {/* Sticky Interactive Category Pills Bar */}
          {!isSearching && vendorCategories.length > 0 && (
            <div className={cn("sticky top-[60px] bg-background/95 backdrop-blur-md z-40 -mx-4 px-4 border-y border-border/60 overflow-x-auto no-scrollbar shadow-xs", isDineInMode ? "py-2 my-2.5 sm:my-3" : "py-2.5 my-4")}>
              <div className="flex items-center gap-2 max-w-5xl mx-auto">
                {discountedItems.length > 0 && (
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-3.5 py-1 text-xs font-bold rounded-full transition-all cursor-pointer shrink-0 bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25"
                    onClick={() => {
                      const el = categoryRefs.current['discounted-section'];
                      if (el) {
                        const yOffset = -140;
                        const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                        window.scrollTo({ top: y, behavior: 'smooth' });
                      }
                    }}
                  >
                    <Tag className="h-3 w-3 text-amber-500" />
                    Special Deals ({discountedItems.length})
                  </button>
                )}

                {vendorCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className="px-3.5 py-1 text-xs font-bold rounded-full transition-all cursor-pointer shrink-0 bg-muted/70 hover:bg-primary hover:text-primary-foreground text-foreground border border-border/50 shadow-2xs"
                    onClick={() => handleCategoryClick(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Menu Sections Grid */}
          <div className="mt-4">
            {isSearching ? (
              <>
                {Object.keys(menuItemsByCategory).length > 0 ? (
                  Object.entries(menuItemsByCategory).map(([category, itemGroups]) => (
                    <div key={category} className="mb-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
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
                  <p className="text-center text-muted-foreground py-12">No dishes match your search.</p>
                )}
              </>
            ) : (
              <>
                {/* Discounted Items Section */}
                {discountedItems.length > 0 && (
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
                  </div>
                )}

                {/* Categorized Menu Sections */}
                {Object.entries(menuItemsByCategory).map(([category, itemGroups]) => (
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
      {(isVendorOwner || isDineInMode) && isTableHost && tableOrderItems.length > 0 && !isTableOrderSheetVisible && (
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-4 inset-x-3 sm:inset-x-auto sm:right-6 z-40 sm:w-[420px]"
        >
          <div
            onClick={() => {
              setIsTableOrderSheetVisible(true);
              setIsTableOrderSheetMinimized(false);
            }}
            className="cursor-pointer group flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#0b132b]/95 via-[#141e3a]/90 to-[#0b132b]/95 text-white p-3 sm:p-3.5 shadow-[0_12px_36px_rgba(11,19,43,0.55)] border border-blue-400/30 backdrop-blur-xl hover:border-blue-400/60 hover:shadow-[0_14px_44px_rgba(37,99,235,0.35)] transition-all duration-300"
          >
            {/* Left Section: Stacked Dish Avatars & Order Info */}
            <div className="flex items-center gap-3 min-w-0">
              {tableOrderThumbnails.length > 0 ? (
                <div className="flex items-center -space-x-5 shrink-0">
                  {tableOrderThumbnails.map((thumb, index) => (
                    <div
                      key={`${thumb.id}-${index}`}
                      className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-[#0b132b] shadow-md ring-1 ring-blue-400/30"
                      style={{ zIndex: 10 - index }}
                    >
                      <Image
                        src={thumb.image}
                        alt={thumb.name}
                        fill
                        sizes="44px"
                        className="object-cover"
                        unoptimized={typeof thumb.image === 'string' && thumb.image.startsWith('data:')}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-md shrink-0">
                  <Utensils className="h-5 w-5" />
                </div>
              )}

              <div className="flex flex-col min-w-0">
                <span className="text-[11px] sm:text-xs text-blue-200/90 font-medium truncate">
                  Table {activeTableId || 'Order'}{activeTableOrder ? ` • Round ${(activeTableOrder.orderRound || 1) + 1}` : ''} • {tableOrderTotalCount} {tableOrderTotalCount === 1 ? 'Item' : 'Items'}
                </span>
                <span className="font-black text-base sm:text-lg text-white tracking-tight">
                  ₹{tableOrderTotal.toFixed(0)}
                </span>
              </div>
            </div>

            {/* Right Section: View Order Action */}
            <div className="flex items-center gap-1.5 text-white font-bold text-xs sm:text-sm px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 shadow-md transition-all shrink-0 ml-2 group-hover:scale-[1.02]">
              <span>View Order</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </motion.div>
      )}

      {/* Dine-In Order Sheet / Drawer */}
      {(isVendorOwner || isDineInMode) && (
        <AnimatePresence>
          {isTableOrderSheetVisible && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="fixed bottom-4 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 max-w-sm"
            >
              <Card className="w-full shadow-2xl rounded-3xl border-2 border-primary/20 bg-card/95 backdrop-blur-md overflow-hidden">
                <CardHeader
                  className={cn(
                    "flex flex-row items-center justify-between p-3.5 bg-primary/5 border-b border-border/40",
                    "cursor-pointer"
                  )}
                  onClick={() => setIsTableOrderSheetMinimized(!isTableOrderSheetMinimized)}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                      <Utensils className="h-3.5 w-3.5" />
                    </div>
                    <CardTitle className="text-sm sm:text-base font-extrabold text-foreground">
                      {orderIdToEdit
                        ? `Editing: #${orderIdToEdit.split('-')[1] || orderIdToEdit}`
                        : activeTableOrder
                        ? `Table ${activeTableId} • Round ${(activeTableOrder.orderRound || 1) + 1}`
                        : `Table ${activeTableId || 'Selection'} • Dine-In`}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full"
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsTableOrderSheetVisible(false);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                {!isTableOrderSheetMinimized && (
                  <>
                    <CardContent className="px-3.5 py-3 space-y-3.5">
                      {!orderIdToEdit && !activeTableId && (
                        <div className="space-y-1.5">
                          <Label htmlFor="table-id-selector" className="text-xs font-bold">Select Table Number</Label>
                          <div id="table-id-selector" className="flex flex-wrap gap-1.5">
                            {Array.from({ length: vendor?.dineInTables ?? 6 }, (_, i) => i + 1).map((number) => (
                              <Button
                                key={number}
                                type="button"
                                variant={activeTableId === `${number}` ? 'default' : 'outline'}
                                size="sm"
                                className="h-7 w-7 p-0 rounded-full font-bold text-xs"
                                onClick={() => setTableId(`${number}`)}
                              >
                                {number}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="space-y-1">
                        <Label htmlFor="dine-in-notes" className="text-xs font-semibold">Special Instructions for Chef</Label>
                        <Textarea
                          id="dine-in-notes"
                          placeholder="e.g., extra spicy, no onions, serve hot..."
                          rows={2}
                          value={dineInNotes}
                          onChange={(e) => setDineInNotes(e.target.value)}
                          className="text-xs rounded-xl"
                        />
                      </div>
                      <ScrollArea className="h-44">
                        <div className="space-y-2 pr-3">
                          {tableOrderItems.length > 0 ? tableOrderItems.map((item, idx) => (
                            <div key={item.cartItemId || item.id || idx} className="flex justify-between items-center text-xs p-1.5 rounded-xl hover:bg-muted/40 transition-colors">
                              <div className="flex-1 pr-2">
                                <span className="font-semibold block text-foreground">{item.name}</span>
                                {item.selectedOptionsText && (
                                  <span className="text-[10px] text-muted-foreground block">{item.selectedOptionsText}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6 rounded-full border-destructive text-destructive hover:bg-destructive hover:text-white"
                                  onClick={() => handleTableOrderQuantityChange(item.id, -1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-5 text-center font-bold text-xs">{item.quantity}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6 rounded-full border-primary text-primary hover:bg-primary hover:text-white"
                                  onClick={() => handleTableOrderQuantityChange(item.id, 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              <span className="font-bold w-12 text-right">₹{(item.finalPrice * item.quantity).toFixed(2)}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 ml-1 text-muted-foreground hover:text-destructive"
                                onClick={() => setTableOrderItems(prev => prev.filter(i => (i.cartItemId || i.id) !== (item.cartItemId || item.id)))}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )) : <p className="text-center text-xs text-muted-foreground pt-10">No items added to this order yet.</p>}
                        </div>
                      </ScrollArea>
                    </CardContent>
                    <CardFooter className="flex-col gap-2 p-3.5 bg-muted/20 border-t border-border/40">
                      <div className="flex justify-between w-full font-extrabold text-sm">
                        <span>Total (Pay at Counter):</span>
                        <span className="text-primary">₹{tableOrderTotal.toFixed(2)}</span>
                      </div>
                      {showMinAmountWarning && (
                        <p className="text-xs text-destructive text-center">
                          The total must be at least ₹{minAmount.toFixed(2)} to update the order.
                        </p>
                      )}
                      <Button
                        className="w-full h-10 rounded-full font-extrabold text-xs tracking-wider uppercase shadow-md"
                        onClick={handlePlaceOrUpdateOrder}
                        disabled={isUpdateDisabled || tableOrderItems.length === 0 || (!orderIdToEdit && !activeTableId.trim()) || isPlacingTableOrder}
                      >
                        {isPlacingTableOrder ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : orderIdToEdit ? (
                          'Update Order'
                        ) : activeTableOrder ? (
                          `Send Round ${(activeTableOrder.orderRound || 1) + 1} to Kitchen`
                        ) : (
                          'Send Order to Kitchen'
                        )}
                      </Button>
                    </CardFooter>
                  </>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Universal Table Picker Dialog */}
      <Dialog open={isUniversalPickerOpen} onOpenChange={setIsUniversalPickerOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl text-center flex items-center justify-center gap-2">
              <Utensils className="h-5 w-5 text-primary" /> Select Your Table
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              Choose the table you are currently seated at in {vendor?.shopName || 'the restaurant'}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 max-h-60 overflow-y-auto p-1">
              {Array.from({ length: vendor?.dineInTables ?? 6 }, (_, i) => i + 1).map((tableNum) => {
                const isSelected = activeTableId === `${tableNum}`;
                const isOccupied = occupiedTableIds.has(`${tableNum}`);
                const isDisabled = isOccupied && !isSelected;

                return (
                  <Button
                    key={tableNum}
                    type="button"
                    disabled={isDisabled}
                    variant={isSelected ? 'default' : isOccupied ? 'secondary' : 'outline'}
                    className={cn(
                      "h-12 text-sm font-extrabold rounded-2xl flex flex-col items-center justify-center transition-all relative",
                      isSelected && "shadow-md scale-105 border-primary",
                      isDisabled && "opacity-50 cursor-not-allowed bg-muted/60 border-dashed text-muted-foreground",
                      !isDisabled && !isSelected && "hover:border-primary/50"
                    )}
                    onClick={() => {
                      if (isDisabled) return;
                      setTableId(`${tableNum}`);
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
                  >
                    <span className="text-[10px] font-medium opacity-75">T</span>
                    <span>{tableNum}</span>
                    {isOccupied && (
                      <span className="text-[9px] font-semibold text-rose-500 uppercase tracking-wider scale-90">
                        Busy
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
  isDineInMode,
  onAddToCart,
  onAddToTableOrder,
  vendor,
}: {
  items: MenuItemType[] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isVendorOwner?: boolean;
  isDineInMode?: boolean;
  onAddToCart?: (item: MenuItemType, quantity: number) => void;
  onAddToTableOrder?: (item: MenuItemType, quantity: number) => void;
  vendor?: Vendor | null;
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    if (open && items && items.length > 0) {
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

    if ((isVendorOwner || isDineInMode) && onAddToTableOrder) {
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
