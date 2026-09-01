'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { motion, AnimatePresence } from 'framer-motion';
import CartSheet from './cart-sheet';
import { cn } from '@/lib/utils';

export default function FloatingCartBar({ className }: { className?: string }) {
  const { totalItems, totalPrice, vendorCarts, cartItems } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Extract up to 3 distinct dish images from cart items (most recently added item first)
  const dishThumbnails = useMemo(() => {
    const seen = new Set<string>();
    const thumbnails: { id: string; name: string; image: string }[] = [];

    // Traverse backwards so the last added item appears first (on the left, top of the stack)
    for (let i = cartItems.length - 1; i >= 0; i--) {
      const item = cartItems[i];
      const imgUrl = item.imageDataUrl || item.image;
      if (imgUrl && !seen.has(imgUrl) && !imgUrl.includes('placehold.co')) {
        seen.add(imgUrl);
        thumbnails.push({ id: item.id, name: item.name, image: imgUrl });
      }
      if (thumbnails.length >= 3) break;
    }
    return thumbnails;
  }, [cartItems]);

  if (totalItems === 0 || cartItems.length === 0) {
    return null;
  }

  const primaryVendorName = vendorCarts[0]?.vendor?.shopName || vendorCarts[0]?.vendor?.name;
  const otherVendorsCount = vendorCarts.length - 1;
  const vendorLabel = otherVendorsCount > 0 
    ? `${primaryVendorName} +${otherVendorsCount}` 
    : primaryVendorName;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={cn(
            'fixed bottom-20 left-3 right-3 sm:bottom-20 sm:left-6 sm:right-6 lg:bottom-6 lg:left-auto lg:right-6 lg:w-[420px] z-40',
            className
          )}
        >
          <div
            onClick={() => setIsCartOpen(true)}
            className="cursor-pointer group flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#0b132b]/85 via-[#141e3a]/80 to-[#0b132b]/85 text-white p-3 sm:p-3.5 shadow-[0_12px_36px_rgba(11,19,43,0.55)] border border-blue-400/30 backdrop-blur-xl hover:border-blue-400/60 hover:shadow-[0_14px_44px_rgba(37,99,235,0.35)] transition-all duration-300"
          >
            {/* Left Section: Stacked Dish Avatars & Cart Information */}
            <div className="flex items-center gap-3 min-w-0">
              {dishThumbnails.length > 0 ? (
                <div className="flex items-center -space-x-5 sm:-space-x-5.5 shrink-0">
                  {dishThumbnails.map((thumb, index) => (
                    <div
                      key={`${thumb.id}-${index}`}
                      className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-[#0b132b] shadow-md ring-1 ring-blue-400/30"
                      style={{ zIndex: 10 - index }}
                    >
                      <Image
                        src={thumb.image}
                        alt={thumb.name}
                        fill
                        sizes="44px"
                        className="object-cover"
                        unoptimized={typeof thumb.image === 'string' && thumb.image.startsWith('data:')}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-md shrink-0">
                  <ShoppingBag className="h-5 w-5" />
                </div>
              )}

              <div className="flex flex-col min-w-0">
                <span className="text-[11px] sm:text-xs text-blue-200/80 font-medium truncate">
                  {totalItems} {totalItems === 1 ? 'Item' : 'Items'}
                  {vendorLabel ? ` • ${vendorLabel}` : ''}
                </span>
                <span className="font-black text-base sm:text-lg text-white tracking-tight">
                  ₹{totalPrice.toFixed(0)}
                </span>
              </div>
            </div>

            {/* Right Section: View Cart Action */}
            <div className="flex items-center gap-1.5 text-white font-bold text-xs sm:text-sm px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 shadow-md transition-all shrink-0 ml-2 group-hover:scale-[1.02]">
              <span>View Cart</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />
    </>
  );
}
