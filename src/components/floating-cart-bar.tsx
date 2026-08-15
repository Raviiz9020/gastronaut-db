'use client';

import React, { useState } from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { motion, AnimatePresence } from 'framer-motion';
import CartSheet from './cart-sheet';
import { cn } from '@/lib/utils';

export default function FloatingCartBar({ className }: { className?: string }) {
  const { totalItems, totalPrice, vendorCarts, cartItems } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  if (totalItems === 0 || cartItems.length === 0) {
    return null;
  }

  const vendorNames = vendorCarts
    .map((vc) => vc.vendor.shopName || vc.vendor.name)
    .filter(Boolean)
    .join(', ');

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className={cn(
            'fixed bottom-5 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50',
            className
          )}
        >
          <div
            onClick={() => setIsCartOpen(true)}
            className="cursor-pointer group flex items-center justify-between rounded-2xl bg-zinc-900/95 dark:bg-zinc-900/95 text-white p-3.5 shadow-2xl border border-zinc-700/60 backdrop-blur-xl hover:border-primary/50 hover:shadow-primary/20 transition-all duration-300"
          >
            {/* Left: Item Count & Total Price */}
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md shrink-0 group-hover:scale-105 transition-transform">
                <ShoppingBag className="h-5 w-5" />
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-zinc-900">
                  {totalItems}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm text-white">
                  ₹{totalPrice.toFixed(2)}
                </span>
                <span className="text-[11px] text-zinc-400 truncate max-w-[150px] sm:max-w-[180px]">
                  {vendorNames || 'Selected items'}
                </span>
              </div>
            </div>

            {/* Right: View Cart Action */}
            <div className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-colors">
              <span>View Cart</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />
    </>
  );
}
