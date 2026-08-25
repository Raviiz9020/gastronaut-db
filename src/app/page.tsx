
'use client';

import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Clock, MapPin, Shield, Star, Gift, Store, ShoppingBag, Utensils, Heart, Building, LayoutGrid, Zap, BadgeCheck, TrendingUp, Users, Package, ArrowRight, ChefHat, Coffee, Pizza, Sandwich, IceCream2, Tag, CheckCircle2, Mail, Phone } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useVendor } from '@/context/vendor-context';
import { useVendorCategory } from '@/context/vendor-category-context';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSiteReview } from '@/context/site-review-context';
import SiteReviewForm from '@/components/site-review-form';
// Logo removed from hero — now using animated food icons
import { cn } from '@/lib/utils';
import type { Vendor, Order, Offer, MenuItem, VendorCategory } from '@/types';
import Autoplay from "embla-carousel-autoplay"
import { motion, AnimatePresence } from 'framer-motion';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import { useOffer } from '@/context/offer-context';
import { useOrder } from '@/context/order-context';
import { useMenu } from '@/context/menu-context';
import { createSlug } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import MultiOfferSplashDialog from '@/components/multi-offer-splash-dialog';
import { LocationPicker } from '@/components/location-picker';
import { useLocation } from '@/context/location-context';
import { useCustomer } from '@/context/customer-context';
import { isVendorServiceable } from '@/lib/location-utils';
import VendorCard from '@/components/vendor-card';
import HeroSearchBar from '@/components/hero-search-bar';
import DishCategoryBubbles from '@/components/dish-category-bubbles';
import QuickFilterBar from '@/components/quick-filter-bar';
import OrderAgainShelf from '@/components/order-again-shelf';
import FloatingCartBar from '@/components/floating-cart-bar';
import TrendingDishesGrid from '@/components/trending-dishes-grid';
import TrustBadgesBar from '@/components/trust-badges-bar';




const floatingFoodIcons = [
  { icon: <Pizza className="h-8 w-8" />, color: 'text-orange-400', delay: 0, x: '15%', y: '20%' },
  { icon: <Coffee className="h-7 w-7" />, color: 'text-amber-500', delay: 0.4, x: '75%', y: '15%' },
  { icon: <ChefHat className="h-9 w-9" />, color: 'text-primary', delay: 0.8, x: '60%', y: '60%' },
  { icon: <Sandwich className="h-7 w-7" />, color: 'text-yellow-500', delay: 1.2, x: '20%', y: '70%' },
  { icon: <IceCream2 className="h-8 w-8" />, color: 'text-pink-400', delay: 0.6, x: '80%', y: '50%' },
  { icon: <Utensils className="h-6 w-6" />, color: 'text-green-400', delay: 1.0, x: '45%', y: '30%' },
  { icon: <Star className="h-5 w-5" />, color: 'text-amber-400', delay: 1.4, x: '35%', y: '80%' },
  { icon: <Gift className="h-6 w-6" />, color: 'text-purple-400', delay: 0.2, x: '88%', y: '80%' },
];

const tickerItems = [
  '#VerifiedVendors', '•', 'Fresh Daily', '•', 'Support Local',
  '•', 'Order Now', '•', 'Hyperlocal Delivery', '•',
  '#VerifiedCustomers', '•', 'Local Vendors', '•', 'Community First', '•',
];


const WhatsAppIcon = () => (
  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 12c0 1.78.46 3.45 1.28 4.93L2 22l5.25-1.38c1.45.77 3.09 1.18 4.79 1.18h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zM12.04 20.15c-1.5 0-2.95-.39-4.23-1.09l-.3-.18-3.14.82.84-3.07-.2-.31a8.29 8.29 0 0 1-1.28-4.38c0-4.54 3.7-8.24 8.24-8.24s8.24 3.7 8.24 8.24-3.7 8.24-8.24 8.24zm4.49-6.17c-.24-.12-1.45-.71-1.67-.79s-.39-.12-.55.12-.63.79-.78.95c-.14.16-.28.18-.52.06s-1.03-.38-1.96-1.21c-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.01-.37.11-.48.1-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42s-.55-1.32-.76-1.81c-.2-.48-.4-.42-.55-.42h-.48c-.16 0-.42.06-.63.3s-.84.82-.84 2c0 1.18.86 2.32 1 2.48.13.16 1.69 2.59 4.1 3.6.58.24 1.04.39 1.4.5.52.17 1-.06 1.16-.36.16-.3.16-.55.11-.67s-.16-.18-.4-.3z" />
  </svg>
);

