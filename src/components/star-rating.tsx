
'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  onRate: (rating: number) => void;
  className?: string;
  starSize?: string;
}

export default function StarRating({ rating, onRate, className, starSize = "h-6 w-6" }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "cursor-pointer transition-colors",
            starSize,
            (hoverRating >= star || rating >= star)
              ? "text-amber-400 fill-amber-400"
              : "text-muted-foreground"
          )}
          onClick={() => onRate(star)}
          onMouseEnter={() => setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
        />
      ))}
    </div>
  );
}
