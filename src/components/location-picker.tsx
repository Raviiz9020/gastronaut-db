'use client';

import React, { useState } from 'react';
import { useLocation } from '@/context/location-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, Search, Loader2, X } from 'lucide-react';
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
    const { userLocation, detectLocation, setLocation, isLoading, error } = useLocation();
    const [manualAddress, setManualAddress] = useState('');
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

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&limit=5`);
            if (res.ok) {
                const data = await res.json();
                setSearchResults(data);
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
                    <span className="truncate">
                        {userLocation ? userLocation.addressName : 'Detect My Location'}
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
                    className={cn("flex items-center gap-2 text-sm font-medium hover:bg-primary/5", className)}
                >
                    <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="truncate max-w-[80px] sm:max-w-[100px] md:max-w-[150px] text-xs font-semibold md:text-sm md:font-medium">
                        {userLocation ? userLocation.addressName : 'Set Location'}
                    </span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="font-headline text-2xl">Find Vendors Near You</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <p className="text-sm text-muted-foreground text-center">
                        {userLocation ? (
                            <>Your current location is set to: <strong className="text-foreground text-base">{userLocation.addressName}</strong></>
                        ) : (
                            "To show you vendors that deliver to your doorstep, we need to know your current location."
                        )}
                    </p>
                    
                    <Button 
                        onClick={handleDetectLocation} 
                        disabled={isLoading}
                        className="w-full h-16 rounded-2xl gap-3 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg transition-all"
                    >
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Navigation className="h-5 w-5" />}
                        {isLoading ? 'Detecting...' : userLocation ? 'Update Location' : 'Use Current Location'}
                    </Button>

                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-muted"></div>
                        <span className="flex-shrink-0 mx-4 text-muted-foreground text-xs font-medium uppercase">or search manually</span>
                        <div className="flex-grow border-t border-muted"></div>
                    </div>

                    <form onSubmit={handleSearch} className="flex w-full gap-2">
                        <Input 
                            placeholder="Enter city, area, or street..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="rounded-xl h-12 flex-1 min-w-0"
                        />
                        <Button type="submit" disabled={isSearching} className="h-12 rounded-xl px-4 flex-shrink-0">
                            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                    </form>

                    {searchResults.length > 0 && (
                        <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-xl p-2 bg-muted/20 w-full overflow-x-hidden">
                            {searchResults.map((result, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleSelectLocation(result)}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors flex flex-col overflow-hidden"
                                >
                                    <span className="font-semibold w-full truncate">{result.name}</span>
                                    <span className="text-xs text-muted-foreground w-full truncate">{result.display_name}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {error && (
                        <div className="bg-destructive/10 p-4 rounded-2xl space-y-2 border border-destructive/20">
                            <p className="text-xs text-destructive text-center font-medium">
                                {error === 'User denied Geolocation' 
                                    ? 'Location access was denied. Please enable location permissions in your browser settings to continue.' 
                                    : error}
                            </p>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full h-8 text-[10px] rounded-lg"
                                onClick={() => detectLocation()}
                            >
                                Try Again
                            </Button>
                        </div>
                    )}

                    <p className="text-[10px] text-muted-foreground text-center px-4">
                        We only use your location to calculate delivery distances. Your privacy is important to us.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
};
