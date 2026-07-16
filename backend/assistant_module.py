import re
import unicodedata


QUICK_REPLY = "¿Tienes otra consulta?"


def normalize_text(value):
    text = unicodedata.normalize("NFD", value.lower())
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    return re.sub(r"\s+", " ", text).strip()


def has_any(text, words):
    return any(word in text for word in words)


def finish(answer):
    return f"{answer}\n\n{QUICK_REPLY}"


def answer_question(question):
    normalized = normalize_text(question)

    if not normalized:
        return finish(
            "Puedo orientarte sobre cédula, BioCed, Registro Civil, certificados, "
            "centro de votación, residencia electoral, oficinas, quioscos, turnos "
            "y seguimiento de solicitudes."
        )

    if has_any(normalized, ["acta", "actas", "certificado", "certificados", "registro civil"]):
        if has_any(normalized, ["defuncion", "difusion", "fallecimiento"]):
            return finish(
                "Para un acta o certificado de defunción, TE Digital Express 360 puede orientarte "
                "sobre requisitos, datos necesarios y seguimiento, pero el asistente no "
                "emite el documento oficial por sí solo. Debes solicitarlo en el área de "
                "Registro Civil, en el portal oficial disponible o en una oficina autorizada. "
                "Ten a mano los datos de la persona inscrita y un medio de contacto."
            )

        if has_any(normalized, ["nacimiento", "matrimonio", "solteria"]):
            return finish(
                "Para actas o certificados de nacimiento, matrimonio o soltería, este "
                "sistema te guía con requisitos, pasos y estado de solicitud. La emisión "
                "oficial debe completarse por el canal autorizado del Tribunal Electoral "
                "o mediante atención de Registro Civil cuando el caso requiera revisión."
            )

        return finish(
            "Para pedir un certificado o acta, selecciona Registro Civil, indica el tipo "
            "de documento, revisa los requisitos y registra la solicitud. Si el documento "
            "requiere validación oficial, el sistema debe dirigirte al portal oficial o a "
            "una oficina del Tribunal Electoral."
        )

    if has_any(normalized, ["cedula", "bioced", "renovar", "renovacion", "duplicado", "identidad"]):
        return finish(
            "Para renovar cédula o usar BioCed, TE Digital Express 360 orienta sobre requisitos, "
            "oficina disponible, validación de datos, captura de foto, firma y biometría. "
            "El asistente no reemplaza la validación presencial ni la emisión oficial; "
            "cuando toque captura o retiro, debes acudir al punto autorizado indicado."
        )

    if has_any(normalized, ["centro de votacion", "votacion", "residencia", "electoral", "partido"]):
        return finish(
            "Para centro de votación, residencia electoral o consultas electorales, el "
            "sistema puede orientarte, mostrar pasos y llevarte al servicio correcto. "
            "Si necesitas cambiar datos electorales, debes completar la solicitud y seguir "
            "la validación que indique el Tribunal Electoral."
        )

    if has_any(normalized, ["oficina", "oficinas", "quiosco", "quioscos", "turno", "horario"]):
        return finish(
            "En oficinas y quioscos puedes consultar ubicaciones, horarios, capacidad "
            "referencial y turnos disponibles. El sistema te ayuda a escoger provincia, "
            "distrito o punto de atención; si el trámite exige presencia física, te indica "
            "dónde ir y qué debes llevar."
        )

    if has_any(normalized, ["seguimiento", "estado", "codigo", "td360", "solicitud"]):
        return finish(
            "Para dar seguimiento, usa tu código TD360 en la página de Seguimiento. "
            "Ahí verás si la solicitud está recibida, validada, en impresión o lista para "
            "retiro. Si no tienes código, registra primero una solicitud inicial."
        )

    if has_any(normalized, ["hola", "ayuda", "que puedes", "que haces", "informacion"]):
        return finish(
            "Soy el asistente de TE Digital Express 360. Puedo ayudarte a ubicar el trámite correcto, "
            "explicar requisitos, decirte si el sistema puede iniciar una solicitud, cuándo "
            "debes ir a una oficina y cómo consultar tu seguimiento."
        )

    return finish(
        "Puedo orientarte sobre trámites del Tribunal Electoral dentro de TE Digital Express 360. "
        "Dime si buscas cédula, BioCed, certificados, actas, centro de votación, oficinas, "
        "quioscos, turnos o seguimiento, y te indico el camino correcto."
    )
