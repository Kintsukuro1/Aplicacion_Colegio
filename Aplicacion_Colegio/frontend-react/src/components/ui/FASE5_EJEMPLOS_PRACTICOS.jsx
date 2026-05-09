/**
 * FASE5_EJEMPLOS_PRACTICOS.jsx
 * 
 * Colección de ejemplos listos para copiar/pegar
 * Demuestra cómo usar los componentes UI en escenarios reales
 */

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
  SidebarMenu 
} from '@/components/ui';
import { useTasks, useCreateTask, useUpdateTaskStatus } from '@/lib/hooks';

/**
 * EJEMPLO 1: CRUD Básico — Crear/Editar Tareas
 */
export function CRUDTasksExample() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', dueDate: '' });
  const { mutate: createTask, isPending } = useCreateTask();

  const handleSubmit = () => {
    createTask(formData, {
      onSuccess: () => {
        setIsOpen(false);
        setFormData({ title: '', description: '', dueDate: '' });
      },
    });
  };

  return (
    <>
      {/* Botón para abrir modal */}
      <Button variant="primary" onClick={() => setIsOpen(true)}>
        ➕ Nueva Tarea
      </Button>

      {/* Modal CRUD */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Crear Nueva Tarea"
        size="md"
        footer={
          <>
            <Button 
              variant="secondary" 
              onClick={() => setIsOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button 
              variant="primary" 
              loading={isPending}
              onClick={handleSubmit}
            >
              Crear
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Título</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ej: Ensayo de Filosofía"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="3"
              placeholder="Detalles de la tarea..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fecha de Entrega</label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </Modal>
    </>
  );
}

/**
 * EJEMPLO 2: Lista de Tarjetas con React Query
 */
export function TaskCardsGridExample() {
  const { tasks, isLoading, error } = useTasks();

  if (error) {
    return (
      <Card variant="default" className="border-red-200 bg-red-50">
        <CardBody className="text-red-700">
          ❌ Error al cargar tareas. Intenta de nuevo.
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {isLoading ? (
        // Skeletons
        [1, 2, 3].map((i) => (
          <Card key={i} variant="default">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
            </div>
          </Card>
        ))
      ) : tasks?.length ? (
        tasks.map((task) => (
          <Card key={task.id} variant="hover_lift">
            <CardHeader 
              title={task.titulo}
              subtitle={task.asignatura}
              icon="✓"
            />
            <CardBody>{task.descripcion}</CardBody>
            <CardFooter>
              <Badge variant={
                task.estado === 'entregada' ? 'success' :
                task.estado === 'pendiente' ? 'warning' :
                'info'
              }>
                {task.estado.toUpperCase()}
              </Badge>
            </CardFooter>
          </Card>
        ))
      ) : (
        <Card variant="default" className="col-span-full text-center py-8">
          <CardBody>📭 No hay tareas</CardBody>
        </Card>
      )}
    </div>
  );
}

/**
 * EJEMPLO 3: Tabla con Acciones
 */
export function TasksTableExample() {
  const { tasks, isLoading } = useTasks();
  const [deleteModal, setDeleteModal] = useState({ open: false, taskId: null });
  const { mutate: deleteTask, isPending } = useDeleteTask();

  const handleDelete = (taskId) => {
    deleteTask(taskId, {
      onSuccess: () => setDeleteModal({ open: false, taskId: null }),
    });
  };

  return (
    <>
      <Card variant="default">
        <CardHeader title="📋 Lista de Tareas" />
        <CardBody>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium">Título</th>
                    <th className="text-left py-2 px-3 font-medium">Estado</th>
                    <th className="text-left py-2 px-3 font-medium">Entrega</th>
                    <th className="text-right py-2 px-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks?.map((task) => (
                    <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3">{task.titulo}</td>
                      <td className="py-2 px-3">
                        <Badge variant={
                          task.estado === 'entregada' ? 'success' : 'warning'
                        } size="sm">
                          {task.estado}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-gray-600">{task.fechaEntrega}</td>
                      <td className="py-2 px-3 text-right space-x-2">
                        <Button variant="ghost" size="sm">
                          ✏️ Editar
                        </Button>
                        <Button 
                          variant="danger" 
                          size="sm"
                          onClick={() => setDeleteModal({ open: true, taskId: task.id })}
                        >
                          🗑️
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Modal de confirmación de eliminación */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, taskId: null })}
        title="Confirmar Eliminación"
        size="sm"
        footer={
          <>
            <Button 
              variant="secondary" 
              onClick={() => setDeleteModal({ open: false, taskId: null })}
            >
              Cancelar
            </Button>
            <Button 
              variant="danger" 
              loading={isPending}
              onClick={() => handleDelete(deleteModal.taskId)}
            >
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-gray-700">
          ⚠️ Esta acción no se puede deshacer. ¿Estás seguro?
        </p>
      </Modal>
    </>
  );
}

/**
 * EJEMPLO 4: Dashboard Modular con Sidebar
 */
export function ModularDashboardExample() {
  const [activeSection, setActiveSection] = useState('overview');

  const menuItems = [
    { id: 'overview', label: 'Resumen', icon: '📊' },
    { id: 'tasks', label: 'Mis Tareas', icon: '✓' },
    { id: 'grades', label: 'Calificaciones', icon: '📈' },
    { id: 'messages', label: 'Mensajes', icon: '💬', children: [
      { id: 'inbox', label: 'Bandeja' },
      { id: 'sent', label: 'Enviados' },
    ] },
    { id: 'calendar', label: 'Calendario', icon: '📅' },
  ];

  const sidebar = (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-blue-600 px-4">🎓 Colegio</h1>
      <SidebarMenu 
        items={menuItems} 
        activeItem={activeSection} 
        onSelect={setActiveSection} 
      />
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewSection />;
      case 'tasks':
        return <TaskCardsGridExample />;
      case 'grades':
        return <GradesSection />;
      default:
        return <div className="p-6">Sección en construcción</div>;
    }
  };

  return (
    <SidebarLayout sidebar={sidebar} mobileBreakpoint="lg">
      <div className="p-6">
        {renderContent()}
      </div>
    </SidebarLayout>
  );
}

