import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

/**
 * Gráfico de línea con área rellena.
 * @param {Object} props
 * @param {string[]} props.labels - Etiquetas del eje X
 * @param {number[]} props.data - Valores del eje Y
 * @param {string} [props.label] - Nombre de la serie
 * @param {string} [props.color] - Color primario del gráfico
 * @param {number} [props.height] - Altura en px
 */
export default function LineChart({
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
        borderColor: color,
        backgroundColor: `${color}18`,
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        borderWidth: 2.5,
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
          maxRotation: 45,
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
      <Line data={chartData} options={options} />
    </div>
  );
}
