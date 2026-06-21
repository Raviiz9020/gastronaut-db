

'use client';

import type { CartItem, MenuItem, Vendor, Customer, DeliveryOption, DeliveryConfig } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useVendor } from './vendor-context';
import { useCustomer } from './customer-context';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { calculateDistanceInKm } from '@/lib/location-utils';

// Helper to generate a unique ID for a cart item based on its content and customizations
const generateCartItemId = (itemId: string, options: Record<string, string | string[]>) => {
    const optionKeys = Object.keys(options || {}).sort();
    const optionString = optionKeys.map(key => {
        const value = options[key];
        return `${key}:${Array.isArray(value) ? value.sort().join(',') : value}`;
    }).join('|');
    // Only add a hyphen if there are options, preventing a trailing hyphen
    return optionString ? `${itemId}-${optionString}` : itemId;
}

export interface VendorCart {
    vendor: Vendor;
    items: CartItem[];
    subtotal: number;
    isMinOrderMet: boolean;
    deliveryOption: DeliveryOption;
    deliveryDistanceKm?: number;
    deliveryCharge?: number;
    isOutOfRange?: boolean;
    distanceCalculationType?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  vendorCarts: VendorCart[];
  addToCart: (
    item: MenuItem, 
    selectedOptions?: Record<string, string | string[]>, 
    quantity?: number, 
    forceSelfPickup?: boolean
  ) => boolean;
  removeFromCart: (cartItemId: string) => void;
  updateCartItemQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  getCartItemCount: (itemId: string) => number;
  totalItems: number;
  totalPrice: number;
  customNotes: Record<string, string>;
  setCustomNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  potentialPoints: number;
  redemptionDetails: {
    canRedeem: boolean;
    pointsToRedeem: number;
    discountAmount: number;
  };
  applyPoints: boolean;
  setApplyPoints: React.Dispatch<React.SetStateAction<boolean>>;
  setVendorDeliveryOption: (vendorUsername: string, option: DeliveryOption) => void;
  getVendorDeliveryOption: (vendorUsername: string) => DeliveryOption;
  canCheckout: boolean;
  deliveryConfig: DeliveryConfig | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customNotes, setCustomNotes] = useState<Record<string, string>>({});
  const [applyPoints, setApplyPoints] = useState(false);
  const [vendorDeliveryOptions, setVendorDeliveryOptions] = useState<Record<string, DeliveryOption>>({});
  const [deliveryConfig, setDeliveryConfig] = useState<DeliveryConfig | null>(null);
  const { toast } = useToast();
  const { vendors } = useVendor();
  const { customer } = useCustomer();

  // Real-time listener for delivery settings
  useEffect(() => {
    let unsubFallback: (() => void) | null = null;

    const startFallbackListener = () => {
      if (unsubFallback) return; // already listening
      unsubFallback = onSnapshot(
        doc(db, 'site-settings', 'delivery'),
        (docSnap2) => {
          if (docSnap2.exists()) {
            setDeliveryConfig(docSnap2.data() as DeliveryConfig);
          }
        },
        (fallbackErr) => {
          // Both sources failed — delivery config stays null (charges default to 0)
          console.warn("Could not load delivery settings from either source:", fallbackErr?.code || fallbackErr);
        }
      );
    };

    const unsubPrimary = onSnapshot(
      doc(db, 'settings', 'delivery_settings'),
      (docSnap) => {
        if (docSnap.exists()) {
          if (unsubFallback) {
            unsubFallback();
            unsubFallback = null;
          }
          setDeliveryConfig(docSnap.data() as DeliveryConfig);
        } else {
          startFallbackListener();
        }
      },
      (err) => {
        console.warn("settings/delivery_settings not accessible, falling back:", err?.code || err);
        startFallbackListener();
      }
    );

    return () => {
      unsubPrimary();
      if (unsubFallback) {
        unsubFallback();
      }
    };
  }, []);

  // Effect to clear cart on logout
  useEffect(() => {
    if (!customer) {
        clearCart();
    }
  }, [customer]);


  const updateCartItemQuantity = useCallback((cartItemId: string, quantity: number) => {
    setCartItems(prevItems => {
        if (quantity <= 0) {
            // This will trigger the logic in removeFromCart to clean up delivery options
            removeFromCart(cartItemId);
            return prevItems.filter(item => item.cartItemId !== cartItemId);
        }
        return prevItems.map(item =>
            item.cartItemId === cartItemId ? { ...item, quantity } : item
        );
    });
  }, []);

  const setVendorDeliveryOption = (vendorUsername: string, option: DeliveryOption) => {
    setVendorDeliveryOptions(prev => ({...prev, [vendorUsername]: option}));
  };

  const getVendorDeliveryOption = (vendorUsername: string): DeliveryOption => {
    const vendor = vendors.find(v => v.username === vendorUsername);
    // Respect the user's explicit choice first, otherwise fallback to vendor's default
    return vendorDeliveryOptions[vendorUsername] || (vendor?.deliveryType === 'Self Pickup Only' ? 'Self Pickup' : 'Home Delivery');
  };

  const addToCart = (
    item: MenuItem, 
    selectedOptions: Record<string, string | string[]> = {}, 
    quantity = 1,
    forceSelfPickup?: boolean
  ): boolean => {
    const uniqueVendorsInCart = new Set(cartItems.map(i => i.vendorUsername));
    if (!uniqueVendorsInCart.has(item.vendorUsername) && uniqueVendorsInCart.size >= 4) {
        toast({
            title: "Vendor Limit Reached",
            description: "You can only order from a maximum of 4 different vendors at a time.",
            variant: "destructive"
        });
        return false;
    }

    // Preserve existing delivery option or set a default if one doesn't exist
    if (!vendorDeliveryOptions[item.vendorUsername]) {
        if (forceSelfPickup === true) {
            setVendorDeliveryOption(item.vendorUsername, 'Self Pickup');
        } else if (forceSelfPickup === false) {
            setVendorDeliveryOption(item.vendorUsername, 'Home Delivery');
        } else {
            // Default behavior if not forced
            const vendor = vendors.find(v => v.username === item.vendorUsername);
            const defaultOption = vendor?.deliveryType === 'Self Pickup Only' ? 'Self Pickup' : 'Home Delivery';
            setVendorDeliveryOption(item.vendorUsername, defaultOption);
        }
    }
    
    const cartItemId = generateCartItemId(item.id, selectedOptions);
    const existingItem = cartItems.find(i => i.cartItemId === cartItemId);
    
    const hasMandatoryCustomization = item.customizations?.some(c => c.minSelect === 1) ?? false;
    const basePrice = hasMandatoryCustomization ? 0 : ((item.isDiscountActive && item.discountPrice && item.discountPrice > 0) ? item.discountPrice : item.price);
    
    let finalPrice = basePrice;
    Object.entries(selectedOptions || {}).forEach(([customizationId, selected]) => {
        const customization = item.customizations?.find(c => c.id === customizationId);
        if (!customization) return;

        const selectedIds = Array.isArray(selected) ? selected : [selected];
        selectedIds.forEach(optionId => {
            const option = customization.options.find(o => o.id === optionId);
            if (option) finalPrice += option.price;
        });
    });

    if (existingItem) {
        updateCartItemQuantity(cartItemId, existingItem.quantity + quantity);
    } else {
        const newCartItem: CartItem = {
            ...item,
            price: finalPrice, 
            customizationDetails: selectedOptions,
            cartItemId: cartItemId,
            quantity: quantity,
        };
        setCartItems(prevItems => [...prevItems, newCartItem]);
    }
    return true;
  };

  const removeFromCart = (cartItemId: string) => {
    setCartItems(prevItems => {
      const itemToRemove = prevItems.find(item => item.cartItemId === cartItemId);
      if (!itemToRemove) {
        return prevItems;
      }
      
      const newItems = prevItems.filter(item => item.cartItemId !== cartItemId);
      
      // Check if any items from the same vendor remain
      const hasMoreItemsFromVendor = newItems.some(item => item.vendorUsername === itemToRemove.vendorUsername);
      
      // If not, clear the delivery option for that vendor
      if (!hasMoreItemsFromVendor) {
        setVendorDeliveryOptions(prevOptions => {
          const newOptions = { ...prevOptions };
          delete newOptions[itemToRemove.vendorUsername];
          return newOptions;
        });
      }
      
      return newItems;
    });
  };

  const clearCart = () => {
    setCartItems([]);
    setCustomNotes({});
    setApplyPoints(false);
    setVendorDeliveryOptions({});
  };

  const getCartItemCount = (itemId: string) => {
    return cartItems
      .filter(item => item.id === itemId)
      .reduce((sum, item) => sum + item.quantity, 0);
  }
  
  const totalItems = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  const totalPrice = useMemo(() => {
    return cartItems.reduce((total, cartItem) => total + (cartItem.price * cartItem.quantity), 0);
  }, [cartItems]);
  
  const vendorCarts = useMemo((): VendorCart[] => {
    if (vendors.length === 0 || cartItems.length === 0) return [];
    
    const cartsByVendor: Record<string, { vendor: Vendor, items: CartItem[], subtotal: number }> = {};

    cartItems.forEach(item => {
        const vendor = vendors.find(v => v.username === item.vendorUsername);
        if (!vendor) return;

        if (!cartsByVendor[item.vendorUsername]) {
            cartsByVendor[item.vendorUsername] = {
                vendor: vendor,
                items: [],
                subtotal: 0
            };
        }
        cartsByVendor[item.vendorUsername].items.push(item);
        cartsByVendor[item.vendorUsername].subtotal += item.price * item.quantity;
    });

    return Object.values(cartsByVendor).map(vc => {
        const effectiveDeliveryOption: DeliveryOption = getVendorDeliveryOption(vc.vendor.username);
        const isMinOrderMet = effectiveDeliveryOption === 'Self Pickup' || vc.subtotal >= (vc.vendor.minOrderAmount || 0);

        let deliveryDistanceKm = 0;
        let deliveryCharge = 0;
        let isOutOfRange = false;
        let distanceCalculationType = "";

        if (effectiveDeliveryOption === 'Home Delivery') {
            if (customer?.latitude && customer?.longitude && vc.vendor.latitude && vc.vendor.longitude) {
                const rawDist = calculateDistanceInKm(
                    customer.latitude,
                    customer.longitude,
                    vc.vendor.latitude,
                    vc.vendor.longitude
                );
                
                const multiplier = deliveryConfig?.distanceMultiplier ?? 1.0;
                const adjustedDist = rawDist * multiplier;
                deliveryDistanceKm = adjustedDist;

                if (deliveryConfig) {
                    if (adjustedDist > deliveryConfig.maxDeliveryRadiusKm) {
                        isOutOfRange = true;
                    }
                    
                    if (deliveryConfig.isEnabled === true) {
                        const slab = deliveryConfig.slabs.find(s => adjustedDist >= s.minKm && adjustedDist <= s.maxKm);
                        deliveryCharge = slab ? slab.charge : 0;
                        distanceCalculationType = "SL-1.3";
                    } else {
                        deliveryCharge = 0.0;
                    }
                }
            }
        }

        return {
            ...vc,
            isMinOrderMet,
            deliveryOption: effectiveDeliveryOption,
            deliveryDistanceKm,
            deliveryCharge,
            isOutOfRange,
            distanceCalculationType,
        };
    });
  }, [cartItems, vendors, vendorDeliveryOptions, getVendorDeliveryOption, deliveryConfig, customer]);

  const canCheckout = useMemo(() => {
    if (vendorCarts.length === 0) return false;
    return vendorCarts.every(vc => vc.isMinOrderMet && !vc.isOutOfRange);
  }, [vendorCarts]);

  const { potentialPoints, redemptionDetails } = useMemo(() => {
    const MAX_REDEEMABLE_POINTS = 200;
    
    const defaults = {
        potentialPoints: 0,
        redemptionDetails: { canRedeem: false, pointsToRedeem: 0, discountAmount: 0 }
    };

    if (vendorCarts.length !== 1 || !customer) {
        let totalPotentialPoints = 0;
        vendorCarts.forEach(vc => {
            if (vc.vendor.isRewardsEnabled && vc.vendor.rewardsConfig) {
                totalPotentialPoints += Math.floor(vc.subtotal / vc.vendor.rewardsConfig.spend) * vc.vendor.rewardsConfig.points;
            }
        });
        return { ...defaults, potentialPoints: totalPotentialPoints };
    }

    const singleVendorCart = vendorCarts[0];
    const vendor = singleVendorCart.vendor;
    
    if (!vendor.isRewardsEnabled || !vendor.rewardsConfig) {
        return defaults;
    }
    
    const minRedemptionPoints = vendor.rewardsConfig.minRedemptionPoints || 100;
    const vendorUsername = vendor.username;
    const vendorPoints = customer.hyperPoints?.[vendorUsername] || 0;
    const lockedVendorPoints = customer.lockedPoints?.[vendorUsername] || 0;
    const availableVendorPoints = vendorPoints - lockedVendorPoints;

    const customerHasEnoughPoints = availableVendorPoints >= minRedemptionPoints;
    
    const pointsAvailableForRedemption = customerHasEnoughPoints
      ? Math.min(Math.floor(availableVendorPoints / 100) * 100, MAX_REDEEMABLE_POINTS)
      : 0;

    let pointsToRedeem = 0;
    let discountAmount = 0;
    let canRedeem = false;

    if (applyPoints && pointsAvailableForRedemption > 0) {
        canRedeem = true;
        pointsToRedeem = pointsAvailableForRedemption;
        discountAmount = pointsToRedeem * 0.25;
    }

    let calculatedPotentialPoints = 0;
    if (!canRedeem) {
        calculatedPotentialPoints = Math.floor(singleVendorCart.subtotal / vendor.rewardsConfig.spend) * vendor.rewardsConfig.points;
    }

    return {
        potentialPoints: calculatedPotentialPoints,
        redemptionDetails: {
            canRedeem,
            pointsToRedeem: canRedeem ? pointsToRedeem : (pointsAvailableForRedemption > 0 ? pointsAvailableForRedemption : 0),
            discountAmount,
        }
    };
  }, [vendorCarts, customer, applyPoints]);


  return (
    <CartContext.Provider value={{ 
        cartItems, 
        vendorCarts, 
        addToCart, 
        removeFromCart, 
        updateCartItemQuantity, 
        clearCart, 
        getCartItemCount, 
        totalItems, 
        totalPrice, 
        customNotes, 
        setCustomNotes, 
        potentialPoints, 
        redemptionDetails, 
        applyPoints, 
        setApplyPoints, 
        setVendorDeliveryOption,
        getVendorDeliveryOption,
        canCheckout,
        deliveryConfig
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
