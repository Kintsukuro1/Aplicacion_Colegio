import { useEffect, useState } from 'react';

import { apiClient } from '../../lib/apiClient';

export default function StudentSelfPage() {
  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [grades, setGrades] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadStudentData() {
      setLoading(true);
      setError('');
      try {
        const [p, c, g, a] = await Promise.all([
          apiClient.get('/api/v1/estudiante/mi-perfil/'),
          apiClient.get('/api/v1/estudiante/mis-clases/'),
          apiClient.get('/api/v1/estudiante/mis-notas/'),
          apiClient.get('/api/v1/estudiante/mi-asistencia/'),
        ]);
        if (active) {
          setProfile(p);
          setClasses(c || []);
          setGrades(g || []);
          setAttendance(a || []);
        }
      } catch (err) {
        if (active) {
          setError(err.payload?.detail || 'No se pudo cargar vista estudiante.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadStudentData();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section>
      <header className="page-header">
        <div>
          <h2>Estudiante: Mi Panel</h2>
          <p>Consume endpoints `estudiante/*` de API v1.</p>
        </div>
      </header>

      {loading ? <p>Cargando datos...</p> : null}
      {error ? <div className="error-box">{error}</div> : null}

      {!loading && !error ? (
        <div className="grid-2">
          <article className="card">
            <h3>Mi Perfil</h3>
            <pre>{JSON.stringify(profile, null, 2)}</pre>
          </article>
          <article className="card">
            <h3>Mis Clases ({classes.length})</h3>
            <pre>{JSON.stringify(classes, null, 2)}</pre>
          </article>
          <article className="card">
            <h3>Mis Notas ({grades.length})</h3>
            <pre>{JSON.stringify(grades, null, 2)}</pre>
          </article>
          <article className="card">
            <h3>Mi Asistencia ({attendance.length})</h3>
            <pre>{JSON.stringify(attendance, null, 2)}</pre>
          </article>
        </div>
      ) : null}
    </section>
  );
}
