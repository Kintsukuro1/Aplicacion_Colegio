import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * SidebarLayout — Layout con sidebar responsive
 * 
 * Características:
 * - Sidebar colapsable en desktop
 * - Drawer móvil en mobile
 * - Animaciones suaves
 * - Menú jerárquico
 * 
 * @param {object} props - { children, sidebar, mobileBreakpoint }
 * @returns {JSX.Element}
 */
export function SidebarLayout({
  children = null,
  sidebar = null,
  mobileBreakpoint = 'lg', // sm, md, lg, xl
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const breakpoints = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  };

  const [windowWidth, setWindowWidth] = React.useState(
    typeof window !== 'undefined' ? window.innerWidth : breakpoints[mobileBreakpoint]
  );

  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < breakpoints[mobileBreakpoint];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <motion.aside
          initial={{ width: 256 }}
          animate={{ width: sidebarOpen ? 256 : 80 }}
          transition={{ type: 'spring', damping: 25, stiffness: 400 }}
          className="bg-white border-r border-gray-200 overflow-hidden"
        >
          <div className="h-full flex flex-col">
            {sidebar}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="absolute bottom-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition"
              title={sidebarOpen ? 'Contraer' : 'Expandir'}
            >
              {sidebarOpen ? '←' : '→'}
            </button>
          </div>
        </motion.aside>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <>
          {/* Toggle Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="fixed top-4 left-4 z-40 p-2 bg-white rounded-lg shadow hover:shadow-md transition"
          >
            ☰
          </button>

          {/* Drawer */}
          <AnimatePresence>
            {mobileOpen && (
              <>
                {/* Overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMobileOpen(false)}
                  className="fixed inset-0 bg-black bg-opacity-50 z-40"
                />

                {/* Sidebar */}
                <motion.aside
                  initial={{ x: -256 }}
                  animate={{ x: 0 }}
                  exit={{ x: -256 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                  className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-xl z-50 overflow-y-auto"
                >
                  <div className="p-4">
                    <button
                      onClick={() => setMobileOpen(false)}
                      className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                      ✕
                    </button>
                    {sidebar}
                  </div>
                </motion.aside>
              </>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}

/**
 * SidebarMenu — Menú para sidebar
 */
export function SidebarMenu({ items = [], activeItem = null, onSelect = null }) {
  return (
    <nav className="space-y-1">
      {items.map((item) => (
        <SidebarMenuItem
          key={item.id}
          item={item}
          isActive={activeItem === item.id}
          onSelect={() => onSelect?.(item.id)}
        />
      ))}
    </nav>
  );
}

function SidebarMenuItem({ item, isActive, onSelect }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => {
          if (item.children) setExpanded(!expanded);
          else onSelect();
        }}
        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition ${
          isActive
            ? 'bg-blue-50 text-blue-600 font-medium'
            : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        {item.icon && <span className="text-lg">{item.icon}</span>}
        <span className="flex-1 text-left">{item.label}</span>
        {item.children && (
          <span
            className={`transform transition ${expanded ? 'rotate-90' : ''}`}
          >
            ›
          </span>
        )}
      </button>

      {/* Submenu */}
      {item.children && expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="pl-4 space-y-1"
        >
          {item.children.map((child) => (
            <button
              key={child.id}
              onClick={() => onSelect?.()}
              className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${
                false
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {child.label}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}

export default SidebarLayout;
