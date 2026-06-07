'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE = { sm: 'size-3.5', md: 'size-5', lg: 'size-7' } as const;

export default function StarRating({
  value,
  onChange,
  max = 5,
  size = 'md',
  className,
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const isInput = !!onChange;
  const display = hovered ?? value;

  return (
    <div className={cn('flex items-center gap-0.5', className)} role={isInput ? 'group' : undefined}>
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          disabled={!isInput}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => isInput && setHovered(star)}
          onMouseLeave={() => isInput && setHovered(null)}
          className={cn(
            'rounded transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            isInput  && 'cursor-pointer hover:scale-110',
            !isInput && 'cursor-default pointer-events-none'
          )}
          aria-label={isInput ? `${star} estrella${star !== 1 ? 's' : ''}` : undefined}
        >
          <Star
            className={cn(
              SIZE[size],
              'transition-colors',
              star <= display
                ? 'fill-amber-400 text-amber-400'
                : 'fill-transparent text-muted-foreground/30'
            )}
          />
        </button>
      ))}
    </div>
  );
}
