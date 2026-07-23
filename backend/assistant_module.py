import re
import unicodedata


QUICK_REPLY = "\n\n¿Tienes otra consulta?"


def normalize_text(value):
    text = unicodedata.normalize("NFD", value.lower())
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    return re.sub(r"\s+", " ", text).strip()


def has_any(text, words):
    return any(word in text for word in words)


def finish(answer):
    return f"{answer}{QUICK_REPLY}"


KNOWLEDGE = [
    # ── Saludos ──
    {
        "keywords": ["hola", "buenos dias", "buenas tardes", "buenas noches", "saludos", "que tal", "como estas"],
        "answer": "Hola, bienvenido al Tribunal Electoral de Panamá. Soy tu asistente virtual y estoy aquí para orientarte en cédula, certificados, Registro Civil, servicios electorales, citas, oficinas y más. ¿En qué puedo ayudarte?"
    },
    {
        "keywords": ["quien eres", "que eres", "que haces", "para que sirves", "que puedes hacer"],
        "answer": "Soy el asistente virtual del Tribunal Electoral de Panamá, parte del sistema TE Digital Express 360. Puedo orientarte sobre trámites de cédula, BioCed, Registro Civil, certificados, centro de votación, servicios electorales, citas, oficinas, quioscos, seguimiento de solicitudes y perfil de ciudadano. Estoy disponible las 24 horas."
    },
    {
        "keywords": ["gracias", "muchas gracias", "te agradezco", "excelente", "perfecto", "genial", "bien"],
        "answer": "¡Con gusto! Estoy aquí para servirte. Si tienes más preguntas, no dudes en escribirme. ¡Que tengas un excelente día!"
    },
    {
        "keywords": ["adios", "hasta luego", "nos vemos", "chao", "bye"],
        "answer": "¡Hasta luego! Recuerda que puedes acceder al Portal Ciudadano en cualquier momento para gestionar tus trámites. ¡Que tengas un buen día!"
    },
    # ── Cédula ──
    {
        "keywords": ["cedula", "bioced", "bio ced", "renovar cedula", "renovacion", "duplicado cedula", "reposicion cedula", "perdida cedula", "robo cedula", "hurto", "extravi"],
        "answer": "La cédula de identidad es el documento oficial del ciudadano panameño. Desde el Portal Ciudadano puedes realizar:\n\n• Renovación por vencimiento: para cédulas próximas a vencer o ya vencidas.\n• Reposición por pérdida o robo: primero reporta el incidente y luego solicita el duplicado.\n• Reemplazo por deterioro: si tu cédula está dañada.\n• Primera vez: para nuevos ciudadanos.\n• Reportar pérdida o robo: inhabilita tu cédula anterior.\n\nIngresa a \"Acceso Rápido\" y selecciona el trámite que necesitas."
    },
    {
        "keywords": ["requisitos cedula", "que necesito cedula", "documentos cedula"],
        "answer": "Para trámites de cédula necesitas:\n\n• Documento de identidad anterior cuando aplique.\n• Validación de datos personales por fuente autorizada.\n• Captura de foto, firma y biometría en punto autorizado.\n\nEl trámite se completa en la oficina del Tribunal Electoral más cercana."
    },
    {
        "keywords": ["costo cedula", "cuanto cuesta cedula", "monto cedula", "precio cedula", "tarifa cedula"],
        "answer": "Los costos por trámite de cédula son:\n\n• Renovación: B/. 25.00\n• Duplicado: B/. 35.00\n• Primera vez: B/. 20.00\n• Reportar pérdida o robo: B/. 10.00\n\nEstos montos pueden estar sujetos a cambios. Verifica en tu Portal Ciudadano antes de iniciar el trámite."
    },
    # ── Registro Civil ──
    {
        "keywords": ["registro civil", "acta", "actas", "inscripcion", "reconocimiento", "correccion datos", "cambio nombre"],
        "answer": "El Registro Civil agrupa los servicios de:\n\n• Inscripción de nacimiento.\n• Registro de matrimonio.\n• Registro de defunción.\n• Reconocimiento de hijos.\n• Corrección de datos en actas.\n• Cambio de nombre.\n\nTodos estos servicios están disponibles en el Portal Ciudadano o en las oficinas del Tribunal Electoral."
    },
    {
        "keywords": ["acta nacimiento", "certificado nacimiento"],
        "answer": "Para obtener un certificado de nacimiento:\n\n1. Ingresa al Portal Ciudadano o ve a una oficina del TE.\n2. Selecciona \"Certificados\" y elige \"Nacimiento\".\n3. Completa tus datos personales.\n4. Envía la solicitud y espera la aprobación.\n5. Descarga tu certificado digital con código QR.\n\nTambién puedes solicitarlo en los quioscos multiservicio."
    },
    {
        "keywords": ["acta matrimonio", "certificado matrimonio"],
        "answer": "Para obtener un certificado de matrimonio:\n\n1. Ingresa al Portal Ciudadano o ve a una oficina del TE.\n2. Selecciona \"Certificados\" y elige \"Matrimonio\".\n3. Completa los datos del matrimonio.\n4. Envía la solicitud y espera la aprobación.\n5. Descarga tu certificado digital con código QR."
    },
    {
        "keywords": ["acta defuncion", "certificado defuncion", "fallecimiento"],
        "answer": "Para obtener un certificado de defunción:\n\n1. Ingresa al Portal Ciudadano o ve a una oficina del TE.\n2. Selecciona \"Certificados\" y elige \"Defunción\".\n3. Proporciona los datos del fallecido.\n4. La solicitud debe ser autorizada.\n5. Descarga el certificado digital con código QR.\n\nLa emisión oficial se completa por el canal autorizado del Tribunal Electoral."
    },
    # ── Certificados ──
    {
        "keywords": ["certificado", "certificados", "solicitar certificado", "pedir certificado", "certificacion", "constancia"],
        "answer": "Puedes solicitar certificados del Registro Civil:\n\n• De nacimiento.\n• De matrimonio.\n• De defunción.\n• Otras certificaciones registrales.\n\nDirígete a los quioscos o institución del Tribunal Electoral más cercano para solicitarlo. También puedes hacerlo desde el Portal Ciudadano."
    },
    {
        "keywords": ["qr", "codigo qr", "verificar qr", "autenticidad"],
        "answer": "Todos los certificados digitales del Tribunal Electoral incluyen un código QR de verificación. Este código permite confirmar la autenticidad del documento. Puedes escanear el código con cualquier lector de código QR para verificar que el certificado es oficial y válido."
    },
    # ── Centro de votación ──
    {
        "keywords": ["centro votacion", "votar", "voto", "donde voto", "mesa", "junta", "votacion"],
        "answer": "El Tribunal Electoral gestiona los servicios electorales. Para consultar tu centro de votación:\n\n1. Ingresa al Portal Ciudadano.\n2. Selecciona \"Servicios Electorales\".\n3. Consulta tu centro de votación y residencia electoral.\n\nTambién puedes verificar tu centro de votación en la oficina del TE más cercana."
    },
    {
        "keywords": ["padron electoral", "padron", "inscripcion electoral", "habilitacion"],
        "answer": "El padrón electoral es el registro oficial de ciudadanos habilitados para votar. Para consultarlo o inscribirte:\n\n1. Ingresa al Portal Ciudadano.\n2. Selecciona \"Servicios Electorales\".\n3. Consulta el padrón electoral preliminar y definitivo.\n4. Verifica si estás habilitado para votar."
    },
    {
        "keywords": ["cambio residencia", "residencia electoral", "cambiar residencia"],
        "answer": "Para cambiar tu residencia electoral:\n\n1. Ingresa al Portal Ciudadano.\n2. Selecciona \"Servicios Electorales\".\n3. Elige \"Cambio de residencia\".\n4. Completa el formulario con tu nueva dirección.\n5. Envía la solicitud y espera la validación del TE."
    },
    # ── Servicios Electorales ──
    {
        "keywords": ["servicios electorales", "electoral", "elecciones", "candidatos", "partidos"],
        "answer": "Los servicios electorales del Tribunal Electoral incluyen:\n\n• Centro de votación: consulta dónde te corresponde votar.\n• Padrón electoral: revisa si estás habilitado.\n• Cambio de residencia: actualiza tu residencia electoral.\n• Habilitación: verifica tu estado para votar.\n• Resultados: consulta resultados de elecciones anteriores.\n\nTodos disponibles en \"Servicios Electorales\" del Portal Ciudadano."
    },
    # ── Citas ──
    {
        "keywords": ["cita", "citas", "agendar cita", "reservar cita", "turno", "turno digital", "fecha cita"],
        "answer": "Puedes gestionar tus citas de forma digital:\n\n• Agendar cita: selecciona el servicio, oficina y horario disponible.\n• Reprogramar: cambia la fecha u hora de una cita existente.\n• Cancelar: anula una cita que ya no necesites.\n• Consultar: revisa todas tus citas futuras.\n\nIngresa a \"Citas\" en el Portal Ciudadano para gestionarlas."
    },
    # ── Oficinas ──
    {
        "keywords": ["oficina", "oficinas", "donde estan", "donde quedan", "ubicacion oficinas", "cuantas oficinas", "direccion"],
        "answer": "El Tribunal Electoral cuenta con oficinas regionales a nivel nacional para atender tus trámites. Para conocer la ubicación de cada oficina, horarios y servicios, ingresa a este link:\n\nhttps://www.tribunal-electoral.gob.pa/contactenos/"
    },
    {
        "keywords": ["oficina central", "sede principal", "ancón", "ancon"],
        "answer": "La sede principal del Tribunal Electoral se encuentra en Ancón, Ciudad de Panamá. Atiende de lunes a viernes de 7:00 a. m. a 3:00 p. m. en Registro Civil y Cedulación.\n\nPara más información: https://www.tribunal-electoral.gob.pa/contactenos/"
    },
    # ── Quioscos ──
    {
        "keywords": ["quiosco", "quioscos", "kiosco", "kioskos", "multiservicio", "donde estan los quioscos", "cuantos quioscos"],
        "answer": "El Tribunal Electoral cuenta con quioscos multiservicio a nivel nacional para trámites rápidos y seguros. Para conocer la cantidad, ubicación y horarios de cada quiosco, ingresa a este link:\n\nhttps://www.tribunal-electoral.gob.pa/quioscos-multiservicio-del-te-para-tramites-rapidos-y-seguros/"
    },
    # ── Horarios ──
    {
        "keywords": ["horario", "horarios", "horas", "abierto", "cierre", "atencion", "lunes", "viernes", "sabado"],
        "answer": "Horario de atención al público:\n\n• Sede principal (Ancón) - Registro Civil y Cedulación: Lunes a viernes, 7:00 a. m. a 3:00 p. m.\n• Demás oficinas, incluyendo la Dirección Regional de Organización Electoral: Lunes a viernes, de 7:30 a. m. a 3:30 p. m.\n\nPara más información ingresa a:\n\nhttps://www.tribunal-electoral.gob.pa/contactenos/"
    },
    # ── Seguimiento ──
    {
        "keywords": ["seguimiento", "rastrear", "codigo", "tracking", "te-", "estado solicitud", "donde esta mi tramite"],
        "answer": "Puedes dar seguimiento a tus solicitudes desde \"Mis Trámites\" en el Portal Ciudadano:\n\n• Estado actual: recibida, validada, en impresión, lista para retiro.\n• Línea de tiempo: cada paso completado.\n• Código de seguimiento: código único de tu trámite (ej: TE-2026-0842).\n• Funcionario asignado a tu caso.\n• Fechas clave de cada etapa."
    },
    {
        "keywords": ["tramite", "tramites", "mis tramites", "solicitud", "solicitudes", "expediente"],
        "answer": "En \"Mis Trámites\" puedes dar seguimiento a todas tus solicitudes activas:\n\n• Estado actual del trámite (Recibida, Validada, En impresión, Lista para retiro).\n• Línea de tiempo con cada paso completado.\n• Código único de seguimiento.\n• Funcionario asignado a tu caso.\n• Fechas clave de cada etapa.\n\nTambién puedes ver el historial de trámites completados anteriormente."
    },
    # ── Perfil ──
    {
        "keywords": ["perfil", "mi perfil", "datos personales", "correo", "telefono", "direccion", "contraseña", "password", "seguridad"],
        "answer": "En \"Mi Perfil\" del Portal Ciudadano puedes administrar tu cuenta:\n\n• Nombre completo y datos personales.\n• Correo electrónico y teléfono de contacto.\n• Dirección registrada.\n• Preferencias de notificación.\n• Cambio de contraseña.\n• Autenticación en dos pasos (recomendado para mayor seguridad).\n\nMantén tus datos actualizados para recibir notificaciones importantes."
    },
    # ── Notificaciones ──
    {
        "keywords": ["notificacion", "notificaciones", "alerta", "aviso", "aviso aprobado", "cita confirmada", "listo retirar"],
        "answer": "Las notificaciones te mantienen al día:\n\n• Documento aprobado: tu trámite ha sido aprobado.\n• Falta un requisito: debes completar información pendiente.\n• Cita confirmada: tu cita ha sido agendada exitosamente.\n• Documento listo para retirar: puedes pasar por tu oficina.\n\nRevisa la sección \"Notificaciones\" del Portal Ciudadano."
    },
    # ── Portal Ciudadano ──
    {
        "keywords": ["portal ciudadano", "registrarse", "crear cuenta", "registrarme", "login", "iniciar sesion", "iniciar sesion"],
        "answer": "El Portal Ciudadano de TE Digital Express 360 te permite:\n\n• Registrarte como ciudadano digital.\n• Iniciar sesión con tu correo y contraseña.\n• Acceder a todos los servicios: cédula, certificados, Registro Civil, servicios electorales, citas, seguimiento.\n• Gestionar tu perfil y notificaciones.\n\nIngresa a https://www.tribunal-electoral.gob.pa/ para acceder."
    },
    {
        "keywords": ["te digital", "te digital express", "360", "sistema", "plataforma"],
        "answer": "TE Digital Express 360 es la plataforma digital del Tribunal Electoral de Panamá que te permite realizar trámites de forma rápida y segura desde cualquier lugar. Incluye:\n\n• Portal Ciudadano para trámites en línea.\n• Gestión de cédula, certificados y Registro Civil.\n• Servicios electorales.\n• Citas y seguimiento de solicitudes.\n• Notificaciones en tiempo real.\n\nDisponible las 24 horas del día, los 7 días de la semana."
    },
    # ── Tribunal Electoral ──
    {
        "keywords": ["tribunal electoral", "te", "que es", "quienes son", "funciones", "institucion", "panama"],
        "answer": "El Tribunal Electoral (TE) es el organismo constitucional autónomo encargado de:\n\n• Organizar, dirigir y supervisar los procesos electorales en Panamá.\n• Administra el Registro Civil.\n• Gestiona la cédula de identidad y BioCed.\n• Maneja el padrón electoral.\n• Brinda servicios digitales a través de TE Digital Express 360.\n\nSu sede principal se encuentra en Ancón, Ciudad de Panamá."
    },
    # ── Requisitos generales ──
    {
        "keywords": ["requisitos", "que necesito", "documentos necesarios", "que llevo"],
        "answer": "Los requisitos varían según el trámite:\n\n• Cédula: documento anterior, datos personales, captura biométrica.\n• Certificados: datos personales del solicitante, cédula vigente.\n• Registro Civil: tipo de acta, datos mínimos requeridos.\n• Servicios electorales: validación de identidad, datos de residencia.\n\n¿Qué trámite específico necesitas? Indícame y te doy los requisitos detallados."
    },
    # ── Solicitud ──
    {
        "keywords": ["solicitar", "iniciar tramite", "empezar", "como hago", "que hago"],
        "answer": "Para iniciar un trámite:\n\n1. Ingresa al Portal Ciudadano.\n2. Selecciona \"Solicitudes\" o ve a \"Acceso Rápido\".\n3. Elige el tipo de servicio que necesitas.\n4. Revisa los requisitos antes de comenzar.\n5. Llena el formulario con tus datos.\n6. Envía la solicitud y recibe tu código de seguimiento.\n\n¿Qué trámite necesitas realizar?"
    },
    # ── Pagos ──
    {
        "keywords": ["pago", "pagos", "cuanto cuesta", "costo", "monto", "tarifa", "precio", "banco", "deposito"],
        "answer": "Los pagos por trámites se realizan en:\n\n• Bancos autorizados (Banco General, Banistmo, etc.)\n• Cajas del Tribunal Electoral.\n\nLos montos varían según el trámite. Algunos servicios digitales no requieren pago. Consulta el costo específico en tu solicitud antes de proceder."
    },
    # ── App / Móvil ──
    {
        "keywords": ["app", "aplicacion", "movil", "celular", "descargar"],
        "answer": "El Tribunal Electoral está trabajando en herramientas digitales para facilitar tus trámites. Actualmente puedes acceder a todos los servicios desde el Portal Ciudadano en tu navegador web, tanto desde computadora como desde tu teléfono móvil."
    },
    # ── Contacto ──
    {
        "keywords": ["contacto", "telefono", "email", "correo electronico", "linea", "atencion al cliente"],
        "answer": "Para contactar al Tribunal Electoral:\n\n• Línea de atención: 183\n• Sitio web: https://www.tribunal-electoral.gob.pa/\n• Correo institucional: consulta@tep.gob.pa\n• Dirección: Ancón, Ciudad de Panamá\n\nTambién puedes acudir a cualquier oficina regional a nivel nacional."
    },
    {
        "keywords": ["linea", "183", "telefono te"],
        "answer": "La línea de atención del Tribunal Electoral es el 183. Disponible en horario laboral para consultas sobre trámites, requisitos y estado de solicitudes."
    },
]


