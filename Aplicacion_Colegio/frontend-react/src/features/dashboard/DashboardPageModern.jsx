import React from 'react';
import { Card, CardHeader, CardBody, Badge, Button } from '@/components/ui';
import { useTasks } from '@/lib/hooks';

/**
 * Modern Dashboard Implementation - Fase 5.3
 * Uses Fase 5 components (Card, Badge, Button) with React Query
 * Responsive grid layout with stats, task lists, events, and quick actions
 */

export default function DashboardPageModern() {
  const { tasks, isLoading } = useTasks();

  // Stats calculated from tasks
  const stats = [
    {
      label: 'Pendientes',
      value: tasks?.filter(t => t.estado === 'pendiente')?.length || 0,
      icon: '⏳',
      color: 'yellow',
    },
    {
      label: 'Entregadas',
      value: tasks?.filter(t => t.estado === 'entregada')?.length || 0,
      icon: '✓',
      color: 'green',
    },
    {
      label: 'Promedio',
      value: '7.8',
      icon: '📊',
      color: 'purple',
    },
    {
      label: 'Asistencia',
      value: '95%',
      icon: '📅',
      color: 'orange',
    },
  ];

  // Upcoming events (mock data, replace with actual data source)
  const upcomingEvents = [
    { date: 'Mañana', title: 'Prueba de Lenguaje', color: 'blue' },
    { date: 'Viernes', title: 'Entrega Proyecto', color: 'blue' },
  ];

  // Quick actions
  const quickActions = [
    { label: '📤 Entregar Tarea', icon: '📤' },
    { label: '📧 Contactar Profesor', icon: '📧' },
    { label: '📲 Ver Calificaciones', icon: '📲' },
  ];

  // Helper function to get color classes
  const getColorClass = (color) => {
    const colors = {
      yellow: 'bg-yellow-100 text-yellow-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600',
      orange: 'bg-orange-100 text-orange-600',
    };
    return colors[color] || colors.yellow;
  };

  return (
    <div className="p-6 space-y-6">
      {/* 1. Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bienvenido, Juan</h1>
        <p className="text-gray-600 mt-1">
          {new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} variant="hover_lift">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`text-4xl p-3 rounded-lg ${getColorClass(stat.color)}`}>
                {stat.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 3. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Próximas Entregas */}
        <div className="lg:col-span-2 space-y-6">
          <Card variant="default">
            <CardHeader title="📋 Próximas Entregas" subtitle="Ordenadas por fecha" />
            <CardBody>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-10 bg-gray-200 rounded animate-pulse"
                    />
                  ))}
                </div>
              ) : tasks?.length ? (
                <div className="space-y-2">
                  {tasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{task.titulo}</p>
                        <p className="text-xs text-gray-500">{task.asignatura}</p>
                      </div>
                      <Badge
                        variant={
                          task.estado === 'entregada'
                            ? 'success'
                            : task.estado === 'vencida'
                              ? 'error'
                              : 'warning'
                        }
                      >
                        {task.estado}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">✨ No hay tareas pendientes</p>
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
                  description="Matemáticas: 8.5"
                  time="Hace 2 horas"
                />
                <ActivityItem
                  icon="📥"
                  title="Tarea entregada"
                  description="Lenguaje - Ensayo"
                  time="Hace 1 día"
                />
                <ActivityItem
                  icon="🔔"
                  title="Nuevo comunicado"
                  description="Del Profesor de Ciencias"
                  time="Hace 3 días"
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
                {upcomingEvents.map((event, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-blue-50 rounded-lg border-l-4 border-blue-500"
                  >
                    <p className="text-xs font-bold text-blue-600">{event.date}</p>
                    <p className="text-sm text-gray-900">{event.title}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Acciones Rápidas */}
          <Card variant="default">
            <CardHeader title="⚡ Acciones Rápidas" />
            <CardBody>
              <div className="space-y-2">
                {quickActions.map((action, idx) => (
                  <Button
                    key={idx}
                    variant="ghost"
                    className="w-full justify-start text-sm"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * ActivityItem Component
 * Reusable component for timeline items
 */
function ActivityItem({ icon, title, description, time }) {
  return (
    <div className="flex gap-3 pb-3 border-b border-gray-200 last:border-0">
      <div className="text-2xl flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm">{title}</p>
        <p className="text-xs text-gray-500">{description}</p>
        <p className="text-xs text-gray-400 mt-1">{time}</p>
      </div>
    </div>
  );
}
