document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.notificaciones-container');
    const btn = document.getElementById('btnNotificaciones');
    const dropdown = document.getElementById('dropdownNotificaciones');
    const list = document.getElementById('listNotificaciones');
    const badge = document.getElementById('badgeNotificaciones');
    const btnMarkAll = document.getElementById('btnMarcarTodas');

    if (!container || !btn || !dropdown || !list || !badge || !btnMarkAll) {
        return;
    }

    const API = {
        summary: '/api/v1/notificaciones/resumen/',
        list: '/api/v1/notificaciones/?limit=30',
        markAll: '/api/v1/notificaciones/marcar-todas-leidas/',
        markOne: (id) => `/api/v1/notificaciones/${id}/marcar-leida/`,
    };

    const POLL_MS = 30000;
    const REQUEST_TIMEOUT_MS = 10000;
    let notifications = [];
    let unreadCount = 0;
    let loading = false;

    function isValidCsrfToken(token) {
        if (!token) {
            return false;
        }
        const cleaned = String(token).trim();
        if (cleaned === 'NOTPROVIDED') {
            return false;
        }
        return /^[A-Za-z0-9]{32}$/.test(cleaned) || /^[A-Za-z0-9]{64}$/.test(cleaned);
    }

    function getCsrfToken() {
        // Prefer explicit template token, then cookie, then hidden input/meta.
        const templateToken = container.dataset.csrfToken;
        if (isValidCsrfToken(templateToken)) {
            return String(templateToken).trim();
        }

        const cookieMatch = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
        if (cookieMatch && cookieMatch[1]) {
            const cookieToken = decodeURIComponent(cookieMatch[1]);
            if (isValidCsrfToken(cookieToken)) {
                return cookieToken;
            }
        }

        const inputToken = document.querySelector('input[name="csrfmiddlewaretoken"]');
        if (inputToken && isValidCsrfToken(inputToken.value)) {
            return String(inputToken.value).trim();
        }

        const metaToken = document.querySelector('meta[name="csrf-token"]');
        if (metaToken) {
            const content = metaToken.getAttribute('content');
            if (isValidCsrfToken(content)) {
                return String(content).trim();
            }
        }

        return '';
    }

    function escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function timeAgo(isoDate) {
        const now = new Date();
        const date = new Date(isoDate);
        const diffMs = now - date;
        const minutes = Math.floor(diffMs / 60000);

        if (!Number.isFinite(minutes) || minutes < 1) return 'ahora';
        if (minutes < 60) return `hace ${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `hace ${hours}h`;
        const days = Math.floor(hours / 24);
        return `hace ${days}d`;
    }

    function normalizeNotificationLink(rawLink) {
        const link = String(rawLink || '').trim();
        if (!link) {
            return '#';
        }

        // Compatibilidad legacy: /dashboard/?pagina=clase&id=<id>&...
        if (link.startsWith('/dashboard/?pagina=clase')) {
            try {
                const search = link.split('?')[1] || '';
                const params = new URLSearchParams(search);
                const claseId = params.get('id');

                if (!claseId) {
                    return '/dashboard/?pagina=mis_clases';
                }

                params.delete('pagina');
                params.delete('id');
                const rest = params.toString();
                return rest
                    ? `/estudiante/clase/${claseId}/?${rest}`
                    : `/estudiante/clase/${claseId}/`;
            } catch (_error) {
                return '/dashboard/?pagina=mis_clases';
            }
        }

        return link;
    }

    async function apiRequest(path, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        const headers = {
            Accept: 'application/json',
            ...(options.headers || {}),
        };

        if (options.method && options.method !== 'GET') {
            const csrfToken = getCsrfToken();
            if (csrfToken) {
                headers['X-CSRFToken'] = csrfToken;
            }
            headers['Content-Type'] = 'application/json';
        }

        try {
            const response = await fetch(path, {
                ...options,
                credentials: 'same-origin',
                headers,
                signal: controller.signal,
            });

            let payload = null;
            try {
                payload = await response.json();
            } catch (_error) {
                payload = null;
            }

            if (!response.ok) {
                const detail = payload && payload.detail ? payload.detail : `HTTP ${response.status}`;
                throw new Error(detail);
            }

            return payload;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    function setLoadingState() {
        loading = true;
        list.innerHTML = '<div class="notif-loading">Cargando...</div>';
    }

    function setErrorState(message) {
        loading = false;
        list.innerHTML = `<div class="notif-empty">${escapeHtml(message)}</div>`;
    }

    function renderBadge() {
        if (unreadCount > 0) {
            badge.style.display = 'inline-flex';
            badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
        } else {
            badge.style.display = 'none';
            badge.textContent = '0';
        }
    }

    function renderList() {
        loading = false;

        if (!Array.isArray(notifications) || notifications.length === 0) {
            list.innerHTML = '<div class="notif-empty">Sin notificaciones</div>';
            return;
        }

        list.innerHTML = notifications
            .map((n) => {
                const title = escapeHtml(n.titulo || 'Notificacion');
                const message = escapeHtml(n.mensaje || '');
                const unreadClass = n.leido ? '' : ' notif-no-leida';
                const meta = timeAgo(n.fecha_creacion);

                const normalizedLink = normalizeNotificationLink(n.enlace);

                return `
                    <a href="${escapeHtml(normalizedLink)}" class="notif-item${unreadClass}" data-id="${n.id}">
                        <div class="notif-item-content">
                            <div class="notif-item-title">${title}</div>
                            <div class="notif-item-message">${message}</div>
                            <div class="notif-item-meta">${meta}</div>
                        </div>
                    </a>
                `;
            })
            .join('');
    }

    async function fetchSummary() {
        try {
            const data = await apiRequest(API.summary);
            unreadCount = Number(data && data.unread_count ? data.unread_count : 0);
            renderBadge();
        } catch (_error) {
            // Non-critical for UX; keep current badge if summary fails.
        }
    }

    async function fetchNotifications() {
        setLoadingState();
        try {
            const data = await apiRequest(API.list);
            notifications = Array.isArray(data) ? data : [];
            unreadCount = notifications.filter((n) => !n.leido).length;
            renderBadge();
            renderList();
        } catch (error) {
            setErrorState('No se pudieron cargar las notificaciones.');
            console.error('[Notificaciones] Error al cargar lista:', error);
        }
    }

    async function markNotificationRead(notificationId) {
        try {
            await apiRequest(API.markOne(notificationId), { method: 'POST', body: '{}' });
            notifications = notifications.map((n) => (n.id === notificationId ? { ...n, leido: true } : n));
            unreadCount = notifications.filter((n) => !n.leido).length;
            renderBadge();
            renderList();
        } catch (error) {
            console.error('[Notificaciones] Error al marcar notificacion:', error);
        }
    }

    async function markAllRead() {
        try {
            await apiRequest(API.markAll, { method: 'POST', body: '{}' });
            notifications = notifications.map((n) => ({ ...n, leido: true }));
            unreadCount = 0;
            renderBadge();
            renderList();
        } catch (error) {
            console.error('[Notificaciones] Error al marcar todas:', error);
        }
    }

    const isOpen = () => dropdown.style.display !== 'none';

    const open = () => {
        dropdown.style.display = 'block';
        fetchNotifications();
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

    btnMarkAll.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        markAllRead();
    });

    list.addEventListener('click', (event) => {
        const item = event.target.closest('.notif-item');
        if (!item) {
            return;
        }

        const idRaw = item.dataset.id;
        const notificationId = Number(idRaw);
        if (!Number.isFinite(notificationId)) {
            return;
        }

        const clicked = notifications.find((n) => n.id === notificationId);
        if (clicked && !clicked.leido) {
            markNotificationRead(notificationId);
        }
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

    // Carga inicial de badge + polling de resumen.
    fetchSummary();
    setInterval(() => {
        fetchSummary();
        if (isOpen() && !loading) {
            fetchNotifications();
        }
    }, POLL_MS);
});
