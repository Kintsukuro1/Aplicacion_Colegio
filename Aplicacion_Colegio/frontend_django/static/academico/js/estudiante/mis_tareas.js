/** MIS TAREAS - ESTUDIANTE */

document.addEventListener('DOMContentLoaded', function() {
    initTabs();
    initTaskAnimations();
});

// Filtrar tareas por estado
function filtrarTareas(estado) {
    const tareas = document.querySelectorAll('.tarea-item, .task-card');
    const tabs = document.querySelectorAll('.tab');
    
    tabs.forEach(tab => {
        if (tab.getAttribute('data-tab') === estado) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    tareas.forEach(tarea => {
        if (estado === 'todas') {
            tarea.style.display = 'block';
        } else if (tarea.getAttribute('data-estado')?.toLowerCase() === estado) {
            tarea.style.display = 'block';
        } else {
            tarea.style.display = 'none';
        }
    });
}

// Filtrar por asignatura
function filtrarPorAsignatura(asignatura) {
    const tareas = document.querySelectorAll('.tarea-item, .task-card');
    
    tareas.forEach(tarea => {
        if (!asignatura || tarea.getAttribute('data-asignatura') === asignatura) {
            tarea.style.display = 'block';
        } else {
            tarea.style.display = 'none';
        }
    });
}

// Ordenar tareas
function ordenarTareas(criterio) {
    console.log('Ordenar por:', criterio);
    // TODO: Implementar ordenamiento
}

// Ver detalle de tarea
function verDetalleTarea(tareaId) {
    console.log('Ver tarea:', tareaId);
    // TODO: Abrir modal o redirigir
}

// Entregar tarea
function entregarTarea(tareaId) {
    document.getElementById('tarea-id').value = tareaId;
    document.getElementById('modal-entregar-custom').style.display = 'flex';
}

// Cerrar modal
function cerrarModalEntregar() {
    document.getElementById('modal-entregar-custom').style.display = 'none';
    document.getElementById('form-entregar-tarea').reset();
}

// Submit entrega
function submitEntrega() {
    const form = document.getElementById('form-entregar-tarea');
    
    if (form.checkValidity()) {
        // TODO: Enviar formulario vía AJAX
        if (typeof ToastManager !== 'undefined') {
            ToastManager.success('¡Tarea entregada exitosamente!');
        }
        cerrarModalEntregar();
        
        setTimeout(() => {
            location.reload();
        }, 1000);
    } else {
        form.reportValidity();
    }
}

// Inicializar tabs
function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            filtrarTareas(tabName);
        });
    });
}

// Animación de entrada para tareas
function initTaskAnimations() {
    const tareas = document.querySelectorAll('.tarea-item, .task-card');
    tareas.forEach((tarea, index) => {
        tarea.style.opacity = '0';
        tarea.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            tarea.style.transition = 'all 0.3s ease';
            tarea.style.opacity = '1';
            tarea.style.transform = 'translateY(0)';
        }, index * 50);
    });
}
