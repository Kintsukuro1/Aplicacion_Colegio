import { motion, AnimatePresence } from 'framer-motion';
import { useNotificationStore } from '../lib/store/useNotificationStore';

/**
 * Enhanced Toast Component with Framer Motion - Fase 5.4
 * 
 * Provides smooth animations for toast notifications:
 * - Slide-in from right on mount
 * - Fade-out on dismiss
 * - Auto-dismiss after 4 seconds
 * 
 * Usage:
 *   <ToastAnimatedProvider><App /></ToastAnimatedProvider>
 */

const toastVariants = {
  initial: {
    opacity: 0,
    x: 400,
    scale: 0.9,
  },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 400,
    },
  },
  exit: {
    opacity: 0,
    x: 400,
    scale: 0.9,
    transition: {
      duration: 0.2,
    },
  },
};

const containerVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export function ToastAnimatedProvider({ children }) {
  const toasts = useNotificationStore((state) => state.toasts);
  const dismiss = useNotificationStore((state) => state.dismiss);

  // Auto-dismiss after 4 seconds
  React.useEffect(() => {
    if (toasts.length === 0) return;

    const timeout = setTimeout(() => {
      const firstToast = toasts[0];
      if (firstToast) {
        dismiss(firstToast.id);
      }
    }, 4000);

    return () => clearTimeout(timeout);
  }, [toasts, dismiss]);

  const getToastColor = (type) => {
    const colors = {
      success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900' },
      error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900' },
      info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900' },
      warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-900' },
    };
    return colors[type] || colors.info;
  };

  const getToastIcon = (type) => {
    const icons = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
      warning: '⚠',
    };
    return icons[type] || '→';
  };

  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => {
            const colors = getToastColor(toast.type);
            return (
              <motion.div
                key={toast.id}
                variants={toastVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                layout
                className={`
                  mb-2 pointer-events-auto
                  flex items-center gap-3 px-4 py-3 rounded-lg
                  ${colors.bg} ${colors.border} border
                  backdrop-blur-sm shadow-lg
                  max-w-sm
                `}
              >
                <span className={`text-lg font-bold ${colors.text}`}>
                  {getToastIcon(toast.type)}
                </span>
                <span className={`flex-1 text-sm font-medium ${colors.text}`}>
                  {toast.message}
                </span>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  className={`
                    ml-2 flex-shrink-0 text-lg leading-none
                    hover:opacity-70 transition-opacity
                    ${colors.text}
                  `}
                  aria-label="Cerrar notificación"
                >
                  ×
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </>
  );
}

export function useToast() {
  return useNotificationStore();
}

// Re-export original for backward compatibility
export { useNotificationStore };
