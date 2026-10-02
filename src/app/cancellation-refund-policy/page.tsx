'use client';

import React from 'react';
import Header from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCcw, ArrowLeft, Calendar, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function CancellationRefundPolicyPage() {
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
            <RotateCcw className="h-3.5 w-3.5 text-primary flex-shrink-0 animate-pulse" />
            <span>Customer Protection & Fair Refunds</span>
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
              Cancellation &{' '}
              <span className="bg-gradient-to-r from-primary via-orange-500 to-amber-500 bg-clip-text text-transparent">
                Refund Policy
              </span>
            </h1>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border text-xs text-muted-foreground mb-4">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span>Effective Date: March 11, 2026</span>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Our commitment to fair, transparent cancellation rules and prompt resolution for our community.
            </p>
          </motion.div>
        </section>

        {/* Content Card with Verbatim Legal Text */}
        <Card className="rounded-3xl border-border/80 bg-card/60 backdrop-blur-md p-5 sm:p-8 md:p-10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

          <CardContent className="prose prose-sm dark:prose-invert max-w-none p-0 text-muted-foreground prose-headings:text-foreground prose-strong:text-foreground prose-li:text-muted-foreground prose-headings:font-headline leading-relaxed space-y-6">
            <p>
              HyperDelivery ("we", "our", "us") believes in helping its customers as far as possible, and has therefore a liberal cancellation policy. Under this policy:
            </p>
            <p>
              <strong>HyperDelivery acts as a technology platform connecting customers with independent restaurants and home chefs. Refund decisions may require verification with the respective vendor where applicable.</strong>
            </p>

            <h3 className="text-lg sm:text-xl font-bold mt-8 pt-4 border-t border-border/60">1. Cancellations</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Timeframe for Cancellation:</strong> Cancellations will be considered only if the request is made within 10 minutes of placing the order. <strong>Orders cannot be cancelled once the restaurant/vendor has started preparing the order.</strong>
              </li>
              <li>
                <strong>Order Rejected Before Preparation:</strong> If the vendor is unable to accept your order before preparation begins, any prepaid amount will be refunded in full.
              </li>
              <li>
                <strong>Non-Cancellable Items:</strong> We do not accept cancellation requests for perishable items once preparation has started. However, a refund/replacement can be made if the user establishes that the quality of product delivered is not good.
              </li>
            </ul>

            <h3 className="text-lg sm:text-xl font-bold mt-8 pt-4 border-t border-border/60">2. Refunds</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Failed Deliveries / Merchant Issues:</strong> In case you do not receive your order, or the vendor cancels your order due to unavailability, a full refund will be initiated automatically.
              </li>
              <li>
                <strong>Damaged or Incorrect Items:</strong> In case of receipt of damaged or defective items, please report the same to our Customer Service team. The request will, however, be entertained once the merchant has checked and determined the same at their own end. This should be reported within 2 hours of receipt of the products.
              </li>
              <li>
                <strong>Customer Mistakes:</strong> Orders placed with an incorrect delivery address, incorrect contact details, or accidental orders may not be eligible for a refund once preparation has begun.
              </li>
              <li>
                <strong>Delivery Delays:</strong> Delays caused by traffic, weather, or unforeseen circumstances do not automatically qualify for a refund.
              </li>
              <li>
                <strong>Partial Refunds:</strong> In certain cases, HyperDelivery may offer a full refund, partial refund, replacement, or store credit, depending on the nature of the issue.
              </li>
              <li>
                <strong>Approval of Refund:</strong> Once your refund request is approved, it will be processed immediately on our end.
              </li>
            </ul>

            <h3 className="text-lg sm:text-xl font-bold mt-8 pt-4 border-t border-border/60">3. Refund Processing Time</h3>
            <p>
              For approved refunds, the amount will be credited back to your original method of payment (Credit Card, Debit Card, UPI, Netbanking, etc.) within <strong>5 to 7 working days</strong>. Please note that the exact time for the refund to reflect in your account depends on your bank or payment provider.
            </p>

            <h3 className="text-lg sm:text-xl font-bold mt-8 pt-4 border-t border-border/60">4. Contact Us</h3>
            <p>If you have any questions about our Cancellation and Refunds Policy, please contact us at:</p>
            <p>Email: <a href="mailto:hyperlabsupport@gmail.com" className="text-primary hover:underline font-semibold">hyperlabsupport@gmail.com</a></p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
