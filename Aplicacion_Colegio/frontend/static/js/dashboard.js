document.addEventListener('DOMContentLoaded', () => {
    const userMenu = document.querySelector('.user-menu');
    const userAvatar = document.querySelector('.user-menu .user-avatar');
    const userDropdown = document.getElementById('userDropdown');

    if (!userMenu || !userAvatar || !userDropdown) {
        return;
    }

    const closeUserDropdown = () => {
        userDropdown.classList.remove('show');
    };

    const toggleUserDropdown = () => {
        userDropdown.classList.toggle('show');
    };

    userAvatar.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleUserDropdown();
    });

    // Evita que clicks dentro del dropdown lo cierren
    userDropdown.addEventListener('click', (event) => {
        event.stopPropagation();
    });

    document.addEventListener('click', (event) => {
        if (!userMenu.contains(event.target)) {
            closeUserDropdown();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeUserDropdown();
        }
    });
});
