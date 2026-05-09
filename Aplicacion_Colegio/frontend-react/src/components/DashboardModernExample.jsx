import React, { useState } from 'react';
import {
  Modal,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Badge,
  Button,
  SidebarLayout,
  SidebarMenu,
} from '@/components/ui';
import { useTasks } from '@/lib/hooks';

/**
 * DashboardModernExample — Dashboard rediseñado con Fase 5
 * 
 * Demuestra:
 * - SidebarLayout responsive
 * - Cards con animaciones
 * - Modales para acciones
 * - Badges para estados
 * - React Query para datos reales
 */
export function DashboardModernExample() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const { tasks, isLoading } = useTasks();

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
    },
    {
      id: 'tareas',
      label: 'Mis Tareas',
      icon: '✓',
    },
    {
      id: 'calificaciones',
      label: 'Calificaciones',
      icon: '📈',
    },
    {
      id: 'asistencia',
      label: 'Asistencia',
      icon: '📅',
    },
    {
      id: 'mensajes',
      label: 'Mensajes',
      icon: '💬',
      children: [
        { id: 'bandeja', label: 'Bandeja de Entrada' },
        { id: 'archivados', label: 'Archivados' },
      ],
    },
  ];

  const sidebar = (
    <div className="space-y-6">
      {/* Logo */}
      <div className="px-4 py-2">
        <h1 className="text-xl font-bold text-blue-600">🎓 Colegio</h1>
      </div>

      {/* Menu */}
      <SidebarMenu
        items={menuItems}
        activeItem={activeMenu}
        onSelect={setActiveMenu}
      />

      {/* User Section */}
      <div className="mt-auto p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center">
            👤
          </div>
          <div className="text-sm">
            <p className="font-bold">Juan Pérez</p>
            <p className="text-gray-500 text-xs">Estudiante</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <SidebarLayout sidebar={sidebar}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Bienvenido, Juan
            </h1>
            <p className="text-gray-600">
              {new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            ➕ Agregar Tarea
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard label="Tareas Pendientes" value={tasks?.filter(t => t.estado === 'pendiente')?.length || 0} icon="⏳" color="blue" />
          <StatsCard label="Tareas Entregadas" value={tasks?.filter(t => t.estado === 'entregada')?.length || 0} icon="✓" color="green" />
          <StatsCard label="Promedio" value="7.8" icon="📊" color="purple" />
          <StatsCard label="Asistencia" value="95%" icon="📅" color="orange" />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tareas Próximas */}
            <Card variant="default">
              <CardHeader title="📋 Próximas Entregas" subtitle="Ordenadas por fecha" />
              <CardBody>
                {isLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ) : tasks?.slice(0, 3)?.length > 0 ? (
                  <div className="space-y-3">
                    {tasks.slice(0, 3).map((task) => (
                      <TaskRow key={task.id} task={task} />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    ✨ No hay tareas pendientes
                  </p>
                )}
              </CardBody>
            </Card>

            {/* Actividad Reciente */}
            <Card variant="default">
              <CardHeader title="📌 Actividad Reciente" />
              <CardBody>
                <div className="space-y-3">
                  <ActivityItem
                    icon="📝"
                    title="Calificación publicada"
                    desc="Matemáticas: 8.5"
                    time="Hace 2 horas"
                  />
                  <ActivityItem
                    icon="💬"
                    title="Nuevo mensaje"
                    desc="Profesor García"
                    time="Hace 4 horas"
                  />
                  <ActivityItem
                    icon="✅"
                    title="Tarea corregida"
                    desc="Historia: Excelente trabajo"
                    time="Hace 1 día"
                  />
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Próximos Eventos */}
            <Card variant="hover_lift">
              <CardHeader title="📅 Próximos Eventos" />
              <CardBody>
                <div className="space-y-2">
                  <EventBadge date="Mañana" title="Prueba de Lenguaje" />
                  <EventBadge date="Viernes" title="Entrega Proyecto" />
                  <EventBadge date="20 Mayo" title="Reunión de Apoderados" />
                </div>
              </CardBody>
            </Card>

            {/* Atajos */}
            <Card variant="default">
              <CardHeader title="⚡ Acciones Rápidas" />
              <CardBody>
                <div className="space-y-2">
                  <Button variant="ghost" className="w-full justify-start">
                    📤 Entregar Tarea
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    📧 Contactar Profesor
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    📲 Ver Calificaciones
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal para agregar tarea */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Crear Nueva Tarea"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary">Crear</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Título
            </label>
            <input
              type="text"
              placeholder="Ej: Ensayo de Filosofía"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Fecha de Entrega
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Descripción
            </label>
            <textarea
              rows="3"
              placeholder="Detalles de la tarea..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </Modal>
    </SidebarLayout>
  );
}

/**
 * Componentes auxiliares
 */

function StatsCard({ label, value, icon, color }) {
  const colorMap = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <Card variant="hover_lift">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`text-4xl p-3 rounded-lg ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

function TaskRow({ task }) {
  const estadoColor = {
    pendiente: 'yellow',
    entregada: 'blue',
    corregida: 'green',
    vencida: 'red',
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
      <div className="flex-1">
        <p className="font-medium text-gray-900">{task.titulo}</p>
        <p className="text-sm text-gray-500">{task.asignatura}</p>
      </div>
      <Badge variant={estadoColor[task.estado]}>
        {task.estado.toUpperCase()}
      </Badge>
    </div>
  );
}

function ActivityItem({ icon, title, desc, time }) {
  return (
    <div className="flex gap-3 py-2">
      <span className="text-xl">{icon}</span>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{desc}</p>
        <p className="text-xs text-gray-400 mt-1">{time}</p>
      </div>
    </div>
  );
}

function EventBadge({ date, title }) {
  return (
    <div className="p-2 bg-blue-50 rounded-lg border-l-4 border-blue-500">
      <p className="text-xs font-bold text-blue-600">{date}</p>
      <p className="text-sm text-gray-900">{title}</p>
    </div>
  );
}

export default DashboardModernExample;
