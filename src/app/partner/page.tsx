'use client';

import React from 'react';
import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Store, 
  Sparkles, 
  Clock, 
  Bell, 
  Send, 
  Zap, 
  ShieldCheck, 
  TrendingUp, 
  Gift, 
  Truck, 
  Layers, 
  Bot, 
  ReceiptText, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  HelpCircle, 
  Phone, 
  Mail, 
  MessageCircle,
  ChefHat,
  Utensils,
  Milk,
  Beef,
  ShoppingBag,
  BadgeCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const valuePillars = [
  {
    icon: Clock,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    title: '⚡ Same-Day Go-Live (1–2 Hr Approval)',
    description: 'No waiting for days. Sign in with Google on our vendor portal, submit your shop details, and your storefront goes live within 1 to 2 hours!'
  },
  {
    icon: Bell,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    title: '🔔 Multi-Channel Order Alerts',
    description: 'Never miss an order. Receive real-time Telegram Bot alerts, loud sound chimes on your vendor app, and full-screen incoming order popups.'
  },
  {
    icon: TrendingUp,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    title: '🎯 Run Your Own Ads & Offers',
    description: 'Full marketing control in your hands. Create custom discount banners, multi-offer splash deals, and combo promotions directly from your dashboard.'
  },
  {
    icon: Gift,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    title: '🎁 Custom Loyalty & Reward Points',
    description: 'Configure your own repeat-customer reward rules (e.g. Spend ₹200, Earn 20 Points) to build a loyal neighborhood customer base.'
  },
  {
    icon: Truck,
    color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
    title: '🛵 Dedicated Local Rider Fleet',
    description: 'Focus 100% on your food and products. Our trained neighborhood delivery riders handle doorstep pickup and fast customer delivery.'
  },
  {
    icon: Layers,
    color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    title: '🛒 Multi-Vendor Cart Advantage',
    description: 'Cross-shop discoverability! Customers ordering dinner from a nearby restaurant can add dessert, drinks, or items from your shop in one cart.'
  },
  {
    icon: Bot,
    color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    title: '✨ AI-Powered Menu Creator',
    description: 'Upload raw dish photos from your smartphone and generate professional, studio-grade promotional visuals with our built-in AI image creator.'
  },
  {
    icon: ReceiptText,
    color: 'text-teal-500 bg-teal-500/10 border-teal-500/20',
    title: '📊 Automated Payout Statements',
    description: 'Transparent, dispute-free settlements. Digital itemized order breakdowns with exact HYPER-XXXX IDs sent straight to your email every settlement.'
  }
];

const businessCategories = [
  {
    icon: ChefHat,
    title: 'Restaurants & Cafes',
    subtitle: 'Dine-in, takeaway, and delivery with live order dispatch.'
  },
  {
    icon: Utensils,
    title: 'Home Chefs & Cloud Kitchens',
    subtitle: 'Zero shop rent needed. Turn your culinary passion into daily income.'
  },
  {
    icon: Milk,
    title: 'Dairy & Bakeries',
    subtitle: 'Fresh milk, paneer, cakes, and breakfast bakes delivered daily.'
  },
  {
    icon: Beef,
    title: 'Fresh Meat & Poultry',
    subtitle: 'Hygienic cold-chain local delivery straight to neighborhood homes.'
  },
  {
    icon: ShoppingBag,
    title: 'Groceries & Daily Essentials',
    subtitle: 'Packaged foods, spices, snacks, and daily household needs.'
  }
];

