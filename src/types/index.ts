export interface CustomizationOption {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  isAvailable?: boolean;
  stock?: number;
}

export interface Customization {
  id: string;
  name: string;
  type: 'SINGLE' | 'MULTI';
  minSelect: number;
  options: CustomizationOption[];
}

export interface MenuItem {
  id: string;
  name:string;
  description: string;
  price: number;
  discountPrice?: number;
  isDiscountActive?: boolean;
  image: string; // Public URL for sharing and fallback
  imageDataUrl?: string; // Data URL for fast initial loading
  blurDataUrl?: string; // For blurry image placeholders
  category: string;
  isVeg?: boolean;
  customizations?: Customization[];
  aiHint: string;
  shopName: string;
  isAvailable: boolean;
  isPopular?: boolean;
  vendorUsername: string;
  slug?: string;
  totalRatingSum?: number;
  ratingCount?: number;
  stock?: number;
}

export interface Category {
  id: string;
  name: string;
  shopName: string; // 'global' for super admin categories
  imageUrl?: string;
  blurDataUrl?: string;
  aiHint?: string;
  vendorCategory?: string;
}

export interface CartItem extends MenuItem {
  cartItemId: string; // Unique identifier for the item configuration in the cart
  quantity: number;
  customizationDetails: Record<string, string | string[]>;
  rating?: number;
  feedback?: string;
  vendorResponse?: string;
}

export interface EmailPreferences {
  campaigns?: boolean;
  offers?: boolean;
  systemNotifications?: boolean;
}

export interface Customer {
    username: string; // This is the Firebase Auth UID
    email?: string;
    password?: string; // Optional: Only for manual signup, not for Google.
    name: string;
    contact: string;
    address: string;
    authUid?: string; // To store Firebase Auth UID for Google Sign-In users
    imageUrl?: string;
    termsAccepted?: boolean;
    phoneVerified?: boolean;
    createdAt?: string; // ISO 8601 date string
    emailPreferences?: EmailPreferences;
    hyperPoints?: Record<string, number>; // Maps vendorUsername to points
    lockedPoints?: Record<string, number>; // Maps vendorUsername to locked points
    lastActivityDate?: string; // ISO 8601 date string for rewards activity
    isDemoCustomer?: boolean;
    latitude?: number;
    longitude?: number;
}

export interface VendorCategory {
  id: string;
  name: string;
  imageUrl?: string;
  blurDataUrl?: string;
  aiHint?: string;
}

export type DeliveryType = 'All' | 'Self Pickup Only';

export interface GmbAuth {
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  scope: string;
}

export interface GmbLocation {
    locationId: string;
    locationName: string;
}


export interface TimeSlot {
  open?: string;
  close?: string;
  startTime?: string;
  endTime?: string;
}

export enum VendorStatus {
  OPEN = 'OPEN',
  CLOSED_TEMP = 'CLOSED_TEMP',
  CLOSED_FOR_DAY = 'CLOSED_FOR_DAY',
  ON_BREAK = 'ON_BREAK',
  BEFORE_OPENING = 'BEFORE_OPENING',
  AFTER_CLOSING = 'AFTER_CLOSING',
}

export interface Vendor {
    username: string; // This is the Firebase Auth UID
    password?: string; // Optional: Only for manual signup, not for Google.
    name: string; 
    shopName: string | null;
    contact: string | null;
    address: string | null;
    googleMapsUrl?: string;
    isApproved: boolean;
    category: string | null; // ID of VendorCategory
    minOrderAmount?: number;
    about?: string;
    workingHours?: string;
    operatingHours?: Record<string, TimeSlot[]>;
    authUid?: string;
    email?: string;
    imageUrl?: string; // For the vendor's own profile image
    tagline?: string;
    shopImage?: string;
    shopImageBlur?: string; // For blurry image placeholders
    isShopOpen?: boolean;
    isGbpEnabled?: boolean; // Super admin control for GBP feature
    isExpenseTrackingEnabled?: boolean; // Super admin control for expense tracking
    isOfferCreationEnabled?: boolean; // Super admin control for offer creation
    isAiAssistantEnabled?: boolean; // Super admin control for AI vendor assistant
    isAccountLinkingEnabled?: boolean; // Super admin control for changing login email
    canAcceptDineIn?: boolean; // Super admin control for dine-in feature
    isRewardsEnabled?: boolean;
    isDemoAccount?: boolean; // Indicates if this is a demo account
    isMenuEditDisabled?: boolean; // Prevents data mutation for demo integrity
    isInventory?: boolean; // Super admin control for inventory management
    rewardsConfig?: {
      spend: number;
      points: number;
      minRedemptionPoints?: number;
    };
    upiId?: string;
    telegramChatId?: string;
    termsAccepted?: boolean;
    slug?: string;
    deliveryType?: DeliveryType;
    dineInTables?: number;
    createdAt?: string; // ISO 8601 date string
    totalRatingSum?: number;
    ratingCount?: number;
    gmbAuth?: GmbAuth;
    gmbLocationId?: string;
    gmbStats?: GmbStats;
    consolidatedExpenses?: { [key: string]: number }; // e.g., { '2024-07': 5000, '2024-06': 4500 }
    emailPreferences?: EmailPreferences;
    latitude?: number;
    longitude?: number;
    deliveryRadius?: number; // in km
}

