
# HyperDelivery - System Documentation & Technical Blueprint

This document provides a comprehensive technical overview of the HyperDelivery platform. It is intended for developers, architects, and stakeholders to understand the system's architecture, features, data models, and operational flows.

## 1. High-Level Overview

**HyperDelivery** is a hyperlocal food delivery platform designed to connect local home chefs and small food vendors with customers within a specific community (e.g., a housing society like Life Republic).

### Core Objectives:
-   **Empower Local Vendors:** Provide a zero-cost digital storefront for home chefs and small shops.
-   **Streamline Ordering:** Offer customers a unified platform to order from multiple local vendors simultaneously.
-   **Enhance Community Commerce:** Keep economic activity within the local community.

### Technology Stack:
-   **Frontend:** Next.js (App Router), React, TypeScript
-   **UI:** ShadCN UI, Tailwind CSS
-   **State Management:** React Context API for modular state management (`CartContext`, `VendorContext`, etc.)
-   **Backend & Database:** Firebase (Firestore, Firebase Authentication, Cloud Storage)
-   **Generative AI:** Google's Genkit framework, utilizing Gemini models for various AI-powered features.
-   **Email:** Nodemailer with Gmail for transactional and campaign emails.

---

## 2. Key Features & Implementation Details

### 2.1. Vendor Module
-   **Onboarding:** Vendors sign up via a dedicated admin portal. New sign-ups trigger an email notification to the Super Admin for approval.
-   **Dashboard:** A central hub for vendors to manage their operations.
-   **Menu Management (`/admin/dashboard/menu`):**
    -   CRUD operations for menu items.
    -   AI-powered image generation for food items.
    -   Support for single-item pricing and half/full portion pricing.
-   **Availability Control (`/admin/dashboard/availability`):**
    -   Toggle availability for individual items or entire categories.
    -   Mark items as "Popular Picks" to feature them on the homepage.
-   **Order Management (`/admin/dashboard/orders`):**
    -   Real-time view of active and completed orders.
    -   Update order status (e.g., 'Accepted', 'Processing').
    -   Assign delivery personnel.
    -   **Dine-In Mode:** A unique feature allowing vendors to place orders on behalf of customers at physical tables. This flow bypasses the customer-facing cart and uses a dedicated UI within the vendor's menu page.
-   **Specials (`/admin/dashboard/specials`):** Create time-based menus (e.g., Breakfast, Lunch) by grouping existing menu items.
-   **Offers (`/admin/dashboard/offers`):** Create promotional offers with AI-generated banners. These can be activated/deactivated and trigger notifications to the Super Admin.
-   **Expense Tracking (`/admin/dashboard/expenses`):** A feature-flagged module for vendors to record business expenses, complete with receipt uploads.

### 2.2. Customer Module
-   **Authentication:** Primarily through Google Sign-In for a secure, passwordless experience.
-   **Menu Discovery (`/menu`):**
    -   View items from all vendors or filter by a specific vendor.
    -   Search functionality for items and vendors.
    -   Category-based navigation.
-   **Multi-Vendor Cart:** The system supports adding items from up to four different vendors in a single checkout flow.
-   **Order Tracking (`/track`):** Real-time status updates for active orders and a complete history of past orders.
-   **Feedback System:** Customers can rate vendors and individual items after an order is 'Delivered'. Low ratings prompt for detailed feedback.

### 2.3. Super Admin Module
-   **Centralized Control Panel:** A separate dashboard for platform oversight.
-   **Vendor Management:**
    -   Approve or suspend vendor accounts.
    -   **Feature Flagging:** Granularly enable/disable advanced features (GBP Integration, Expense Tracking, Offers, AI Assistant) for each vendor.
-   **Global Category Management:** Create and manage menu and vendor categories that are available to all vendors.
-   **Email Campaigns:** A powerful tool to send marketing emails to 'All Customers', 'All Vendors', or specific segments using an AI-powered email composer.
-   **Revenue Dashboard:** An aggregated view of revenue across all vendors, with filtering capabilities.

