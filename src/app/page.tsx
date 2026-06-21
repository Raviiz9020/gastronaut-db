
'use client';

import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Clock, MapPin, Shield, Star, Gift, Store, ShoppingBag, Utensils, Heart, Building } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useVendor } from '@/context/vendor-context';
import { useVendorCategory } from '@/context/vendor-category-context';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSiteReview } from '@/context/site-review-context';
import SiteReviewForm from '@/components/site-review-form';
import Logo from '@/components/logo';
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


const features = [
  { name: 'Fast Delivery', icon: <Clock className="h-5 w-5 text-primary" /> },
  { name: 'Local Vendors', icon: <MapPin className="h-5 w-5 text-primary" /> },
  { name: 'Easy Order', icon: <ShoppingBag className="h-5 w-5 text-primary" /> },
];

const WhatsAppIcon = () => (
    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 12c0 1.78.46 3.45 1.28 4.93L2 22l5.25-1.38c1.45.77 3.09 1.18 4.79 1.18h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zM12.04 20.15c-1.5 0-2.95-.39-4.23-1.09l-.3-.18-3.14.82.84-3.07-.2-.31a8.29 8.29 0 0 1-1.28-4.38c0-4.54 3.7-8.24 8.24-8.24s8.24 3.7 8.24 8.24-3.7 8.24-8.24 8.24zm4.49-6.17c-.24-.12-1.45-.71-1.67-.79s-.39-.12-.55.12-.63.79-.78.95c-.14.16-.28.18-.52.06s-1.03-.38-1.96-1.21c-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.01-.37.11-.48.1-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42s-.55-1.32-.76-1.81c-.2-.48-.4-.42-.55-.42h-.48c-.16 0-.42.06-.63.3s-.84.82-.84 2c0 1.18.86 2.32 1 2.48.13.16 1.69 2.59 4.1 3.6.58.24 1.04.39 1.4.5.52.17 1-.06 1.16-.36.16-.3.16-.55.11-.67s-.16-.18-.4-.3z"/>
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
            }, 1500); // 1.5 seconds
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
    // Auto-open location dialog if no location is set and initial loading is done
    if (!isLocationLoading && !userLocation) {
        const timer = setTimeout(() => {
            setIsLocationDialogOpen(true);
        }, 500); // 500ms delay to ensure mounting
        return () => clearTimeout(timer);
    }
  }, [isLocationLoading, userLocation]);

  
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

  const [zoomedItem, setZoomedItem] = useState<{id: string, image: string, name: string} | null>(null);

  const handleImageClick = (item: {id: string, image: string, name: string}) => {
    setZoomedItem(item);
  };

  const activeOffers = useMemo(() => {
    const now = new Date();
    return offers.filter(o => {
        if (!o.isActive) return false;
        const startDate = o.startDate ? new Date(o.startDate) : null;
        const endDate = o.endDate ? new Date(o.endDate) : null;
        if (startDate && now < startDate) return false; // Not yet started
        if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            if (now > endOfDay) return false; // Expired
        }
        return true;
    });
  }, [offers]);

  const vendorsWithOffers = useMemo(() => {
    const vendorUsernamesWithOffers = new Set<string>();
    activeOffers.forEach(offer => {
        // Include vendors for vendor-specific offers
        if (offer.vendorUsername) {
            vendorUsernamesWithOffers.add(offer.vendorUsername);
        }
    });

    // If there's a global offer, all approved vendors are included
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

    if (approved.length === 0) return [];
    
    let extendedList: Vendor[] = [];
    while (extendedList.length < 10 && approved.length > 0) {
      extendedList = extendedList.concat(approved);
    }
    return extendedList;
  }, [vendors, userLocation]);

  const activeVendorCategories = useMemo(() => {
    let serviceableVendors = vendors.filter(v => v.isApproved);
    
    // If location is set, only consider vendors that can serve this location
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
        <div className="container mx-auto px-4 py-6">
          <section className="py-6 md:py-8">
            <div className="grid md:grid-cols-2 gap-6 items-center">
              <div className="flex justify-center md:order-last">
                <div className="w-40 h-40 md:w-56 md:h-56 rounded-full flex items-center justify-center text-primary">
                    <Logo className="h-full w-full" />
                </div>
              </div>
              <div className="text-center md:text-left">
                <h1 className="font-headline text-3xl md:text-4xl font-bold">
                  Your Daily Essentials, <br/> Delivered.
                </h1>
                <p className="mt-3 text-sm text-muted-foreground">
                  Life Republicans. Order anything from your favorite local vendors and get it delivered in minutes.
                </p>
                <p className="mt-2 text-xs text-primary font-semibold">
                  #VerifiedVendors #VerifiedCustomers #onlyLifeRepublic
                </p>
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 justify-center md:justify-start">
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
                <div className="mt-6 space-y-4 pt-4 border-t border-primary/10">
                    <div className="text-center md:text-left">
                        <label className="text-sm font-medium text-muted-foreground">Find items in your budget: <span className="font-bold text-primary">₹{priceRange}</span></label>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <Slider
                            defaultValue={[priceRange]}
                            max={1000}
                            step={50}
                            onValueChange={(value) => setPriceRange(value[0])}
                            className="flex-1"
                        />
                        <Button 
                            size="lg" 
                            onClick={handlePriceFilterClick}
                            className="w-full sm:w-auto text-white bg-gradient-to-r from-green-400 via-teal-500 to-blue-500 bg-[length:200%_auto] animate-gradient-move"
                        >
                           <Search className="mr-2 h-5 w-5" />
                           Find
                        </Button>
                    </div>
                </div>
              </div>
            </div>
          </section>

          <section className="py-2">
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
                            <div className="relative w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:shadow-lg group-hover:border-primary border-2 border-transparent">
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

          {vendorsWithOffers.length > 0 && (
            <section className="py-4 bg-muted/50 rounded-3xl mt-8">
              <div className="flex justify-between items-center px-4">
                <h2 className="text-xl font-bold font-headline flex items-center gap-2">
                  <Gift className="h-5 w-5 text-destructive" />
                  Popular Offers
                </h2>
              </div>
              <div className="mt-4">
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
              </div>
            </section>
          )}

          <section className="py-4 bg-muted/50 rounded-3xl mt-8">
            <div className="flex justify-between items-center px-4">
              <h2 className="text-xl font-bold font-headline flex items-center gap-2">
                <Store className="h-5 w-5 text-destructive"/>
                Popular Vendors
              </h2>
              {popularVendors.length > 0 && (
                <Link href="/vendor-details" passHref>
                  <Button variant="link" className="text-primary pr-0">
                    See all
                  </Button>
                </Link>
              )}
            </div>
            <div className="mt-4">
              {popularVendors.length > 0 ? (
               <Carousel
                plugins={[plugin.current]}
                opts={{
                  align: "start",
                  loop: true,
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
                                <div
                                className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center relative overflow-hidden"
                                >
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
                  )})}
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

          <section className="py-4 bg-muted/50 rounded-3xl mt-8">
            <h2 className="text-xl font-bold text-center font-headline">Why Choose Us</h2>
            <div className="mt-4 flex flex-wrap justify-center gap-8">
              {features.map((feature, index) => (
                <div key={index} className="text-center p-2">
                  <div className="w-10 h-10 mx-auto bg-background rounded-full flex items-center justify-center">
                    {feature.icon}
                  </div>
                  <h3 className="mt-1 font-semibold text-xs">{feature.name}</h3>
                </div>
              ))}
            </div>
          </section>

          <section className="py-6 md:py-8">
            <h2 className="text-xl font-bold text-center font-headline">Reviews</h2>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {reviews.map((review, index) => (
                <Card key={index} className="bg-muted/50 rounded-3xl">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 text-primary fill-primary" />
                      ))}
                    </div>
                    <p className="mt-2 text-muted-foreground text-xs italic">"{review.text}"</p>
                    <p className="mt-2 font-semibold text-right text-xs">- {review.authorName}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
             <div className="mt-6 max-w-4xl mx-auto">
                <SiteReviewForm />
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-primary/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <Link href="/about" className="hover:text-primary">About</Link>
              <Link href="/contact" className="hover:text-primary">Contact</Link>
              <Link href="/privacy-policy" className="hover:text-primary">Privacy Policy</Link>
              <Link href="/terms-of-service" className="hover:text-primary">Terms of Service</Link>
            </div>
            <div className="flex items-center gap-4">
                 <Link href="/benefits" passHref>
                    <div className="text-muted-foreground hover:text-primary">
                        <Heart className="h-6 w-6" />
                    </div>
                 </Link>
                <a href="https://www.instagram.com/lrmasalamagic/?igsh=MTM0c3ExYWo5Y3Z3bQ%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                    <InstagramIcon />
                </a>
                <a href="https://wa.me/917083609020" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
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
