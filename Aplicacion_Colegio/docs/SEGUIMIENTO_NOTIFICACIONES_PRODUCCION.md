# Seguimiento Notificaciones Produccion

## Pasos a seguir

1. Auditar estado actual de notificaciones (modelos, rutas, settings, channels).
2. Implementar servicio unificado de entrega por canales:
   - Web in-app (Notificacion)
   - Push FCM
   - Email transaccional
3. Implementar registro y gestion de dispositivos FCM por usuario.
4. Integrar envio en tiempo real via Channels para notificaciones web.
5. Exponer endpoint SSE de solo lectura para clientes que no usen WebSocket.
6. Exponer endpoints API v1 para:
   - registrar/desactivar dispositivo
   - listar notificaciones
   - marcar como leida
   - stream SSE
7. Agregar pruebas unitarias API y de servicio para validar:
   - aislamiento tenant
   - permisos
   - entrega por canal
   - funcionamiento de stream en tiempo real
8. Documentar variables de entorno de produccion para FCM y SMTP.

## Reglas del proyecto aplicadas

1. Fuente unica de autorizacion: `PolicyService` via `HasCapability` cuando aplique.
2. Multi-tenant obligatorio: consultas filtradas por `rbd_colegio` salvo admin global.
3. Cambios incrementales: agregar capa nueva sin romper endpoints legacy.
4. Seguridad primero: no exponer tokens FCM ni datos sensibles en responses.
5. Compatibilidad: fallback seguro si FCM no esta configurado en entorno.

## Alcance de esta iteracion

- Entregar base productiva para Push FCM, Email transaccional y real-time (WebSocket/SSE).
- Dejar contratos API v1 para consumo de app movil y frontend React.

## Iteracion 2026-03-17 - Notificaciones academicas y mensajeria

### Pasos a seguir

1. Habilitar señales en academico y mensajeria para emitir notificaciones al crear eventos de dominio.
2. Cubrir eventos de estudiante:
   - tarea asignada
   - evaluacion planificada
   - nota publicada
   - mensaje recibido
3. Cubrir eventos de profesor:
   - mensaje recibido
   - recordatorio cuando es el dia de tarea o evaluacion (prueba/actividad)
4. Agregar comando de gestion diario para recordatorios del dia evitando duplicados.
5. Extender autopoblar para crear datos de mensajeria y notificaciones de validacion.
6. Verificar por BD/API y por WebSocket que los eventos se despachan correctamente.

### Reglas del proyecto aplicadas

1. Mantener multi-tenant mediante destinatarios con `rbd_colegio` consistente.
2. Reutilizar infraestructura existente de notificaciones (`Notificacion` + `post_save` dispatcher).
3. Evitar cambios destructivos en flujos legacy; solo sumar integraciones incrementales.
4. Evitar duplicados en recordatorios diarios con validacion por destinatario/enlace/fecha.
5. Mantener texto y enlaces de notificacion orientados a trazabilidad para pruebas manuales.

### Estado de implementacion

1. Senales habilitadas en academico y mensajeria mediante `ready()` en AppConfig.
2. Eventos implementados para estudiante:
   - `tarea_nueva`
   - `evaluacion`
   - `calificacion`
   - `mensaje_nuevo`
3. Eventos implementados para profesor:
   - `mensaje_nuevo`
   - `tarea_entregada`
   - notificacion inmediata al programar tarea/evaluacion
   - recordatorio diario de tarea/evaluacion del dia (`tipo=alerta`)
4. Auto-seed extendido en `autopoblar.py` con `poblar_notificaciones()` para escenario funcional.
5. Comando diario agregado: `notify_profesores_eventos_hoy` con anti-duplicado por titulo/enlace/fecha/destinatario.

### Evidencia de verificacion (2026-03-17)

1. `python manage.py check`: sin issues.
2. `python manage.py help notify_profesores_eventos_hoy`: comando registrado correctamente.
3. `python autopoblar.py`: ejecucion completa exitosa.
4. Pruebas unitarias focalizadas: `tests/unit/notificaciones/test_signals.py` -> 5 passed.
5. API funcional:
   - estudiante (`alumno1@colegio.cl`): `/api/v1/notificaciones/` y `/api/v1/notificaciones/resumen/` en 200.
   - profesor (`javier.torres@colegio.cl`): `/api/v1/notificaciones/` y `/api/v1/notificaciones/resumen/` en 200.
