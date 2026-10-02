'use client';

import React from 'react';
import Header from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Phone,
  Mail,
  MessageCircle,
  ArrowLeft,
  ArrowRight,
  Headphones,
  ChefHat,
  Code,
  MapPin,
  Clock,
  Sparkles,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function ContactUsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-28 md:pb-16">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-6 sm:py-10 md:py-14 max-w-5xl">
        {/* Navigation / Top Bar */}
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
            <Headphones className="h-3.5 w-3.5 text-primary flex-shrink-0 animate-pulse" />
            <span>Dedicated Support & Assistance</span>
          </div>
        </div>

        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              Get in Touch with{' '}
              <span className="bg-gradient-to-r from-primary via-orange-500 to-amber-500 bg-clip-text text-transparent">
                HyperDelivery
              </span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg font-medium text-foreground/90 max-w-2xl mx-auto mb-3">
              We’d love to hear from you. Whether you’re a resident needing order help, a chef ready to partner, or an entrepreneur exploring our platform.
            </p>

            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Fast, friendly neighborhood support built right into Life Republic township.
            </p>

            {/* Quick Channel Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted/80 border border-border">
                <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
                WhatsApp Quick Support
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted/80 border border-border">
                <HelpCircle className="h-3.5 w-3.5 text-primary" />
                In-App Help Center
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted/80 border border-border">
                <ChefHat className="h-3.5 w-3.5 text-amber-500" />
                Partner Onboarding
              </span>
            </div>
          </motion.div>
        </section>

        {/* Contact Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-16">
          {/* Card 1: For Customers */}
          <Card className="rounded-3xl border-border/80 bg-card/60 backdrop-blur-md hover:border-primary/40 hover:shadow-lg transition-all duration-300 flex flex-col justify-between p-5 sm:p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <Headphones className="h-6 w-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                  For Foodies & Residents
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold mb-2">Customer Support</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mb-6 leading-relaxed">
                Have questions regarding your active order, delivery timeline, or payment status? Our community team is standing by.
              </p>

              <div className="space-y-3 mb-6">
                <a
                  href="https://wa.me/917083609020"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-background/60 border border-border/60 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">WhatsApp Chat</p>
                    <p className="text-[11px] text-muted-foreground truncate">+91 70836 09020</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-emerald-500 transition-colors flex-shrink-0" />
                </a>

                <a
                  href="mailto:hyperlabsupport@gmail.com"
                  className="flex items-center gap-3 p-3 rounded-xl bg-background/60 border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                >
                  <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">Email Support</p>
                    <p className="text-[11px] text-muted-foreground truncate">hyperlabsupport@gmail.com</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </a>
              </div>
            </div>

            <Link href="/support" passHref className="w-full">
              <Button className="w-full rounded-full gap-2 font-semibold text-xs sm:text-sm h-10 sm:h-11 shadow-xs">
                Visit Help Center
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>

          {/* Card 2: For Vendors & Home Chefs */}
          <Card className="rounded-3xl border-border/80 bg-card/60 backdrop-blur-md hover:border-primary/40 hover:shadow-lg transition-all duration-300 flex flex-col justify-between p-5 sm:p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <ChefHat className="h-6 w-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                  Partners & Kitchens
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold mb-2">Vendors & Chefs</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mb-6 leading-relaxed">
                Ready to take your kitchen, bakery, or local food shop online in Life Republic? Join our growing partner community.
              </p>

              <div className="space-y-3 mb-6">
                <a
                  href="tel:+917083609020"
                  className="flex items-center gap-3 p-3 rounded-xl bg-background/60 border border-border/60 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all group"
                >
                  <Phone className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">Direct Partner Hotline</p>
                    <p className="text-[11px] text-muted-foreground truncate">+91 70836 09020</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-amber-500 transition-colors flex-shrink-0" />
                </a>

                <Link
                  href="/admin/login"
                  className="flex items-center gap-3 p-3 rounded-xl bg-background/60 border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                >
                  <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">Vendor Portal Login</p>
                    <p className="text-[11px] text-muted-foreground truncate">hyperdelivery.in/admin/login</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </Link>
              </div>
            </div>

            <Link href="/partner" passHref className="w-full">
              <Button
                variant="outline"
                className="w-full rounded-full gap-2 font-semibold text-xs sm:text-sm h-10 sm:h-11 border-primary/30 hover:bg-primary/10 shadow-xs"
              >
                Register as a Partner
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>

          {/* Card 3: For Entrepreneurs & Tech */}
          <Card className="rounded-3xl border-border/80 bg-card/60 backdrop-blur-md hover:border-primary/40 hover:shadow-lg transition-all duration-300 flex flex-col justify-between p-5 sm:p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-28 h-28 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                  <Code className="h-6 w-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                  Tech & Inquiries
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold mb-2">Platform Inquiries</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mb-6 leading-relaxed">
                Thinking of launching a hyperlocal delivery ecosystem for your township or building similar tech platforms? Let's connect.
              </p>

              <div className="space-y-3 mb-6">
                <a
                  href="mailto:hyperlabsupport@gmail.com"
                  className="flex items-center gap-3 p-3 rounded-xl bg-background/60 border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                >
                  <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">Technical & Business</p>
                    <p className="text-[11px] text-muted-foreground truncate">hyperlabsupport@gmail.com</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </a>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-background/40 border border-border/40">
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">Response Window</p>
                    <p className="text-[11px] text-muted-foreground">Within 1–2 business hours</p>
                  </div>
                </div>
              </div>
            </div>

            <a href="mailto:hyperlabsupport@gmail.com" className="w-full">
              <Button
                variant="outline"
                className="w-full rounded-full gap-2 font-semibold text-xs sm:text-sm h-10 sm:h-11 border-border hover:bg-muted shadow-xs"
              >
                Send Us an Email
                <Mail className="h-4 w-4" />
              </Button>
            </a>
          </Card>
        </div>

        {/* Location & Township Presence Banner */}
        <section className="bg-gradient-to-r from-primary/10 via-amber-500/10 to-rose-500/10 rounded-3xl p-6 sm:p-8 border border-primary/20 text-center relative overflow-hidden">
          <div className="max-w-xl mx-auto">
            <div className="p-2.5 rounded-2xl bg-background/80 border border-border/60 text-primary w-fit mx-auto mb-3 shadow-xs">
              <MapPin className="h-5 w-5" />
            </div>
            <h3 className="font-headline text-lg sm:text-xl font-bold mb-1.5">
              HyperDelivery Headquarters
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">
              Proudly rooted in <strong className="text-foreground">Life Republic Township</strong>, Marunji / Hinjawadi, Pune, Maharashtra 411057.
            </p>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-background/80 border border-border/60 text-xs font-medium text-muted-foreground shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Neighbor-to-Neighbor Delivery Across All Sectors & Clusters</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
