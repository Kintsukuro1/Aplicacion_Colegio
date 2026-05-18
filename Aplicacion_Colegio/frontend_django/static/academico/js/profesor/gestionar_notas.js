/** GESTIONAR NOTAS - PROFESOR */

document.addEventListener('DOMContentLoaded', function() {
    initTableAnimations();
});

// Abrir modal crear evaluación
function abrirModalCrearEvaluacion() {
    document.getElementById('modal-crear-evaluacion').style.display = 'flex';
}

// Cerrar modal crear evaluación
function cerrarModalCrearEvaluacion() {
    document.getElementById('modal-crear-evaluacion').style.display = 'none';
    document.getElementById('form-crear-evaluacion').reset();
}

// Submit crear evaluación
function submitCrearEvaluacion() {
    const form = document.getElementById('form-crear-evaluacion');
    
    if (form.checkValidity()) {
        form.submit();
    } else {
        form.reportValidity();
    }
}

// Calificar evaluación
function calificarEvaluacion(evaluacionId) {
    // TODO: Redirigir a página de calificación o abrir modal
    window.location.href = `?pagina=notas&modo=calificar&evaluacion_id=${evaluacionId}`;
}

// Editar evaluación
function editarEvaluacion(evaluacionId) {
    // TODO: Abrir modal de edición con datos precargados
    if (typeof ToastManager !== 'undefined') {
        ToastManager.info('Función de edición en desarrollo');
    }
}

// Eliminar evaluación
function eliminarEvaluacion(evaluacionId) {
    if (confirm('¿Estás seguro de eliminar esta evaluación? Se eliminarán todas las calificaciones asociadas.')) {
        // TODO: Enviar solicitud de eliminación
        const form = document.createElement('form');
        form.method = 'POST';
        form.innerHTML = `
            <input type="hidden" name="csrfmiddlewaretoken" value="${getCsrfToken()}">
            <input type="hidden" name="accion" value="eliminar_evaluacion">
            <input type="hidden" name="evaluacion_id" value="${evaluacionId}">
        `;
        document.body.appendChild(form);
        form.submit();
    }
}

// Obtener CSRF token
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

// Animaciones de tabla
function initTableAnimations() {
    const rows = document.querySelectorAll('.table tbody tr');
    rows.forEach((row, index) => {
        row.style.opacity = '0';
        row.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            row.style.transition = 'all 0.3s ease';
            row.style.opacity = '1';
            row.style.transform = 'translateY(0)';
        }, index * 50);
    });
}

// Cerrar modal con ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal-backdrop');
        modals.forEach(modal => {
            if (modal.style.display === 'flex') {
                modal.style.display = 'none';
            }
        });
    }
});
