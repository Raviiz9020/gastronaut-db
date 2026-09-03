'use client';

import React, { useState } from 'react';
import Header from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Heart, 
  ChefHat, 
  Sparkles, 
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  TrendingUp,
  Truck,
  Layers,
  Bot,
  ReceiptText,
  Bell,
  MapPin,
  Utensils,
  Zap,
  BadgeCheck,
  CreditCard,
  Gift,
  TrendingDown,
  Percent,
  Smartphone,
  BarChart3,
  Package,
  QrCode,
  Headphones,
  ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Resident benefits data
const residentBenefits = [
  {
    icon: TrendingDown,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    title: 'Much Cheaper Than Other Aggregators',
    badge: 'Save 25–40%',
    description: 'Big delivery apps mark up menu prices by 30–40% on top of surge fees and ₹15 platform charges. We bring you direct, honest neighborhood prices with just a flat ₹5 platform fee.'
  },
  {
    icon: Gift,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    title: 'Reward Points on Every Order',
    badge: 'HyperPoints',
    description: 'Every order earns you HyperPoints loyalty rewards! Accumulate points automatically with every meal and easily redeem them for instant cash discounts on your future orders.'
  },
  {
    icon: Clock,
    color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    title: 'Real-Time In-App Order Tracking',
    badge: 'Live In-App',
    description: 'Watch your meal progress live in the app from the moment the kitchen begins cooking to rider pickup and doorstep arrival. Transparent updates with zero guessing.'
  },
  {
    icon: ShoppingBag,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    title: 'Self-Pickup While Passing By',
    badge: '₹0 Delivery Fee',
    description: 'Walking past a vendor or heading home from work? Order a little in advance, skip the queue, and pick up your food fresh and hot with zero delivery charges!'
  },
  {
    icon: Layers,
    color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    title: 'Multi-Vendor Cart in 1 Checkout',
    badge: '1 Unified Cart',
    description: 'Craving biryani from a home chef, dessert from a bakery, and dairy? Combine items from multiple vendors into a single cart and checkout all together in one go.'
  },
  {
    icon: Truck,
    color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
    title: 'Early Township Doorstep Delivery',
    badge: 'Our Community',
    description: 'City delivery riders get lost or stranded at the gate. Our dedicated local riders live here, ensuring prompt pickup and early delivery straight to your tower and flat.'
  },
  {
    icon: CreditCard,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    title: 'All Payment Modes & Flat ₹5 Fee',
    badge: '0% Gateway Surcharge',
    description: 'Pay your way: UPI (GPay, PhonePe, Paytm), Debit Cards, or Credit Cards with zero extra payment gateway charges. Simple, transparent, and fair.'
  }
];

