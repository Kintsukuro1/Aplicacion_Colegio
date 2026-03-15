document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.notificaciones-container');
    const btn = document.getElementById('btnNotificaciones');
    const dropdown = document.getElementById('dropdownNotificaciones');

    if (!container || !btn || !dropdown) {
        return;
    }

    const isOpen = () => dropdown.style.display !== 'none';

    const open = () => {
        dropdown.style.display = 'block';
    };

    const close = () => {
        dropdown.style.display = 'none';
    };

    const toggle = () => {
        if (isOpen()) {
            close();
        } else {
            open();
        }
    };

    // Asegura estado inicial consistente
    if (!dropdown.style.display) {
        dropdown.style.display = 'none';
    }

    btn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle();
    });

    dropdown.addEventListener('click', (event) => {
        event.stopPropagation();
    });

    document.addEventListener('click', (event) => {
        if (!container.contains(event.target)) {
            close();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            close();
        }
    });
});
