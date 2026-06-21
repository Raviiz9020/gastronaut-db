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

    const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
    const setIsOpen = externalOnOpenChange !== undefined ? externalOnOpenChange : setInternalOpen;

    const handleDetectLocation = async () => {
        await detectLocation();
        if (onLocationSelected) onLocationSelected();
        setIsOpen(false);
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // For now, since we don't have a geocoding API, we'll just set a mock location
        // in a real app, this would use Google Places Autocomplete
        if (manualAddress.trim()) {
            setLocation({
                latitude: 18.5868, // Default Life Republic area coordinates
                longitude: 73.6860,
                addressName: manualAddress
            });
            if (onLocationSelected) onLocationSelected();
            setIsOpen(false);
        }
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
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="truncate max-w-[150px]">
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
                        To show you vendors that deliver to your doorstep, we need to know your current location.
                    </p>
                    
                    <Button 
                        onClick={handleDetectLocation} 
                        disabled={isLoading}
                        className="w-full h-16 rounded-2xl gap-3 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg transition-all"
                    >
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Navigation className="h-5 w-5" />}
                        {isLoading ? 'Detecting...' : 'Use Current Location'}
                    </Button>

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