/**
 * EJEMPLO 5: Confirmación Destructiva
 */
export function ConfirmationModalExample() {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { mutate: markAsCompleted, isPending } = useUpdateTaskStatus();

  return (
    <>
      <Button variant="danger" onClick={() => setDeleteOpen(true)}>
        🗑️ Eliminar Tarea
      </Button>

      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="⚠️ Advertencia"
        size="sm"
        footer={
          <>
            <Button 
              variant="secondary" 
              onClick={() => setDeleteOpen(false)}
            >
              No, cancelar
            </Button>
            <Button 
              variant="danger" 
              loading={isPending}
              onClick={() => {
                markAsCompleted({ status: 'deleted' }, {
                  onSuccess: () => setDeleteOpen(false),
                });
              }}
            >
              Sí, eliminar
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-gray-700 font-medium">
            ¿Estás seguro de que deseas eliminar esta tarea?
          </p>
          <p className="text-sm text-gray-500">
            Esta acción no se puede deshacer y todos los datos asociados se perderán.
          </p>
        </div>
      </Modal>
    </>
  );
}

/**
 * EJEMPLO 6: Stats Grid
 */
export function StatsGridExample() {
  const stats = [
    { label: 'Tareas Pendientes', value: 5, icon: '⏳', color: 'blue' },
    { label: 'Tareas Entregadas', value: 12, icon: '✓', color: 'green' },
    { label: 'Promedio', value: '7.8', icon: '📊', color: 'purple' },
    { label: 'Asistencia', value: '95%', icon: '📅', color: 'orange' },
  ];

  return (
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
  );
}

/**
 * AUXILIARES
 */

function OverviewSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Bienvenido</h2>
      <StatsGridExample />
    </div>
  );
}

function GradesSection() {
  return (
    <Card variant="default">
      <CardHeader title="📈 Mis Calificaciones" />
      <CardBody>Calificaciones aquí...</CardBody>
    </Card>
  );
}

function getColorClass(color) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };
  return colors[color] || colors.blue;
}

// Placeholder hooks (reemplazar con reales)
function useDeleteTask() {
  return { mutate: (id, cb) => cb.onSuccess?.(), isPending: false };
}

export default CRUDTasksExample;
