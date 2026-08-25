'use client';

import React, { useState } from 'react';
import { useLocation } from '@/context/location-context';
import { useCustomer } from '@/context/customer-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, Search, Loader2, Home, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface LocationPickerProps {
    className?: string;
    variant?: 'minimal' | 'full';
    onLocationSelected?: () => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({ 
    className, 
    variant = 'minimal',
    onLocationSelected,
    open: externalOpen,
    onOpenChange: externalOnOpenChange
}) => {
    const { userLocation, detectLocation, setLocation, selectHomeLocation, isCurrentHome, isLoading, error } = useLocation();
    const { customer } = useCustomer();
    const [internalOpen, setInternalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
    const setIsOpen = externalOnOpenChange !== undefined ? externalOnOpenChange : setInternalOpen;

    const handleDetectLocation = async () => {
        await detectLocation();
        if (onLocationSelected) onLocationSelected();
        setIsOpen(false);
    };

    const handleSelectHome = () => {
        selectHomeLocation();
        if (onLocationSelected) onLocationSelected();
        setIsOpen(false);
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const res = await fetch(`/api/geocode?address=${encodeURIComponent(searchQuery)}`);
            if (res.ok) {
                const data = await res.json();
                if (data.status === 'OK' && data.results) {
                    const mapped = data.results.map((item: any) => {
                        const components = item.address_components || [];
                        const cityComp = components.find((c: any) => 
                            c.types.includes('locality') || 
                            c.types.includes('administrative_area_level_2')
                        );
                        const subLocalityComp = components.find((c: any) => 
                            c.types.includes('sublocality') || 
                            c.types.includes('neighborhood')
                        );

                        const name = subLocalityComp?.long_name || cityComp?.long_name || item.formatted_address;

                        return {
                            name: name,
                            display_name: item.formatted_address,
                            lat: item.geometry.location.lat,
                            lon: item.geometry.location.lng,
                            address: {
                                city: cityComp?.long_name || null
                            }
                        };
                    });
                    setSearchResults(mapped);
                } else {
                    console.error('Geocoding API returned status:', data.status, data.error_message || '');
                    setSearchResults([]);
                }
            }
        } catch (err) {
            console.error('Search failed:', err);
        }
        setIsSearching(false);
    };

    const handleSelectLocation = (result: any) => {
        const placeName = result.address?.city || result.address?.town || result.address?.village || result.address?.suburb || result.name || 'Selected Location';
        setLocation({
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon),
            addressName: placeName
        });
        if (onLocationSelected) onLocationSelected();
        setIsOpen(false);
    };

    const locationLabel = isCurrentHome || userLocation?.isHome || userLocation?.addressName === 'Home'
        ? 'Home'
        : userLocation?.addressName || 'Set Location';

    if (variant === 'minimal') {
        return (
            <div className={cn("flex flex-col gap-2", className)}>
                <Button 
                    onClick={handleDetectLocation} 
                    disabled={isLoading}
                    variant="outline"
                    className="w-full justify-start gap-2 h-12 rounded-xl"
                >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                    <span className="truncate font-medium">
                        {locationLabel}
                    </span>
                </Button>
            </div>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button 
                    variant="ghost" 
                    className={cn("flex items-center gap-1.5 text-sm font-medium hover:bg-primary/5 px-2.5 sm:px-3 py-1.5 rounded-full border border-primary/15 bg-background/50", className)}
                >
                    {isCurrentHome ? (
                        <Home className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    ) : (
                        <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    )}
                    <span className="truncate max-w-[90px] sm:max-w-[120px] md:max-w-[160px] text-xs font-semibold md:text-sm md:font-medium">
                        {locationLabel}
                    </span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="font-headline text-2xl">Find Vendors Near You</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
                    <p className="text-xs sm:text-sm text-muted-foreground text-center">
                        {userLocation ? (
                            <>Your current delivery location is set to: <strong className="text-foreground">{isCurrentHome ? 'Home' : userLocation.addressName}</strong></>
                        ) : (
                            "To show you vendors that deliver to your doorstep, we need your delivery location."
                        )}
                    </p>

                    {/* Saved Home Address Option */}
                    {customer && customer.latitude && customer.longitude && (
                        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 space-y-2 text-left transition-all">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                                    <Home className="h-3.5 w-3.5" /> Saved Address
                                </span>
                                {isCurrentHome ? (
                                    <span className="text-[11px] font-semibold text-green-600 dark:text-green-400 flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                                        <Check className="h-3 w-3" /> Active Delivery Location
                                    </span>
                                ) : (
                                    <span className="text-[10px] text-muted-foreground font-medium">Home Profile</span>
                                )}
                            </div>
                            <p className="text-xs text-foreground/90 font-medium line-clamp-2 leading-relaxed">
                                {customer.address}
                            </p>
                            {!isCurrentHome && (
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleSelectHome}
                                    className="w-full h-9 text-xs font-semibold rounded-xl gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs mt-1"
                                >
                                    <Home className="h-3.5 w-3.5" /> Deliver to Home Address
                                </Button>
                            )}
                        </div>
                    )}
                    
                    <Button 
                        onClick={handleDetectLocation} 
                        disabled={isLoading}
                        className="w-full h-14 rounded-2xl gap-2.5 text-base font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md transition-all"
                    >
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Navigation className="h-5 w-5" />}
                        {isLoading ? 'Detecting...' : 'Use Current GPS Location'}
                    </Button>

                    <div className="relative flex items-center py-1">
                        <div className="flex-grow border-t border-muted"></div>
                        <span className="flex-shrink-0 mx-4 text-muted-foreground text-[11px] font-medium uppercase">or search manually</span>
                        <div className="flex-grow border-t border-muted"></div>
                    </div>

                    <form onSubmit={handleSearch} className="flex w-full gap-2 min-w-0">
                        <Input 
                            placeholder="Enter city, area, or street..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="rounded-xl h-11 flex-1 min-w-0 text-sm"
                        />
                        <Button type="submit" disabled={isSearching} className="h-11 rounded-xl px-4 flex-shrink-0">
                            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                    </form>

                    {searchResults.length > 0 && (
                        <div className="max-h-[180px] overflow-y-auto space-y-1.5 border rounded-xl p-2 bg-muted/20 w-full min-w-0 max-w-full">
                            {searchResults.map((result, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleSelectLocation(result)}
                                    className="w-full text-left px-2.5 py-2 text-sm hover:bg-muted rounded-lg transition-colors flex flex-col min-w-0 overflow-hidden"
                                >
                                    <span className="font-semibold block w-full truncate text-xs sm:text-sm">{result.name}</span>
                                    <span className="text-[11px] text-muted-foreground block w-full truncate">{result.display_name}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {error && (
                        <div className="bg-destructive/10 p-3 rounded-2xl space-y-2 border border-destructive/20">
                            <p className="text-xs text-destructive text-center font-medium leading-relaxed">
                                {error === 'User denied Geolocation' 
                                    ? 'Location access was denied. Please enable location permissions or search for your address manually above.' 
                                    : `${error}. If you are experiencing GPS issues, please search for your address manually.`}
                            </p>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full h-8 text-[11px] rounded-lg"
                                onClick={() => detectLocation()}
                            >
                                Try Again
                            </Button>
                        </div>
                    )}

                    <p className="text-[10px] text-muted-foreground text-center px-4">
                        We use your location to calculate delivery distance & vendor serviceability.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
};