// Vendor & Home Chef benefits data
const vendorBenefits = [
  {
    icon: Smartphone,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    title: 'Dedicated Industry-Standard App',
    badge: 'Fast & Modern',
    description: 'Built to modern industry standards. Enjoy a smooth, reliable vendor app designed for fast counter operation, instant status updates, and zero lag.'
  },
  {
    icon: BarChart3,
    color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    title: 'Dashboards for Business Growth',
    badge: 'Analytics',
    description: 'Track total revenue, monitor sales trends, identify best-selling dishes, and understand peak ordering times with simple, powerful visual analytics.'
  },
  {
    icon: Bell,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    title: 'Telegram & In-App Notifications',
    badge: 'Never Miss an Order',
    description: 'Multi-channel alert redundancy: get instant Telegram Bot order messages, loud audio chimes on your vendor app, and full-screen incoming order popups.'
  },
  {
    icon: Zap,
    color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
    title: 'Go Online in a Single Day',
    badge: 'Same-Day Go-Live',
    description: 'No waiting weeks or paying heavy registration fees. Sign in with Google, add your menu, and get approved within 1 to 2 hours to start taking orders today.'
  },
  {
    icon: Percent,
    color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    title: 'Create Your Own Offers & Discounts',
    badge: 'Marketing Control',
    description: 'Run your shop your way. Create percentage discounts, flat cash off, custom combo deals, and highlight promotional banners directly from your dashboard.'
  },
  {
    icon: Gift,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    title: 'Retain Customers Using HyperPoints',
    badge: 'Repeat Loyalty',
    description: 'Turn first-time foodies into loyal regulars. Configure your own repeat-reward rules (e.g. Spend ₹250, Earn 25 Points) to keep neighbors reordering.'
  },
  {
    icon: Package,
    color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
    title: 'Manage Your Inventory in Real-Time',
    badge: '1-Tap Toggles',
    description: 'Run out of a special dish or fresh bake? Instantly toggle items in-stock or sold-out with a single tap so customers never order unavailable items.'
  },
  {
    icon: ReceiptText,
    color: 'text-teal-500 bg-teal-500/10 border-teal-500/20',
    title: 'Share Digital Receipts If Needed',
    badge: 'Clean Records',
    description: 'Generate professional, itemized digital receipts with official HYPER IDs. Easily share them with customers via WhatsApp, email, or download for bookkeeping.'
  },
  {
    icon: QrCode,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    title: 'Dine-In Table Orders Included',
    badge: 'QR Menus',
    description: 'Not just for delivery! Generate table QR codes for Dine-In guests to scan, browse your menu, and place orders directly into your unified dashboard.'
  },
  {
    icon: Headphones,
    color: 'text-primary bg-primary/10 border-primary/20',
    title: 'Dedicated Business Growth Support',
    badge: 'Local Partner',
    description: 'You’re never on your own. Receive personal onboarding assistance, menu pricing guidance, and community promotion support from our local team.'
  }
];

// Customer Comparison Matrix Data
const customerComparisonPoints = [
  {
    feature: 'Meal Prices & Menu Markups',
    whatsapp: '⚠️ Manual pricing in text chats',
    aggregators: '❌ 25% – 40% inflated menu rates',
    hyperdelivery: '✅ Direct kitchen prices (Save 25–40%)'
  },
  {
    feature: 'Self-Pickup While Passing By',
    whatsapp: '❌ Back-and-forth manual text messages',
    aggregators: '⚠️ Complex takeaway fees / limited',
    hyperdelivery: '✅ 1-Tap pre-order & pick up with ₹0 fee'
  },
  {
    feature: 'Order from multiple shops in 1 checkout',
    whatsapp: '❌ Impossible (separate chats)',
    aggregators: '❌ Must place completely separate orders',
    hyperdelivery: '✅ 1 Unified cart & checkout for all shops'
  },
  {
    feature: 'Reward Points on Every Order',
    whatsapp: '❌ No loyalty or points',
    aggregators: '❌ Expensive paid subscription clubs',
    hyperdelivery: '✅ HyperPoints earned on every meal'
  },
  {
    feature: 'Township doorstep delivery (No lost riders)',
    whatsapp: '⚠️ Self-pickup or delivery chaos',
    aggregators: '⚠️ Often lost at society gates',
    hyperdelivery: '✅ Dedicated local fleet to your tower'
  },
  {
    feature: 'Platform Fee & Payment Surcharges',
    whatsapp: '⚠️ Manual UPI transfers only',
    aggregators: '❌ ₹10–₹15 platform fee + card surcharges',
    hyperdelivery: '✅ Flat ₹5 fee • UPI & Cards (0% surcharge)'
  }
];

