'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useCustomer } from '@/context/customer-context';

export interface UserLocation {
    latitude: number;
    longitude: number;
    addressName?: string;
    fullAddress?: string;
    isHome?: boolean;
}

interface LocationContextType {
    userLocation: UserLocation | null;
    isLoading: boolean;
    error: string | null;
    isCurrentHome: boolean;
    detectLocation: () => Promise<void>;
    setLocation: (location: UserLocation) => void;
    selectHomeLocation: () => void;
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

    // When a logged-in customer is resolved with a saved address, default to their Home address
    useEffect(() => {
        if (!isAuthLoading && customer?.latitude && customer?.longitude) {
            const customerLat = customer.latitude;
            const customerLng = customer.longitude;
            const hasSessionOverride = typeof window !== 'undefined' && sessionStorage.getItem(SESSION_OVERRIDE_KEY) === 'true';

            // If user hasn't explicitly chosen a different temporary location in this session,
            // or if the currently set location isn't a custom override, auto-set Home
            if (!hasSessionOverride) {
                const homeLoc: UserLocation = {
                    latitude: customerLat,
                    longitude: customerLng,
                    addressName: 'Home',
                    fullAddress: customer.address || '',
                    isHome: true,
                };
                setUserLocation(homeLoc);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(homeLoc));
            }
        }
    }, [customer, isAuthLoading]);

    const setLocation = useCallback((location: UserLocation) => {
        // Check if new location matches customer profile
        let locationToSave = location;
        let isHome = false;
        if (customer?.latitude && customer?.longitude) {
            const latDiff = Math.abs(location.latitude - customer.latitude);
            const lngDiff = Math.abs(location.longitude - customer.longitude);
            if (latDiff < 0.0005 && lngDiff < 0.0005) {
                isHome = true;
                locationToSave = {
                    ...location,
                    addressName: 'Home',
                    fullAddress: customer.address || location.fullAddress,
                    isHome: true
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

    const selectHomeLocation = useCallback(() => {
        if (customer?.latitude && customer?.longitude) {
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem(SESSION_OVERRIDE_KEY);
            }
            const homeLoc: UserLocation = {
                latitude: customer.latitude,
                longitude: customer.longitude,
                addressName: 'Home',
                fullAddress: customer.address || '',
                isHome: true
            };
            setUserLocation(homeLoc);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(homeLoc));
            setError(null);
        }
    }, [customer]);

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
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.address) {
                            placeName = data.address.city || data.address.town || data.address.village || data.address.suburb || data.address.county || 'Current Location';
                        }
                    }
                } catch (err) {
                    console.error('Reverse geocoding failed:', err);
                }

                // Check if detected GPS matches customer's saved home coordinates
                let isHome = false;
                if (customer?.latitude && customer?.longitude) {
                    const latDiff = Math.abs(position.coords.latitude - customer.latitude);
                    const lngDiff = Math.abs(position.coords.longitude - customer.longitude);
                    if (latDiff < 0.0005 && lngDiff < 0.0005) {
                        isHome = true;
                        placeName = 'Home';
                    }
                }

                const newLocation: UserLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    addressName: placeName,
                    fullAddress: isHome ? customer?.address : undefined,
                    isHome
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
    }, [setLocation, customer]);

    const isCurrentHome = Boolean(
        userLocation && 
        customer?.latitude && 
        customer?.longitude && 
        (userLocation.isHome || userLocation.addressName === 'Home' || (
            Math.abs(userLocation.latitude - customer.latitude) < 0.0005 && 
            Math.abs(userLocation.longitude - customer.longitude) < 0.0005
        ))
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
