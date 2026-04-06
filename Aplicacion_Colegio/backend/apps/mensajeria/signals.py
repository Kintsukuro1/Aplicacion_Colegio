from django.db.models.signals import post_save
from django.dispatch import receiver

from backend.apps.mensajeria.models import Mensaje
from backend.apps.notificaciones.models import Notificacion


@receiver(post_save, sender=Mensaje)
def notificar_mensaje_recibido(sender, instance, created, **kwargs):
    if not created:
        return

    if instance.emisor_id == instance.receptor_id:
        return

    Notificacion.objects.create(
        destinatario=instance.receptor,
        tipo='mensaje_nuevo',
        titulo=f'Nuevo mensaje de {instance.emisor.get_full_name()}',
        mensaje=instance.contenido[:200],
        enlace=f'/dashboard/?pagina=mensajeria&conversacion={instance.conversacion_id}',
        prioridad='normal',
    )