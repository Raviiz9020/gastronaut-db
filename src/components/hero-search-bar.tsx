'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const SEARCH_PLACEHOLDERS = [
  "Search for 'Hyderabadi Biryani'...",
  "Search for 'Cheese Pizza'...",
  "Search for 'Momos & Rolls'...",
  "Search for 'Home Thali'...",
  "Search for 'Cakes & Pastries'...",
  "Search for 'Annapurna Kitchen'...",
];

export default function HeroSearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  // Rotate placeholder text every 3.5 seconds
  useEffect(() => {
    if (isFocused || query.length > 0) return;

    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [isFocused, query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      router.push('/menu');
      return;
    }
    router.push(`/menu?search=${encodeURIComponent(query.trim())}`);
  };

  return (
    <form
      onSubmit={handleSearch}
      className={cn(
        'relative w-full max-w-xl mx-auto md:mx-0 flex items-center rounded-2xl border bg-card/90 backdrop-blur-md p-1.5 shadow-lg transition-all duration-300',
        isFocused ? 'border-primary shadow-primary/20 ring-2 ring-primary/20' : 'border-border/80 hover:border-primary/40',
        className
      )}
    >
      <div className="flex items-center justify-center pl-3 pr-2 text-primary shrink-0">
        <Search className="h-5 w-5" />
      </div>

      <div className="relative flex-1 h-10 flex items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="w-full bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-transparent z-10 px-1"
        />

        {/* Animated Rotating Placeholder when input is empty */}
        {query.length === 0 && (
          <div className="absolute inset-0 flex items-center pointer-events-none px-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.span
                key={placeholderIndex}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 0.6 }}
                exit={{ y: -12, opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="text-sm text-muted-foreground truncate"
              >
                {SEARCH_PLACEHOLDERS[placeholderIndex]}
              </motion.span>
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Clear Button */}
      {query.length > 0 && (
        <button
          type="button"
          onClick={() => setQuery('')}
          className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors mr-1"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        size="sm"
        aria-label="Search dishes"
        className="rounded-xl px-2.5 sm:px-4 font-semibold text-xs h-9 shadow-sm shrink-0 flex items-center justify-center"
      >
        <span className="hidden sm:inline">Search</span>
        <ArrowRight className="h-3.5 w-3.5 sm:ml-1.5" />
      </Button>
    </form>
  );
}
