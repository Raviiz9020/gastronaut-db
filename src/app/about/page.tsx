'use client';

import React from 'react';
import Header from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Heart,
  ChefHat,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Truck,
  MapPin,
  Utensils,
  Store,
  Users,
  TrendingDown,
  Layers,
  ShoppingBag,
  Building2,
  Flame,
  Award
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Core Pillars Data
const corePillars = [
  {
    icon: ChefHat,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    tag: 'Empowering Talent',
    title: 'Supporting Home Chefs & Artisans',
    description:
      'Passionate homemakers, local bakeries, and butcher stalls in Life Republic don’t need high marketing budgets or storefronts. We give them a professional digital platform to share their culinary craft.'
  },
  {
    icon: Truck,
    color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
    tag: 'Tower Fleet',
    title: 'Dedicated Township Doorstep Fleet',
    description:
      'City delivery riders frequently get lost or held at township security gates. Our dedicated delivery partners live right here — ensuring prompt tower-level pickup and delivery straight to your door.'
  },
  {
    icon: TrendingDown,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    tag: 'Honest Pricing',
    title: 'Radical Price Fairness & Flat ₹5 Fee',
    description:
      'No 30%–40% menu price inflations, no surge charges, and zero predatory commissions. You pay direct kitchen rates with a transparent, flat ₹5 platform fee.'
  },
  {
    icon: Heart,
    color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    tag: 'Community Wealth',
    title: 'Keeping Value Inside Our Community',
    description:
      'Every order directly enriches a fellow resident or local vendor. We are building a self-sustaining neighborhood economy where neighbors support neighbors.'
  }
];

// Step Journey Data
const journeySteps = [
  {
    step: '01',
    icon: Utensils,
    title: 'Cooked with Love',
    badge: 'Fresh Daily',
    description:
      'Neighbors and local shops prepare authentic regional recipes, fresh daily bakes, and essentials using clean, homemade care.'
  },
  {
    step: '02',
    icon: Layers,
    title: '1-Cart Convenience',
    badge: 'Multi-Vendor',
    description:
      'Combine dishes from a favorite home chef, bakery, and dairy in a single order with unified checkout and zero hassle.'
  },
  {
    step: '03',
    icon: Truck,
    title: 'Delivered to Your Tower',
    badge: 'Zero Gate Delay',
    description:
      'Our local riders know every sector and tower cluster, bringing hot meals and groceries straight to your flat on time.'
  }
];

// Township Quick Highlights
const townshipHighlights = [
  {
    icon: MapPin,
    label: 'Built for our Community',
    detail: 'Serving all sectors & clusters'
  },
  {
    icon: TrendingDown,
    label: 'Direct Kitchen Rates',
    detail: 'Save 25–40% vs aggregators'
  },
  {
    icon: Users,
    label: 'Neighbor-to-Neighbor',
    detail: 'True community micro-economy'
  },
  {
    icon: ShieldCheck,
    label: 'Transparent & Safe',
    detail: 'Direct UPI & Live tracking'
  }
];