def answer_question(question):
    normalized = normalize_text(question)

    if not normalized:
        return finish(
            "Puedo orientarte sobre cédula, BioCed, Registro Civil, certificados, "
            "centro de votación, residencia electoral, oficinas, quioscos, turnos "
            "y seguimiento de solicitudes. ¿Qué necesitas?"
        )

    for entry in KNOWLEDGE:
        if has_any(normalized, entry["keywords"]):
            return entry["answer"]

    words = normalized.split()
    best_score = 0
    best_answer = None

    for entry in KNOWLEDGE:
        score = 0
        for kw in entry["keywords"]:
            kw_words = kw.split()
            for w in words:
                if len(w) > 3 and any(kww in w or w in kww for kww in kw_words):
                    score += 1
        if score > best_score:
            best_score = score
            best_answer = entry["answer"]

    if best_score >= 2 and best_answer:
        return finish(best_answer)

    return finish(
        "No tengo una respuesta específica para esa consulta. Puedo ayudarte con:\n\n"
        "• Cédula de identidad y BioCed.\n"
        "• Registro Civil (actas y certificados).\n"
        "• Certificados digitales.\n"
        "• Centro de votación y servicios electorales.\n"
        "• Citas y turnos.\n"
        "• Oficinas y quioscos del Tribunal Electoral.\n"
        "• Seguimiento de solicitudes.\n"
        "• Perfil de ciudadano.\n\n"
        "Intenta escribir tu pregunta de otra forma o elige uno de estos temas."
    )
