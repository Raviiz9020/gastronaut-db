import { Vendor } from "@/types";

/**
 * Calculates the distance between two points in kilometers using the Haversine formula.
 * This implementation matches the logic used in the Hyperdelivery Android app.
 * 
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in kilometers
 */
export function calculateDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const r = 6371.0; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return r * c;
}

/**
 * Checks if a vendor is serviceable based on the user's location and the vendor's delivery radius.
 * 
 * @param vendor The vendor object containing location and radius
 * @param userLocation The user's current location { lat, lng }
 * @returns True if the vendor is serviceable, false otherwise
 */
export function isVendorServiceable(
    vendor: Vendor, 
    userLocation: { latitude: number; longitude: number } | null
): boolean {
    // If no location is set, we treat as serviceable but maybe show a warning in UI
    if (!userLocation) return true;
    
    // If vendor doesn't have location data, assume serviceable (fallback)
    if (vendor.latitude === undefined || vendor.longitude === undefined) return true;
    
    const distance = calculateDistanceInKm(
        userLocation.latitude, 
        userLocation.longitude, 
        vendor.latitude, 
        vendor.longitude
    );
    
    const radius = vendor.deliveryRadius || 0;
    
    // Rule: distance <= vendor.deliveryRadius
    // If deliveryRadius is 0, we treat it as 0 (no delivery) or handled specifically
    return distance <= radius;
}

export interface DineInLocationVerification {
    verified: boolean;
    distanceMeters?: number;
    reason?: 'within_range' | 'out_of_range' | 'permission_denied' | 'timeout' | 'no_vendor_coords' | 'unsupported';
}

/**
 * Soft Geofence verification for Dine-In orders.
 * Fast check (2.5s hard timeout) so diner experience is never blocked.
 * Default radius is 300 meters as requested.
 * 
 * @param vendor The vendor object with latitude and longitude
 * @param maxRadiusMeters Maximum allowed distance in meters (default: 300)
 */
export async function verifyDineInLocation(
    vendor: { latitude?: number; longitude?: number },
    maxRadiusMeters: number = 300
): Promise<DineInLocationVerification> {
    if (vendor.latitude === undefined || vendor.longitude === undefined) {
        return { verified: true, reason: 'no_vendor_coords' };
    }

    if (typeof window === 'undefined' || !navigator.geolocation) {
        return { verified: false, reason: 'unsupported' };
    }

    const geoPromise = new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 2500,
            maximumAge: 30000,
        });
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 2500);
    });

    try {
        const position = await Promise.race([geoPromise, timeoutPromise]);
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        const distanceKm = calculateDistanceInKm(userLat, userLng, vendor.latitude, vendor.longitude);
        const distanceMeters = Math.round(distanceKm * 1000);

        if (distanceMeters <= maxRadiusMeters) {
            return { verified: true, distanceMeters, reason: 'within_range' };
        } else {
            return { verified: false, distanceMeters, reason: 'out_of_range' };
        }
    } catch (err: any) {
        if (err?.message === 'timeout') {
            return { verified: false, reason: 'timeout' };
        }
        return { verified: false, reason: 'permission_denied' };
    }
}

/**
 * Formats a distance in meters to a clean human-readable string (e.g. 450m, 1.2 km).
 */
export function formatLocationDistance(distanceMeters?: number | null): string {
    if (distanceMeters === undefined || distanceMeters === null || isNaN(distanceMeters)) {
        return '';
    }
    if (distanceMeters < 1000) {
        return `${Math.round(distanceMeters)}m`;
    }
    return `${(distanceMeters / 1000).toFixed(1)} km`;
}

export interface LocationBadgeInfo {
    label: string;
    description: string;
    badgeClass: string;
    statusType: 'verified' | 'out_of_range' | 'permission_denied' | 'timeout' | 'unknown';
    canRetry: boolean;
}

/**
 * Returns human-readable status, badge styling, and explanation for location verification.
 */
export function getLocationBadgeInfo(
    verification?: { verified?: boolean; reason?: string; distanceMeters?: number } | null
): LocationBadgeInfo {
    if (!verification) {
        return {
            label: 'Verifying...',
            description: 'Checking diner location...',
            badgeClass: 'bg-muted/80 text-muted-foreground border-border',
            statusType: 'unknown',
            canRetry: false,
        };
    }

    if (verification.verified === true) {
        const dist = formatLocationDistance(verification.distanceMeters);
        return {
            label: dist ? `In-Store (${dist})` : 'In-Store',
            description: 'Diner location verified at restaurant table',
            badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
            statusType: 'verified',
            canRetry: false,
        };
    }

    const dist = formatLocationDistance(verification.distanceMeters);

    switch (verification.reason) {
        case 'out_of_range':
            return {
                label: dist ? `~${dist} Away` : 'Outside Restaurant',
                description: dist
                    ? `Diner appears to be ~${dist} away. Dine-in orders are for seated guests.`
                    : 'Diner appears to be far from the restaurant.',
                badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
                statusType: 'out_of_range',
                canRetry: true,
            };
        case 'permission_denied':
            return {
                label: 'GPS Blocked',
                description: 'Location access was denied. Tap to allow so kitchen can verify your table.',
                badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
                statusType: 'permission_denied',
                canRetry: true,
            };
        case 'timeout':
            return {
                label: 'GPS Timeout',
                description: 'Could not lock GPS location in time. Tap to retry.',
                badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
                statusType: 'timeout',
                canRetry: true,
            };
        case 'no_vendor_coords':
            return {
                label: 'No Geo-Coords',
                description: 'Restaurant has not set map coordinates.',
                badgeClass: 'bg-muted text-muted-foreground border-border',
                statusType: 'unknown',
                canRetry: false,
            };
        case 'unsupported':
            return {
                label: 'No Geolocation',
                description: 'Browser does not support geolocation.',
                badgeClass: 'bg-muted text-muted-foreground border-border',
                statusType: 'unknown',
                canRetry: false,
            };
        default:
            return {
                label: 'Unverified',
                description: 'Diner location could not be verified.',
                badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
                statusType: 'unknown',
                canRetry: true,
            };
    }
}


