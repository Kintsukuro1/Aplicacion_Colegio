/**
 * Table displaying students with selection and row actions.
 */
export function AdminStudentsTable({ rows, selectedIds, canUpdate, canDelete, onToggleSelect, onToggleSelectAll, onStartEdit, onDelete }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={rows.length > 0 && rows.every((row) => selectedIds.includes(row.id))}
                onChange={onToggleSelectAll}
                disabled={!canDelete || rows.length === 0}
                aria-label={rows.length > 0 ? 'Seleccionar todos los estudiantes de la pagina' : 'Seleccionar todos'}
              />
            </th>
            <th>ID</th>
            <th>Nombre</th>
            <th>Email</th>
            <th>RUT</th>
            <th>Activo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(row.id)}
                  onChange={() => onToggleSelect(row.id)}
                  disabled={!canDelete}
                  aria-label={`Seleccionar estudiante ${`${row.nombre} ${row.apellido_paterno || ''}`.trim()}`}
                />
              </td>
              <td>{row.id}</td>
              <td>{`${row.nombre} ${row.apellido_paterno || ''}`.trim()}</td>
              <td>{row.email}</td>
              <td>{row.rut}</td>
              <td>{row.is_active ? <span className="badge badge-active">Activo</span> : <span className="badge badge-inactive">Inactivo</span>}</td>
              <td className="actions-cell">
                {canUpdate ? (
                  <>
                    <button type="button" className="small" onClick={() => onStartEdit(row)}>
                      Editar
                    </button>
                  </>
                ) : null}
                {canDelete ? (
                  <button type="button" className="small danger" onClick={() => onDelete(row.id)}>
                    Desactivar
                  </button>
                ) : null}
                {!canUpdate && !canDelete ? <span>-</span> : null}
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan="7">Sin registros</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
