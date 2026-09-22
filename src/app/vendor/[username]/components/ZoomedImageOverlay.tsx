'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface ZoomedImageOverlayProps {
  item: { id: string; image: string; name: string } | null;
  onClose: () => void;
}

export const ZoomedImageOverlay: React.FC<ZoomedImageOverlayProps> = ({
  item,
  onClose,
}) => {
  useEffect(() => {
    if (item) {
      const timer = setTimeout(() => {
        onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [item, onClose]);

  if (!item) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-80 h-80 sm:w-96 sm:h-96"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          className="relative w-full h-full rounded-full overflow-hidden shadow-2xl"
          layoutId={item.id}
        >
          <Image
            src={item.image || ''}
            alt={item.name}
            fill
            className="object-cover"
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default ZoomedImageOverlay;
