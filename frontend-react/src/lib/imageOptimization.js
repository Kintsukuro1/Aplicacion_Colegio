/**
 * Utilidades para Optimización de Imágenes
 * Lazy loading, responsive, WebP, CDN
 */

/**
 * Componente de Imagen Optimizada
 * - Lazy loading automático
 * - Responsive srcSet
 * - WebP fallback
 * 
 * Uso:
 * <OptimizedImage
 *   src="photo.jpg"
 *   alt="Photo"
 *   sizes="(max-width: 640px) 100vw, 50vw"
 * />
 */
export function OptimizedImage({ 
  src, 
  alt, 
  className = '', 
  sizes = '100vw',
  width,
  height 
}) {
  // Genera srcSet para responsive images
  const generateSrcSet = (imagePath) => {
    if (!imagePath) return ''
    
    // Asume CDN que soporta query params de tamaño
    // Ejemplos: ?w=200, ?w=400, etc.
    return [
      `${imagePath}?w=200 200w`,
      `${imagePath}?w=400 400w`,
      `${imagePath}?w=800 800w`,
      `${imagePath}?w=1200 1200w`,
    ].join(',')
  }

  return (
    <picture>
      {/* WebP para navegadores modernos */}
      <source 
        srcSet={generateSrcSet(src?.replace(/\.(jpg|jpeg|png)$/i, '.webp'))}
        type="image/webp"
        sizes={sizes}
      />
      
      {/* Fallback para navegadores antiguos */}
      <img
        loading="lazy"
        src={src}
        alt={alt}
        className={className}
        width={width}
        height={height}
        srcSet={generateSrcSet(src)}
        sizes={sizes}
      />
    </picture>
  )
}

/**
 * Genera URL optimizada con CDN (ejemplo con Cloudinary)
 */
export function getOptimizedImageUrl(publicId, options = {}) {
  const {
    width = 800,
    height = undefined,
    quality = 80,
    format = 'auto', // auto = mejor formato para navegador
    crop = 'auto',
  } = options

  const baseUrl = 'https://res.cloudinary.com/YOUR_ACCOUNT/image/upload'
  const transformation = [
    `w_${width}`,
    height && `h_${height}`,
    `q_${quality}`,
    `f_${format}`,
    `c_${crop}`,
  ].filter(Boolean).join(',')

  return `${baseUrl}/${transformation}/${publicId}`
}

/**
 * Preload image para mejor performance
 */
export function preloadImage(src) {
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'image'
  link.href = src
  document.head.appendChild(link)
}

/**
 * Obtiene información de imagen para lazy loading seguro
 */
export function getImagePlaceholder(width = 100, height = 100) {
  // Genera SVG placeholder de bajo tamaño
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#e5e7eb"/>
    <text x="50%" y="50%" font-size="14" fill="#9ca3af" text-anchor="middle" dy=".3em">
      Loading...
    </text>
  </svg>`
  
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

/**
 * Patrón LQIP (Low Quality Image Placeholder)
 */
export function LqipImage({ 
  src, 
  placeholder, 
  alt,
  className = ''
}) {
  const [imageSrc, setImageSrc] = require('react').useState(placeholder || getImagePlaceholder())
  const [isLoaded, setIsLoaded] = require('react').useState(false)

  const handleImageLoad = () => {
    setImageSrc(src)
    setIsLoaded(true)
  }

  require('react').useEffect(() => {
    const img = new Image()
    img.src = src
    img.onload = handleImageLoad
  }, [src])

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`${className} ${isLoaded ? 'transition-opacity duration-300' : ''}`}
      loading="lazy"
    />
  )
}

/**
 * Utilidades para medir tamaño de imágenes
 */
export const imageMetrics = {
  /**
   * Calcula tamaño óptimo basado en viewport
   */
  getOptimalSize(containerWidth) {
    // Estándar: 1x, 2x para retina
    return {
      1x: Math.ceil(containerWidth),
      2x: Math.ceil(containerWidth * 2),
    }
  },

  /**
   * Calcula ahorro de ancho de banda con WebP
   */
  estimateWebPSavings(jpgSize) {
    // WebP típicamente es 25-35% más pequeño que JPEG
    return {
      jpgSize,
      webpSize: Math.ceil(jpgSize * 0.75), // 25% ahorro
      savings: Math.ceil(jpgSize * 0.25),
      percentSaving: '25%',
    }
  },
}