const InstagramIcon = () => (
  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.024.06 1.378.06 3.808s-.012 2.784-.06 3.808c-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.024.048-1.378.06-3.808.06s-2.784-.012-3.808-.06c-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416 1.363-.465 2.427-.048-1.024-.06-1.378-.06-3.808s.012-2.784.06-3.808c.049 1.064.218 1.791.465 2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 016.08 2.525c.636-.247 1.363.416 2.427.465C9.53 2.013 9.884 2 12.315 2zm-1.16 4.707a4.12 4.12 0 100 8.24 4.12 4.12 0 000-8.24zM12 15.1a3.1 3.1 0 110-6.2 3.1 3.1 0 010 6.2zm4.113-7.536a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0z" clipRule="evenodd" />
  </svg>
);

const ZoomedImageOverlay = ({ item, onClose }: { item: { id: string; image: string; name: string } | null, onClose: () => void }) => {
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
          layoutId={`image-${item.id}`}
        >
          <Image
            src={item.image || ''}
            alt={item.name}
            layout="fill"
            objectFit="cover"
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};


export default function LandingPage() {
  const { vendors, fetchAllVendors } = useVendor();
  const { vendorCategories } = useVendorCategory();
  const { reviews } = useSiteReview();
  const { offers, fetchAllOffers } = useOffer();
  const { fetchAllItems, menuItems } = useMenu();
  const [priceRange, setPriceRange] = useState(50);
  const router = useRouter();
  const { userLocation, isLoading: isLocationLoading } = useLocation();
  const { customer, isAuthLoading } = useCustomer();
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);

  useEffect(() => {
    if (!isLocationLoading && !isAuthLoading && !userLocation && !customer?.latitude) {
      const timer = setTimeout(() => {
        setIsLocationDialogOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLocationLoading, isAuthLoading, userLocation, customer]);

  const { orders } = useOrder();

  // Compute real dynamic platform stats
  const approvedVendorsCount = useMemo(() => {
    let list = vendors.filter((v) => v.isApproved && v.shopName);
    if (userLocation) {
      list = list.filter((v) => isVendorServiceable(v, userLocation));
    }
    return list.length;
  }, [vendors, userLocation]);

  const platformStats = useMemo(() => {
    let sum = 0;
    let count = 0;
    orders.forEach((o) => {
      if (o.status === 'Delivered' && typeof o.vendorRating === 'number' && o.vendorRating > 0) {
        sum += o.vendorRating;
        count += 1;
      }
    });
    if (count === 0) {
      vendors.forEach((v) => {
        if (v.totalRatingSum && v.ratingCount) {
          sum += v.totalRatingSum;
          count += v.ratingCount;
        }
      });
    }
    const avg = count > 0 ? (sum / count).toFixed(1) : '4.8';
    return { avg, count };
  }, [orders, vendors]);

  const heroDishes = useMemo(() => {
    const approvedVendors = vendors.filter(
      (v) => v.isApproved && (userLocation ? isVendorServiceable(v, userLocation) : true)
    );
    const vendorMap = new Map(approvedVendors.map((v) => [v.username, v]));

    const list = menuItems
      .filter(
        (i) =>
          vendorMap.has(i.vendorUsername) &&
          i.isAvailable &&
          i.image &&
          typeof i.image === 'string' &&
          i.image.startsWith('http') &&
          i.image.length > 15
      )
      .map((item) => {
        const vendor = vendorMap.get(item.vendorUsername)!;
        let rating = 4.8;
        let reviewCount = 0;
        let ratingType: 'dish' | 'kitchen' | 'default' = 'default';

        if (item.totalRatingSum && item.ratingCount && item.ratingCount > 0) {
          rating = Number((item.totalRatingSum / item.ratingCount).toFixed(1));
          reviewCount = item.ratingCount;
          ratingType = 'dish';
        } else if (vendor.totalRatingSum && vendor.ratingCount && vendor.ratingCount > 0) {
          rating = Number((vendor.totalRatingSum / vendor.ratingCount).toFixed(1));
          reviewCount = vendor.ratingCount;
          ratingType = 'kitchen';
        }
        return {
          ...item,
          shopName: vendor.shopName,
          calculatedRating: rating.toFixed(1),
          calculatedReviewCount: reviewCount,
          ratingType,
        };
      });

    const popularWithImages = list.filter((i) => i.isPopular);
    if (popularWithImages.length > 0) return popularWithImages.slice(0, 5);
    if (list.length >= 1) return list.slice(0, 5);

    return [
      {
        id: 'default-hero',
        name: 'Freshly Prepared Meals',
        image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
        price: 199,
        shopName: 'Local Kitchens',
        calculatedRating: '4.8',
        calculatedReviewCount: 0,
        ratingType: 'default' as const,
      },
    ];
  }, [menuItems, vendors, userLocation]);

  const [activeHeroDishIndex, setActiveHeroDishIndex] = useState(0);

  // Automatically cycle through top hero dishes every 3.8s
  useEffect(() => {
    if (heroDishes.length <= 1) return;
    const interval = setInterval(() => {
      setActiveHeroDishIndex((prev) => (prev + 1) % heroDishes.length);
    }, 3800);
    return () => clearInterval(interval);
  }, [heroDishes]);

  const currentHeroDish = heroDishes[activeHeroDishIndex] || heroDishes[0];
  const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);
  const [selectedOffers, setSelectedOffers] = useState<Offer[]>([]);

  useEffect(() => {
    fetchAllVendors();
    fetchAllOffers();
    fetchAllItems();
  }, [fetchAllVendors, fetchAllOffers, fetchAllItems]);

  const plugin = useRef(
    Autoplay({ delay: 2000, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  const reviewPlugin = useRef(
    Autoplay({ delay: 3500, stopOnInteraction: true, stopOnMouseEnter: true })
  );

  const [zoomedItem, setZoomedItem] = useState<{ id: string, image: string, name: string } | null>(null);

  const handleImageClick = (item: { id: string, image: string, name: string }) => {
    setZoomedItem(item);
  };

  const activeOffers = useMemo(() => {
    const now = new Date();
    return offers.filter(o => {
      if (!o.isActive) return false;
      const startDate = o.startDate ? new Date(o.startDate) : null;
      const endDate = o.endDate ? new Date(o.endDate) : null;
      if (startDate && now < startDate) return false;
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        if (now > endOfDay) return false;
      }
      return true;
    });
  }, [offers]);

  const vendorsWithOffers = useMemo(() => {
    const vendorUsernamesWithOffers = new Set<string>();
    activeOffers.forEach(offer => {
      if (offer.vendorUsername) {
        vendorUsernamesWithOffers.add(offer.vendorUsername);
      }
    });

    if (activeOffers.some(o => !o.vendorUsername)) {
      vendors.forEach(vendor => {
        if (vendor.isApproved) {
          vendorUsernamesWithOffers.add(vendor.username);
        }
      });
    }

    let filteredVendors = vendors.filter(vendor => vendor.isApproved && vendorUsernamesWithOffers.has(vendor.username));

    if (userLocation) {
      filteredVendors = filteredVendors.filter(v => isVendorServiceable(v, userLocation));
    }

    return filteredVendors;
  }, [activeOffers, vendors, userLocation]);

  const handleVendorOfferClick = (vendor: Vendor) => {
    const vendorSpecificOffers = activeOffers.filter(offer =>
      !offer.vendorUsername || offer.vendorUsername === vendor.username
    );
    setSelectedOffers(vendorSpecificOffers);
    setIsOfferDialogOpen(true);
  };

  const popularVendors = useMemo(() => {
    let approved = vendors.filter(v => v.isApproved && v.shopName);

    if (userLocation) {
      approved = approved.filter(v => isVendorServiceable(v, userLocation));
    }

    return approved;
  }, [vendors, userLocation]);

  const activeVendorCategories = useMemo(() => {
    let serviceableVendors = vendors.filter(v => v.isApproved);

    if (userLocation) {
      serviceableVendors = serviceableVendors.filter(v => isVendorServiceable(v, userLocation));
    }

    const approvedVendorCategories = new Set(serviceableVendors.map(v => v.category));
    return vendorCategories.filter(cat => approvedVendorCategories.has(cat.name));
  }, [vendors, vendorCategories, userLocation]);

  const cateringText = "We accept catering services for functions and birthdays";
  const renderTagline = (tagline: string | undefined | null) => {
    if (tagline && tagline.includes(cateringText)) {
      const parts = tagline.split(cateringText);
      return (
        <div className="flex flex-col">
          <span>{parts[0]}</span>
          <span className="font-bold text-blue-400 mt-1">{cateringText}</span>
          <span>{parts[1]}</span>
        </div>
      );
    }
    return tagline;
  };

  const getVendorUrl = (vendor: Vendor) => {
    const identifier = vendor.slug || (vendor.shopName ? createSlug(vendor.shopName) : vendor.username);
    return `/menu?vendor=${identifier}`;
  }

  const handlePriceFilterClick = () => {
    router.push(`/menu?maxPrice=${priceRange}`);
  };

  const handleOrderNow = () => {
    if (!userLocation) {
      setIsLocationDialogOpen(true);
    } else {
      router.push('/menu');
    }
  };

  return (
    <>
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <Header />
        <AnimatePresence>
          {zoomedItem && (
            <ZoomedImageOverlay
              item={zoomedItem}
              onClose={() => setZoomedItem(null)}
            />
          )}
        </AnimatePresence>
        <main className="flex-1">
          <div className="container mx-auto px-4">

            {/* ── HERO ──────────────────────────────────────────────── */}
            <section className="py-10 md:py-16">
              <div className="grid md:grid-cols-2 gap-8 items-center w-full">

                {/* ─── FOOD SHOWCASE HERO GRAPHIC ─ right side */}
                <motion.div
                  className="flex justify-center order-last md:order-last"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                >
                  <div className="relative w-full max-w-xs sm:max-w-sm h-72 sm:h-84 flex items-center justify-center">
                    {/* Background Radial Glow */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/25 via-amber-500/15 to-orange-500/10 blur-3xl" />

                    {/* Central Elevated Dish Image Platter with Automatic Rotation */}
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                      className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full p-2 bg-gradient-to-b from-primary/30 to-transparent shadow-2xl"
                    >
                      <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-card shadow-inner bg-muted">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={currentHeroDish?.id || activeHeroDishIndex}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.04 }}
                            transition={{ duration: 0.6, ease: 'easeInOut' }}
                            className="relative w-full h-full"
                          >
                            <Image
                              src={currentHeroDish?.image || 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80'}
                              alt={currentHeroDish?.name || 'Delicious Food'}
                              fill
                              sizes="(max-width: 640px) 224px, 256px"
                              className="object-cover hover:scale-105 transition-transform duration-700"
                              priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/15" />
                            <div className="absolute bottom-3 inset-x-0 text-center px-4">
                              <p className="text-xs font-bold text-white drop-shadow-md truncate">
                                {currentHeroDish?.name || 'Fresh Local Specialties'}
                              </p>
                              <p className="text-[10px] text-amber-300 font-semibold drop-shadow-sm truncate">
                                {currentHeroDish?.shopName ? `by ${currentHeroDish.shopName}` : 'Freshly Prepared'}
                              </p>
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </motion.div>

                    {/* Floating Badge 1 (Top Left: Real Speed / Location ETA) */}
                    <motion.div
                      animate={{ y: [0, 6, 0] }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
                      className="absolute -top-2 -left-2 sm:left-0 bg-card/95 border border-primary/20 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-xl flex items-center gap-2 z-20"
                    >
                      <div className="w-6 h-6 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                        <Clock className="h-3.5 w-3.5" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-foreground">20-30 Min Delivery</span>
                        </div>
                        <p className="text-[9px] text-muted-foreground truncate max-w-[100px] sm:max-w-[120px]">
                          {userLocation?.addressName || 'In Your Society'}
                        </p>
                      </div>
                    </motion.div>

                    {/* Floating Badge 2 (Top Right: Real Platform/Dish Rating that updates with rotating dish) */}
                    <motion.div
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                      className="absolute top-2 -right-2 sm:right-0 bg-card/95 border border-primary/20 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-xl flex items-center gap-2 z-20"
                    >
                      <div className="w-6 h-6 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                        <Star className="h-3.5 w-3.5 fill-emerald-500 text-emerald-500" />
                      </div>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={currentHeroDish?.id || activeHeroDishIndex}
                          initial={{ opacity: 0, y: 3 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -3 }}
                          transition={{ duration: 0.3 }}
                          className="text-left"
                        >
                          <span className="text-[10px] font-bold text-foreground">
                            {(currentHeroDish as any)?.calculatedRating || platformStats.avg} ⭐{' '}
                            {(currentHeroDish as any)?.ratingType === 'dish'
                              ? 'Dish'
                              : (currentHeroDish as any)?.ratingType === 'kitchen'
                              ? 'Kitchen'
                              : ''}{' '}
                            Rating
                          </span>
                          <p className="text-[9px] text-muted-foreground">
                            {(currentHeroDish as any)?.calculatedReviewCount > 0
                              ? `${(currentHeroDish as any).calculatedReviewCount}+ ${(currentHeroDish as any)?.ratingType === 'dish' ? 'Dish' : (currentHeroDish as any)?.ratingType === 'kitchen' ? 'Kitchen' : ''} Reviews`
                              : 'Verified Kitchen'}
                          </p>
                        </motion.div>
                      </AnimatePresence>
                    </motion.div>

                    {/* Floating Badge 3 (Bottom Left: Real Kitchens Count) */}
                    <motion.div
                      animate={{ y: [0, 5, 0] }}
                      transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                      className="absolute -bottom-2 -left-2 sm:left-2 bg-card/95 border border-primary/20 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-xl flex items-center gap-2 z-20"
                    >
                      <div className="w-6 h-6 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <ChefHat className="h-3.5 w-3.5" />
                      </div>
                      <div className="text-left">
                        <span className="text-[10px] font-bold text-foreground">
                          {approvedVendorsCount > 0 ? `${approvedVendorsCount}+ Kitchens` : 'Local Kitchens'}
                        </span>
                        <p className="text-[9px] text-muted-foreground">
                          Fresh & Hygienic
                        </p>
                      </div>
                    </motion.div>

                  </div>
                </motion.div>

                {/* Text side */}
                <motion.div
                  className="text-center md:text-left"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                >
                  {/* Eyebrow label */}
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-widest mb-3">
                    <Zap className="h-3 w-3" />
                    Hyperlocal Food Discovery
                  </span>

                  <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-extrabold leading-tight">
                    Craving Delicious Food?{' '}
                    <span className="text-primary block sm:inline">Delivered Hot & Fresh.</span>
                  </h1>

                  <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-md mx-auto md:mx-0 leading-relaxed">
                    Order authentic meals, daily tiffins, and snacks from verified home chefs & local kitchens in your society.
                  </p>

                  {/* Trust pills */}
                  <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                      <BadgeCheck className="h-3.5 w-3.5" /> 100% Fresh & Hygienic
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                      <Clock className="h-3.5 w-3.5" /> 20-30 Min Delivery
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                      <MapPin className="h-3.5 w-3.5" /> {userLocation?.addressName || 'Local Kitchens Only'}
                    </span>
                  </div>

                  {/* Live Hero Search Bar with Rotating Placeholders */}
                  <HeroSearchBar className="mt-5" />

                  {/* Secondary Quick Action Buttons */}
                  <div className="mt-4 flex flex-wrap items-center gap-3 justify-center md:justify-start">
                    <Button
                      size="default"
                      onClick={handleOrderNow}
                      className="rounded-xl px-5 font-semibold shadow-md"
                    >
                      <Utensils className="mr-2 h-4 w-4" />
                      Browse Full Menu
                    </Button>
                    <Link href="/admin/login" passHref>
                      <Button
                        size="default"
                        variant="outline"
                        className="rounded-xl px-5 font-semibold border-border/80 hover:border-primary/40 hover:bg-primary/5"
                      >
                        <Store className="mr-2 h-4 w-4 text-primary" />
                        Join as Vendor
                      </Button>
                    </Link>
                  </div>

                </motion.div>
              </div>
            </section>

            {/* ── SCROLLING TICKER ─────────────────────────────────── */}
            <div className="overflow-hidden py-3 border-y border-primary/10 my-2">
              <motion.div
                className="flex gap-6 whitespace-nowrap"
                animate={{ x: ['0%', '-50%'] }}
                transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
              >
                {[...tickerItems, ...tickerItems].map((item, i) => (
                  <span
                    key={i}
                    className={`text-xs font-semibold ${
                      item === '•' ? 'text-primary/40' : 'text-primary/70'
                    }`}
                  >
                    {item}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* ── QUICK FILTER BAR ─────────────────────────────────── */}
            <QuickFilterBar className="my-2" />

            {/* ── DISH INSPIRATION BUBBLES ─────────────────────────── */}
            <DishCategoryBubbles />

            {/* ── ORDER AGAIN (PAST FAVORITES) ────────────────────── */}
            <OrderAgainShelf />

            {/* ── TRENDING DISHES IN YOUR SOCIETY ──────────────────── */}
            <TrendingDishesGrid />

            {/* ── BROWSE BY CATEGORY ───────────────────────────────── */}
            {activeVendorCategories.length > 0 && (
              <section className="py-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <LayoutGrid className="h-4 w-4 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold font-headline">Browse by Category</h2>
                </div>
                <Carousel
                  plugins={[plugin.current]}
                  opts={{
                    align: "start",
                    loop: activeVendorCategories.length > 7,
                  }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-2">
                    {activeVendorCategories.map((category) => (
                      <CarouselItem key={category.id} className="basis-1/4 sm:basis-1/5 md:basis-1/6 lg:basis-1/8 pl-2">
                        <Link href={`/menu?vendorCategory=${encodeURIComponent(category.name)}`} passHref>
                          <div className="flex flex-col items-center gap-2 group cursor-pointer">
                            <div className="relative w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:shadow-lg group-hover:border-primary border-2 border-transparent group-hover:scale-105">
                              {category.imageUrl ? (
                                <Image
                                  src={category.imageUrl}
                                  alt={category.name}
                                  layout="fill"
                                  className="object-cover"
                                  placeholder={category.blurDataUrl ? 'blur' : 'empty'}
                                  blurDataURL={category.blurDataUrl}
                                />
                              ) : (
                                <Building className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                              )}
                            </div>
                            <p className="text-xs font-semibold text-center">{category.name}</p>
                          </div>
                        </Link>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              </section>
            )}

            {/* ── FIND BY BUDGET ───────────────────────────────────── */}
            <section className="py-6 mt-2">
              <div className="bg-muted/50 rounded-3xl p-6 border border-primary/10">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Search className="h-4 w-4 text-primary" />
                      <h2 className="text-base font-bold font-headline">Find Items in Your Budget</h2>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">
                      Drag to set your max budget: <span className="font-bold text-primary">₹{priceRange}</span>
                    </p>
                    <Slider
                      defaultValue={[priceRange]}
                      max={1000}
                      step={50}
                      onValueChange={(value) => setPriceRange(value[0])}
                      className="flex-1"
                    />
                  </div>
                  <Button
                    size="lg"
                    onClick={handlePriceFilterClick}
                    className="sm:self-end text-white bg-gradient-to-r from-green-400 via-teal-500 to-blue-500 bg-[length:200%_auto] animate-gradient-move"
                  >
                    <Search className="mr-2 h-5 w-5" />
                    Find
                  </Button>
                </div>
              </div>
            </section>

            {/* ── POPULAR OFFERS ───────────────────────────────────── */}
            {vendorsWithOffers.length > 0 && (
              <section className="py-6 bg-muted/50 rounded-3xl mt-6">
                <div className="flex justify-between items-center px-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Gift className="h-5 w-5 text-destructive" />
                      <h2 className="text-xl font-bold font-headline">Popular Offers</h2>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 pl-7">Limited-time deals from local vendors</p>
                  </div>
                </div>
                <Carousel
                  plugins={[
                    Autoplay({ delay: 3000, stopOnInteraction: true, stopOnMouseEnter: true })
                  ]}
                  opts={{
                    align: "start",
                    loop: vendorsWithOffers.length > 4,
                  }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-4">
                    {vendorsWithOffers.map((vendor) => {
                      const firstOffer = activeOffers.find(o => !o.vendorUsername || o.vendorUsername === vendor.username);
                      return (
                        <CarouselItem key={vendor.username} className="basis-3/4 sm:basis-1/2 md:basis-1/3 lg:basis-1/4 pl-4">
                          <Card
                            className="rounded-2xl overflow-hidden group h-full flex flex-col text-left bg-card/90 border border-border/60 backdrop-blur-sm cursor-pointer transition-all duration-300 hover:shadow-xl hover:border-primary/40 hover:-translate-y-1"
                            onClick={() => handleVendorOfferClick(vendor)}
                          >
                            {firstOffer && (
                              <>
                                <div className="aspect-[16/9] w-full relative overflow-hidden bg-muted">
                                  <Image
                                    src={firstOffer.imageUrl}
                                    alt={firstOffer.title}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    placeholder={firstOffer.blurDataUrl ? 'blur' : 'empty'}
                                    blurDataURL={firstOffer.blurDataUrl}
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-600/90 text-white text-[10px] font-bold shadow-sm">
                                      <Tag className="h-3 w-3" /> Special Deal
                                    </span>
                                    {firstOffer.startDate && firstOffer.endDate && (
                                      <span className="text-[10px] text-white/90 bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                                        Valid till {format(new Date(firstOffer.endDate), 'dd MMM')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="p-3.5 flex flex-col flex-1 gap-1">
                                  <h3 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                    {firstOffer.title}
                                  </h3>
                                  <p className="text-xs text-muted-foreground truncate">{vendor.shopName}</p>
                                </div>
                              </>
                            )}
                          </Card>
                        </CarouselItem>
                      );
                    })}
                  </CarouselContent>
                </Carousel>
              </section>
            )}

            {/* ── POPULAR VENDORS ──────────────────────────────────── */}
            <section className="py-6 bg-muted/50 rounded-3xl mt-6">
              <div className="flex justify-between items-center px-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-destructive" />
                    <h2 className="text-xl font-bold font-headline">Popular Vendors</h2>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 pl-7">Top-rated local shops near you</p>
                </div>
                {popularVendors.length > 0 && (
                  <Link href="/vendor-details" passHref>
                    <Button variant="link" className="text-primary pr-0">
                      See all
                    </Button>
                  </Link>
                )}
              </div>
              <div>
                {popularVendors.length > 0 ? (
                  <Carousel
                    plugins={[plugin.current]}
                    opts={{
                      align: "start",
                      loop: popularVendors.length > 4,
                    }}
                    className="w-full"
                  >
                    <CarouselContent className="-ml-4">
                      {popularVendors.map((vendor, index) => (
                        <CarouselItem key={`${vendor.username}-${index}`} className="basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 pl-4">
                          <VendorCard
                            vendor={vendor}
                            offers={activeOffers}
                            userLocation={userLocation}
                          />
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                  </Carousel>
                ) : userLocation ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mx-4 rounded-3xl border border-primary/20 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-orange-500/5 p-8 text-center"
                  >
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                      <Store className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-headline text-xl font-bold text-foreground mb-2">
                      Thank You for Choosing Us
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                      We are currently expanding our network in your area. Please stay with us while we onboard local vendors near you. We look forward to serving you soon.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-6 rounded-full border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() => setIsLocationDialogOpen(true)}
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      Change Location
                    </Button>
                  </motion.div>
                ) : null}
              </div>
            </section>

            {/* ── PARTNER WITH US (VENDOR ACQUISITION CTA) ─────────── */}
            <section className="py-8 my-4">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-card to-primary/5 border border-primary/20 p-8 sm:p-10 shadow-lg">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                  <div className="max-w-xl text-center md:text-left">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold uppercase tracking-wider mb-3">
                      <Store className="h-3.5 w-3.5" />
                      For Restaurants, Home Chefs & Cloud Kitchens
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold font-headline tracking-tight text-foreground">
                      Grow Your Food Business in Your Society
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2.5 leading-relaxed">
                      Reach hundreds of hungry neighbors in your residential area with zero setup hassle. List your menu, accept digital orders, and manage deliveries effortlessly.
                    </p>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-5 text-xs font-semibold text-foreground/80">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        0% Commission on Day 1
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Direct UPI Payments
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Live In-App Order Tracking
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Dedicated Vendor Portal
                      </span>
                    </div>

                    {/* Direct Contact & Support info */}
                    <div className="mt-5 pt-4 border-t border-primary/15 flex flex-wrap items-center justify-center md:justify-start gap-2.5 sm:gap-3 text-xs">
                      <span className="text-muted-foreground font-medium text-[11px] w-full sm:w-auto">
                        Quick Onboarding Support:
                      </span>
                      <a
                        href="mailto:hyperlabsupport@gmail.com"
                        className="inline-flex items-center gap-1.5 font-semibold text-foreground hover:text-primary transition-colors bg-card/80 hover:bg-card px-3 py-1.5 rounded-full border border-border/80 shadow-sm text-xs"
                      >
                        <Mail className="h-3.5 w-3.5 text-primary" />
                        hyperlabsupport@gmail.com
                      </a>
                      <a
                        href="https://wa.me/917083609020"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-semibold text-foreground hover:text-emerald-500 transition-colors bg-card/80 hover:bg-card px-3 py-1.5 rounded-full border border-border/80 shadow-sm text-xs"
                      >
                        <Phone className="h-3.5 w-3.5 text-emerald-500" />
                        +91 70836 09020
                      </a>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-center gap-2">
                    <Link href="/admin/login" passHref>
                      <Button
                        size="lg"
                        className="rounded-2xl px-7 py-6 text-sm font-bold shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:scale-105 transition-all duration-300 gap-2 w-full sm:w-auto"
                      >
                        <Store className="h-4 w-4" />
                        Register Your Business ➔
                      </Button>
                    </Link>
                    <p className="text-[11px] text-muted-foreground">
                      Free setup • Instant activation
                    </p>
                  </div>
                </div>

                {/* Decorative background glow */}
                <div className="absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
              </div>
            </section>

            {/* ── TRUST BADGES BAR ─────────────────────────────────── */}
            <TrustBadgesBar />

            {/* ── CUSTOMER REVIEWS ─────────────────────────────────── */}
            <section className="py-8 mt-2">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold font-headline">What Our Customers Say</h2>
                <div className="flex items-center justify-center gap-1 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                  <span className="text-sm text-muted-foreground ml-2">Loved by our community</span>
                </div>
              </div>

              {reviews.length > 0 ? (
                <Carousel
                  plugins={[reviewPlugin.current]}
                  opts={{
                    align: "start",
                    loop: reviews.length > 2,
                  }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-4">
                    {reviews.map((review, index) => (
                      <CarouselItem key={index} className="basis-full sm:basis-1/2 md:basis-1/3 pl-4">
                        <Card className="bg-muted/50 rounded-3xl h-full border-l-4 border-primary/50">
                          <CardContent className="p-5 flex flex-col h-full">
                            <div className="flex items-center gap-1 mb-3">
                              {[...Array(review.rating)].map((_, i) => (
                                <Star key={i} className="h-3.5 w-3.5 text-primary fill-primary" />
                              ))}
                            </div>
                            <p className="text-sm text-muted-foreground italic leading-relaxed flex-1">
                              "{review.text}"
                            </p>
                            <p className="mt-4 font-semibold text-xs text-right text-foreground/70">
                              — {review.authorName}
                            </p>
                          </CardContent>
                        </Card>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              ) : null}

              <div className="mt-8 max-w-2xl mx-auto">
                <SiteReviewForm />
              </div>
            </section>

          </div>
        </main>

        {/* ── FOOTER ───────────────────────────────────────────────── */}
        <footer className="border-t border-primary/10 mt-8">
          <div className="container mx-auto px-4 py-6">
            <p className="text-center text-xs text-muted-foreground mb-4 font-medium">
              HyperDelivery — Taste the difference, delivered to your door.
            </p>
            <div className="flex flex-col md:flex-row justify-between items-center gap-3">
              <div className="flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <Link href="/about" className="hover:text-primary">About</Link>
                <Link href="/contact" className="hover:text-primary">Contact</Link>
                <Link href="/privacy-policy" className="hover:text-primary">Privacy Policy</Link>
                <Link href="/terms-of-service" className="hover:text-primary">Terms of Service</Link>
                <Link href="/cancellation-refund-policy" className="hover:text-primary">Cancellation & Refunds</Link>
              </div>
              <div className="flex items-center gap-4">
                <Link href="/benefits" passHref>
                  <div className="text-muted-foreground hover:text-primary transition-colors">
                    <Heart className="h-6 w-6" />
                  </div>
                </Link>
                <a href="https://www.instagram.com/lrmasalamagic/?igsh=MTM0c3ExYWo5Y3Z3bQ%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <InstagramIcon />
                </a>
                <a href="https://wa.me/917083609020" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <WhatsAppIcon />
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
      <MultiOfferSplashDialog isOpen={isOfferDialogOpen} onOpenChange={setIsOfferDialogOpen} offers={selectedOffers} />
      <LocationPicker
        variant="full"
        open={isLocationDialogOpen}
        onOpenChange={setIsLocationDialogOpen}
        onLocationSelected={() => router.push('/menu')}
      />
      <FloatingCartBar />
    </>
  );
}
