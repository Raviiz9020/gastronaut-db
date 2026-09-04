'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/header';
import VendorCard from '@/components/vendor-card';
import { useVendor } from '@/context/vendor-context';
import { useOffer } from '@/context/offer-context';
import { useLocation } from '@/context/location-context';
import { isVendorServiceable } from '@/lib/location-utils';
import { Loader2, Store, MapPin, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function VendorDetailsPage() {
  const { vendors, fetchAllVendors } = useVendor();
  const { offers, fetchAllOffers } = useOffer();
  const { userLocation, isLoading: isLocationLoading } = useLocation();

  useEffect(() => {
    fetchAllVendors();
    fetchAllOffers();
  }, [fetchAllVendors, fetchAllOffers]);

  // Strictly filter approved vendors serviceable in the user's location
  const serviceableVendors = useMemo(() => {
    let list = vendors.filter((v) => v.isApproved && v.shopName);
    if (userLocation) {
      list = list.filter((v) => isVendorServiceable(v, userLocation));
    }
    return list;
  }, [vendors, userLocation]);

  const activeOffers = useMemo(() => {
    return offers.filter((o) => o.isActive);
  }, [offers]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <div className="mb-4">
          <Link href="/" passHref>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-9 w-9 rounded-full border-border/70 hover:border-primary/50 hover:bg-primary/10 transition-all shadow-xs"
              aria-label="Back to Home"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 md:mb-12 max-w-2xl mx-auto"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-3">
            <Store className="h-3.5 w-3.5" />
            Hyperlocal Kitchens
          </span>
          <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground">
            Our Kitchens & Chefs
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-2">
            Meet the verified home chefs and local specialty kitchens serving fresh meals in your community.
          </p>

          {userLocation?.addressName && (
            <div className="mt-4 inline-flex items-center gap-1.5 bg-muted/60 border border-border/60 text-xs font-medium px-3.5 py-1.5 rounded-full text-foreground/80">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              Delivering to: <span className="font-bold text-foreground">{userLocation.addressName}</span>
            </div>
          )}
        </motion.div>

        {isLocationLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Checking kitchens in your area...</p>
          </div>
        ) : serviceableVendors.length === 0 ? (
          <div className="text-center py-16 px-4 bg-muted/30 rounded-3xl border border-dashed border-border/80 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <Store className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-foreground">No Kitchens Found in This Area</h3>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-xs mx-auto">
              We couldn&apos;t find any active kitchens delivering to your selected location yet.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/menu">
                <Button className="rounded-xl font-semibold">
                  Browse All Available Dishes
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {serviceableVendors.map((vendor, index) => (
              <motion.div
                key={vendor.username}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <VendorCard
                  vendor={vendor}
                  offers={activeOffers}
                  userLocation={userLocation}
                />
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