// Vendor Comparison Matrix Data
const vendorComparisonPoints = [
  {
    feature: 'Platform Commission Cut',
    whatsapp: '0% (high manual errors & labor)',
    aggregators: '❌ 25% – 35% commission cut per plate',
    hyperdelivery: '✅ Fair, low & sustainable margins'
  },
  {
    feature: 'Daily Order Management',
    whatsapp: '❌ Chaotic chats, lost notes & manual totals',
    aggregators: '⚠️ Complicated corporate portal',
    hyperdelivery: '✅ Industry-standard dedicated vendor app'
  },
  {
    feature: 'Instant Order Notifications',
    whatsapp: '❌ Easily missed silent chat messages',
    aggregators: '⚠️ App sound only (often muted)',
    hyperdelivery: '✅ Telegram Bot + audio chimes + popups'
  },
  {
    feature: 'Time to Go Live',
    whatsapp: 'Immediate (but zero visibility)',
    aggregators: '❌ Weeks of documentation & inspection',
    hyperdelivery: '✅ Go online in a single day (1–2 hrs)'
  },
  {
    feature: 'Promotions & Custom Offers',
    whatsapp: '❌ Manual text broadcasting',
    aggregators: '❌ Forced discounts & costly ad spend',
    hyperdelivery: '✅ 100% Control: run your own promos & banners'
  },
  {
    feature: 'Customer Retention & Loyalty',
    whatsapp: '❌ No loyalty or retention tools',
    aggregators: '❌ Aggregator owns customer data',
    hyperdelivery: '✅ Custom HyperPoints repeat-order rewards'
  },
  {
    feature: 'Dine-In Table QR Ordering',
    whatsapp: '❌ Not available',
    aggregators: '❌ Separate costly POS subscription',
    hyperdelivery: '✅ Table QR ordering included free'
  }
];

