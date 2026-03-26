import type { ReactNode } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  animation?: 'fade-up' | 'fade-in' | 'scale-in' | 'slide-left' | 'slide-right';
  delay?: number;
  duration?: number;
}

export function ScrollReveal({
  children,
  className,
  animation = 'fade-up',
  delay = 0,
  duration = 500,
}: ScrollRevealProps) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>();

  const baseStyles = 'transition-all ease-out';
  
  const animationStyles = {
    'fade-up': {
      hidden: 'opacity-0 translate-y-6',
      visible: 'opacity-100 translate-y-0',
    },
    'fade-in': {
      hidden: 'opacity-0',
      visible: 'opacity-100',
    },
    'scale-in': {
      hidden: 'opacity-0 scale-95',
      visible: 'opacity-100 scale-100',
    },
    'slide-left': {
      hidden: 'opacity-0 translate-x-6',
      visible: 'opacity-100 translate-x-0',
    },
    'slide-right': {
      hidden: 'opacity-0 -translate-x-6',
      visible: 'opacity-100 translate-x-0',
    },
  };

  const currentAnimation = animationStyles[animation];

  return (
    <div
      ref={ref}
      className={cn(
        baseStyles,
        isVisible ? currentAnimation.visible : currentAnimation.hidden,
        className
      )}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// For staggered children animations
interface ScrollRevealGroupProps {
  children: ReactNode[];
  className?: string;
  childClassName?: string;
  animation?: 'fade-up' | 'fade-in' | 'scale-in' | 'slide-left' | 'slide-right';
  staggerDelay?: number;
  duration?: number;
}

export function ScrollRevealGroup({
  children,
  className,
  childClassName,
  animation = 'fade-up',
  staggerDelay = 100,
  duration = 500,
}: ScrollRevealGroupProps) {
  const { ref, isVisible } = useScrollAnimation<HTMLDivElement>();

  const baseStyles = 'transition-all ease-out';
  
  const animationStyles = {
    'fade-up': {
      hidden: 'opacity-0 translate-y-6',
      visible: 'opacity-100 translate-y-0',
    },
    'fade-in': {
      hidden: 'opacity-0',
      visible: 'opacity-100',
    },
    'scale-in': {
      hidden: 'opacity-0 scale-95',
      visible: 'opacity-100 scale-100',
    },
    'slide-left': {
      hidden: 'opacity-0 translate-x-6',
      visible: 'opacity-100 translate-x-0',
    },
    'slide-right': {
      hidden: 'opacity-0 -translate-x-6',
      visible: 'opacity-100 translate-x-0',
    },
  };

  const currentAnimation = animationStyles[animation];

  return (
    <div ref={ref} className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className={cn(
            baseStyles,
            isVisible ? currentAnimation.visible : currentAnimation.hidden,
            childClassName
          )}
          style={{
            transitionDuration: `${duration}ms`,
            transitionDelay: `${index * staggerDelay}ms`,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