export interface SuperAdmin {
    username: string;
    password?: string;
    name: string;
}

export type PaymentMethod = 'Pay Now' | 'COD' | 'Pay at Counter' | 'UPI';
export type DeliveryOption = 'Home Delivery' | 'Self Pickup' | 'Dine-In';

export type OrderStatus = 'Order Placed' | 'Accepted' | 'Processing' | 'Out for Delivery' | 'Delivered' | 'Cancelled' | 'Order Ready' | 'Picked Up';

export interface Order {
    orderId: string;
    displayId?: string; // User-friendly order ID
    customer: {
      name: string;
      contact: string;
      address: string;
      email?: string;
      latitude?: number;
      longitude?: number;
    };
    customerUsername: string;
    items: CartItem[];
    subtotal: number;
    discountAmount: number;
    totalPrice: number;
    status: OrderStatus;
    createdAt: string; // ISO 8601 date string
    assignedDeliveryBoyId?: string;
    assignedDeliveryBoyName?: string;
    assignedDeliveryBoyContact?: string;
    assignedDeliveryBoyAt?: string;
    vendorUsername: string;
    vendorContact?: string;
    vendorRating?: number;
    vendorFeedback?: string;
    cancellationReason?: string;
    paymentMethod: PaymentMethod;
    deliveryOption: DeliveryOption;
    acceptedAt?: string;
    paymentRequestedAt?: string;
    paymentAcceptedAt?: string;
    paymentConfirmedAt?: string;
    paymentStatus?: 'Pending' | 'Paid' | 'Failed' | 'PENDING' | 'PAID' | 'FAILED' | 'AWAITING_CONFIRMATION' | 'CONFIRMED BY VENDOR' | 'CONFIRMED BY RIDER';
    riderStatus?: string;
    customNotes?: string;
    pointsEarned?: number;
    pointsRedeemed?: number;
    deliveryDistanceKm?: number;
    deliveryCharge?: number;
    distanceCalculationType?: string;
    
    // Additional home-delivery settlement/vendor fields (Android Parity)
    riderPayout?: number;
    riderSettlementConfirmedAt?: string;
    riderSettlementMarkedAt?: string;
    riderSettlementMarkedBy?: string;
    riderSettlementPaymentMode?: string;
    riderSettlementRejectedReason?: string;
    riderSettlementStatus?: string;
    vendorAddress?: string;
    vendorLatitude?: number;
    vendorLongitude?: number;
    vendorShopName?: string;
}

export interface DeliveryBoy {
  id: string;
  username: string;
  password?: string;
  name: string;
  contact: string;
  image: string;
  blurDataUrl?: string; // For blurry image placeholders
  vendorUsername: string;
  isApproved: boolean;
}

export interface Rider {
    id: string;
    name: string;
    email: string;
    contact: string;
    address: string;
    aadhaarNumber: string;
    aadhaarImageUrl: string;
    drivingLicenseNumber: string;
    drivingLicenseImageUrl: string;
    vehicleNumber: string;
    upiId: string;
    emergencyContactName: string;
    emergencyContactNumber: string;
    isApproved: boolean;
    verificationStatus: 'approved' | 'rejected' | 'pending';
    status: string;
    profileComplete: boolean;
    fcmToken?: string;
    currentLatitude?: number | null;
    currentLongitude?: number | null;
    lastLocationUpdate?: any;
    createdAt?: string;
}

export interface SearchResult {
    id: string;
    name: string;
    type: 'vendor' | 'item';
    vendorUsername?: string;
    item?: MenuItem;
}

export interface OtpToken {
    username: string;
    otpHash: string;
    expiresAt: string; // ISO 8601 date string
    userType: 'customer' | 'vendor';
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  blurDataUrl?: string; // For blurry image placeholders
  isActive: boolean;
  vendorUsername?: string;
  vendorName?: string;
  aiHint?: string;
  startDate?: string;
  endDate?: string;
}

export interface SiteReview {
  id: string;
  customerUsername: string;
  authorName: string;
  rating: number;
  text: string;
  createdAt: string; // ISO 8601 date string
}

export type SpecialMenuType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Evening Snacks';

export interface SpecialMenu {
    id: string;
    vendorUsername: string;
    type: SpecialMenuType;
    title: string;
    itemIds: string[];
    isActive: boolean;
}

export interface SiteSettings {
    logoUrl: string;
}

export interface DeliverySlab {
  minKm: number;
  maxKm: number;
  charge: number;
  riderPayout: number;
}

export interface DeliveryConfig {
  isEnabled: boolean;
  maxDeliveryRadiusKm: number;
  distanceMultiplier: number;
  slabs: DeliverySlab[];
}

export interface GmbStats {
    averageRating?: number;
    totalReviewCount?: number;
    lastFetched?: number;
}

export interface VendorInsightsOutput {
  insights: {
    type: 'positive' | 'opportunity' | 'warning';
    message: string;
  }[];
}

export interface ExpenseCategory {
    id: string;
    name: string;
}

export interface Expense {
    id: string;
    vendorUsername: string;
    date: string; // ISO 8601 date string
    category: string;
    description: string;
    amount: number;
    imageUrl?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  imageUrl?: string;
  imagePrompt?: string;
}
