import React from 'react';
import { motion } from 'framer-motion';

/**
 * Enhanced Skeleton Loading Components - Fase 5.4
 * 
 * Provides pulse animations for loading states
 * - Smoother pulse effect than CSS-only animations
 * - Reusable skeleton components for common patterns
 * - Works with React Query isLoading states
 * 
 * Usage:
 *   <SkeletonLine width="w-3/4" />
 *   <SkeletonCard count={3} />
 *   <SkeletonTable rows={5} />
 */

const skeletonPulse = {
  initial: { opacity: 0.6 },
  animate: {
    opacity: [0.6, 1, 0.6],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * SkeletonLine - Single line placeholder
 */
export function SkeletonLine({
  width = 'w-full',
  height = 'h-4',
  className = '',
}) {
  return (
    <motion.div
      variants={skeletonPulse}
      initial="initial"
      animate="animate"
      className={`
        bg-gray-200 rounded
        ${width} ${height}
        ${className}
      `}
    />
  );
}

/**
 * SkeletonCard - Card placeholder with header + 2 lines
 */
export function SkeletonCard({ className = '' }) {
  return (
    <div
      className={`
        p-4 rounded-lg border border-gray-200 bg-white
        space-y-3
        ${className}
      `}
    >
      <SkeletonLine width="w-2/3" height="h-5" />
      <SkeletonLine width="w-full" height="h-4" />
      <SkeletonLine width="w-4/5" height="h-4" />
    </div>
  );
}

/**
 * SkeletonGrid - Grid of skeleton cards
 */
export function SkeletonGrid({ count = 3, columns = 'grid-cols-3' }) {
  return (
    <div className={`grid ${columns} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/**
 * SkeletonTable - Table placeholder
 */
export function SkeletonTable({ rows = 5, columns = 3 }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonLine key={`header-${i}`} height="h-5" width="w-2/3" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={`row-${rowIdx}`}
          className="grid gap-4 py-2 border-b border-gray-200"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <SkeletonLine
              key={`cell-${rowIdx}-${colIdx}`}
              width="w-4/5"
              height="h-4"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonAvatar - Circular avatar placeholder
 */
export function SkeletonAvatar({ size = 'h-10 w-10', className = '' }) {
  return (
    <motion.div
      variants={skeletonPulse}
      initial="initial"
      animate="animate"
      className={`
        bg-gray-200 rounded-full
        ${size}
        ${className}
      `}
    />
  );
}

/**
 * SkeletonButton - Button placeholder
 */
export function SkeletonButton({ width = 'w-24', className = '' }) {
  return (
    <motion.div
      variants={skeletonPulse}
      initial="initial"
      animate="animate"
      className={`
        bg-gray-200 rounded-lg
        h-10 ${width}
        ${className}
      `}
    />
  );
}

/**
 * SkeletonText - Multi-line text placeholder
 */
export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine
          key={i}
          width={i === lines - 1 ? 'w-3/4' : 'w-full'}
          height="h-4"
        />
      ))}
    </div>
  );
}

/**
 * SkeletonImage - Image placeholder
 */
export function SkeletonImage({ width = 'w-full', height = 'h-48', className = '' }) {
  return (
    <motion.div
      variants={skeletonPulse}
      initial="initial"
      animate="animate"
      className={`
        bg-gray-200 rounded-lg
        ${width} ${height}
        ${className}
      `}
    />
  );
}

/**
 * Predefined skeleton for common patterns
 */
export const SkeletonPresets = {
  // Task card skeleton
  taskCard: () => (
    <div className="p-4 border border-gray-200 rounded-lg space-y-3">
      <div className="flex justify-between items-start">
        <SkeletonLine width="w-2/3" height="h-5" />
        <SkeletonButton width="w-20" />
      </div>
      <SkeletonLine width="w-1/2" height="h-4" />
      <SkeletonLine width="w-full" height="h-4" />
    </div>
  ),

  // Profile card skeleton
  profileCard: () => (
    <div className="p-4 border border-gray-200 rounded-lg space-y-4">
      <div className="flex items-center gap-4">
        <SkeletonAvatar size="h-16 w-16" />
        <div className="flex-1 space-y-2">
          <SkeletonLine width="w-2/3" height="h-5" />
          <SkeletonLine width="w-1/2" height="h-4" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  ),

  // Dashboard stats skeleton
  statsGrid: () => (
    <div className="grid grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-4 border border-gray-200 rounded-lg space-y-2">
          <SkeletonLine width="w-3/4" height="h-4" />
          <SkeletonLine width="w-1/2" height="h-6" />
        </div>
      ))}
    </div>
  ),
};

export default {
  SkeletonLine,
  SkeletonCard,
  SkeletonGrid,
  SkeletonTable,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonText,
  SkeletonImage,
  SkeletonPresets,
};
