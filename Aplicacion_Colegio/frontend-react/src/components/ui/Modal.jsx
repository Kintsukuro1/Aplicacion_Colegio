import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Modal — Componente reutilizable para diálogos modales
 * 
 * Características:
 * - Animación suave de entrada/salida
 * - Overlay oscuro con click para cerrar
 * - Tamaño responsive (sm, md, lg, xl)
 * - Header, body, footer con slots
 * - Accesibilidad (ESC para cerrar)
 * 
 * @param {object} props - { isOpen, onClose, title, children, footer, size, closeBtn }
 * @returns {JSX.Element}
 */
export function Modal({
  isOpen = false,
  onClose = () => {},
  title = '',
  children = null,
  footer = null,
  size = 'md',
  closeBtn = true,
}) {
  // ESC para cerrar
  React.useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-lg shadow-xl w-11/12 ${sizeClasses[size]}`}
          >
            {/* Header */}
            {(title || closeBtn) && (
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                {closeBtn && (
                  <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700 transition"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end gap-2">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default Modal;
