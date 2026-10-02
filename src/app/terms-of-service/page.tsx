'use client';

import React from 'react';
import Header from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ArrowLeft, Calendar, Scale } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-28 md:pb-16">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-6 sm:py-10 md:py-14 max-w-4xl">
        {/* Navigation Bar / Top Bar */}
        <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8">
          <Link href="/" passHref>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full border-border/70 hover:border-primary/50 hover:bg-primary/10 transition-all shadow-xs"
              aria-label="Back to Home"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[11px] sm:text-xs font-semibold text-primary shadow-xs">
            <Scale className="h-3.5 w-3.5 text-primary flex-shrink-0 animate-pulse" />
            <span>Platform Agreement & Guidelines</span>
          </div>
        </div>

        {/* Hero Section */}
        <section className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
              Terms of{' '}
              <span className="bg-gradient-to-r from-primary via-orange-500 to-amber-500 bg-clip-text text-transparent">
                Service
              </span>
            </h1>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border text-xs text-muted-foreground mb-4">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span>Effective Date: March 11, 2026</span>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              These Terms of Service govern your use of the HyperDelivery platform, including our mobile application and website.
            </p>
          </motion.div>
        </section>

        {/* Content Card with Verbatim Legal Text */}
        <Card className="rounded-3xl border-border/80 bg-card/60 backdrop-blur-md p-5 sm:p-8 md:p-10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

          <CardContent className="prose prose-sm dark:prose-invert max-w-none p-0 text-muted-foreground prose-headings:text-foreground prose-strong:text-foreground prose-li:text-muted-foreground prose-headings:font-headline leading-relaxed space-y-6">
            <p>
              Welcome to HyperDelivery. These Terms of Service govern your use of the HyperDelivery platform, including our mobile application and website.
            </p>
            <p>
              By accessing or using the HyperDelivery platform, you agree to comply with these Terms. If you do not agree with any part of these Terms, you should not use the platform.
            </p>

            <h3 className="text-lg sm:text-xl font-bold mt-8 pt-4 border-t border-border/60">1. Our Role</h3>
            <p>
              HyperDelivery is a technology platform that connects customers with local home chefs and vendors (“Vendors”). Our platform allows Vendors to list their products and enables customers to place orders with them.
            </p>
            <p>
              HyperDelivery acts solely as a technology facilitator and does not manufacture, prepare, store, or deliver the products listed by Vendors.
            </p>
            <p>
              Any transaction for the purchase of products is directly between the customer and the Vendor.
            </p>

            <h3 className="text-lg sm:text-xl font-bold mt-8 pt-4 border-t border-border/60">2. User Accounts</h3>
            <p>
              To use certain features of the platform, users may be required to create an account.
            </p>
            <p>Users are responsible for:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Maintaining the confidentiality of their account credentials</li>
              <li>Ensuring the accuracy of information provided</li>
              <li>All activities conducted under their account</li>
            </ul>
            <p>
              HyperDelivery reserves the right to suspend or terminate accounts that violate these Terms or misuse the platform.
            </p>

            <h3 className="text-lg sm:text-xl font-bold mt-8 pt-4 border-t border-border/60">3. Vendor Responsibilities</h3>
            <p>Vendors using the HyperDelivery platform are responsible for:</p>

            <p><strong>Product Quality:</strong> Vendors are solely responsible for the quality, safety, and legality of the products they offer.</p>
            <p><strong>Delivery:</strong> Vendors are responsible for the preparation and delivery of the goods ordered through the platform. HyperDelivery does not manage the physical delivery of items.</p>
            <p><strong>Delivery Distance &amp; Routing:</strong> The distance displayed on vendor cards and storefront listings represents straight-line (radial/aerial) distance for general proximity reference. However, when an order is fulfilled for delivery, delivery charges, serviceability boundaries, and rider transit are determined based on navigable road distance, which may vary from straight-line distance due to actual road layout, traffic navigation, and routing.</p>
            <p><strong>Product Information:</strong> Vendors must provide accurate information regarding product descriptions, pricing, and availability.</p>
            <p><strong>Product Images:</strong> Images displayed on the platform are for illustrative purposes only. While Vendors strive to provide accurate representations, the actual product received may vary slightly in appearance. The product description should be considered the primary reference.</p>

            <h3 className="text-lg sm:text-xl font-bold mt-8 pt-4 border-t border-border/60">4. Orders and Cancellations</h3>
            <p>Orders placed through the platform are requests to purchase products from Vendors.</p>
            <p>Vendors may accept or reject orders based on availability or operational constraints.</p>
            <p>In cases where an order cannot be fulfilled, the Vendor may cancel the order and inform the customer accordingly.</p>
            <p>Customers are expected to place orders responsibly and avoid misuse of the platform.</p>

            <h3 className="text-lg sm:text-xl font-bold mt-8 pt-4 border-t border-border/60">5. Payments</h3>
            <p>HyperDelivery provides QR code generation to simplify payment between customers and Vendors.</p>
            <p>HyperDelivery does not process payments and is not responsible for payment processing, transaction failures, or disputes arising from UPI or bank transactions.</p>
            <p>In the event of payment issues, customers and Vendors should first attempt to resolve the issue directly. If necessary, users should contact their respective bank or UPI service provider.</p>

            <h3 className="text-lg sm:text-xl font-bold mt-8 pt-4 border-t border-border/60">6. Platform Availability</h3>
            <p>While we strive to provide uninterrupted service, HyperDelivery does not guarantee that the platform will always be available without interruption.</p>
            <p>The service may occasionally be unavailable due to system maintenance, technical issues, or updates.</p>

            <h3 className="text-lg sm:text-xl font-bold mt-8 pt-4 border-t border-border/60">7. Prohibited Use</h3>
            <p>Users agree not to misuse the platform. This includes but is not limited to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Placing fraudulent or fake orders</li>
              <li>Abusing or harassing Vendors or other users</li>
              <li>Attempting to interfere with platform functionality</li>
              <li>Using the platform for unlawful activities</li>
            </ul>

            <h3 className="text-lg sm:text-xl font-bold mt-8 pt-4 border-t border-border/60">8. Limitation of Liability</h3>
            <p>HyperDelivery is provided on an “as is” and “as available” basis.</p>
            <p>We do not make any warranties regarding product quality provided by Vendors, delivery timelines, or availability of products.</p>
            <p>HyperDelivery shall not be liable for any direct or indirect damages arising from the use of the platform.</p>

            <h3 className="text-lg sm:text-xl font-bold mt-8 pt-4 border-t border-border/60">9. Changes to These Terms</h3>
            <p>HyperDelivery reserves the right to update or modify these Terms at any time.</p>
            <p>Any updates will be posted on this page. Continued use of the platform after changes indicates acceptance of the revised Terms.</p>

            <h3 className="text-lg sm:text-xl font-bold mt-8 pt-4 border-t border-border/60">10. Contact Us</h3>
            <p>If you have questions about these Terms of Service, please contact us:</p>
            <p>Email: <a href="mailto:hyperlabsupport@gmail.com" className="text-primary hover:underline font-semibold">hyperlabsupport@gmail.com</a></p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
