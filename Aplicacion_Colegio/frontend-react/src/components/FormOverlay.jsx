import { useEffect } from 'react';

export default function FormOverlay({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Manejar tecla ESC
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="form-overlay-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="card form-overlay-content" onClick={(e) => e.stopPropagation()}>
        <header className="form-overlay-header">
          <h3>{title}</h3>
          <button type="button" className="small secondary" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>
        <div className="form-overlay-body">
          {children}
        </div>
      </div>
    </div>
  );
}
