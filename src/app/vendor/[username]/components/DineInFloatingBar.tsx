'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Utensils, ArrowRight } from 'lucide-react';
import type { Order } from '@/types';
import type { TableOrderThumbnail } from '../types';

export interface DineInFloatingBarProps {
  isVisible: boolean;
  activeTableId: string;
  activeTableOrder?: Order | null;
  tableOrderTotalCount: number;
  tableOrderTotal: number;
  tableOrderThumbnails: TableOrderThumbnail[];
  onOpenSheet: () => void;
}

export function DineInFloatingBar({
  isVisible,
  activeTableId,
  activeTableOrder,
  tableOrderTotalCount,
  tableOrderTotal,
  tableOrderThumbnails,
  onOpenSheet,
}: DineInFloatingBarProps) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ y: 80, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 80, opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="fixed bottom-4 inset-x-3 sm:inset-x-auto sm:right-6 z-40 sm:w-[420px]"
    >
      <div
        onClick={onOpenSheet}
        className="cursor-pointer group flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#0b132b]/95 via-[#141e3a]/90 to-[#0b132b]/95 text-white p-3 sm:p-3.5 shadow-[0_12px_36px_rgba(11,19,43,0.55)] border border-blue-400/30 backdrop-blur-xl hover:border-blue-400/60 hover:shadow-[0_14px_44px_rgba(37,99,235,0.35)] transition-all duration-300"
      >
        {/* Left Section: Stacked Dish Avatars & Order Info */}
        <div className="flex items-center gap-3 min-w-0">
          {tableOrderThumbnails.length > 0 ? (
            <div className="flex items-center -space-x-5 shrink-0">
              {tableOrderThumbnails.map((thumb, index) => (
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
              <Utensils className="h-5 w-5" />
            </div>
          )}

          <div className="flex flex-col min-w-0">
            <span className="text-[11px] sm:text-xs text-blue-200/90 font-medium truncate">
              Table {activeTableId || 'Order'}{activeTableOrder ? ` • Round ${(activeTableOrder.orderRound || 1) + 1}` : ''} • {tableOrderTotalCount} {tableOrderTotalCount === 1 ? 'Item' : 'Items'}
            </span>
            <span className="font-black text-base sm:text-lg text-white tracking-tight">
              ₹{tableOrderTotal.toFixed(0)}
            </span>
          </div>
        </div>

        {/* Right Section: View Order Action */}
        <div className="flex items-center gap-1.5 text-white font-bold text-xs sm:text-sm px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 shadow-md transition-all shrink-0 ml-2 group-hover:scale-[1.02]">
          <span>View Order</span>
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </motion.div>
  );
}
