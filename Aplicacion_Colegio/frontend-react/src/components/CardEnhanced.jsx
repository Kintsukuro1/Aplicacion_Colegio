import React from 'react';
import { motion } from 'framer-motion';

/**
 * Enhanced Card Component with Advanced Hover Effects - Fase 5.4
 * 
 * Extends the Fase 5.1 Card with:
 * - Refined hover lift with shadow depth
 * - Subtle border glow on hover
 * - Smooth transitions for complex effects
 * - Interactive feedback (press effect)
 */

const cardVariants = {
  default: {
    y: 0,
    boxShadow: '0 1px 3px 0 rgb(0, 0, 0, 0.1)',
  },
  hover_lift: {
    y: -8,
    boxShadow: '0 20px 25px -5px rgb(0, 0, 0, 0.15)',
  },
  interactive_hover: {
    y: -4,
    boxShadow: '0 10px 15px -3px rgb(0, 0, 0, 0.12)',
  },
  interactive_tap: {
    y: 0,
    boxShadow: '0 4px 6px -1px rgb(0, 0, 0, 0.08)',
  },
};

const borderGlowVariants = {
  initial: {
    borderColor: 'rgb(229, 231, 235)',
  },
  glow: {
    borderColor: 'rgb(37, 99, 235)',
    boxShadow: '0 0 20px -5px rgb(37, 99, 235, 0.3)',
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

export function CardEnhanced({
  children,
  variant = 'default',
  animate = true,
  onClick,
  className = '',
  glowOnHover = false,
}) {
  const [isHovered, setIsHovered] = React.useState(false);

  const getVariant = () => {
    if (!animate) return 'default';
    if (variant === 'hover_lift') return isHovered ? 'hover_lift' : 'default';
    if (variant === 'interactive') return isHovered ? 'interactive_hover' : 'default';
    return 'default';
  };

  const cardClasses = `
    rounded-lg border transition-colors
    bg-white
    ${className}
  `;

  return (
    <motion.div
      variants={cardVariants}
      initial="default"
      animate={getVariant()}
      whileTap={variant === 'interactive' ? 'interactive_tap' : undefined}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      className={cardClasses}
      style={{
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {glowOnHover ? (
        <motion.div
          variants={borderGlowVariants}
          initial="initial"
          animate={isHovered ? 'glow' : 'initial'}
          className="rounded-lg border border-gray-200 h-full w-full"
        >
          <div className="p-4">{children}</div>
        </motion.div>
      ) : (
        <div className="p-4">{children}</div>
      )}
    </motion.div>
  );
}

export default CardEnhanced;
