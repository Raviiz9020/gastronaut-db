'use client';

import React, { useState } from 'react';
import { useLocation } from '@/context/location-context';
import { useCustomer } from '@/context/customer-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    MapPin, Navigation, Search, Loader2, Home, Check, Map, 
    Plus, Briefcase, Users, Building, Edit3, ChevronRight, Trash2, Star 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MapLocationPickerDialog } from '@/components/map-location-picker-dialog';
import type { SavedAddress } from '@/types';
import { cn } from '@/lib/utils';

interface LocationPickerProps {
    className?: string;
    variant?: 'minimal' | 'full';
    onLocationSelected?: () => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

const getTagIcon = (tag?: string) => {
    switch (tag) {
        case 'Home': return Home;
        case 'Parents': return Users;
        case 'Work': return Briefcase;
        default: return Building;
    }
};

export const LocationPicker: React.FC<LocationPickerProps> = ({ 
    className, 
    variant = 'minimal',
    onLocationSelected,
    open: externalOpen,
    onOpenChange: externalOnOpenChange
}) => {
    const { userLocation, detectLocation, setLocation, selectSavedAddress, isCurrentHome, isLoading, error } = useLocation();
    const { customer, setDefaultAddress, deleteSavedAddress } = useCustomer();
    const [internalOpen, setInternalOpen] = useState(false);
    const [isMapDialogOpen, setIsMapDialogOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
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

    const handleSelectSavedAddress = (addr: SavedAddress) => {
        selectSavedAddress(addr);
        if (onLocationSelected) onLocationSelected();
        setIsOpen(false);
    };

    const handleEditAddress = (addr: SavedAddress) => {
        setEditingAddress(addr);
        setIsOpen(false);
        setIsMapDialogOpen(true);
    };

    const handleAddNewAddress = () => {
        setEditingAddress(null);
        setIsOpen(false);
        setIsMapDialogOpen(true);
    };

    const handleSetDefault = async (addr: SavedAddress) => {
        try {
            await setDefaultAddress(addr.id);
        } catch (err) {
            console.error('Failed to set default:', err);
        }
    };

    const handleDeleteAddress = async (addr: SavedAddress) => {
        if (!customer?.savedAddresses || customer.savedAddresses.length <= 1) return;
        try {
            await deleteSavedAddress(addr.id);
        } catch (err) {
            console.error('Failed to delete address:', err);
        }
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
                        };
                    });
                    setSearchResults(mapped);
                } else {
                    setSearchResults([]);
                }
            }
        } catch (err) {
            console.error('Search failed:', err);
        }
        setIsSearching(false);
    };

    const handleSelectSearchResult = (result: any) => {
        setLocation({
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon),
            addressName: result.name || 'Selected Location'
        });
        if (onLocationSelected) onLocationSelected();
        setIsOpen(false);
    };

    const savedAddresses = customer?.savedAddresses || [];
    const activeAddressId = userLocation?.addressId;

    const TagIcon = getTagIcon(userLocation?.tag || (isCurrentHome ? 'Home' : undefined));
    const locationLabel = userLocation?.addressName || 'Set Location';

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
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button 
                        variant="ghost" 
                        className={cn("flex items-center gap-1.5 text-sm font-medium hover:bg-primary/5 px-2.5 sm:px-3 py-1.5 rounded-full border border-primary/15 bg-background/50", className)}
                    >
                        <TagIcon className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        <span className="truncate max-w-[90px] sm:max-w-[120px] md:max-w-[160px] text-xs font-semibold md:text-sm md:font-medium">
                            {locationLabel}
                        </span>
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md rounded-3xl p-5 max-h-[85vh] flex flex-col">
                    <DialogHeader className="pb-1">
                        <DialogTitle className="font-headline text-2xl font-bold flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            Select Delivery Location
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 overflow-y-auto pr-1 flex-1 py-1">
                        {/* 1. Saved Addresses List */}
                        {savedAddresses.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between px-0.5">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Saved Addresses ({savedAddresses.length})
                                    </span>
                                </div>

                                <div className="space-y-2.5">
                                    {savedAddresses.map((addr) => {
                                        const ItemIcon = getTagIcon(addr.tag);
                                        const isSelected = activeAddressId === addr.id || (
                                            userLocation && 
                                            Math.abs(userLocation.latitude - addr.latitude) < 0.0005 && 
                                            Math.abs(userLocation.longitude - addr.longitude) < 0.0005
                                        );
                                        const canDelete = savedAddresses.length > 1;

                                        return (
                                            <div key={addr.id} className="space-y-0">
                                                {/* TOP LAYER: Address Card — Click to Select */}
                                                <div
                                                    onClick={() => handleSelectSavedAddress(addr)}
                                                    className={cn(
                                                        "p-3 rounded-t-2xl border border-b-0 transition-all cursor-pointer text-left space-y-1.5 relative group",
                                                        isSelected 
                                                            ? "bg-primary/10 border-primary/40 shadow-xs"
                                                            : "bg-card border-border hover:border-primary/30 hover:bg-muted/40"
                                                    )}
                                                >
                                                    {/* Header: Tag icon + label + badges */}
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <div className={cn(
                                                                "w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0",
                                                                isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                                                            )}>
                                                                <ItemIcon className="h-3.5 w-3.5" />
                                                            </div>
                                                            <span className="font-bold text-xs text-foreground">
                                                                {addr.label || addr.tag}
                                                            </span>
                                                            {addr.isDefault && (
                                                                <span className="text-[9px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border border-amber-200 dark:border-amber-700">
                                                                    <Star className="h-2.5 w-2.5 fill-current" /> DEFAULT
                                                                </span>
                                                            )}
                                                        </div>

                                                        {isSelected ? (
                                                            <span className="text-[10px] font-bold text-green-600 dark:text-green-400 flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                                                                <Check className="h-3 w-3" /> DELIVER HERE
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                                                Deliver Here →
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Address body */}
                                                    <p className="text-[11px] text-foreground/80 font-medium line-clamp-2 leading-relaxed pl-[30px]">
                                                        {addr.address}
                                                    </p>

                                                    {/* Receiver info */}
                                                    {addr.recipientName && (
                                                        <div className="pl-[30px]">
                                                            <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                                                👤 {addr.recipientName} {addr.recipientContact ? `(${addr.recipientContact})` : ''}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* BOTTOM LAYER: Actions Bar — Sibling, NOT inside clickable card */}
                                                <div className={cn(
                                                    "flex items-center justify-between px-3 py-1.5 rounded-b-2xl border transition-colors",
                                                    isSelected
                                                        ? "bg-primary/5 border-primary/40"
                                                        : "bg-muted/30 border-border"
                                                )}>
                                                    {/* Left: Default indicator or Set Default button */}
                                                    <div>
                                                        {addr.isDefault ? (
                                                            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                                <Star className="h-3 w-3 fill-current" /> Default Delivery Address
                                                            </span>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSetDefault(addr)}
                                                                className="text-[10px] font-semibold text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1 transition-colors"
                                                            >
                                                                <Star className="h-3 w-3" /> Set as Default
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Right: Edit + Delete */}
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditAddress(addr)}
                                                            className="h-6.5 px-3 rounded-full border border-border/70 bg-background hover:bg-muted text-[10px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-all shadow-2xs"
                                                            title="Edit address"
                                                        >
                                                            <Edit3 className="h-2.5 w-2.5" /> Edit
                                                        </button>
                                                        {canDelete && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteAddress(addr)}
                                                                className="h-6.5 px-3 rounded-full border border-border/70 bg-background hover:bg-destructive/10 hover:border-destructive/30 text-[10px] font-medium text-muted-foreground hover:text-destructive flex items-center gap-1 transition-all shadow-2xs"
                                                                title="Delete address"
                                                            >
                                                                <Trash2 className="h-2.5 w-2.5" /> Delete
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 2. Interactive Map Trigger Button */}
                        <Button
                            type="button"
                            onClick={handleAddNewAddress}
                            className="w-full h-12 rounded-2xl gap-2 font-semibold text-xs sm:text-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md text-white"
                        >
                            <Map className="h-4 w-4" />
                            {savedAddresses.length > 0 ? '+ Add New Address on Map 🗺️' : 'Select Location on Map 🗺️'}
                        </Button>

                        {/* 3. Device GPS Button */}
                        <Button 
                            onClick={handleDetectLocation} 
                            disabled={isLoading}
                            variant="outline"
                            className="w-full h-10 rounded-2xl gap-2 font-medium text-xs border-dashed"
                        >
                            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5 text-primary" />}
                            {isLoading ? 'Detecting...' : 'Use Current Device GPS'}
                        </Button>

                        <div className="relative flex items-center py-0.5">
                            <div className="flex-grow border-t border-muted"></div>
                            <span className="flex-shrink-0 mx-4 text-muted-foreground text-[10px] font-medium uppercase">or search locality</span>
                            <div className="flex-grow border-t border-muted"></div>
                        </div>

                        {/* 4. Manual Locality Search */}
                        <form onSubmit={handleSearch} className="flex w-full gap-2 min-w-0">
                            <Input 
                                placeholder="Search city, area, or landmark..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="rounded-xl h-10 flex-1 min-w-0 text-xs"
                            />
                            <Button type="submit" disabled={isSearching} className="h-10 rounded-xl px-3.5 flex-shrink-0 text-xs">
                                {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                            </Button>
                        </form>

                        {searchResults.length > 0 && (
                            <div className="max-h-[160px] overflow-y-auto space-y-1 border rounded-xl p-1.5 bg-muted/20 w-full min-w-0 max-w-full">
                                {searchResults.map((result, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleSelectSearchResult(result)}
                                        className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-muted rounded-lg transition-colors flex flex-col min-w-0 overflow-hidden"
                                    >
                                        <span className="font-semibold block w-full truncate">{result.name}</span>
                                        <span className="text-[10px] text-muted-foreground block w-full truncate">{result.display_name}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {error && (
                            <div className="bg-destructive/10 p-2.5 rounded-2xl space-y-1.5 border border-destructive/20 text-center">
                                <p className="text-[11px] text-destructive font-medium leading-tight">
                                    {error}
                                </p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Interactive Map Picker Modal for Adding or Editing */}
            <MapLocationPickerDialog 
                open={isMapDialogOpen}
                onOpenChange={setIsMapDialogOpen}
                editingAddress={editingAddress}
                onAddressSaved={(saved) => {
                    selectSavedAddress(saved);
                    if (onLocationSelected) onLocationSelected();
                }}
            />
        </>
    );
};
