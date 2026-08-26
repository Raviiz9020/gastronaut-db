'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useCustomer } from '@/context/customer-context';
import type { SavedAddress } from '@/types';

export interface UserLocation {
    latitude: number;
    longitude: number;
    addressName?: string;
    fullAddress?: string;
    isHome?: boolean;
    tag?: 'Home' | 'Work' | 'Parents' | 'Other' | string;
    addressId?: string;
}

interface LocationContextType {
    userLocation: UserLocation | null;
    isLoading: boolean;
    error: string | null;
    isCurrentHome: boolean;
    detectLocation: () => Promise<void>;
    setLocation: (location: UserLocation) => void;
    selectHomeLocation: () => void;
    selectSavedAddress: (address: SavedAddress) => void;
    clearLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const STORAGE_KEY = 'hyperdelivery_user_location';
const SESSION_OVERRIDE_KEY = 'hyperdelivery_location_override_active';

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { customer, isAuthLoading } = useCustomer();
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initialize from localStorage on initial load
    useEffect(() => {
        const savedLocation = localStorage.getItem(STORAGE_KEY);
        if (savedLocation) {
            try {
                setUserLocation(JSON.parse(savedLocation));
            } catch (e) {
                console.error('Failed to parse saved location', e);
            }
        }
        setIsLoading(false);
    }, []);

    // When a logged-in customer is resolved with saved addresses, sync active location
    useEffect(() => {
        if (!isAuthLoading && customer) {
            const hasSessionOverride = typeof window !== 'undefined' && sessionStorage.getItem(SESSION_OVERRIDE_KEY) === 'true';

            // Find default address or primary address
            const defaultSaved = customer.savedAddresses?.find(a => a.isDefault || a.id === customer.defaultAddressId) 
                              || customer.savedAddresses?.[0];

            const targetLat = defaultSaved?.latitude || customer.latitude;
            const targetLng = defaultSaved?.longitude || customer.longitude;
            const targetAddress = defaultSaved?.address || customer.address || '';
            const targetName = defaultSaved?.label || defaultSaved?.tag || 'Home';
            const isHome = defaultSaved?.tag === 'Home' || targetName === 'Home';

            if (!hasSessionOverride && targetLat && targetLng) {
                const targetLoc: UserLocation = {
                    latitude: targetLat,
                    longitude: targetLng,
                    addressName: targetName,
                    fullAddress: targetAddress,
                    isHome,
                    tag: defaultSaved?.tag || 'Home',
                    addressId: defaultSaved?.id,
                };
                setUserLocation(targetLoc);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(targetLoc));
            }
        }
    }, [customer, isAuthLoading]);

    const setLocation = useCallback((location: UserLocation) => {
        // Check if new location matches a customer profile address
        let locationToSave = location;
        let isHome = location.isHome ?? false;

        if (customer?.savedAddresses && customer.savedAddresses.length > 0) {
            const matched = customer.savedAddresses.find(a => 
                Math.abs(location.latitude - a.latitude) < 0.0005 && 
                Math.abs(location.longitude - a.longitude) < 0.0005
            );
            if (matched) {
                isHome = matched.tag === 'Home';
                locationToSave = {
                    ...location,
                    addressName: matched.label || matched.tag,
                    fullAddress: matched.address,
                    isHome,
                    tag: matched.tag,
                    addressId: matched.id
                };
            }
        } else if (customer?.latitude && customer?.longitude) {
            const latDiff = Math.abs(location.latitude - customer.latitude);
            const lngDiff = Math.abs(location.longitude - customer.longitude);
            if (latDiff < 0.0005 && lngDiff < 0.0005) {
                isHome = true;
                locationToSave = {
                    ...location,
                    addressName: 'Home',
                    fullAddress: customer.address || location.fullAddress,
                    isHome: true,
                    tag: 'Home'
                };
            }
        }

        if (typeof window !== 'undefined') {
            if (isHome) {
                sessionStorage.removeItem(SESSION_OVERRIDE_KEY);
            } else {
                sessionStorage.setItem(SESSION_OVERRIDE_KEY, 'true');
            }
        }

        setUserLocation(locationToSave);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(locationToSave));
        setError(null);
    }, [customer]);

    const selectSavedAddress = useCallback((addr: SavedAddress) => {
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem(SESSION_OVERRIDE_KEY);
        }
        const loc: UserLocation = {
            latitude: addr.latitude,
            longitude: addr.longitude,
            addressName: addr.label || addr.tag,
            fullAddress: addr.address,
            isHome: addr.tag === 'Home',
            tag: addr.tag,
            addressId: addr.id
        };
        setUserLocation(loc);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
        setError(null);
    }, []);

    const selectHomeLocation = useCallback(() => {
        const homeAddr = customer?.savedAddresses?.find(a => a.tag === 'Home') 
                      || (customer?.latitude && customer?.longitude ? {
                          id: 'addr_default_home',
                          tag: 'Home' as const,
                          label: 'Home',
                          address: customer.address || '',
                          areaLocality: '',
                          latitude: customer.latitude,
                          longitude: customer.longitude,
                      } : null);

        if (homeAddr) {
            selectSavedAddress(homeAddr);
        }
    }, [customer, selectSavedAddress]);

    const clearLocation = useCallback(() => {
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem(SESSION_OVERRIDE_KEY);
        }
        setUserLocation(null);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    const detectLocation = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            setIsLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                let placeName = 'Current Location';
                try {
                    const res = await fetch(`/api/geocode?lat=${position.coords.latitude}&lng=${position.coords.longitude}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.results && data.results.length > 0) {
                            const comp = data.results[0].address_components?.find((c: any) => 
                                c.types.includes('sublocality') || c.types.includes('locality')
                            );
                            placeName = comp?.long_name || data.results[0].formatted_address || 'Current Location';
                        }
                    }
                } catch (err) {
                    console.error('Reverse geocoding failed:', err);
                }

                const newLocation: UserLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    addressName: placeName,
                };
                setLocation(newLocation);
                setIsLoading(false);
            },
            (err) => {
                console.error('Geolocation error:', err.code, err.message);
                let message = 'Failed to detect location';
                if (err.code === 1) message = 'User denied Geolocation';
                else if (err.code === 2) message = 'Location unavailable';
                else if (err.code === 3) message = 'Location request timed out';
                
                setError(message);
                setIsLoading(false);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    }, [setLocation]);

    const isCurrentHome = Boolean(
        userLocation && 
        (userLocation.isHome || userLocation.tag === 'Home' || userLocation.addressName === 'Home')
    );

    return (
        <LocationContext.Provider value={{
            userLocation,
            isLoading,
            error,
            isCurrentHome,
            detectLocation,
            setLocation,
            selectHomeLocation,
            selectSavedAddress,
            clearLocation
        }}>
            {children}
        </LocationContext.Provider>
    );
};

export const useLocation = () => {
    const context = useContext(LocationContext);
    if (context === undefined) {
        throw new Error('useLocation must be used within a LocationProvider');
    }
    return context;
};
