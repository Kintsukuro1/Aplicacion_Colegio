/**
 * Tarjeta de estadística ejecutiva con icono, valor, tendencia y subtítulo.
 * Diseño premium para el dashboard ejecutivo.
 *
 * @param {Object} props
 * @param {string} props.title - Etiqueta/título de la métrica
 * @param {string|number} props.value - Valor principal
 * @param {string} [props.subtitle] - Texto descriptivo inferior
 * @param {'up'|'down'|'stable'|null} [props.trend] - Dirección de tendencia
 * @param {string} [props.trendValue] - Valor de tendencia (ej: "+2.3%")
 * @param {string} [props.icon] - Emoji o ícono
 * @param {string} [props.color] - Color accent
 * @param {'default'|'success'|'warning'|'danger'} [props.variant] - Variante de color
 * @param {number[]} [props.sparkline] - Serie breve para tendencia visual
 */
export default function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  color,
  sparkline,
  variant = 'default',
}) {
  const variantColors = {
    default: { bg: 'var(--brand-light)', accent: 'var(--brand)', iconBg: 'var(--brand-muted)' },
    success: { bg: 'var(--success-light)', accent: 'var(--success)', iconBg: 'rgba(16, 185, 129, 0.1)' },
    warning: { bg: 'var(--warning-light)', accent: 'var(--warning)', iconBg: 'rgba(245, 158, 11, 0.1)' },
    danger: { bg: 'var(--danger-light)', accent: 'var(--danger)', iconBg: 'rgba(244, 63, 94, 0.1)' },
  };

  const vc = variantColors[variant] || variantColors.default;
  const accentColor = color || vc.accent;

  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : null;
  const trendClass = trend === 'up' ? 'stat-trend-up' : trend === 'down' ? 'stat-trend-down' : '';

  return (
    <article className="stat-card-exec">
      <div className="stat-card-top">
        {icon ? (
          <span
            className="stat-card-icon"
            style={{ background: vc.iconBg, color: accentColor }}
          >
            {icon}
          </span>
        ) : null}
        <span className="stat-card-title">{title}</span>
      </div>

      <div className="stat-card-body">
        <strong className="stat-card-value" style={color ? { color } : undefined}>
          {value ?? '—'}
        </strong>
        <div className="stat-card-body-meta">
          {(trendIcon || trendValue) ? (
            <span className={`stat-card-trend ${trendClass}`}>
              {trendIcon} {trendValue}
            </span>
          ) : null}
          {Array.isArray(sparkline) && sparkline.length > 1 ? (
            <div className="stat-card-sparkline" aria-hidden="true">
              <Sparkline data={sparkline} color={accentColor} />
            </div>
          ) : null}
        </div>
      </div>

      {subtitle ? (
        <p className="stat-card-subtitle">{subtitle}</p>
      ) : null}
    </article>
  );
}

function Sparkline({ data = [], color = '#6366f1', width = 120, height = 34 }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((value, index) => {
    const x = data.length === 1 ? width / 2 : (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