---

## 3. Data Models (Firestore Collections)

-   `vendors`: Stores all vendor profile information, including feature flags, shop details, and authentication UID.
-   `customers`: Stores customer profiles, contact info, and preferences.
-   `menuItems`: Contains all food items from all vendors. `vendorUsername` field links to the `vendors` collection.
-   `orders`: The central collection for all orders. Contains denormalized customer and item data for historical integrity. `vendorUsername` and `customerUsername` link to their respective collections.
-   `deliveryTeam`: Stores profiles for a vendor's delivery personnel. Linked via `vendorUsername`.
-   `specialMenus`: Defines timed menus like "Breakfast" or "Lunch".
-   `offers`: Stores promotional offers created by vendors or the super admin.
-   `categories`: Global menu categories managed by the Super Admin.
-   `siteReviews`: Feedback and ratings submitted by users about the platform itself.
-   `expenses`: Expense records for vendors who have the feature enabled.
-   `otpTokens`: Temporarily stores OTP hashes for password resets.

---

## 4. AI & Automation (Genkit Flows)

The application heavily utilizes **Genkit** for its AI capabilities, located in `src/ai/flows/`.

-   **`generate-image.ts`:** Generates images for menu items, offers, and logos using different prompt engineering strategies based on the `promptType`.
-   **`get-vendor-insights.ts`:** The "AI Vendor Assistant". It analyzes a vendor's dashboard data (revenue, popular items, etc.) and provides actionable business insights.
-   **`generate-campaign-email.ts`:** Takes a high-level prompt (e.g., "weekend biryani discount") and generates a complete subject and body for a marketing email.
-   **Email Automation:** A suite of flows (`send-order-email.ts`, `send-cancellation-email.ts`, `send-customer-invoice.ts`, etc.) handles all transactional emails. They use `nodemailer` configured with a Gmail App Password stored in environment variables (`EMAIL_USER`, `EMAIL_APP_PASSWORD`).
-   **Authentication Flows (`send-otp.ts`, `verify-otp.ts`):** Manage the password reset process for vendors.

---

## 5. Key Business Logic & Limitations

### 5.1. Order & Cart Logic
-   **Multi-Vendor Cart:** A customer's cart can contain items from up to **four** different vendors. When an order is placed, the system splits the cart into separate `Order` documents in Firestore, one for each vendor.
-   **Minimum Order Amount:** The cart checkout process verifies that the subtotal for each vendor meets their specified minimum order amount.

### 5.2. Authentication & Security
-   **Primary Method:** Google Sign-In is the primary and recommended authentication method for both customers and vendors for a secure, passwordless experience.
-   **Vendor Email Change:** The `linkNewGoogleAccount` flow provides a secure way for vendors to change their login email. It links the new account, updates the email in Firestore, and forces a logout to ensure the user re-authenticates with the new credential. Login events **do not** write email data to prevent rollbacks.
-   **Phone Verification:** A `PhoneAuthProvider` flow is implemented to verify customer phone numbers via OTP, a critical step for delivery coordination.
-   **Environment Variables:** Sensitive keys (Firebase config, email passwords) are managed through `.env` files.

### 5.3. Known Limitations & Edge Cases
-   **Case-Sensitivity:** As discovered, customer names are treated as case-sensitive (e.g., "Ravi Patil" and "ravi patil" are two different users). This is the current required behavior.
-   **PDF Generation CORS:** Generating a PDF menu with images from Firebase Storage requires configuring CORS on the storage bucket. A `cors.json` file and instructions are included in the main `README.md`.
-   **Image Optimization:** The `client-utils.ts` file contains a `compressImage` function to resize and compress user-uploaded images on the client side before they are sent to Firebase Storage, saving bandwidth and storage costs.
-   **OTP for Customers:** The password reset flow is currently implemented only for vendors. Customers are expected to use Google Sign-In for account recovery.

---

This documentation provides a solid foundation for understanding the HyperDelivery platform. It can be used to plan future features, onboard new developers, or replicate its architecture for new projects.
