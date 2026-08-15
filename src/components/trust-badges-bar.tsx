'use client';

import React from 'react';
import { ShieldCheck, Zap, HeartHandshake, CreditCard } from 'lucide-react';

const TRUST_PILLARS = [
  {
    icon: ShieldCheck,
    title: '100% Verified Kitchens',
    desc: 'FSSAI compliant & quality checked',
  },
  {
    icon: Zap,
    title: 'Express Delivery',
    desc: 'Hot & fresh from local kitchens',
  },
  {
    icon: HeartHandshake,
    title: 'Support Local Chefs',
    desc: '100% goes to local entrepreneurs',
  },
  {
    icon: CreditCard,
    title: 'Instant & Secure Pay',
    desc: 'Zero payment failure via UPI',
  },
];

export default function TrustBadgesBar() {
  return (
    <section className="py-6 my-2">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {TRUST_PILLARS.map((pillar, i) => {
          const Icon = pillar.icon;
          return (
            <div
              key={i}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-muted/40 border border-border/40 hover:border-primary/20 hover:bg-card transition-all duration-300 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs sm:text-sm text-foreground truncate">
                  {pillar.title}
                </h4>
                <p className="text-[11px] text-muted-foreground truncate">
                  {pillar.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
