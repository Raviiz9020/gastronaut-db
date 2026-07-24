
'use client';

import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Clock, MapPin, Shield, Star, Gift, Store, ShoppingBag, Utensils, Heart, Building, LayoutGrid, Zap, BadgeCheck, TrendingUp, Users, Package, ArrowRight, ChefHat, Coffee, Pizza, Sandwich, IceCream2 } from 'lucide-react';
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
import { isVendorServiceable } from '@/lib/location-utils';


const richFeatures = [
  {
    name: 'Fast Delivery',
    icon: <Clock className="h-6 w-6 text-primary" />,
    description: 'Get your order at your doorstep in minutes, not hours. We partner with local vendors to keep delivery swift and reliable.',
  },
  {
    name: 'Local Vendors',
    icon: <MapPin className="h-6 w-6 text-primary" />,
    description: 'Support home chefs and local shops in your neighborhood. Every order goes directly to a local entrepreneur.',
  },
  {
    name: 'Easy Ordering',
    icon: <ShoppingBag className="h-6 w-6 text-primary" />,
    description: 'Browse menus, customize your order, and pay — all in a few taps. No complexity, just great food.',
  },
];

const howItWorks = [
  {
    step: '01',
    title: 'Browse Vendors',
    description: 'Discover local restaurants, home chefs, and grocery shops near you.',
    icon: <Store className="h-6 w-6" />,
  },
  {
    step: '02',
    title: 'Place Your Order',
    description: 'Pick your items, customize to your taste, and confirm in seconds.',
    icon: <ShoppingBag className="h-6 w-6" />,
  },
  {
    step: '03',
    title: 'Get It Delivered',
    description: 'Sit back and track your order in real-time as it heads to your door.',
    icon: <Package className="h-6 w-6" />,
  },
];


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

