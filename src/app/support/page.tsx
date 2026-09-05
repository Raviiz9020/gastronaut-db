'use client';

import React from 'react';
import Header from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  HelpCircle, 
  ArrowLeft, 
  MessageCircle, 
  Phone, 
  Mail, 
  Package, 
  Store, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  ChevronRight,
  ExternalLink,
  Smartphone,
  Laptop
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function SupportPage() {
  const whatsappNumber = "917083609020";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hi HyperDelivery Support, I need help regarding my order.")}`;
  const phoneUrl = "tel:+917083609020";
  const emailAddress = "hyperlabsupport@gmail.com";

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-20 lg:pb-12">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-6 md:py-10 max-w-4xl">
        {/* Back navigation button */}
        <div className="mb-4">
          <Link href="/track" passHref>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-full border-border/70 hover:border-primary/50 hover:bg-primary/10 transition-all text-xs flex items-center gap-1.5 shadow-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Track Orders
            </Button>
          </Link>
        </div>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 text-primary mb-1 border border-primary/20 shadow-xs">
              <HelpCircle className="h-7 w-7 animate-pulse" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-headline font-bold text-foreground">
              Customer Help & Support
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Ordered food and need assistance? We're here to help you track your meal, contact the kitchen, or resolve payment questions quickly.
            </p>
          </div>

          {/* Direct 1-Tap Quick Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {/* WhatsApp */}
            <a 
              href={whatsappUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all active:scale-[0.98] group"
            >
              <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20 shrink-0">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <h3 className="text-sm font-bold text-foreground group-hover:text-emerald-500 transition-colors">WhatsApp Us</h3>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-70" />
                </div>
                <p className="text-xs text-muted-foreground truncate">+91 70836 09020</p>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Fastest response</span>
              </div>
            </a>

            {/* Direct Call */}
            <a 
              href={phoneUrl}
              className="flex items-center gap-3 p-4 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition-all active:scale-[0.98] group"
            >
              <div className="p-2.5 rounded-xl bg-blue-500 text-white shadow-md shadow-blue-500/20 shrink-0">
                <Phone className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-foreground group-hover:text-blue-500 transition-colors">Call Helpline</h3>
                <p className="text-xs text-muted-foreground truncate">+91 70836 09020</p>
                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">Available during delivery hours</span>
              </div>
            </a>

            {/* Email Support */}
            <a 
              href={`mailto:${emailAddress}`}
              className="flex items-center gap-3 p-4 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition-all active:scale-[0.98] group"
            >
              <div className="p-2.5 rounded-xl bg-purple-500 text-white shadow-md shadow-purple-500/20 shrink-0">
                <Mail className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-foreground group-hover:text-purple-500 transition-colors">Email Us</h3>
                <p className="text-xs text-muted-foreground truncate">{emailAddress}</p>
                <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">Formal inquiries & proofs</span>
              </div>
            </a>
          </div>

          {/* Quick Tracking CTA Card */}
          <Card className="rounded-2xl border-primary/20 bg-gradient-to-r from-primary/10 via-purple-500/5 to-primary/5 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-center sm:text-left">
                <div className="p-2.5 rounded-xl bg-primary/20 text-primary shrink-0">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground">Want to check your current order?</h3>
                  <p className="text-xs text-muted-foreground">View real-time preparation status, delivery rider details, and download tax invoices.</p>
                </div>
              </div>
              <Link href="/track" passHref className="w-full sm:w-auto shrink-0">
                <Button className="w-full sm:w-auto rounded-xl text-xs font-semibold h-9 px-4">
                  View Live Tracking
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </Card>

          {/* 4 Core Help Topics */}
          <div className="space-y-4 pt-2">
            <h2 className="text-lg font-headline font-bold text-foreground px-1 flex items-center gap-2">
              Common Questions & Quick Guides
            </h2>

            {/* 1. How to Track Your Order */}
            <Card className="rounded-2xl border-border/70 overflow-hidden shadow-xs">
              <CardHeader className="p-4 sm:p-5 pb-3 bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">1. How to Track Your Order</CardTitle>
                    <CardDescription className="text-xs">Understand live stages and contact your delivery partner</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-3 space-y-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                <p>
                  You can easily track your order in real-time from any device:
                </p>

                {/* Device specific navigation guide */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-2">
                  <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 space-y-1">
                    <span className="font-bold text-foreground text-xs sm:text-sm flex items-center gap-1.5">
                      <Smartphone className="h-4 w-4 text-primary shrink-0" />
                      On Mobile Browser
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Look at the bottom navigation bar and tap the <strong className="text-foreground">"Orders"</strong> button to view your active delivery status anytime.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 space-y-1">
                    <span className="font-bold text-foreground text-xs sm:text-sm flex items-center gap-1.5">
                      <Laptop className="h-4 w-4 text-purple-500 shrink-0" />
                      On Desktop / Laptop
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Click your <strong className="text-foreground">Profile icon</strong> at the top right header and choose <strong className="text-foreground">"My Orders"</strong> (or click <Link href="/track" className="text-primary hover:underline font-semibold">Track</Link>).
                    </p>
                  </div>
                </div>

                <p className="pt-1">
                  Once on the <Link href="/track" className="text-primary font-semibold hover:underline">Track Orders page</Link>, your order passes through five clear stages:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                    <span className="font-semibold text-foreground block mb-0.5">🟡 Order Placed & Accepted</span>
                    <span>Received by the platform and confirmed by the kitchen.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                    <span className="font-semibold text-foreground block mb-0.5">🔥 Processing / Cooking</span>
                    <span>The kitchen is actively preparing your fresh dish.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                    <span className="font-semibold text-foreground block mb-0.5">🛵 Out for Delivery</span>
                    <span>Your delivery rider has collected the parcel and is heading to you.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40">
                    <span className="font-semibold text-foreground block mb-0.5">✅ Delivered</span>
                    <span>Order successfully delivered to your doorstep.</span>
                  </div>
                </div>
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-foreground flex items-start gap-2.5 mt-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <strong>Calling your Rider:</strong> When your order status turns to <em>"Out for Delivery"</em>, the delivery partner’s name and direct <strong>phone link</strong> will appear on your tracking card.
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. How to Contact the Kitchen / Vendor */}
            <Card className="rounded-2xl border-border/70 overflow-hidden shadow-xs">
              <CardHeader className="p-4 sm:p-5 pb-3 bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
                    <Store className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">2. How to Contact the Kitchen / Vendor</CardTitle>
                    <CardDescription className="text-xs">Direct communication for cooking notes, spice levels & pickups</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-3 space-y-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    <strong className="text-foreground">Direct Phone Number:</strong> On your active order card in <Link href="/track" className="text-primary font-semibold hover:underline">My Orders</Link>, look for <em>"From: [Kitchen Name]"</em>. The kitchen's phone number is clickable—tap to call them right away. You can also view all kitchen contacts anytime under the <Link href="/vendor-details" className="text-primary font-semibold hover:underline">Kitchens</Link> tab.
                  </li>
                  <li>
                    <strong className="text-foreground">When should you call?</strong> If you forgot to add a cooking preference (e.g., less spicy, extra green chutney, no onions), we recommend calling the kitchen immediately after placing the order before preparation begins.
                  </li>
                  <li>
                    <strong className="text-foreground">Self Pickup Orders:</strong> If you selected <em>Self Pickup</em>, a <strong>"Map Directions"</strong> link appears directly on your order card with instant GPS directions to the kitchen counter.
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* 3. Payment & Refund Inquiries */}
            <Card className="rounded-2xl border-border/70 overflow-hidden shadow-xs">
              <CardHeader className="p-4 sm:p-5 pb-3 bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 shrink-0">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">3. Payment & Refund Inquiries</CardTitle>
                    <CardDescription className="text-xs">UPI deductions, banking turnaround, and refund timelines</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-3 space-y-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
                    <h4 className="font-semibold text-foreground text-xs sm:text-sm mb-1">
                      Money deducted from bank / UPI, but order shows failed or pending?
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      During peak UPI server load, banking confirmation callbacks may take 2–5 minutes. If an order was not confirmed by the kitchen, your issuing bank or UPI application will reverse and credit the amount back to your account automatically.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-foreground">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm">
                          Official Refund Processing Time: 5 to 7 Working Days
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          As stated in our official policy, once a refund request is approved, the amount is initiated back to your original source of payment (UPI, Credit/Debit Card, or Netbanking) and reflects within <strong>5 to 7 working days</strong>, depending on your bank's clearance cycles.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
                    <h4 className="font-semibold text-foreground text-xs sm:text-sm mb-1">
                      Cash on Delivery (COD) & Pay at Counter
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      For Cash on Delivery orders, pay the delivery partner in cash or UPI QR upon arrival. For Pickup orders, you can pay at the vendor's physical counter.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <Link 
                    href="/cancellation-refund-policy" 
                    className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Read Full Cancellation & Refund Policy
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* 4. Food & Delivery Issues */}
            <Card className="rounded-2xl border-border/70 overflow-hidden shadow-xs">
              <CardHeader className="p-4 sm:p-5 pb-3 bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 shrink-0">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">4. Food Quality, Missing Items & Delays</CardTitle>
                    <CardDescription className="text-xs">What to do if something is missing, damaged, or delayed</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-3 space-y-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    <strong className="text-foreground">Order Delayed:</strong> Our community kitchens cook meals fresh upon order. In case of peak township hours or rain, preparation and delivery may take 10–15 minutes longer. Tap the rider or vendor call icon on your tracking card for an instant update.
                  </li>
                  <li>
                    <strong className="text-foreground">Missing or Wrong Dish:</strong> If an item was left out or you received an incorrect item, please message our team on WhatsApp at <strong>+91 70836 09020</strong> within <strong>2 hours of delivery</strong>. Mention your Order ID and send a quick photo of the items received so we can verify with the vendor immediately.
                  </li>
                  <li>
                    <strong className="text-foreground">Spilled or Damaged Packaging:</strong> Please report damaged packaging immediately on WhatsApp with an image of the parcel. We will arrange an immediate replacement or process a refund based on vendor confirmation.
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Help Banner */}
          <div className="rounded-3xl p-6 bg-card border border-primary/20 text-center space-y-3 mt-6 shadow-sm">
            <h3 className="text-lg font-headline font-bold text-foreground">
              Still have questions or need immediate help?
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              Our operations support team is available during delivery hours to ensure your food experience is seamless.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 h-9 gap-1.5 shadow-xs">
                  <MessageCircle className="h-4 w-4" />
                  Chat on WhatsApp
                </Button>
              </a>
              <a href={phoneUrl}>
                <Button variant="outline" className="rounded-xl text-xs font-semibold px-4 h-9 gap-1.5">
                  <Phone className="h-4 w-4" />
                  Call Helpline
                </Button>
              </a>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
