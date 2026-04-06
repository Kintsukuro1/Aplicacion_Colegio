import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Barra de búsqueda reutilizable con debounce, clear, y shortcut Ctrl+K.
 *
 * Props:
 *   value       — valor controlado
 *   onChange     — callback(string)
 *   placeholder  — placeholder text
 *   debounceMs   — ms antes de emitir cambio (default 300)
 */
export default function SearchBar({
  value = '',
  onChange,
  placeholder = 'Buscar por nombre, email, RUT...',
  debounceMs = 300,
}) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  // Sync external value → local
  useEffect(() => {
    setLocal(value);
  }, [value]);

  const emit = useCallback(
    (v) => {
      if (onChange) {
        onChange(v);
      }
    },
    [onChange],
  );

  function handleChange(e) {
    const v = e.target.value;
    setLocal(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => emit(v), debounceMs);
  }

  function handleClear() {
    setLocal('');
    clearTimeout(timerRef.current);
    emit('');
    inputRef.current?.focus();
  }

  // Ctrl+K para focus rápido
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="search-bar">
      <svg className="search-bar-icon" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
        <path
          fillRule="evenodd"
          d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
          clipRule="evenodd"
        />
      </svg>
      <input
        ref={inputRef}
        id="searchbar-input"
        type="text"
        value={local}
        onChange={handleChange}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
      />
      {local ? (
        <button
          type="button"
          className="search-bar-clear"
          onClick={handleClear}
          aria-label="Limpiar búsqueda"
        >
          ✕
        </button>
      ) : (
        <kbd className="search-bar-shortcut">Ctrl+K</kbd>
      )}
    </div>
  );
}
