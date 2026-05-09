import React from 'react';
import { motion } from 'framer-motion';

/**
 * Card — Componente de tarjeta reutilizable
 * 
 * Características:
 * - Elevación visual con sombra hover
 * - Animación suave de entrada
 * - Variantes: default, hover-lift, interactive
 * - Responsivo
 * 
 * @param {object} props - { children, variant, onClick, className, animate }
 * @returns {JSX.Element}
 */
export function Card({
  children = null,
  variant = 'default',
  onClick = null,
  className = '',
  animate = true,
}) {
  const variants = {
    default: 'bg-white rounded-lg shadow border border-gray-200',
    hover_lift: 'bg-white rounded-lg shadow border border-gray-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer transition-all',
    interactive: 'bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md active:shadow-none cursor-pointer transition-all',
  };

  const baseClass = variants[variant] || variants.default;

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 10 } : false}
      animate={animate ? { opacity: 1, y: 0 } : false}
      whileHover={variant === 'hover_lift' ? { y: -2 } : {}}
      onClick={onClick}
      className={`${baseClass} p-4 ${className}`}
    >
      {children}
    </motion.div>
  );
}

/**
 * CardHeader — Header de tarjeta
 */
export function CardHeader({ title = '', subtitle = '', icon = null }) {
  return (
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2">
        {icon && <span className="text-2xl">{icon}</span>}
        <div>
          {title && <h3 className="font-bold text-gray-900">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

/**
 * CardBody — Cuerpo de tarjeta
 */
export function CardBody({ children = null }) {
  return <div className="text-gray-700 text-sm">{children}</div>;
}

/**
 * CardFooter — Footer de tarjeta
 */
export function CardFooter({ children = null }) {
  return (
    <div className="mt-4 pt-3 border-t border-gray-200 flex justify-end gap-2">
      {children}
    </div>
  );
}

export default Card;
