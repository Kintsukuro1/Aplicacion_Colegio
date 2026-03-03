/** GESTIONAR TAREAS - PROFESOR */

function mostrarModalCrear() {
    document.getElementById('modalCrearTarea').style.display = 'flex';
}

function cerrarModalCrear() {
    document.getElementById('modalCrearTarea').style.display = 'none';
    document.getElementById('formCrearTarea').reset();
}

function submitCrearTarea() {
    const form = document.getElementById('formCrearTarea');
    if (form.checkValidity()) {
        form.submit();
    } else {
        form.reportValidity();
    }
}

function eliminarTarea(tareaId) {
    if (confirm('¿Eliminar esta tarea? Se eliminarán todas las entregas asociadas.')) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.innerHTML = `
            <input type="hidden" name="csrfmiddlewaretoken" value="${getCsrfToken()}">
            <input type="hidden" name="accion" value="eliminar_tarea">
            <input type="hidden" name="tarea_id" value="${tareaId}">
        `;
        document.body.appendChild(form);
        form.submit();
    }
}

function getCsrfToken() {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
