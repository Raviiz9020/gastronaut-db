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
