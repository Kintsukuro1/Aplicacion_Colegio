import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const DEFAULT_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#f43f5e',
  '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
];

/**
 * Gráfico de dona (donut chart).
 * @param {Object} props
 * @param {string[]} props.labels - Etiquetas de los segmentos
 * @param {number[]} props.data - Valores de cada segmento
 * @param {string[]} [props.colors] - Colores para cada segmento
 * @param {number} [props.height] - Altura en px
 * @param {string} [props.centerLabel] - Texto central opcional
 * @param {string|number} [props.centerValue] - Valor central opcional
 */
export default function DonutChart({
  labels = [],
  data = [],
  colors = DEFAULT_COLORS,
  height = 260,
  centerLabel = '',
  centerValue = '',
}) {
  const chartData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor: colors.slice(0, data.length),
        hoverBackgroundColor: colors.slice(0, data.length).map((c) => `${c}ee`),
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverBorderWidth: 0,
        spacing: 2,
        borderRadius: 4,
      },
    ],
  };

  const centerTextPlugin = {
    id: 'centerText',
    afterDraw(chart) {
      if (!centerValue && !centerLabel) return;

      const { ctx, chartArea } = chart;
      const centerX = (chartArea.left + chartArea.right) / 2;
      const centerY = (chartArea.top + chartArea.bottom) / 2;

      // Value
      if (centerValue) {
        ctx.save();
        ctx.font = 'bold 1.5rem Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#1e293b';
        ctx.fillText(String(centerValue), centerX, centerLabel ? centerY - 8 : centerY);
        ctx.restore();
      }

      // Label
      if (centerLabel) {
        ctx.save();
        ctx.font = '500 0.72rem Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(centerLabel, centerX, centerValue ? centerY + 14 : centerY);
        ctx.restore();
      }
    },
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle',
          font: { family: 'Inter', size: 11, weight: '500' },
          color: '#64748b',
        },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { family: 'Inter', size: 12, weight: '600' },
        bodyFont: { family: 'Inter', size: 12 },
        padding: { top: 8, right: 12, bottom: 8, left: 12 },
        cornerRadius: 8,
        displayColors: true,
        boxWidth: 8,
        boxHeight: 8,
        boxPadding: 4,
      },
    },
  };

  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <Doughnut data={chartData} options={options} plugins={[centerTextPlugin]} />
    </div>
  );
}
