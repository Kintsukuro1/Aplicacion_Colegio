import { useMemo, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { SummarySkeleton } from '../../components/TableLoadingState';
import { formatNumber } from '../../lib/formatters';

function formatPercentage(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return `${formatNumber(value, '-')}%`;
}

function buildAverage(items) {
  let total = 0;
  let count = 0;
  for (const item of items) {
    const value = Number(item?.promedio);
    if (!Number.isNaN(value)) {
      total += value;
      count += 1;
    }
  }

  if (count === 0) {
    return null;
  }

  return total / count;
}



import { StudentProfileTab } from './StudentProfileTab';
import { StudentClassesTab } from './StudentClassesTab';
import { StudentGradesTab } from './StudentGradesTab';
import { StudentAttendanceTab } from './StudentAttendanceTab';
import { StudentHistoryTab } from './StudentHistoryTab';

export default function StudentSelfPage() {
  const [activeTab, setActiveTab] = useState('student-profile');
  const [selectedCycle, setSelectedCycle] = useState('');

  const { data: profile, isLoading: loadingProfile, error: profileErrorObj } = useQuery({
    queryKey: ['student-profile'],
    queryFn: () => apiClient.get('/api/v1/estudiante/mi-perfil/')
  });
  const { data: classesData = [], isLoading: loadingClasses, error: classesErrorObj } = useQuery({
    queryKey: ['student-classes'],
    queryFn: () => apiClient.get('/api/v1/estudiante/mis-clases/')
  });
  const { data: gradesData = [], isLoading: loadingGrades, error: gradesErrorObj } = useQuery({
    queryKey: ['student-grades'],
    queryFn: () => apiClient.get('/api/v1/estudiante/mis-notas/')
  });
  const { data: attendanceData = [], isLoading: loadingAttendance, error: attendanceErrorObj } = useQuery({
    queryKey: ['student-attendance'],
    queryFn: () => apiClient.get('/api/v1/estudiante/mi-asistencia/')
  });

  const profileError = profileErrorObj?.message;
  const classesError = classesErrorObj?.message;
  const gradesError = gradesErrorObj?.message;
  const attendanceError = attendanceErrorObj?.message;
  
  const classes = Array.isArray(classesData) ? classesData : [];
  const grades = Array.isArray(gradesData) ? gradesData : [];
  const attendance = Array.isArray(attendanceData) ? attendanceData : [];

  const historyUrl = selectedCycle 
    ? `/api/v1/estudiante/historial-academico/?ciclo=${selectedCycle}`
    : '/api/v1/estudiante/historial-academico/';
  const { 
    data: history, 
    isLoading: loadingHistory, 
    error: historyErrorObj 
  } = useQuery({
    queryKey: ['student-history', selectedCycle],
    queryFn: () => apiClient.get(historyUrl)
  });
  const historyError = historyErrorObj?.message;

  // We need an effect to sync selectedCycle based on the loaded history
  useEffect(() => {
    if (!selectedCycle && history?.ciclo?.id) {
      setSelectedCycle(String(history.ciclo.id));
    }
  }, [history, selectedCycle]);

  const summaryLoading = loadingProfile || loadingClasses || loadingGrades || loadingAttendance || loadingHistory;
  const hasAnyError = profileError || classesError || gradesError || attendanceError || historyError;

  const quickLinks = [
    { id: 'student-profile', label: 'Mi Perfil' },
    { id: 'student-classes', label: 'Mis Clases' },
    { id: 'student-grades', label: 'Mis Notas' },
    { id: 'student-attendance', label: 'Mi Asistencia' },
    { id: 'student-history', label: 'Historial Académico' },
  ];

  const profileCards = useMemo(() => {
    const subjectCount = classes.length;
    const gradeAverage = buildAverage(history?.asignaturas || []);
    const attendanceAverage = history?.asignaturas?.length
      ? buildAverage(history.asignaturas.map((item) => ({ promedio: item.porcentaje_asistencia })))
      : null;
    const pendingTasks = Array.isArray(grades)
      ? grades.reduce((acc, item) => acc + (Number(item?.pendientes) || 0), 0)
      : 0;

    return [
      {
        title: 'Mi Curso',
        value: profile?.curso_actual || profile?.curso || 'Sin curso',
        subtitle: profile?.colegio || profile?.escuela || 'Perfil estudiante',
      },
      {
        title: 'Asignaturas',
        value: subjectCount,
        subtitle: subjectCount > 0 ? 'Clases activas en el ciclo' : 'Sin clases registradas',
      },
      {
        title: 'Promedio general',
        value: gradeAverage !== null ? formatNumber(gradeAverage, '-') : '-',
        subtitle: gradeAverage !== null ? 'Promedio ponderado del historial' : 'Aún no hay notas suficientes',
      },
      {
        title: 'Asistencia',
        value: attendanceAverage !== null ? formatPercentage(attendanceAverage) : '-',
        subtitle: attendanceAverage !== null ? 'Promedio del ciclo actual' : 'Sin datos de asistencia',
      },
      {
        title: 'Tareas pendientes',
        value: pendingTasks,
        subtitle: pendingTasks > 0 ? 'Revisa tareas abiertas' : 'Sin tareas pendientes',
      },
    ];
  }, [classes.length, grades, history, profile]);

  const historyAverage = useMemo(() => buildAverage(history?.asignaturas || []), [history]);

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Estudiante: Mi Panel</h2>
          <p>Resumen personal con perfil, clases, notas, asistencia e historial académico.</p>
        </div>
      </header>

      <div className="tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {quickLinks.map((link) => (
          <button
            key={link.id}
            type="button"
            className={activeTab === link.id ? 'primary' : 'secondary'}
            onClick={() => setActiveTab(link.id)}
            style={{ whiteSpace: 'nowrap' }}
          >
            {link.label}
          </button>
        ))}
      </div>

      <div className="stack">
        {activeTab === 'student-profile' && <StudentProfileTab profile={profile} loading={loadingProfile} error={profileError} />}
        {activeTab === 'student-classes' && <StudentClassesTab classes={classes} loading={loadingClasses} error={classesError} />}
        {activeTab === 'student-grades' && <StudentGradesTab grades={grades} loading={loadingGrades} error={gradesError} />}
        {activeTab === 'student-attendance' && <StudentAttendanceTab attendance={attendance} loading={loadingAttendance} error={attendanceError} />}
        {activeTab === 'student-history' && (
          <StudentHistoryTab
            history={history}
            loading={loadingHistory}
            error={historyError}
            selectedCycle={selectedCycle}
            onCycleChange={setSelectedCycle}
            historyAverage={historyAverage}
            formatPercentage={formatPercentage}
          />
        )}
      </div>
    </section>
  );
}

