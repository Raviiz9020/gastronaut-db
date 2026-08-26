'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCustomer } from '@/context/customer-context';
import { useLocation } from '@/context/location-context';
import { useToast } from '@/hooks/use-toast';
import type { SavedAddress } from '@/types';
import { 
    MapPin, Search, Navigation, Loader2, Home, Briefcase, 
    Users, Building, Check, ArrowLeft, Plus, X 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MapLocationPickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingAddress?: SavedAddress | null;
    onAddressSaved?: (address: SavedAddress) => void;
}

const DEFAULT_CENTER = { lat: 18.5913, lng: 73.7389 }; // Default: Pune / Marunji

export const MapLocationPickerDialog: React.FC<MapLocationPickerDialogProps> = ({
    open,
    onOpenChange,
    editingAddress,
    onAddressSaved
}) => {
    const { customer, addSavedAddress, updateSavedAddress } = useCustomer();
    const { setLocation } = useLocation();
    const { toast } = useToast();

    // Steps: 1 = Pin on Map, 2 = Doorstep Details
    const [step, setStep] = useState<1 | 2>(1);

    // Map & Coordinates State
    const [center, setCenter] = useState<{ lat: number; lng: number }>(DEFAULT_CENTER);
    const [addressText, setAddressText] = useState<string>('Locating address...');
    const [areaLocality, setAreaLocality] = useState<string>('');
    const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);

    // Step 2 Form State
    const [tag, setTag] = useState<'Home' | 'Work' | 'Parents' | 'Other'>('Home');
    const [customLabel, setCustomLabel] = useState('');
    const [houseFlatNo, setHouseFlatNo] = useState('');
    const [buildingSocietyName, setBuildingSocietyName] = useState('');
    const [floorNo, setFloorNo] = useState('');
    const [landmark, setLandmark] = useState('');
    const [recipientName, setRecipientName] = useState('');
    const [recipientContact, setRecipientContact] = useState('');
    const [isDefault, setIsDefault] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // DOM & Map instance references
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);

    // Reset or populate state when dialog opens or editingAddress changes
    useEffect(() => {
        if (open) {
            setStep(1);
            setSearchQuery('');
            setSearchResults([]);

            if (editingAddress) {
                const targetLat = editingAddress.latitude;
                const targetLng = editingAddress.longitude;
                setCenter({ lat: targetLat, lng: targetLng });
                setAddressText(editingAddress.address);
                setAreaLocality(editingAddress.areaLocality || '');
                setTag(editingAddress.tag || 'Home');
                setCustomLabel(editingAddress.label || '');
                setHouseFlatNo(editingAddress.houseFlatNo || '');
                setBuildingSocietyName(editingAddress.buildingSocietyName || '');
                setFloorNo(editingAddress.floorNo || '');
                setLandmark(editingAddress.landmark || '');
                setRecipientName(editingAddress.recipientName || customer?.name || '');
                setRecipientContact(editingAddress.recipientContact || customer?.contact || '');
                setIsDefault(Boolean(editingAddress.isDefault));
            } else {
                const initialLat = customer?.latitude || DEFAULT_CENTER.lat;
                const initialLng = customer?.longitude || DEFAULT_CENTER.lng;
                setCenter({ lat: initialLat, lng: initialLng });
                setTag('Home');
                setCustomLabel('');
                setHouseFlatNo('');
                setBuildingSocietyName('');
                setFloorNo('');
                setLandmark('');
                setRecipientName(customer?.name || '');
                setRecipientContact(customer?.contact || '');
                setIsDefault(!customer?.savedAddresses || customer.savedAddresses.length === 0);
                reverseGeocode(initialLat, initialLng);
            }
        }
    }, [open, editingAddress, customer]);

    // Reverse Geocode helper
    const reverseGeocode = useCallback(async (lat: number, lng: number) => {
        setIsReverseGeocoding(true);
        try {
            const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
            if (res.ok) {
                const data = await res.json();
                if (data.results && data.results.length > 0) {
                    const first = data.results[0];
                    setAddressText(first.formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);

                    const localityComp = first.address_components?.find((c: any) => 
                        c.types.includes('sublocality') || c.types.includes('locality') || c.types.includes('neighborhood')
                    );
                    setAreaLocality(localityComp?.long_name || '');
                } else {
                    setAddressText(`Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
                }
            } else {
                const osmRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
                if (osmRes.ok) {
                    const osmData = await osmRes.json();
                    setAddressText(osmData.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                    setAreaLocality(osmData.address?.suburb || osmData.address?.city || '');
                }
            }
        } catch (err) {
            console.error('Reverse geocoding error:', err);
            setAddressText(`Pinned Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
        } finally {
            setIsReverseGeocoding(false);
        }
    }, []);

    // Leaflet dynamic loader — self-contained, does NOT rely on layout.tsx
    const loadLeaflet = useCallback((): Promise<any> => {
        return new Promise((resolve) => {
            if ((window as any).L) {
                resolve((window as any).L);
                return;
            }

            // Load CSS if not present
            if (!document.querySelector('link[href*="leaflet"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);
            }

            // Load JS
            const existing = document.querySelector('script[src*="leaflet"]');
            if (existing) {
                // Script tag exists but hasn't loaded yet — wait for it
                existing.addEventListener('load', () => resolve((window as any).L));
                // In case it already loaded between checks
                if ((window as any).L) resolve((window as any).L);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => resolve((window as any).L);
            script.onerror = () => {
                console.error('Failed to load Leaflet JS');
                resolve(null);
            };
            document.head.appendChild(script);
        });
    }, []);

    // Initialize Interactive Map with CartoDB Voyager tiles
    useEffect(() => {
        if (!open || step !== 1) return;

        let isMounted = true;

        const initMap = async () => {
            // Wait for portal DOM to mount (Radix Dialog uses portal)
            let container = mapContainerRef.current;
            let retries = 0;
            while (!container && retries < 20 && isMounted) {
                await new Promise(r => setTimeout(r, 100));
                container = mapContainerRef.current;
                retries++;
            }
            if (!container || !isMounted) {
                console.warn('Map container ref not available after retries');
                return;
            }

            const L = await loadLeaflet();
            if (!L || !isMounted) {
                console.warn('Leaflet failed to load');
                return;
            }

            // Destroy previous instance
            if (mapInstanceRef.current) {
                try { mapInstanceRef.current.remove(); } catch (e) { /* ignore */ }
                mapInstanceRef.current = null;
            }

            try {
                const map = L.map(container, {
                    center: [center.lat, center.lng],
                    zoom: 16,
                    zoomControl: false,
                    attributionControl: false,
                    dragging: true,
                    touchZoom: true,
                    scrollWheelZoom: true,
                    doubleClickZoom: true,
                });

                // CartoDB Voyager tiles — clean road map style, no API key needed
                L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                    maxZoom: 19,
                    subdomains: 'abcd',
                }).addTo(map);

                L.control.zoom({ position: 'bottomright' }).addTo(map);

                map.on('moveend', () => {
                    if (!isMounted) return;
                    const c = map.getCenter();
                    setCenter({ lat: c.lat, lng: c.lng });
                    reverseGeocode(c.lat, c.lng);
                });

                mapInstanceRef.current = map;

                // Recalculate dimensions after dialog animation settles
                setTimeout(() => {
                    if (isMounted && map?.invalidateSize) map.invalidateSize();
                }, 300);
                setTimeout(() => {
                    if (isMounted && map?.invalidateSize) map.invalidateSize();
                }, 600);
            } catch (err) {
                console.error('Leaflet map init error:', err);
            }
        };

        initMap();

        return () => {
            isMounted = false;
            if (mapInstanceRef.current) {
                try { mapInstanceRef.current.remove(); } catch (e) { /* ignore */ }
                mapInstanceRef.current = null;
            }
        };
    }, [open, step, loadLeaflet, reverseGeocode]);

    // Handle Search Submit
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const res = await fetch(`/api/geocode?address=${encodeURIComponent(searchQuery)}`);
            if (res.ok) {
                const data = await res.json();
                if (data.results && data.results.length > 0) {
                    const mapped = data.results.map((item: any) => ({
                        name: item.formatted_address,
                        lat: item.geometry.location.lat,
                        lng: item.geometry.location.lng,
                    }));
                    setSearchResults(mapped);
                } else {
                    setSearchResults([]);
                }
            }
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setIsSearching(false);
        }
    };

    // Select Search Result -> Pan Map
    const handleSelectSearchResult = (result: { name: string; lat: number; lng: number }) => {
        setCenter({ lat: result.lat, lng: result.lng });
        setAddressText(result.name);
        setSearchResults([]);
        setSearchQuery('');

        if (mapInstanceRef.current && mapInstanceRef.current.setView) {
            mapInstanceRef.current.setView([result.lat, result.lng], 16);
        } else {
            reverseGeocode(result.lat, result.lng);
        }
    };

    // Use Device Current GPS
    const handleUseCurrentGps = () => {
        if (!navigator.geolocation) {
            toast({ title: 'GPS Unavailable', description: 'Geolocation not supported by your browser', variant: 'destructive' });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                setCenter({ lat, lng });

                if (mapInstanceRef.current && mapInstanceRef.current.setView) {
                    mapInstanceRef.current.setView([lat, lng], 17);
                } else {
                    reverseGeocode(lat, lng);
                }
            },
            (err) => {
                toast({ title: 'Location Error', description: err.message || 'Could not detect GPS location', variant: 'destructive' });
            },
            { enableHighAccuracy: true, timeout: 6000 }
        );
    };

    // Step 2 Submit: Save Address to Customer Context & Firestore
    const handleSaveAddress = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!houseFlatNo.trim()) {
            toast({ title: 'Missing Details', description: 'Please enter your flat or house number.', variant: 'destructive' });
            return;
        }

        if (!buildingSocietyName.trim()) {
            toast({ title: 'Missing Details', description: 'Please enter building or society name.', variant: 'destructive' });
            return;
        }

        setIsSaving(true);
        try {
            const formattedFullAddress = [
                houseFlatNo.trim(),
                floorNo.trim() ? `Floor ${floorNo.trim()}` : '',
                buildingSocietyName.trim(),
                landmark.trim() ? `Near ${landmark.trim()}` : '',
                areaLocality.trim() || addressText,
            ].filter(Boolean).join(', ');

            const addressPayload: Omit<SavedAddress, 'id' | 'createdAt'> = {
                tag,
                label: customLabel.trim() || tag,
                address: formattedFullAddress,
                houseFlatNo: houseFlatNo.trim(),
                buildingSocietyName: buildingSocietyName.trim(),
                floorNo: floorNo.trim(),
                areaLocality: areaLocality.trim(),
                landmark: landmark.trim(),
                latitude: center.lat,
                longitude: center.lng,
                recipientName: recipientName.trim() || customer?.name || '',
                recipientContact: recipientContact.trim() || customer?.contact || '',
                isDefault,
                hasCompletedOrder: false, // New address requires first prepaid order for COD
            };

            let savedObj: SavedAddress;

            if (editingAddress?.id) {
                await updateSavedAddress(editingAddress.id, addressPayload);
                savedObj = { ...addressPayload, id: editingAddress.id };
            } else {
                savedObj = await addSavedAddress(addressPayload);
            }

            // Sync active browsing location
            setLocation({
                latitude: center.lat,
                longitude: center.lng,
                addressName: savedObj.label || savedObj.tag,
                fullAddress: savedObj.address,
                isHome: tag === 'Home'
            });

            if (onAddressSaved) {
                onAddressSaved(savedObj);
            }

            onOpenChange(false);
        } catch (err: any) {
            console.error('Error saving address:', err);
            toast({ title: 'Save Failed', description: err.message || 'Could not save address.', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden max-h-[90vh] flex flex-col gap-0 border-primary/20 shadow-2xl">
                {/* Header */}
                <DialogHeader className="p-4 sm:p-5 border-b bg-card flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        {step === 2 && (
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setStep(1)}
                                className="h-8 w-8 rounded-full -ml-1 mr-1"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <div>
                            <DialogTitle className="font-headline text-lg sm:text-xl font-bold flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                                {step === 1 ? 'Set Delivery Location on Map' : 'Complete Delivery Address'}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                {step === 1 ? 'Move the map to set your pin location' : 'Enter your house number and landmark'}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* STEP 1: Interactive Map & Pin */}
                {step === 1 && (
                    <div className="flex-1 flex flex-col relative" style={{ minHeight: '450px' }}>
                        {/* Search Bar Overlay */}
                        <div className="absolute top-3 left-3 right-3 z-[1000] space-y-1">
                            <form onSubmit={handleSearch} className="flex gap-1.5 shadow-lg rounded-2xl bg-background/95 backdrop-blur-md p-1.5 border border-primary/20">
                                <div className="flex-1 flex items-center gap-2 px-2.5">
                                    <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <Input
                                        placeholder="Search city, area, or society (e.g. Sangli, Hinjawadi)..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="border-none focus-visible:ring-0 shadow-none h-9 text-xs sm:text-sm px-0"
                                    />
                                </div>
                                <Button type="submit" size="sm" disabled={isSearching} className="h-9 px-3 rounded-xl gap-1 font-semibold text-xs">
                                    {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Search'}
                                </Button>
                            </form>

                            {/* Search Results Dropdown */}
                            {searchResults.length > 0 && (
                                <div className="bg-background/95 backdrop-blur-md border border-primary/20 rounded-2xl shadow-xl p-1.5 max-h-[160px] overflow-y-auto space-y-1">
                                    {searchResults.map((res, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handleSelectSearchResult(res)}
                                            className="w-full text-left px-3 py-2 text-xs hover:bg-muted/80 rounded-xl transition-colors flex items-start gap-2"
                                        >
                                            <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                                            <span className="line-clamp-2 leading-relaxed font-medium">{res.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Interactive Map Canvas */}
                        <div 
                            ref={mapContainerRef} 
                            className="w-full relative z-0"
                            style={{ height: '360px', width: '100%', cursor: 'grab' }}
                        />

                        {/* Centered Fixed Floating Pin */}
                        <div className="absolute top-[180px] left-1/2 -translate-x-1/2 -translate-y-full z-[1000] pointer-events-none flex flex-col items-center">
                            <div className="bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-lg mb-1 whitespace-nowrap animate-bounce">
                                Move map to adjust exact gate
                            </div>
                            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xl ring-4 ring-primary/20">
                                <MapPin className="h-6 w-6 fill-current" />
                            </div>
                            <div className="w-3 h-1.5 bg-foreground/30 rounded-full blur-[1px] mt-0.5" />
                        </div>

                        {/* GPS Locate Me Button */}
                        <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            onClick={handleUseCurrentGps}
                            className="absolute top-20 right-3 z-[1000] rounded-full shadow-xl bg-background/95 border border-primary/20 hover:bg-background h-10 w-10 text-primary"
                            title="Locate my GPS position"
                        >
                            <Navigation className="h-4 w-4" />
                        </Button>

                        {/* Bottom Location Confirmation Card */}
                        <div className="p-3.5 sm:p-4 bg-card border-t z-[1000] space-y-2.5 shadow-2xl">
                            <div className="flex items-start gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                                    <MapPin className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Selected Location</span>
                                    <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                                        {isReverseGeocoding ? 'Identifying street & locality...' : addressText}
                                    </p>
                                </div>
                            </div>

                            <Button
                                type="button"
                                onClick={() => setStep(2)}
                                disabled={isReverseGeocoding}
                                className="w-full h-11 rounded-2xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md gap-2"
                            >
                                {isReverseGeocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                Confirm Pin & Enter Door Details
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP 2: Doorstep & Recipient Details Form */}
                {step === 2 && (
                    <form onSubmit={handleSaveAddress} className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[75vh]">
                        {/* Pinned Location Banner */}
                        <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                                <div className="text-xs truncate">
                                    <span className="font-bold text-foreground">Pinned: </span>
                                    <span className="text-muted-foreground truncate">{addressText}</span>
                                </div>
                            </div>
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setStep(1)}
                                className="h-7 text-[11px] font-bold text-primary hover:bg-primary/10 rounded-full px-2.5 flex-shrink-0"
                            >
                                Change
                            </Button>
                        </div>

                        {/* Tag / Category Selection */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Save Address As</Label>
                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { key: 'Home', icon: Home, label: 'Home' },
                                    { key: 'Parents', icon: Users, label: 'Parents' },
                                    { key: 'Work', icon: Briefcase, label: 'Work' },
                                    { key: 'Other', icon: Building, label: 'Other' },
                                ].map((item) => {
                                    const Icon = item.icon;
                                    const isSelected = tag === item.key;
                                    return (
                                        <button
                                            key={item.key}
                                            type="button"
                                            onClick={() => setTag(item.key as any)}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-2 rounded-2xl border text-xs font-semibold gap-1 transition-all",
                                                isSelected 
                                                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                                    : "bg-card border-border hover:bg-muted text-muted-foreground"
                                            )}
                                        >
                                            <Icon className="h-4 w-4" />
                                            <span>{item.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Custom Label (Optional) */}
                        <div className="space-y-1">
                            <Label htmlFor="customLabel" className="text-xs font-semibold">Address Nickname (Optional)</Label>
                            <Input
                                id="customLabel"
                                placeholder='e.g. "Sangli House" or "Office Phase 1"'
                                value={customLabel}
                                onChange={(e) => setCustomLabel(e.target.value)}
                                className="rounded-xl h-10 text-xs sm:text-sm"
                            />
                        </div>

                        {/* House/Flat and Floor */}
                        <div className="grid grid-cols-2 gap-2.5">
                            <div className="space-y-1">
                                <Label htmlFor="houseNo" className="text-xs font-semibold">House / Flat / Block No <span className="text-destructive">*</span></Label>
                                <Input
                                    id="houseNo"
                                    placeholder="e.g. Flat 1801, Plot 24"
                                    value={houseFlatNo}
                                    onChange={(e) => setHouseFlatNo(e.target.value)}
                                    className="rounded-xl h-10 text-xs sm:text-sm"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="floorNo" className="text-xs font-semibold">Floor No (Optional)</Label>
                                <Input
                                    id="floorNo"
                                    placeholder="e.g. 18th Floor"
                                    value={floorNo}
                                    onChange={(e) => setFloorNo(e.target.value)}
                                    className="rounded-xl h-10 text-xs sm:text-sm"
                                />
                            </div>
                        </div>

                        {/* Building / Society Name */}
                        <div className="space-y-1">
                            <Label htmlFor="buildingName" className="text-xs font-semibold">Apartment / Building / Society Name <span className="text-destructive">*</span></Label>
                            <Input
                                id="buildingName"
                                placeholder="e.g. Life Republic R1 Building A, Shree Niwas"
                                value={buildingSocietyName}
                                onChange={(e) => setBuildingSocietyName(e.target.value)}
                                className="rounded-xl h-10 text-xs sm:text-sm"
                                required
                            />
                        </div>

                        {/* Landmark */}
                        <div className="space-y-1">
                            <Label htmlFor="landmark" className="text-xs font-semibold">Landmark / Nearby (Optional)</Label>
                            <Input
                                id="landmark"
                                placeholder="e.g. Near Ganpati Temple, Opp. Park"
                                value={landmark}
                                onChange={(e) => setLandmark(e.target.value)}
                                className="rounded-xl h-10 text-xs sm:text-sm"
                            />
                        </div>

                        {/* Recipient Details */}
                        <div className="pt-2 border-t space-y-2.5">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Receiver Info (For Delivery Updates)</Label>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                    <Label htmlFor="recName" className="text-[11px] font-medium">Receiver Name</Label>
                                    <Input
                                        id="recName"
                                        placeholder="e.g. Dad / Ravi"
                                        value={recipientName}
                                        onChange={(e) => setRecipientName(e.target.value)}
                                        className="rounded-xl h-9 text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="recContact" className="text-[11px] font-medium">Receiver Mobile No</Label>
                                    <Input
                                        id="recContact"
                                        placeholder="e.g. 9822012345"
                                        value={recipientContact}
                                        onChange={(e) => setRecipientContact(e.target.value)}
                                        className="rounded-xl h-9 text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Set as Default Checkbox */}
                        <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={isDefault}
                                onChange={(e) => setIsDefault(e.target.checked)}
                                className="rounded text-primary focus:ring-primary h-4 w-4"
                            />
                            <span className="text-xs font-medium text-foreground">Set as my default delivery address</span>
                        </label>

                        {/* Actions */}
                        <div className="pt-2 flex gap-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => onOpenChange(false)}
                                className="flex-1 rounded-2xl h-11 text-xs font-semibold"
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={isSaving}
                                className="flex-1 rounded-2xl h-11 text-xs font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md gap-2"
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                Save & Select Address
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
};
