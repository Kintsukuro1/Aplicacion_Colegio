# Resumen — APIs usadas

- Propósito: versión corta para auditoría rápida.
- Externas: hCaptcha, Webpay/Transbank y MercadoPago.
- Internas: autenticación, dashboard, notificaciones, académico, apoderado, biblioteca, finanzas, import/export y onboarding.
- Tiempo real: `ws/notificaciones/`.
- Webhooks: `/api/v1/payments/webhook/` y callbacks de pasarela.
- Idea clave: las APIs internas conectan el frontend con la lógica del backend; las externas solo resuelven seguridad y pagos.