export default function BenefitsPage() {
  const [activeTab, setActiveTab] = useState<'customers' | 'vendors'>('customers');

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 md:py-14 max-w-6xl">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" passHref>
            <Button variant="outline" size="sm" className="rounded-full gap-2 border-primary/20 hover:bg-primary/10">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary shadow-sm">
            <Heart className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
            <span>Cooked with Love by Neighbors You Know</span>
          </div>
        </div>

        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto mb-12">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-headline text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
              Why Our Community Loves{' '}
              <span className="bg-gradient-to-r from-primary via-orange-500 to-amber-500 bg-clip-text text-transparent">
                HyperDelivery
              </span>
            </h1>
            <p className="text-base sm:text-lg font-semibold text-foreground/90 mb-2">
              Real Neighbors. Real Recipes. Fresh Daily Staples.
            </p>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Support the kitchen next door and save on every order. Freshly prepared meals and daily essentials delivered with care right inside our community.
            </p>

            {/* Quick Stat Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted/80 border border-border">
                <Gift className="h-3.5 w-3.5 text-amber-500" />
                Reward Points on Every Order
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted/80 border border-border">
                <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
                Much Cheaper Than Other Aggregators
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted/80 border border-border">
                <Clock className="h-3.5 w-3.5 text-indigo-500" />
                Live In-App Order Tracking
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted/80 border border-border">
                <Layers className="h-3.5 w-3.5 text-rose-500" />
                Multi-Vendor Single Cart
              </span>
            </div>
          </motion.div>
        </section>

        {/* Audience Switcher Tabs */}
        <div className="flex justify-center mb-10">
          <Tabs 
            defaultValue="customers" 
            value={activeTab} 
            onValueChange={(val) => setActiveTab(val as 'customers' | 'vendors')}
            className="w-full max-w-md"
          >
            <TabsList className="grid grid-cols-2 p-1 bg-muted/60 border border-border/80 rounded-full h-12 shadow-sm">
              <TabsTrigger 
                value="customers" 
                className="rounded-full text-sm font-semibold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                <Utensils className="h-4 w-4" />
                For Foodies & Residents
              </TabsTrigger>
              <TabsTrigger 
                value="vendors" 
                className="rounded-full text-sm font-semibold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                <ChefHat className="h-4 w-4" />
                For Home Chefs & Shops
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Benefits Bento / Feature Grid */}
        <AnimatePresence mode="wait">
          {activeTab === 'customers' ? (
            <motion.div
              key="customers-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
            >
              {residentBenefits.map((b, idx) => {
                const IconComponent = b.icon;
                return (
                  <Card 
                    key={idx} 
                    className="relative overflow-hidden bg-card/60 backdrop-blur-md border-border/70 hover:border-primary/40 hover:shadow-lg transition-all duration-300 rounded-2xl flex flex-col justify-between"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                    <CardHeader className="p-6 pb-3">
                      <div className="flex items-center justify-between mb-4">
                        <div className={cn("p-3 rounded-xl border", b.color)}>
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                          {b.badge}
                        </span>
                      </div>
                      <CardTitle className="text-lg font-bold leading-snug">
                        {b.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {b.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="vendors-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
            >
              {vendorBenefits.map((b, idx) => {
                const IconComponent = b.icon;
                return (
                  <Card 
                    key={idx} 
                    className="relative overflow-hidden bg-card/60 backdrop-blur-md border-border/70 hover:border-primary/40 hover:shadow-lg transition-all duration-300 rounded-2xl flex flex-col justify-between"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                    <CardHeader className="p-6 pb-3">
                      <div className="flex items-center justify-between mb-4">
                        <div className={cn("p-3 rounded-xl border", b.color)}>
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                          {b.badge}
                        </span>
                      </div>
                      <CardTitle className="text-lg font-bold leading-snug">
                        {b.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {b.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Interactive App Previews / Bento Spotlight Section */}
        <section className="mb-16">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="font-headline text-2xl sm:text-3xl font-bold tracking-tight">
              See How It Works in Real Life
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              We replaced complicated clunky apps with intuitive, modern tools crafted for township community convenience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Feature Mockup 1: Cheaper Prices vs Big Aggregators */}
            <Card className="rounded-3xl border-primary/20 bg-gradient-to-br from-card/90 to-muted/40 backdrop-blur-md p-6 overflow-hidden relative shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <TrendingDown className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg">Much Cheaper Than Other Aggregators</h3>
                  <p className="text-xs text-muted-foreground">Direct menu prices with no 30% inflation or hidden surges</p>
                </div>
              </div>

              {/* Visual Mock of Real Price Comparison */}
              <div className="bg-background/80 rounded-2xl p-4 border border-border/80 space-y-2.5 shadow-inner">
                <div className="flex items-center justify-between text-xs font-semibold pb-1.5 border-b border-border/60">
                  <span className="text-muted-foreground">TYPICAL 2-MEAL ORDER</span>
                  <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Save ₹145 on Every Order
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                    <p className="font-bold text-muted-foreground">Other Aggregator Apps</p>
                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      <p>Inflated Menu: ₹340</p>
                      <p>Delivery Fee: ₹55</p>
                      <p>Platform Fee: ₹15</p>
                      <p>Surge/Rain: ₹25</p>
                    </div>
                    <p className="font-extrabold text-destructive pt-1 border-t border-border/40 text-sm">₹435</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/30 space-y-1">
                    <p className="font-bold text-primary flex items-center gap-1">
                      HyperDelivery <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    </p>
                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      <p>Direct Chef Menu: ₹260</p>
                      <p>Local Delivery: ₹25</p>
                      <p>Platform Fee: Flat ₹5</p>
                      <p>Surge / Hidden: ₹0</p>
                    </div>
                    <p className="font-extrabold text-emerald-600 dark:text-emerald-400 pt-1 border-t border-emerald-500/20 text-sm">₹290</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                💡 Real money saved on every breakfast, lunch, and dinner.
              </p>
            </Card>

            {/* Feature Mockup 2: Reward Points on Every Order */}
            <Card className="rounded-3xl border-primary/20 bg-gradient-to-br from-card/90 to-muted/40 backdrop-blur-md p-6 overflow-hidden relative shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Gift className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg">Reward Points on Every Order</h3>
                  <p className="text-xs text-muted-foreground">Earn HyperPoints that turn into instant cash discounts</p>
                </div>
              </div>

              {/* Visual Mock of HyperPoints Loyalty */}
              <div className="bg-background/80 rounded-2xl p-4 border border-border/80 space-y-3 shadow-inner">
                <div className="flex items-center justify-between text-xs font-semibold pb-1.5 border-b border-border/60">
                  <span className="text-muted-foreground">LOYALTY REWARDS</span>
                  <span className="text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Automatic on Every Order
                  </span>
                </div>

                <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 p-3 rounded-xl border border-amber-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">Order #HYPER-8492 Completed:</span>
                    <span className="font-extrabold text-amber-600 dark:text-amber-400 text-sm">+35 HP Earned 🎉</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-500/20">
                    <span className="text-muted-foreground">Your HyperPoints Balance:</span>
                    <span className="font-bold text-foreground">140 HP (= ₹35 Instant Discount)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span>✅ Never expires</span>
                  <span className="font-semibold text-foreground">Redeem on any kitchen at checkout</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                💡 The more you order from local neighbors, the more you save.
              </p>
            </Card>

            {/* Feature Mockup 3: In-App Live Order Tracking */}
            <Card className="rounded-3xl border-primary/20 bg-gradient-to-br from-card/90 to-muted/40 backdrop-blur-md p-6 overflow-hidden relative shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg">Live In-App Order Tracking</h3>
                  <p className="text-xs text-muted-foreground">Follow your food from the kitchen stove to your doorstep</p>
                </div>
              </div>

              <div className="bg-background/80 rounded-2xl p-4 border border-border/80 space-y-3 shadow-inner">
                <div className="flex items-center justify-between text-xs font-semibold pb-1.5 border-b border-border/60">
                  <span className="text-muted-foreground">IN-APP LIVE STATUS</span>
                  <span className="text-indigo-500 font-bold flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> Early Doorstep Delivery
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Order Confirmed & Payment Verified</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-primary font-bold">
                    <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <span>Chef is Cooking Your Fresh Meal</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <div className="h-4 w-4 rounded-full border border-muted-foreground/40" />
                    <span>Local Rider Dispatched to Your Doorstep</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Tracked in real time inside the app</span>
                  <span className="font-semibold text-foreground">Zero phone call anxiety</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                💡 Clear stage-by-stage updates so you're always in the loop.
              </p>
            </Card>

            {/* Feature Mockup 4: Multi-Vendor Cart */}
            <Card className="rounded-3xl border-primary/20 bg-gradient-to-br from-card/90 to-muted/40 backdrop-blur-md p-6 overflow-hidden relative shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg">The 1-Cart Multi-Shop Experience</h3>
                  <p className="text-xs text-muted-foreground">Order from multiple kitchens in 1 single checkout</p>
                </div>
              </div>

              {/* Visual Mock of Multi-Vendor Cart */}
              <div className="bg-background/80 rounded-2xl p-4 border border-border/80 space-y-3 shadow-inner">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="text-xs font-semibold text-muted-foreground">YOUR CART (2 KITCHENS)</span>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">1 Single Checkout</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <span className="font-medium">Shree Krishna Kitchen:</span>
                    <span className="text-muted-foreground">Special Dum Biryani</span>
                  </div>
                  <span className="font-bold">₹180</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="font-medium">Sweet Crust Bakes:</span>
                    <span className="text-muted-foreground">Belgian Chocolate Brownie</span>
                  </div>
                  <span className="font-bold">₹90</span>
                </div>

                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-semibold">
                  <span>Items Subtotal</span>
                  <span className="text-primary text-sm font-extrabold">₹270</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                💡 Single checkout convenience with transparent, per-vendor delivery settings.
              </p>
            </Card>
          </div>
        </section>

        {/* Comparison Table Section */}
        <section className="mb-16">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="font-headline text-2xl sm:text-3xl font-bold tracking-tight">
              HyperDelivery vs The Old Way{' '}
              <span className="text-primary">
                {activeTab === 'customers' ? '(For Foodies & Residents)' : '(For Home Chefs & Vendors)'}
              </span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              {activeTab === 'customers'
                ? 'Why settle for chaotic WhatsApp chats or expensive commercial aggregator apps?'
                : 'See why local kitchen creators choose HyperDelivery over high-commission aggregators and WhatsApp chaos.'}
            </p>
          </div>

          <Card className="rounded-3xl border-border/80 overflow-hidden shadow-sm bg-card/60 backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/60">
                    <th className="p-4 sm:p-5 font-bold text-foreground">
                      {activeTab === 'customers' ? 'Feature' : 'Business Capability'}
                    </th>
                    <th className="p-4 sm:p-5 font-semibold text-muted-foreground">
                      {activeTab === 'customers' ? 'WhatsApp Orders' : 'Selling on WhatsApp'}
                    </th>
                    <th className="p-4 sm:p-5 font-semibold text-muted-foreground">Big Aggregator Apps</th>
                    <th className="p-4 sm:p-5 font-bold text-primary bg-primary/10">
                      {activeTab === 'customers' ? 'HyperDelivery' : 'HyperDelivery Partner'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(activeTab === 'customers' ? customerComparisonPoints : vendorComparisonPoints).map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 sm:p-5 font-medium text-foreground">{row.feature}</td>
                      <td className="p-4 sm:p-5 text-muted-foreground text-xs sm:text-sm">{row.whatsapp}</td>
                      <td className="p-4 sm:p-5 text-muted-foreground text-xs sm:text-sm">{row.aggregators}</td>
                      <td className="p-4 sm:p-5 font-semibold text-primary bg-primary/5 text-xs sm:text-sm">
                        {row.hyperdelivery}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        {/* Community Trust Section */}
        <section className="mb-16 bg-gradient-to-r from-primary/10 via-amber-500/10 to-rose-500/10 rounded-3xl p-6 sm:p-10 border border-primary/20 text-center">
          <div className="max-w-2xl mx-auto">
            <Heart className="h-10 w-10 text-primary mx-auto mb-4 animate-pulse" />
            <h2 className="font-headline text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">
              Keeping Value Inside Our Township
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6">
              When you order through HyperDelivery, your money goes directly to your neighbor who cooked with love, and to local riders who deliver with care. No corporate siphon, no unfair commissions.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-semibold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Zero Hidden Fees</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Verified Township Kitchens</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Safe Direct UPI Payments</span>
              </div>
            </div>
          </div>
        </section>

        {/* Dual Conversion CTA Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CTA for Customers */}
          <Card className="rounded-3xl border-primary/20 p-6 sm:p-8 bg-card/80 backdrop-blur-md flex flex-col justify-between hover:shadow-lg transition-all">
            <div>
              <div className="p-3 rounded-2xl bg-primary/10 text-primary w-fit mb-4">
                <Utensils className="h-6 w-6" />
              </div>
              <h3 className="font-headline text-2xl font-bold mb-2">Ready to Taste Something Homemade?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Explore menus from passionate home chefs, bakeries, and food creators living right in our community.
              </p>
            </div>
            <Link href="/" passHref>
              <Button size="lg" className="w-full rounded-full gap-2 font-bold shadow-md">
                Browse Today's Menu
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>

          {/* CTA for Vendors & Chefs */}
          <Card className="rounded-3xl border-primary/20 p-6 sm:p-8 bg-card/80 backdrop-blur-md flex flex-col justify-between hover:shadow-lg transition-all">
            <div>
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 w-fit mb-4">
                <ChefHat className="h-6 w-6" />
              </div>
              <h3 className="font-headline text-2xl font-bold mb-2">Have a Signature Recipe or Shop?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Go online in a single day. Get an industry-standard vendor app, business growth dashboards, Telegram order alerts, and dedicated partner support.
              </p>
            </div>
            <Link href="/partner" passHref>
              <Button size="lg" variant="outline" className="w-full rounded-full gap-2 font-bold border-primary/30 hover:bg-primary/10 shadow-sm">
                Register as a Home Chef or Vendor
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>
        </section>
      </main>
    </div>
  );
}
