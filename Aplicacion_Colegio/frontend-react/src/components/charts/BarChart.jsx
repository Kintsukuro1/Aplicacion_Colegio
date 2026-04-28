import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

/**
 * Gráfico de barras verticales.
 * @param {Object} props
 * @param {string[]} props.labels - Etiquetas del eje X
 * @param {number[]} props.data - Valores del eje Y
 * @param {string} [props.label] - Nombre de la serie
 * @param {string} [props.color] - Color de las barras
 * @param {number} [props.height] - Altura en px
 */
export default function BarChart({
  labels = [],
  data = [],
  label = 'Datos',
  color = '#6366f1',
  height = 260,
}) {
  const chartData = {
    labels,
    datasets: [
      {
        label,
        data,
        backgroundColor: `${color}cc`,
        hoverBackgroundColor: color,
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 48,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { family: 'Inter', size: 12, weight: '600' },
        bodyFont: { family: 'Inter', size: 12 },
        padding: { top: 8, right: 12, bottom: 8, left: 12 },
        cornerRadius: 8,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { family: 'Inter', size: 11 },
          color: '#94a3b8',
        },
        border: { display: false },
      },
      y: {
        grid: {
          color: '#f1f5f9',
          drawBorder: false,
        },
        ticks: {
          font: { family: 'Inter', size: 11 },
          color: '#94a3b8',
          padding: 8,
        },
        border: { display: false },
        beginAtZero: true,
      },
    },
  };

  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}
