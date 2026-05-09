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