const orderSteps = [
  {
    icon: <ShoppingBag className="h-6 w-6" />,
    iconBg: 'bg-purple-500/20 text-purple-400',
    glow: 'from-purple-500/20 to-pink-500/10',
    status: 'Order Confirmed',
    detail: 'Your order has been placed',
    tag: 'CONFIRMED',
    tagColor: 'bg-purple-500/20 text-purple-300',
    dot: 'bg-purple-400',
  },
  {
    icon: <ChefHat className="h-6 w-6" />,
    iconBg: 'bg-orange-500/20 text-orange-400',
    glow: 'from-orange-500/20 to-amber-500/10',
    status: 'Being Prepared',
    detail: 'Chef is cooking your meal',
    tag: 'PREPARING',
    tagColor: 'bg-orange-500/20 text-orange-300',
    dot: 'bg-orange-400',
  },
  {
    icon: <Package className="h-6 w-6" />,
    iconBg: 'bg-blue-500/20 text-blue-400',
    glow: 'from-blue-500/20 to-cyan-500/10',
    status: 'Rider On the Way',
    detail: 'Arriving in approximately 5 mins',
    tag: 'EN ROUTE',
    tagColor: 'bg-blue-500/20 text-blue-300',
    dot: 'bg-blue-400',
  },
  {
    icon: <MapPin className="h-6 w-6" />,
    iconBg: 'bg-green-500/20 text-green-400',
    glow: 'from-green-500/20 to-emerald-500/10',
    status: 'Delivered!',
    detail: 'Enjoy your meal 🎉',
    tag: 'DELIVERED',
    tagColor: 'bg-green-500/20 text-green-300',
    dot: 'bg-green-400',
  },
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
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);

  useEffect(() => {
    if (!isLocationLoading && !userLocation) {
      const timer = setTimeout(() => {
        setIsLocationDialogOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLocationLoading, userLocation]);

  const [activeOrderStep, setActiveOrderStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveOrderStep(prev => (prev + 1) % orderSteps.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);
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
            <section className="relative flex items-center py-12 md:py-20 overflow-hidden">
              {/* Gradient background blobs */}
              <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500/5 rounded-full blur-2xl pointer-events-none" />

              <div className="grid md:grid-cols-2 gap-8 items-center w-full relative z-10">

                {/* ─── CINEMATIC ORDER SCENE ─ right side */}
                <motion.div
                  className="hidden md:flex justify-center md:order-last"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                >
                  <div className="relative w-80 h-96">
                    {/* Background glow that shifts color with step */}
                    <motion.div
                      className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${orderSteps[activeOrderStep].glow} blur-3xl`}
                      animate={{ opacity: [0.4, 0.7, 0.4] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    />

                    {/* Floating ambient food icons — subtle, around the card */}
                    {[
                      { icon: <Pizza className="h-6 w-6" />, color: 'text-orange-400/50', x: '-14%', y: '10%', delay: 0 },
                      { icon: <Coffee className="h-5 w-5" />, color: 'text-amber-400/50', x: '108%', y: '20%', delay: 0.6 },
                      { icon: <Sandwich className="h-5 w-5" />, color: 'text-yellow-400/50', x: '-12%', y: '75%', delay: 1.1 },
                      { icon: <IceCream2 className="h-6 w-6" />, color: 'text-pink-400/50', x: '108%', y: '70%', delay: 0.3 },
                    ].map((f, i) => (
                      <motion.div
                        key={i}
                        className={`absolute ${f.color}`}
                        style={{ left: f.x, top: f.y }}
                        animate={{ y: [0, -10, 0], opacity: [0.4, 0.7, 0.4] }}
                        transition={{ duration: 3.5 + i * 0.4, delay: f.delay, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        {f.icon}
                      </motion.div>
                    ))}

                    {/* Main order status card */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-2">

                      {/* Step indicator dots */}
                      <div className="flex items-center gap-2">
                        {orderSteps.map((s, i) => (
                          <motion.div
                            key={i}
                            className={`rounded-full ${i === activeOrderStep ? s.dot : 'bg-muted-foreground/30'}`}
                            animate={{ width: i === activeOrderStep ? 20 : 8, height: 8 }}
                            transition={{ duration: 0.3 }}
                          />
                        ))}
                      </div>

                      {/* Animated status card */}
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeOrderStep}
                          className="w-full bg-card/80 border border-primary/20 rounded-2xl p-5 backdrop-blur-md shadow-xl"
                          initial={{ y: 20, opacity: 0, scale: 0.97 }}
                          animate={{ y: 0, opacity: 1, scale: 1 }}
                          exit={{ y: -20, opacity: 0, scale: 0.97 }}
                          transition={{ duration: 0.45, ease: 'easeInOut' }}
                        >
                          {/* Tag */}
                          <span className={`inline-flex text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full ${orderSteps[activeOrderStep].tagColor}`}>
                            {orderSteps[activeOrderStep].tag}
                          </span>

                          {/* Icon + Status */}
                          <div className="flex items-center gap-3 mt-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${orderSteps[activeOrderStep].iconBg}`}>
                              {orderSteps[activeOrderStep].icon}
                            </div>
                            <div>
                              <p className="font-bold text-foreground text-base leading-tight">{orderSteps[activeOrderStep].status}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{orderSteps[activeOrderStep].detail}</p>
                            </div>
                          </div>

                          {/* Animated progress bar */}
                          <div className="mt-4 h-1.5 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${orderSteps[activeOrderStep].dot}`}
                              initial={{ width: '0%' }}
                              animate={{ width: `${((activeOrderStep + 1) / orderSteps.length) * 100}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                            />
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-[10px] text-muted-foreground">Step {activeOrderStep + 1} of {orderSteps.length}</span>
                            <span className="text-[10px] text-muted-foreground">{Math.round(((activeOrderStep + 1) / orderSteps.length) * 100)}%</span>
                          </div>
                        </motion.div>
                      </AnimatePresence>

                      {/* Mini order summary below */}
                      <div className="w-full bg-muted/40 border border-border/50 rounded-xl px-4 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <Utensils className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">Local Vendor Order</p>
                          <p className="text-[10px] text-muted-foreground">Fresh • Community-first</p>
                        </div>
                        <div className="text-xs font-bold text-primary">LIVE</div>
                      </div>

                    </div>
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
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-widest mb-4">
                    <Zap className="h-3 w-3" />
                    Hyperlocal Delivery Platform
                  </span>

                  <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                    Your Daily Essentials,{' '}
                    <span className="text-primary">Delivered.</span>
                  </h1>

                  <p className="mt-4 text-base text-muted-foreground max-w-md mx-auto md:mx-0 leading-relaxed">
                    Order anything from your favorite local vendors and get it delivered right to your door — fresh, fast, and community-first.
                  </p>

                  {/* Trust pills */}
                  <div className="mt-5 flex flex-wrap gap-2 justify-center md:justify-start">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20">
                      <BadgeCheck className="h-3.5 w-3.5" /> Verified Vendors
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20">
                      <Clock className="h-3.5 w-3.5" /> Fast Delivery
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20">
                      <MapPin className="h-3.5 w-3.5" /> Local Shops Only
                    </span>
                  </div>

                  {/* CTA Buttons — colors & functionality unchanged */}
                  <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-sm mx-auto md:mx-0">
                    <Button
                      size="lg"
                      onClick={handleOrderNow}
                      className="w-full text-white bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 bg-[length:200%_auto] animate-gradient-move"
                    >
                      <Utensils className="mr-2 h-5 w-5" />
                      Order Now
                    </Button>
                    <Link href="/admin/login" passHref>
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full text-white bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-[length:200%_auto] animate-gradient-move"
                      >
                        <Store className="mr-2 h-5 w-5" />
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
                        <CarouselItem key={vendor.username} className="basis-3/4 sm:basis-1/2 md:basis-1/3 pl-4">
                          <Card
                            className="rounded-2xl overflow-hidden group h-full flex flex-col text-left bg-card/80 cursor-pointer"
                            onClick={() => handleVendorOfferClick(vendor)}
                          >
                            {firstOffer && (
                              <>
                                <div className="aspect-video w-full relative">
                                  <Image
                                    src={firstOffer.imageUrl}
                                    alt={firstOffer.title}
                                    fill
                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                    placeholder={firstOffer.blurDataUrl ? 'blur' : 'empty'}
                                    blurDataURL={firstOffer.blurDataUrl}
                                  />
                                </div>
                                <div className="p-3 flex flex-col flex-1">
                                  <h3 className="font-semibold text-sm truncate">{firstOffer.title}</h3>
                                  <p className="text-xs text-muted-foreground mt-1 truncate">{vendor.shopName}</p>
                                  {firstOffer.startDate && firstOffer.endDate && (
                                    <p className="text-xs text-destructive mt-1 font-semibold">
                                      Valid: {format(new Date(firstOffer.startDate), 'dd MMM')} - {format(new Date(firstOffer.endDate), 'dd MMM')}
                                    </p>
                                  )}
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
                      {popularVendors.map((vendor, index) => {
                        const ratingCount = vendor.ratingCount || 0;
                        const totalRatingSum = vendor.totalRatingSum || 0;
                        const average = ratingCount > 0 ? totalRatingSum / ratingCount : 0;

                        return (
                          <CarouselItem key={`${vendor.username}-${index}`} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6 pl-4">
                            <Link href={getVendorUrl(vendor)} passHref>
                              <Card className="rounded-2xl overflow-hidden group h-full flex flex-col text-center bg-card/80">
                                <CardContent className="p-3 flex flex-col flex-1 items-center">
                                  <div className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center relative overflow-hidden">
                                    <Image
                                      src={vendor.shopImage || `https://placehold.co/96x96.png`}
                                      alt={vendor.shopName || ''}
                                      layout="fill"
                                      data-ai-hint={vendor.category || 'restaurant'}
                                      className="object-cover transition-transform duration-300 group-hover:scale-105 rounded-full"
                                      placeholder={vendor.shopImageBlur ? 'blur' : 'empty'}
                                      blurDataURL={vendor.shopImageBlur}
                                    />
                                  </div>
                                  <div className="p-2 flex flex-col flex-1 w-full">
                                    <h3 className="font-semibold text-sm truncate">{vendor.shopName}</h3>
                                    <p className="text-xs text-muted-foreground flex-1">{renderTagline(vendor.tagline)}</p>
                                    {ratingCount > 0 && (
                                      <div className="flex items-center justify-center gap-1 text-xs text-amber-400 mt-2" title="Vendor Rating">
                                        <Star className="h-3 w-3 fill-current" />
                                        <span className="font-bold">{average.toFixed(1)}</span>
                                        <span className="text-muted-foreground">({ratingCount})</span>
                                      </div>
                                    )}
                                    <p className="text-xs text-primary font-semibold mt-1">{vendor.category}</p>
                                  </div>
                                </CardContent>
                              </Card>
                            </Link>
                          </CarouselItem>
                        )
                      })}
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

            {/* ── WHY CHOOSE US ────────────────────────────────────── */}
            <section className="py-10 mt-6">
              <div className="text-center mb-8">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-widest mb-3">
                  <Zap className="h-3 w-3" />
                  Built for your community
                </span>
                <h2 className="text-2xl md:text-3xl font-bold font-headline">Why Choose HyperDelivery</h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                  We're not just an app — we're a local ecosystem that puts your neighborhood first.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {richFeatures.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="bg-muted/50 rounded-3xl p-6 text-center flex flex-col items-center gap-3 border border-primary/10 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                  >
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                      {feature.icon}
                    </div>
                    <h3 className="font-semibold text-base">{feature.name}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* ── HOW IT WORKS ─────────────────────────────────────── */}
            <section className="py-10 mt-2 bg-muted/30 rounded-3xl px-6">
              <div className="text-center mb-8">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-widest mb-3">
                  <ArrowRight className="h-3 w-3" />
                  Simple & fast
                </span>
                <h2 className="text-2xl md:text-3xl font-bold font-headline">How It Works</h2>
                <p className="text-sm text-muted-foreground mt-2">Three easy steps to get food at your doorstep</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative">

                {howItWorks.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.15 }}
                    className="flex flex-col items-center text-center gap-3 relative"
                  >
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-primary">
                        {step.icon}
                      </div>
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                    </div>
                    <h3 className="font-semibold text-base">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{step.description}</p>
                  </motion.div>
                ))}
              </div>
            </section>

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
    </>
  );
}
