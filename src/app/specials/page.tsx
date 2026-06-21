

'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { MenuItem as MenuItemType, SpecialMenu, SpecialMenuType, Vendor } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import OrderCustomizationSheet from '@/components/order-customization-sheet';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/header';
import { useCart } from '@/context/cart-context';
import { Star, Building, Loader2, Minus, Plus, Tag, Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSpecialMenu } from '@/context/special-menu-context';
import { useMenu } from '@/context/menu-context';
import { useVendor } from '@/context/vendor-context';
import { useOrder } from '@/context/order-context';
import { collection, onSnapshot, query, where, getDocs, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';


import { VendorStatusManager, isItemInStock } from '@/lib/vendorStatusManager';
import { VendorStatus } from '@/types';
import { cn } from '@/lib/utils';


const specialMenuTypes: SpecialMenuType[] = ['Breakfast', 'Lunch', 'Dinner', 'Evening Snacks'];

const ZoomedImageOverlay = ({
  item,
  onClose,
}: {
  item: { layoutId: string; image: string; name: string } | null;
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
          layoutId={item.layoutId}
        >
          <Image src={item.image || ''} alt={item.name} fill className="object-cover" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

const MenuItemCard = ({
  item,
  averageRating,
  ratingCount,
  vendor,
  onCustomize,
  onImageClick,
}: {
  item: MenuItemType;
  averageRating: number;
  ratingCount: number;
  vendor?: Vendor;
  onCustomize: () => void;
  onImageClick: (item: MenuItemType, layoutId: string) => void;
}) => {
  const { addToCart, getCartItemCount } = useCart();
  const quantityInCart = getCartItemCount(item.id);
  const layoutId = `image-${item.id}`;

  const shopStatus = useMemo(() => {
    return vendor ? VendorStatusManager.getShopStatus(vendor) : null;
  }, [vendor]);

  const isShopOpen = !shopStatus || shopStatus.status === VendorStatus.OPEN;
  const isItemEffectivelyAvailable = isItemInStock(item, vendor?.isInventory) && isShopOpen;

  const handleSimpleQuantityChange = (change: number) => {
    addToCart(item, {}, change);
  };

  const handleAdd = () => {
    if (item.customizations && item.customizations.length > 0) {
      onCustomize();
    } else {
      addToCart(item, {}, 1);
    }
  };

  const showImage = item.image && !item.image.includes('placehold.co');
  const hasDiscount = item.isDiscountActive && item.discountPrice && item.discountPrice > 0;
  const discountPercentage = hasDiscount
    ? Math.round(((item.price - item.discountPrice!) / item.price) * 100)
    : 0;

  const vendorName = vendor?.shopName || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-full"
    >
      <Card
        className={cn(
          "w-full h-full flex flex-col overflow-hidden border-primary/10 hover:border-primary/40 transition-all duration-300 hover:bg-card/95 rounded-3xl relative",
          !isItemEffectivelyAvailable && "bg-muted/50 border-muted-foreground/10 hover:border-muted-foreground/10"
        )}
      >
        {hasDiscount && (
          <div className="absolute top-2 right-2 z-10 bg-destructive text-destructive-foreground rounded-full px-2 py-1 text-[10px] font-bold flex items-center justify-center">
            <Tag className="h-3 w-3 mr-1" />
            <span>{discountPercentage}%</span>
          </div>
        )}
        <CardContent className="p-4 relative flex-1 flex flex-col">
          {!isItemEffectivelyAvailable && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-3xl">
              <p className="text-foreground font-bold text-lg text-center px-4">
                {!isShopOpen ? (shopStatus?.msg || 'Closed') : 'Out of Stock'}
              </p>
            </div>
          )}
          <div
            className={cn("flex flex-row items-start gap-4 flex-1", !isItemEffectivelyAvailable && "filter grayscale opacity-60")}
          >
            <div className="w-24 flex-shrink-0">
              {showImage && (
                <motion.div
                  layoutId={layoutId}
                  className="aspect-square relative rounded-2xl overflow-hidden cursor-pointer"
                  onClick={() => onImageClick(item, layoutId)}
                >
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 128px"
                    className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
                  />
                </motion.div>
              )}
              {ratingCount > 0 && (
                <div
                  className="flex items-center justify-center gap-1 text-xs text-amber-400 mt-2"
                  title="Item Rating"
                >
                  <Star className="h-3 w-3 fill-current" />
                  <span>{averageRating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({ratingCount})</span>
                </div>
              )}
            </div>
            <div className="flex-1 flex flex-col h-full">
              <div className="flex-grow">
                <h3 className="font-headline text-lg font-semibold">{item.name}</h3>
                <div className="flex items-center gap-4 mt-1 flex-wrap">
                  <div
                    className="flex items-center gap-2 text-xs text-amber-500"
                    title={`Vendor: ${vendorName}`}
                  >
                    <Building className="h-4 w-4" />
                    <span className="font-medium">{vendorName}</span>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm mt-2">{item.description}</p>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2 text-foreground">
                  {hasDiscount ? (
                    <>
                      <p className="text-sm">₹{item.discountPrice?.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground line-through">
                        ₹{item.price.toFixed(2)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm">₹{item.price.toFixed(2)}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {quantityInCart > 0 ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleSimpleQuantityChange(-1)}
                        disabled={!isItemEffectivelyAvailable}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="font-bold w-8 text-center">{quantityInCart}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleSimpleQuantityChange(1)}
                        disabled={!isItemEffectivelyAvailable}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={handleAdd}
                      variant="outline"
                      size="sm"
                      className="rounded-full border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white"
                      disabled={!isItemEffectivelyAvailable}
                    >
                      {item.customizations && item.customizations.length > 0
                        ? 'Customize'
                        : 'Add'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

function SpecialsPageContent() {
  const { specialMenus, fetchAllSpecialMenus } = useSpecialMenu();
  const { vendors, fetchAllVendors } = useVendor();
  const { orders } = useOrder();
  
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [isFetchingItems, setIsFetchingItems] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MenuItemType | null>(null);
  const [zoomedItem, setZoomedItem] = useState<{
    layoutId: string;
    image: string;
    name: string;
  } | null>(null);

  const searchParams = useSearchParams();
  const specialType = searchParams.get('type') as SpecialMenuType | null;
  const vendorIdentifier = searchParams.get('vendor') as string | null;

  const [currentTab, setCurrentTab] = useState<SpecialMenuType>(specialType || 'Breakfast');

  useEffect(() => {
    // Initial fetches
    fetchAllSpecialMenus();
    fetchAllVendors();
  }, [fetchAllSpecialMenus, fetchAllVendors]);

  useEffect(() => {
    // Real-time listener for menu items associated with active specials
    const activeSpecials = specialMenus.filter(s => s.isActive);
    const allItemIds = Array.from(new Set(activeSpecials.flatMap(s => s.itemIds)));

    if (allItemIds.length === 0) {
        setMenuItems([]);
        setIsFetchingItems(false);
        return () => {};
    }

    setIsFetchingItems(true);
    const itemBatches: string[][] = [];
    for (let i = 0; i < allItemIds.length; i += 30) {
        itemBatches.push(allItemIds.slice(i, i + 30));
    }

    const unsubscribers = itemBatches.map(batch => {
        if (batch.length === 0) return () => {};
        const q = query(collection(db, 'menuItems'), where('__name__', 'in', batch));
        return onSnapshot(q, (snapshot) => {
            const fetchedItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItemType));
            setMenuItems(prevItems => {
                const itemMap = new Map(prevItems.map(item => [item.id, item]));
                fetchedItems.forEach(item => itemMap.set(item.id, item));
                return Array.from(itemMap.values());
            });
            setIsFetchingItems(false);
        }, (error) => {
            console.error("Error fetching menu items for specials:", error);
            setIsFetchingItems(false);
        });
    });

    return () => {
        unsubscribers.forEach(unsub => unsub());
    };
  }, [specialMenus]);


  useEffect(() => {
    if (specialType && specialMenuTypes.includes(specialType)) {
      setCurrentTab(specialType);
    }
  }, [specialType]);


  const specialsToShow = useMemo(() => {
    const specialsToFilter = specialMenus.filter((special) => special.type === currentTab && special.isActive);

    const specialsWithItemsAndVendor = specialsToFilter
      .map((special) => {
        const specialVendor = vendors.find(v => v.username === special.vendorUsername);
        const items = special.itemIds
          .map((id) => menuItems.find((item) => item.id === id))
          .filter((item): item is MenuItemType => !!item && isItemInStock(item, specialVendor?.isInventory));
        return { ...special, items, vendor: specialVendor };
      }).filter(s => {
        if (!s.items.length || !s.vendor || !s.vendor.isApproved) return false;
        // Filter out if temporarily closed (emergency toggle)
        const shopStatus = VendorStatusManager.getShopStatus(s.vendor);
        return shopStatus.status !== VendorStatus.CLOSED_TEMP;
      });

    // Prioritize the vendor from the URL if specified
    if (vendorIdentifier) {
      specialsWithItemsAndVendor.sort((a, b) => {
        const aIsPrioritized = a.vendor?.slug === vendorIdentifier || a.vendor?.username === vendorIdentifier;
        const bIsPrioritized = b.vendor?.slug === vendorIdentifier || b.vendor?.username === vendorIdentifier;
        if (aIsPrioritized && !bIsPrioritized) return -1;
        if (!aIsPrioritized && bIsPrioritized) return 1;
        return 0;
      });
    }

    return specialsWithItemsAndVendor;
  }, [specialMenus, menuItems, vendors, currentTab, vendorIdentifier]);
  
  const { itemRatings } = useMemo(() => {
    const itemRatingsMap = new Map<string, { sum: number, count: number }>();
    orders.forEach(order => {
      if (order.status === 'Delivered') {
        order.items.forEach(item => {
          if (item.rating !== undefined) {
            const current = itemRatingsMap.get(item.id) || { sum: 0, count: 0 };
            itemRatingsMap.set(item.id, {
              sum: current.sum + item.rating,
              count: current.count + 1,
            });
          }
        });
      }
    });
    return { itemRatings: itemRatingsMap };
  }, [orders]);

  const getAverageRating = (menuItemId: string) => {
    const rating = itemRatings.get(menuItemId);
    if (!rating || rating.count === 0) return { average: 0, count: 0 };
    return { average: rating.sum / rating.count, count: rating.count };
  }

  const handleOpenCustomization = useCallback((item: MenuItemType) => {
    setSelectedItem(item);
  }, []);

  const handleCloseCustomization = useCallback((open: boolean) => {
    if (!open) {
      setSelectedItem(null);
    }
  }, []);

  const handleImageClick = (item: MenuItemType, layoutId: string) => {
    setZoomedItem({ layoutId, image: item.image, name: item.name });
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <AnimatePresence>
        {zoomedItem && (
          <ZoomedImageOverlay item={zoomedItem} onClose={() => setZoomedItem(null)} />
        )}
      </AnimatePresence>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/menu" passHref>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to All Menu
            </Button>
          </Link>
        </div>
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-center font-headline mb-4 flex items-center justify-center gap-2">
            <Sparkles className="text-primary" />
            Today's Specials
            <Sparkles className="text-primary" />
          </h2>
            <Tabs
              value={currentTab}
              onValueChange={(v) => setCurrentTab(v as SpecialMenuType)}
              className="w-full"
            >
              <TabsList className="flex-wrap h-auto justify-center rounded-full">
                {specialMenuTypes.map((type) => (
                  <TabsTrigger key={type} value={type} className="rounded-full">
                    {type}
                  </TabsTrigger>
                ))}
              </TabsList>
                <TabsContent value={currentTab}>
                  {isFetchingItems ? (
                      <div className="flex justify-center items-center py-16">
                          <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                      </div>
                  ) : specialsToShow.length > 0 ? (
                    <div className="space-y-6 mt-4">
                      {specialsToShow.map((special) =>
                        <Card key={special.id} className="rounded-2xl">
                            <CardHeader>
                            <CardTitle>{special.vendor?.shopName}</CardTitle>
                            </CardHeader>
                            <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {special.items.map((item) => {
                                   const { average, count } = getAverageRating(item.id);
                                   return (
                                     <MenuItemCard
                                        key={item.id}
                                        item={item}
                                        averageRating={average}
                                        ratingCount={count}
                                        vendor={special.vendor}
                                        onCustomize={() => handleOpenCustomization(item)}
                                        onImageClick={handleImageClick}
                                    />
                                   )
                                })}
                            </div>
                            </CardContent>
                        </Card>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No {currentTab} specials available right now. Check back later!
                    </p>
                  )}
                </TabsContent>
            </Tabs>
        </section>
        <OrderCustomizationSheet
          item={selectedItem}
          open={!!selectedItem}
          onOpenChange={handleCloseCustomization}
        />
      </div>
    </div>
  );
}

export default function SpecialsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <SpecialsPageContent />
    </Suspense>
  );
}
