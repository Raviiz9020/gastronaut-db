'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Utensils } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { useMenu } from '@/context/menu-context';
import { useVendor } from '@/context/vendor-context';
import { useLocation } from '@/context/location-context';
import { isVendorServiceable } from '@/lib/location-utils';
import { isItemInStock } from '@/lib/vendorStatusManager';

// Fallback images for common food categories if none is uploaded
const FALLBACK_CATEGORY_IMAGES: Record<string, string> = {
  biryani: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&auto=format&fit=crop&q=80',
  pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80',
  thali: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=300&auto=format&fit=crop&q=80',
  rolls: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=300&auto=format&fit=crop&q=80',
  chinese: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=300&auto=format&fit=crop&q=80',
  starters: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=300&auto=format&fit=crop&q=80',
  desserts: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&auto=format&fit=crop&q=80',
  beverages: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=300&auto=format&fit=crop&q=80',
  default: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&auto=format&fit=crop&q=80',
};

export default function DishCategoryBubbles() {
  const { menuItems, categories, globalCategories, fetchAllItems } = useMenu();
  const { vendors } = useVendor();
  const { userLocation } = useLocation();

  useEffect(() => {
    fetchAllItems();
  }, [fetchAllItems]);

  const plugin = useRef(
    Autoplay({ delay: 3500, stopOnInteraction: true, stopOnMouseEnter: true })
  );

  // Compute active categories that strictly have available menu items in the serviceable area
  const activeDishCategories = useMemo(() => {
    // 1. Get approved & serviceable vendors
    let approvedVendors = vendors.filter((v) => v.isApproved && v.shopName);
    if (userLocation) {
      approvedVendors = approvedVendors.filter((v) => isVendorServiceable(v, userLocation));
    }
    const vendorMap = new Map(approvedVendors.map((v) => [v.username, v]));

    // 2. Filter available and in-stock menu items belonging to these vendors
    const availableItems = menuItems.filter((item) => {
      const vendor = vendorMap.get(item.vendorUsername);
      if (!vendor) return false;
      if (!item.isAvailable) return false;
      return isItemInStock(item, vendor.isInventory);
    });

    if (availableItems.length === 0) return [];

    // 3. Find unique categories with item count and sample image
    const categoryMap = new Map<
      string,
      { name: string; imageUrl?: string; blurDataUrl?: string; itemCount: number }
    >();

    availableItems.forEach((item) => {
      if (!item.category) return;
      const catName = item.category.trim();
      const existing = categoryMap.get(catName);

      if (!existing) {
        categoryMap.set(catName, {
          name: catName,
          imageUrl: item.image,
          blurDataUrl: item.blurDataUrl,
          itemCount: 1,
        });
      } else {
        existing.itemCount += 1;
        if (!existing.imageUrl && item.image) {
          existing.imageUrl = item.image;
          existing.blurDataUrl = item.blurDataUrl;
        }
      }
    });

    // 4. Match with official global/vendor category meta if available
    const allCategoryMeta = [...globalCategories, ...categories];

    const result = Array.from(categoryMap.values()).map((cat) => {
      const meta = allCategoryMeta.find((c) => c.name.toLowerCase() === cat.name.toLowerCase());
      const officialImage = meta?.imageUrl || cat.imageUrl;
      const lowerName = cat.name.toLowerCase();
      const fallbackKey = Object.keys(FALLBACK_CATEGORY_IMAGES).find((k) => lowerName.includes(k)) || 'default';

      return {
        name: cat.name,
        imageUrl: officialImage || FALLBACK_CATEGORY_IMAGES[fallbackKey],
        blurDataUrl: meta?.blurDataUrl || cat.blurDataUrl,
        itemCount: cat.itemCount,
      };
    });

    // Sort by item count descending (most popular categories first)
    return result.sort((a, b) => b.itemCount - a.itemCount);
  }, [menuItems, categories, globalCategories, vendors, userLocation]);

  // If no category has dishes to show, don't render the section
  if (activeDishCategories.length === 0) {
    return null;
  }

  return (
    <section className="py-6">
      <div className="flex items-center gap-2 mb-4 px-1">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <Utensils className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-xl font-bold font-headline tracking-tight">
            Eat What Makes You Happy
          </h2>
          <p className="text-xs text-muted-foreground">
            Explore popular dishes crafted by local home chefs & kitchens
          </p>
        </div>
      </div>

      <Carousel
        plugins={[plugin.current]}
        opts={{
          align: 'start',
          loop: activeDishCategories.length > 5,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-3">
          {activeDishCategories.map((category) => (
            <CarouselItem
              key={category.name}
              className="basis-1/3 sm:basis-1/4 md:basis-1/6 lg:basis-[12.5%] pl-3"
            >
              <Link
                href={`/menu?category=${encodeURIComponent(category.name)}`}
                className="group flex flex-col items-center gap-2 cursor-pointer select-none"
              >
                <div className="relative w-20 h-20 sm:w-22 sm:h-22 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-transparent group-hover:border-primary transition-all duration-300 group-hover:scale-105 shadow-sm group-hover:shadow-md bg-muted">
                  <Image
                    src={category.imageUrl}
                    alt={category.name}
                    fill
                    sizes="(max-width: 640px) 80px, 96px"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    placeholder={category.blurDataUrl ? 'blur' : 'empty'}
                    blurDataURL={category.blurDataUrl}
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                </div>
                <span className="text-xs font-semibold text-center text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {category.name}
                </span>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}