const faqs = [
  {
    q: 'How fast can my shop go live on Hyper Delivery?',
    a: 'You can register in 2 minutes using your Google account on our vendor portal. Once you submit your basic shop details, our team reviews and approves your storefront within 1 to 2 hours on the same day!'
  },
  {
    q: 'How do I receive incoming order notifications?',
    a: 'You get instant alerts across multiple channels: 1) Real-time Telegram Bot messages, 2) Loud sound notifications on the Vendor App, and 3) Full-screen popup alerts with complete item and customer details.'
  },
  {
    q: 'Can I run my own discounts, banners, and reward points?',
    a: 'Yes! Unlike other rigid platforms, Hyper Delivery gives you full marketing freedom. You can create custom advertisement banners, launch percentage/flat discount offers, and configure your own customer loyalty reward points.'
  },
  {
    q: 'Do I need to hire my own delivery boys?',
    a: 'No. Hyper Delivery operates a dedicated fleet of local riders who pick up orders from your counter and deliver them hot & fresh to customers in your locality.'
  },
  {
    q: 'Can Home Chefs and Cloud Kitchens join?',
    a: 'Absolutely! Home chefs and cloud kitchens are a core pillar of Hyper Delivery. You do not need a commercial storefront to start selling to thousands of nearby residents.'
  },
  {
    q: 'How do payouts and commission settlements work?',
    a: 'Settlements are transferred directly to your registered UPI ID or Bank Account. Upon every settlement confirmation, an official itemized statement listing every HYPER order ID, subtotal, commission, and net payout is automatically emailed to you for clear bookkeeping.'
  }
];

