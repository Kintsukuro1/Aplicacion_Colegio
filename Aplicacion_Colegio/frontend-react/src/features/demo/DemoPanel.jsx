import React, {useEffect, useState} from 'react';
import { apiClient } from '../../lib/apiClient';

export default function DemoPanel() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    apiClient.get('/api/v1/demo/panel/')
      .then(payload => {
        if (!mounted) return;
        setData(payload);
      })
      .catch(err => {
        if (!mounted) return;
        setError(err);
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false };
  }, []);

  if (loading) return <div>Cargando demo…</div>;
  if (error) return <div>Error cargando demo</div>;
  if (!data) return <div>No hay datos demo.</div>;

  return (
    <article className="card section-card">
      <h3>Contenido demo</h3>
      <div className="counts">
        <div>Tareas: {data.counts.tareas}</div>
        <div>Materiales: {data.counts.materiales}</div>
        <div>Bloques: {data.counts.bloques}</div>
      </div>

      <h4>Tareas recientes</h4>
      <ul>
        {data.tareas.map(t => (
          <li key={t.id_tarea}>{t.titulo} — {t.clase_nombre} — entrega: {t.fecha_entrega}</li>
        ))}
      </ul>

      <h4>Materiales</h4>
      <ul>
        {data.materiales.map(m => (
          <li key={m.id_material}>{m.titulo} — {m.clase_nombre}</li>
        ))}
      </ul>

      <h4>Horario (muestra por día)</h4>
      {Object.keys(data.horario || {}).map(dia => (
        <div key={dia}>
          <strong>{dia}</strong>
          <ul>
            {data.horario[dia].map(b => (
              <li key={b.id_bloque}>{b.hora_inicio} - {b.hora_fin} — {b.clase_nombre}</li>
            ))}
          </ul>
        </div>
      ))}
    </article>
  );
}