export default function AboutUsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-28 md:pb-16">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-6 sm:py-10 md:py-14 max-w-5xl">
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
            <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0 animate-pulse" />
            <span>Proudly Born in Life Republic, Pune</span>
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
              Connecting Neighbors Through{' '}
              <span className="bg-gradient-to-r from-primary via-orange-500 to-amber-500 bg-clip-text text-transparent">
                Good Food & Care
              </span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg font-medium text-foreground/90 max-w-2xl mx-auto mb-3">
              HyperDelivery is our township’s hyperlocal platform — uniting passionate home cooks, local shops, and neighbors living just a few buildings away.
            </p>

            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
              We believe the finest meals aren’t from far-away commercial cloud kitchens. They’re crafted by your neighbors with authentic recipes and homemade love.
            </p>

            {/* Quick Stat Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted/80 border border-border">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                100% Township Focused
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted/80 border border-border">
                <ChefHat className="h-3.5 w-3.5 text-amber-500" />
                Empowering Home Chefs
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted/80 border border-border">
                <Truck className="h-3.5 w-3.5 text-cyan-500" />
                Tower Doorstep Delivery
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted/80 border border-border">
                <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
                Direct Kitchen Pricing
              </span>
            </div>
          </motion.div>
        </section>

        {/* Our Story / Why We Started */}
        <section className="mb-12 sm:mb-16">
          <Card className="rounded-3xl border-primary/20 bg-gradient-to-br from-card/95 via-card/80 to-muted/30 backdrop-blur-md p-5 sm:p-8 md:p-10 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Flame className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  The HyperDelivery Story
                </span>
              </div>

              <h2 className="font-headline text-2xl sm:text-3xl font-extrabold tracking-tight mb-4">
                The Best Food is Just a Few Towers Away
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground leading-relaxed">
                <div className="space-y-3">
                  <p>
                    Living in a vibrant, sprawling township like <strong className="text-foreground">Life Republic</strong>, we noticed a common frustration: big delivery apps charge 25%–40% inflated prices, levy excessive platform fees, and their riders frequently get delayed or stranded at security gates.
                  </p>
                  <p>
                    Meanwhile, talented home cooks, bakers, and local food vendors were creating culinary magic inside our own society — with delicious regional thalis, healthy tiffins, authentic biryanis, and fresh bakes. Yet, they had no easy digital avenue to reach their immediate neighbors.
                  </p>
                </div>
                <div className="space-y-3">
                  <p>
                    <strong className="text-foreground">HyperDelivery was born to bridge this gap.</strong> We set out to give every passionate cook, butcher shop, and baker in Life Republic a zero-hassle digital counter, complete with automated notifications, real-time tracking, and doorstep fulfillment.
                  </p>
                  <p>
                    Today, HyperDelivery connects neighbors across towers. You enjoy honest homemade food delivered directly to your door, while every order strengthens our township’s culinary ecosystem.
                  </p>
                </div>
              </div>

              {/* Township Highlight Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-border/60">
                {townshipHighlights.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="flex flex-col gap-1 p-3 rounded-2xl bg-background/60 border border-border/60">
                      <div className="flex items-center gap-2 text-foreground font-semibold text-xs sm:text-sm">
                        <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">{item.detail}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </section>

        {/* 4 Core Pillars Bento Grid */}
        <section className="mb-12 sm:mb-16">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
            <h2 className="font-headline text-2xl sm:text-3xl font-extrabold tracking-tight">
              Our Core Principles
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Everything we build is rooted in neighborhood trust, convenience, and mutual support.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {corePillars.map((pillar, idx) => {
              const IconComponent = pillar.icon;
              return (
                <Card
                  key={idx}
                  className="relative overflow-hidden bg-card/60 backdrop-blur-md border-border/70 hover:border-primary/40 hover:shadow-lg transition-all duration-300 rounded-2xl flex flex-col justify-between p-5 sm:p-6"
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={cn('p-3 rounded-xl border', pillar.color)}>
                        <IconComponent className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                        {pillar.tag}
                      </span>
                    </div>

                    <CardTitle className="text-base sm:text-lg font-bold leading-snug mb-2">
                      {pillar.title}
                    </CardTitle>

                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* How It Connects Us / 3-Step Journey */}
        <section className="mb-12 sm:mb-16">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="font-headline text-2xl sm:text-3xl font-extrabold tracking-tight">
              How Community Delivery Works
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Simple, transparent, and completely self-sustained within our society.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {journeySteps.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <div
                  key={idx}
                  className="p-5 sm:p-6 rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 hover:border-primary/30 transition-all flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-extrabold px-2.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                      STEP {step.step}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                      {step.badge}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/60 w-fit mb-3 text-foreground">
                    <StepIcon className="h-5 w-5 text-primary" />
                  </div>

                  <h3 className="font-bold text-base sm:text-lg mb-1.5">{step.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Community Trust & Quality Banner */}
        <section className="mb-12 sm:mb-16 bg-gradient-to-r from-primary/10 via-amber-500/10 to-rose-500/10 rounded-3xl p-6 sm:p-10 border border-primary/20 text-center relative overflow-hidden">
          <div className="max-w-2xl mx-auto relative z-10">
            <Heart className="h-9 w-9 text-rose-500 mx-auto mb-3 animate-pulse" />
            <h2 className="font-headline text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
              Our Community Promise
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed mb-6">
              When you order on HyperDelivery, you are not just getting food delivered. You are encouraging a neighbor’s passion, enjoying honest hygiene, and keeping township value alive.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm font-semibold">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>Verified Home Kitchens</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>Zero Hidden Fees</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>Tower Doorstep Delivery</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span>Direct UPI Payments</span>
              </div>
            </div>
          </div>
        </section>

        {/* Dual Conversion CTA Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* CTA for Customers / Foodies */}
          <Card className="rounded-3xl border-primary/20 p-5 sm:p-8 bg-card/80 backdrop-blur-md flex flex-col justify-between hover:shadow-lg transition-all">
            <div>
              <div className="p-3 rounded-2xl bg-primary/10 text-primary w-fit mb-4">
                <Utensils className="h-6 w-6" />
              </div>
              <h3 className="font-headline text-xl sm:text-2xl font-bold mb-2">
                Hungry for Something Homemade?
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-6 leading-relaxed">
                Explore delicious daily dishes, fresh bakery specials, and regional delicacies prepared by neighbors right here in Life Republic.
              </p>
            </div>
            <Link href="/" passHref className="w-full">
              <Button size="lg" className="w-full rounded-full gap-2 font-bold shadow-md h-11 sm:h-12 text-sm sm:text-base">
                Browse Today's Menu
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>

          {/* CTA for Chefs / Shop Owners */}
          <Card className="rounded-3xl border-primary/20 p-5 sm:p-8 bg-card/80 backdrop-blur-md flex flex-col justify-between hover:shadow-lg transition-all">
            <div>
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 w-fit mb-4">
                <ChefHat className="h-6 w-6" />
              </div>
              <h3 className="font-headline text-xl sm:text-2xl font-bold mb-2">
                Cook or Run a Shop in Life Republic?
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-6 leading-relaxed">
                Go online in a single day. Get your dedicated vendor app, live Telegram notifications, sales dashboards, and local doorstep delivery support.
              </p>
            </div>
            <Link href="/partner" passHref className="w-full">
              <Button
                size="lg"
                variant="outline"
                className="w-full rounded-full gap-2 font-bold border-primary/30 hover:bg-primary/10 shadow-xs h-11 sm:h-12 text-sm sm:text-base"
              >
                Register as a Food Partner
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Card>
        </section>
      </main>
    </div>
  );
}
