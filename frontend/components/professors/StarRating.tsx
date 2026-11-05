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
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      role={isInput ? 'group' : 'img'}
      aria-label={isInput ? 'Calificación' : `${value} de ${max} estrellas`}
    >
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => {
        const icon = (
          <Star
            aria-hidden="true"
            className={cn(
              SIZE[size], 'transition-colors',
              star <= display ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-muted-foreground/30'
            )}
          />
        );
        if (!isInput) return <span key={star}>{icon}</span>;
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            className="rounded cursor-pointer transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${star} estrella${star !== 1 ? 's' : ''}`}
            aria-pressed={star === value}
          >
            {icon}
          </button>
        );
      })}
    </span>
  );
}
