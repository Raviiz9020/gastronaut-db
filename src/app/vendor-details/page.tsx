'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useVendor } from '@/context/vendor-context';
import { useOffer } from '@/context/offer-context';
import type { Vendor, Offer } from '@/types';
import { Loader2, Building, Tag, MapPin, Phone, Info, Clock, Gift, Utensils, Star, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import MultiOfferSplashDialog from '@/components/multi-offer-splash-dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { createSlug } from '@/lib/utils';

export default function VendorDetailsPage() {
    const { vendors, fetchAllVendors } = useVendor();
    const { offers } = useOffer();
    const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);
    const [selectedOffers, setSelectedOffers] = useState<Offer[]>([]);

    useEffect(() => {
        fetchAllVendors();
    }, [fetchAllVendors]);


    const approvedVendors = useMemo(() => {
        return vendors.filter(v => v.isApproved && v.shopName);
    }, [vendors]);
    
    const activeOffers = useMemo(() => {
        return offers.filter(o => o.isActive);
    }, [offers]);

    const handleOfferClick = (vendor: Vendor) => {
        const vendorSpecificOffers = activeOffers.filter(offer => 
            !offer.vendorUsername || offer.vendorUsername === vendor.username
        );
        setSelectedOffers(vendorSpecificOffers);
        setIsOfferDialogOpen(true);
    };

    const getVendorUrl = (vendor: Vendor) => {
        const identifier = vendor.slug || (vendor.shopName ? createSlug(vendor.shopName) : vendor.username);
        return `/menu?vendor=${identifier}`;
    }

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


    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 container mx-auto px-4 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-12"
                >
                    <h1 className="font-headline text-5xl text-primary">Our Vendors</h1>
                    <p className="text-muted-foreground text-lg mt-2">Meet the talented home chefs and local shops in our community.</p>
                </motion.div>

                {approvedVendors.length === 0 ? (
                    <div className="flex items-center justify-center h-64">
                         <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {approvedVendors.map((vendor, index) => {
                            const hasActiveOffer = activeOffers.some(offer => !offer.vendorUsername || offer.vendorUsername === vendor.username);
                            const ratingCount = vendor.ratingCount || 0;
                            const totalRatingSum = vendor.totalRatingSum || 0;
                            const average = ratingCount > 0 ? totalRatingSum / ratingCount : 0;
                            
                            return (
                            <motion.div
                                key={vendor.username}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                            >
                                <Card className="h-full rounded-3xl bg-card/80 backdrop-blur-sm border-primary/10 hover:border-primary/30 transition-all duration-300 flex flex-col relative overflow-hidden">
                                    {hasActiveOffer && (
                                        <div className="absolute top-0 right-0 z-20">
                                            <Button 
                                                onClick={() => handleOfferClick(vendor)}
                                                className="rounded-none rounded-bl-2xl rounded-tr-2xl bg-destructive hover:bg-destructive/90 h-auto px-4 py-2 font-bold"
                                            >
                                                <Gift className="h-4 w-4 mr-2"/>
                                                Offer!
                                            </Button>
                                        </div>
                                    )}
                                    <div className="relative w-full h-40">
                                        <Image 
                                            src={vendor.shopImage || 'https://placehold.co/600x400.png'}
                                            alt={vendor.shopName || 'Vendor shop image'}
                                            layout="fill"
                                            objectFit="cover"
                                            className="rounded-t-3xl"
                                        />
                                    </div>
                                    <CardHeader className="z-10">
                                        <CardTitle className="flex items-center justify-between text-2xl text-primary">
                                            <div className="flex items-center gap-3">
                                                <Building className="h-7 w-7" />
                                                <span>{vendor.shopName}</span>
                                            </div>
                                            <Link href={getVendorUrl(vendor)} passHref>
                                                <Button variant="outline" size="sm">
                                                    <Utensils className="h-4 w-4 mr-2" />
                                                    Menu
                                                </Button>
                                            </Link>
                                        </CardTitle>
                                        <div className="flex justify-between items-center">
                                            <CardDescription>{renderTagline(vendor.tagline || `Operated by: ${vendor.name}`)}</CardDescription>
                                            {ratingCount > 0 && (
                                                <div className="flex items-center gap-1 text-xs text-amber-400" title="Vendor Rating">
                                                    <Star className="h-4 w-4 fill-current" />
                                                    <span className="font-bold">{average.toFixed(1)}</span>
                                                    <span className="text-xs text-muted-foreground">({ratingCount})</span>
                                                </div>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4 text-left flex-1 z-10">
                                        {vendor.about && (
                                            <div className="flex items-start gap-3">
                                                <Info className="h-5 w-5 mt-1 text-muted-foreground flex-shrink-0" />
                                                <div>
                                                    <h4 className="font-semibold">About</h4>
                                                    <p className="text-muted-foreground">{vendor.about}</p>
                                                </div>
                                            </div>
                                        )}
                                        {vendor.category && (
                                            <div className="flex items-start gap-3">
                                                <Tag className="h-5 w-5 mt-1 text-muted-foreground flex-shrink-0" />
                                                <div>
                                                    <h4 className="font-semibold">Category</h4>
                                                    <p className="text-muted-foreground">{vendor.category}</p>
                                                </div>
                                            </div>
                                        )}
                                         {vendor.address && (
                                            <div className="flex items-start gap-3">
                                                <MapPin className="h-5 w-5 mt-1 text-muted-foreground flex-shrink-0" />
                                                <div className="flex flex-col">
                                                    <h4 className="font-semibold">Address</h4>
                                                    <p className="text-muted-foreground">{vendor.address}</p>
                                                    {vendor.googleMapsUrl && (
                                                        <a href={vendor.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 flex items-center gap-1">
                                                            View on Google Maps <ExternalLink className="h-3 w-3"/>
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {vendor.workingHours && (
                                            <div className="flex items-start gap-3">
                                                <Clock className="h-5 w-5 mt-1 text-muted-foreground flex-shrink-0" />
                                                <div>
                                                    <h4 className="font-semibold">Hours</h4>
                                                    <p className="text-muted-foreground">{vendor.workingHours}</p>
                                                </div>
                                            </div>
                                        )}
                                        {vendor.contact && (
                                            <div className="flex items-start gap-3">
                                                <Phone className="h-5 w-5 mt-1 text-muted-foreground flex-shrink-0" />
                                                <div>
                                                    <h4 className="font-semibold">Contact</h4>
                                                    <p className="text-muted-foreground">{vendor.contact.replace('+91','')}</p>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )})}
                    </div>
                )}
                 <MultiOfferSplashDialog isOpen={isOfferDialogOpen} onOpenChange={setIsOfferDialogOpen} offers={selectedOffers} />
            </main>
        </div>
    );
}
