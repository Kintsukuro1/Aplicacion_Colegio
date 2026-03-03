from django import template

register = template.Library()

@register.filter
def asignaturas_unicas(clases):
    """
    Toma un queryset de clases y devuelve una lista de nombres de asignaturas únicos,
    separados por comas.
    """
    if not clases:
        return "Sin asignaturas"

    asignaturas = set()
    for clase in clases:
        if clase.activo and clase.asignatura:
            asignaturas.add(clase.asignatura.nombre)

    if asignaturas:
        return ", ".join(sorted(asignaturas))
    else:
        return "Sin asignaturas"