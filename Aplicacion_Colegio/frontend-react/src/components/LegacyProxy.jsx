import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function LegacyProxy({ baseUrl }) {
  const location = useLocation();
  const navigate = useNavigate();
  const iframeRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  // Reconstruct the URL to point to the Django backend
  // We use the current pathname and search params
  const targetUrl = new URL(location.pathname + location.search, window.location.origin);
  
  // Append the layout=bare parameter so Django hides its navbar/footer
  targetUrl.searchParams.set('layout', 'bare');

  // Handle messages from the iframe (like session expiration or redirects)
  useEffect(() => {
    const handleMessage = (event) => {
      // Security check: ensure the message comes from the same origin
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'NAVIGATE') {
        navigate(event.data.url);
      } else if (event.data?.type === 'SESSION_EXPIRED') {
        navigate('/login');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate]);

  return (
    <div className="w-full h-[calc(100vh-64px)] relative bg-slate-50">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 backdrop-blur-sm z-10">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-slate-500 font-medium animate-pulse">Cargando módulo heredado...</p>
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={targetUrl.toString()}
        className="w-full h-full border-0"
        onLoad={() => setIsLoading(false)}
        title="Módulo Legacy"
      />
    </div>
  );
}
