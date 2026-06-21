'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface UserLocation {
    latitude: number;
    longitude: number;
    addressName?: string;
}

interface LocationContextType {
    userLocation: UserLocation | null;
    isLoading: boolean;
    error: string | null;
    detectLocation: () => Promise<void>;
    setLocation: (location: UserLocation) => void;
    clearLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const STORAGE_KEY = 'hyperdelivery_user_location';

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initialize from localStorage
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

    const setLocation = useCallback((location: UserLocation) => {
        setUserLocation(location);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
        setError(null);
    }, []);

    const clearLocation = useCallback(() => {
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
            (position) => {
                const newLocation: UserLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    addressName: 'Current Location' // Fallback since we don't have reverse geocoding yet
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

    return (
        <LocationContext.Provider value={{
            userLocation,
            isLoading,
            error,
            detectLocation,
            setLocation,
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
