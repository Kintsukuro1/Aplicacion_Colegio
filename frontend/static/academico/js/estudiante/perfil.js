/** PERFIL - ESTUDIANTE */

document.addEventListener('DOMContentLoaded', function() {
    initTabs();
    initPasswordValidation();
    initCardsAnimation();
});

// Cambiar foto de perfil
function cambiarFoto(input) {
    if (input.files && input.files[0]) {
        const formData = new FormData();
        formData.append('foto', input.files[0]);
        
        if (typeof ToastManager !== 'undefined') {
            ToastManager.info('Subiendo foto...', 2000);
            
            // TODO: Implementar AJAX para subir foto
            setTimeout(() => {
                ToastManager.success('¡Foto actualizada exitosamente!');
                
                // Previsualizar imagen
                const reader = new FileReader();
                reader.onload = function(e) {
                    const avatarImg = document.querySelector('.profile-avatar');
                    if (avatarImg.tagName === 'IMG') {
                        avatarImg.src = e.target.result;
                    }
                };
                reader.readAsDataURL(input.files[0]);
            }, 2000);
        }
    }
}

// Validar que las contraseñas coincidan
function initPasswordValidation() {
    const passwordConfirm = document.getElementById('password_confirmar');
    
    if (passwordConfirm) {
        passwordConfirm.addEventListener('input', function() {
            const nueva = document.getElementById('password_nueva').value;
            const confirmar = this.value;
            
            if (nueva && confirmar && nueva !== confirmar) {
                this.setCustomValidity('Las contraseñas no coinciden');
            } else {
                this.setCustomValidity('');
            }
        });
    }
}

// Resetear formulario de seguridad
function resetSecurityForm() {
    const form = document.querySelector('#seguridad form');
    if (form) {
        form.reset();
    }
}

// Inicializar tabs
function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    const panes = document.querySelectorAll('.tab-pane');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetId = this.getAttribute('data-tab');
            
            // Actualizar tabs activos
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Actualizar panes activos
            panes.forEach(pane => {
                if (pane.id === targetId) {
                    pane.classList.add('active');
                } else {
                    pane.classList.remove('active');
                }
            });
        });
    });
}

// Animación de entrada
function initCardsAnimation() {
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 80);
    });
}