export default function PartnerBusinessPage() {
  const whatsappUrl = `https://wa.me/917083609020?text=${encodeURIComponent('Hi Hyper Delivery Team, I would like to partner and list my business on Hyper Delivery.')}`;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />

      <main className="flex-1">
        {/* Back Button Container */}
        <div className="container mx-auto px-4 pt-6">
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
        </div>

        {/* ── HERO SECTION ──────────────────────────────────────────────── */}
        <section className="py-10 md:py-16 overflow-hidden relative">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-bold uppercase tracking-wider shadow-sm"
              >
                <Store className="h-4 w-4" />
                Hyper Delivery Partner Program
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-foreground leading-tight"
              >
                Grow Your Food & Retail Business <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-primary bg-clip-text text-transparent">
                  With Hyper Delivery
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
              >
                Get discovered by thousands of nearby residents. Receive instant orders with Telegram and loud sound alerts, create your own custom offers, and let our dedicated local rider fleet handle the deliveries.
              </motion.p>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
              >
                <Link href="/admin/login" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto rounded-2xl gap-2 font-bold px-8 h-12 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
                    <Zap className="h-5 w-5" />
                    Register with Google (Portal)
                  </Button>
                </Link>

                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-2xl gap-2 font-bold px-8 h-12 border-primary/30 hover:bg-primary/10">
                    <MessageCircle className="h-5 w-5 text-emerald-500" />
                    Chat with Onboarding Team
                  </Button>
                </a>
              </motion.div>

              {/* Quick Trust Highlights */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-4 text-xs font-semibold text-muted-foreground"
              >
                <span className="flex items-center gap-1.5">
                  <BadgeCheck className="h-4 w-4 text-emerald-500" />
                  1–2 Hour Fast Approval
                </span>
                <span className="flex items-center gap-1.5">
                  <BadgeCheck className="h-4 w-4 text-blue-500" />
                  Dedicated Rider Fleet
                </span>
                <span className="flex items-center gap-1.5">
                  <BadgeCheck className="h-4 w-4 text-purple-500" />
                  Transparent Email Settlements
                </span>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── 8 CORE VALUE PILLARS ─────────────────────────────────────── */}
        <section className="py-12 bg-muted/30 border-y border-border/60">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Why Partner With Hyper Delivery?</h2>
              <p className="text-sm text-muted-foreground">
                Everything you need to sell, retain customers, and scale online in your township.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {valuePillars.map((pillar, idx) => {
                const Icon = pillar.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: idx * 0.05 }}
                    className="p-5 rounded-2xl bg-card border border-border/80 hover:border-primary/40 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 border ${pillar.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-bold text-base text-foreground mb-2">{pillar.title}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {pillar.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── CATEGORIES WE SUPPORT ────────────────────────────────────── */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                Multi-Category Support
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Businesses We Welcome</h2>
              <p className="text-sm text-muted-foreground">
                From home kitchens to local supermarkets — if you provide quality to the community, you belong here.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {businessCategories.map((cat, idx) => {
                const Icon = cat.icon;
                return (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-card border border-border/70 text-center hover:border-primary/30 transition-all flex flex-col items-center"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-sm text-foreground mb-1">{cat.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{cat.subtitle}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS (3 FAST STEPS) ──────────────────────────────── */}
        <section className="py-12 md:py-16 bg-muted/40 border-t border-border/60">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">How to Get Started (3 Simple Steps)</h2>
              <p className="text-sm text-muted-foreground">
                Fast onboarding designed for busy shop owners and passionate chefs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="p-6 rounded-2xl bg-card border border-border shadow-sm relative">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-black text-sm flex items-center justify-center mb-4">
                  1
                </div>
                <h3 className="font-bold text-base mb-2">1-Click Portal Sign In</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Sign in using your Google account and submit your basic shop name, contact number, and menu items in just 2 minutes.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-card border border-border shadow-sm relative">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-black text-sm flex items-center justify-center mb-4">
                  2
                </div>
                <h3 className="font-bold text-base mb-2">1–2 Hour Fast Approval</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Our local onboarding team reviews your details, sets up your digital store profile, and activates your merchant account.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-card border border-border shadow-sm relative">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-black text-sm flex items-center justify-center mb-4">
                  3
                </div>
                <h3 className="font-bold text-base mb-2">Go Live & Start Earning!</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Receive orders with instant Telegram alerts and loud sound chimes. Our riders pick up and deliver directly to your customers.
                </p>
              </div>
            </div>

            <div className="text-center mt-10">
              <Link href="/admin/login">
                <Button size="lg" className="rounded-2xl gap-2 font-bold px-8 h-12 bg-primary hover:bg-primary/90">
                  <Zap className="h-5 w-5" />
                  Get Your Business Online Now
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── FAQ SECTION ─────────────────────────────────────────────── */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-center mb-10 space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Frequently Asked Questions</h2>
              <p className="text-sm text-muted-foreground">
                Everything you need to know about partnering with Hyper Delivery.
              </p>
            </div>

            <Accordion type="single" collapsible className="w-full space-y-3">
              {faqs.map((faq, idx) => (
                <AccordionItem
                  key={idx}
                  value={`faq-${idx}`}
                  className="border border-border/80 rounded-2xl px-4 bg-card shadow-sm"
                >
                  <AccordionTrigger className="text-sm sm:text-base font-semibold hover:no-underline text-left py-4">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ── CONTACT & SUPPORT CTA ────────────────────────────────────── */}
        <section className="py-12 bg-gradient-to-r from-[#0b132b] via-[#141e3a] to-[#0b132b] text-white">
          <div className="container mx-auto px-4 text-center max-w-2xl space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Ready to Expand Your Local Reach?</h2>
            <p className="text-sm text-blue-200/80 leading-relaxed">
              Join dozens of satisfied local food entrepreneurs, home chefs, and shops growing their revenue on Hyper Delivery.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href="/admin/login" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto rounded-2xl gap-2 font-bold px-8 h-12 bg-blue-600 hover:bg-blue-500 text-white">
                  <Store className="h-5 w-5" />
                  Sign In with Google
                </Button>
              </Link>

              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-2xl gap-2 font-bold px-8 h-12 bg-white/10 hover:bg-white/20 text-white border-white/20">
                  <MessageCircle className="h-5 w-5 text-emerald-400" />
                  WhatsApp +917083609020
                </Button>
              </a>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-blue-200/60">
              <span>📧 hyperlabsupport@gmail.com</span>
              <span>📱 +917083609020</span>
              <span>📍 Pune / Marunji / Life Republic Area</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
