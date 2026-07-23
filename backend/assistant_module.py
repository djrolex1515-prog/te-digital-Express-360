import re
import unicodedata


QUICK_REPLY = "\n\n¿Tienes otra consulta?"


def normalize(value):
    text = unicodedata.normalize("NFD", value.lower())
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    return re.sub(r"\s+", " ", text).strip()


def has_any(text, words):
    return any(word in text for word in words)


def score_match(text, keywords):
    score = 0
    matched = []
    for kw in keywords:
        if kw in text:
            score += 2 if len(kw) > 4 else 1
            matched.append(kw)
    return score, matched


def finish(answer):
    return f"{answer}{QUICK_REPLY}"


INTENTS = [
    # ── SALUDOS ──
    {
        "intent": "saludo",
        "keywords": [
            "hola", "buenos dias", "buenas tardes", "buenas noches",
            "saludos", "que tal", "como estas", "hey", "que onda",
            "buenas", "saludo", "hello", "hi",
        ],
        "answer": "Hola, bienvenido al Tribunal Electoral de Panamá. Soy tu asistente virtual y estoy aquí para orientarte en cédula, certificados, Registro Civil, servicios electorales, citas, oficinas y más. ¿En qué puedo ayudarte?"
    },

    # ── QUIÉN SOY ──
    {
        "intent": "identidad",
        "keywords": [
            "quien eres", "que eres", "que haces", "para que sirves",
            "que puedes hacer", "que sabes hacer", "para que eres",
            "tu funcion", "tu rol", "ayuda",
        ],
        "answer": "Soy el asistente virtual del Tribunal Electoral de Panamá, parte del sistema TE Digital Express 360. Puedo orientarte sobre trámites de cédula, BioCed, Registro Civil, certificados, centro de votación, servicios electorales, citas, oficinas, quioscos, seguimiento de solicitudes y perfil de ciudadano. Estoy disponible las 24 horas."
    },

    # ── AGRADECIMIENTO ──
    {
        "intent": "agradecimiento",
        "keywords": [
            "gracias", "muchas gracias", "te agradezco", "excelente",
            "perfecto", "genial", "bien", "ok", "va", "dale", "buenisimo",
        ],
        "answer": "¡Con gusto! Estoy aquí para servirte. Si tienes más preguntas, no dudes en escribirme. ¡Que tengas un excelente día!"
    },

    # ── DESPEDIDA ──
    {
        "intent": "despedida",
        "keywords": [
            "adios", "hasta luego", "nos vemos", "chao", "bye",
            "nos vemos luego", "hasta pronto",
        ],
        "answer": "¡Hasta luego! Recuerda que puedes acceder al Portal Ciudadano en cualquier momento para gestionar tus trámites. ¡Que tengas un buen día!"
    },

    # ── CÉDULA ──
    {
        "intent": "cedula",
        "keywords": [
            "cedula", "bioced", "bio ced", "renovar cedula", "renovacion cedula",
            "duplicado cedula", "reposicion cedula", "perdida cedula", "robo cedula",
            "hurto cedula", "extravi cedula", "renovar", "duplicado", "reposicion",
            "perdi cedula", "perdí cedula", "robaron cedula", "extravie cedula",
            "extravié cedula", "dañada cedula", "deterioro cedula", "vieja cedula",
            "cambio de cedula", "cambiar cedula", "primera vez cedula",
            "nueva cedula", "sacar cedula", "obtener cedula", "mi cedula",
        ],
        "answer": "La cédula de identidad es el documento oficial del ciudadano panameño. Desde el Portal Ciudadano puedes realizar:\n\n• Renovación por vencimiento: para cédulas próximas a vencer o ya vencidas.\n• Reposición por pérdida o robo: primero reporta el incidente y luego solicita el duplicado.\n• Reemplazo por deterioro: si tu cédula está dañada.\n• Primera vez: para nuevos ciudadanos.\n• Reportar pérdida o robo: inhabilita tu cédula anterior.\n\nIngresa a \"Acceso Rápido\" y selecciona el trámite que necesitas."
    },
    {
        "intent": "cedula_requisitos",
        "keywords": [
            "requisitos cedula", "que necesito cedula", "documentos cedula",
            "que llevo cedula", "que traigo cedula", "requisitos para cedula",
        ],
        "answer": "Para trámites de cédula necesitas:\n\n• Documento de identidad anterior cuando aplique.\n• Validación de datos personales por fuente autorizada.\n• Captura de foto, firma y biometría en punto autorizado.\n\nEl trámite se completa en la oficina del Tribunal Electoral más cercana."
    },
    {
        "intent": "cedula_costo",
        "keywords": [
            "costo cedula", "cuanto cuesta cedula", "monto cedula",
            "precio cedula", "tarifa cedula", "cuanto vale cedula",
            "costo de cedula", "precio de cedula",
        ],
        "answer": "Los costos por trámite de cédula son:\n\n• Renovación: B/. 25.00\n• Duplicado: B/. 35.00\n• Primera vez: B/. 20.00\n• Reportar pérdida o robo: B/. 10.00\n\nEstos montos pueden estar sujetos a cambios. Verifica en tu Portal Ciudadano antes de iniciar el trámite."
    },

    # ── REGISTRO CIVIL ──
    {
        "intent": "registro_civil",
        "keywords": [
            "registro civil", "acta", "actas", "inscripcion",
            "reconocimiento", "correccion datos", "cambio nombre",
            "inscribir", "inscribir nacimiento", "inscribir matrimonio",
            "acta de", "acta nacimiento", "acta matrimonio", "acta defuncion",
        ],
        "answer": "El Registro Civil agrupa los servicios de:\n\n• Inscripción de nacimiento.\n• Registro de matrimonio.\n• Registro de defunción.\n• Reconocimiento de hijos.\n• Corrección de datos en actas.\n• Cambio de nombre.\n\nTodos estos servicios están disponibles en el Portal Ciudadano o en las oficinas del Tribunal Electoral."
    },
    {
        "intent": "certificado_nacimiento",
        "keywords": [
            "certificado nacimiento", "acta nacimiento", "nacimiento",
            "certificado de nacimiento", "acta de nacimiento",
            "nací", "nacido", "nacida",
        ],
        "answer": "Para obtener un certificado de nacimiento:\n\n1. Ingresa al Portal Ciudadano o ve a una oficina del TE.\n2. Selecciona \"Certificados\" y elige \"Nacimiento\".\n3. Completa tus datos personales.\n4. Envía la solicitud y espera la aprobación.\n5. Descarga tu certificado digital con código QR.\n\nTambién puedes solicitarlo en los quioscos multiservicio."
    },
    {
        "intent": "certificado_matrimonio",
        "keywords": [
            "certificado matrimonio", "acta matrimonio", "matrimonio",
            "certificado de matrimonio", "acta de matrimonio",
            "casado", "casada", "bodas",
        ],
        "answer": "Para obtener un certificado de matrimonio:\n\n1. Ingresa al Portal Ciudadano o ve a una oficina del TE.\n2. Selecciona \"Certificados\" y elige \"Matrimonio\".\n3. Completa los datos del matrimonio.\n4. Envía la solicitud y espera la aprobación.\n5. Descarga tu certificado digital con código QR."
    },
    {
        "intent": "certificado_defuncion",
        "keywords": [
            "certificado defuncion", "acta defuncion", "defuncion",
            "certificado de defuncion", "acta de defuncion",
            "fallecimiento", "fallecido", "fallecida", "murio", "murió",
            "muerte",
        ],
        "answer": "Para obtener un certificado de defunción:\n\n1. Ingresa al Portal Ciudadano o ve a una oficina del TE.\n2. Selecciona \"Certificados\" y elige \"Defunción\".\n3. Proporciona los datos del fallecido.\n4. La solicitud debe ser autorizada.\n5. Descarga el certificado digital con código QR.\n\nLa emisión oficial se completa por el canal autorizado del Tribunal Electoral."
    },

    # ── CERTIFICADOS ──
    {
        "intent": "certificados",
        "keywords": [
            "certificado", "certificados", "solicitar certificado",
            "pedir certificado", "certificacion", "constancia",
            "certificado oficial", "documento oficial", "papeles",
        ],
        "answer": "Puedes solicitar certificados del Registro Civil:\n\n• De nacimiento.\n• De matrimonio.\n• De defunción.\n• Otras certificaciones registrales.\n\nDirígete a los quioscos o institución del Tribunal Electoral más cercano para solicitarlo. También puedes hacerlo desde el Portal Ciudadano."
    },
    {
        "intent": "qr",
        "keywords": [
            "qr", "codigo qr", "verificar qr", "autenticidad",
            "código qr", "escanear", "verificar documento",
        ],
        "answer": "Todos los certificados digitales del Tribunal Electoral incluyen un código QR de verificación. Este código permite confirmar la autenticidad del documento. Puedes escanear el código con cualquier lector de código QR para verificar que el certificado es oficial y válido."
    },

    # ── CITAS ──
    {
        "intent": "citas",
        "keywords": [
            "cita", "citas", "agendar cita", "reservar cita",
            "turno", "turno digital", "fecha cita", "agenda",
            "agendar", "reservar", "fecha", "cuando puedo ir",
            "cuando atienden", "disponibilidad", "horario disponible",
            "reserva", "reservacion", "reservación",
        ],
        "answer": "Puedes gestionar tus citas de forma digital:\n\n• Agendar cita: selecciona el servicio, oficina y horario disponible.\n• Reprogramar: cambia la fecha u hora de una cita existente.\n• Cancelar: anula una cita que ya no necesites.\n• Consultar: revisa todas tus citas futuras.\n\nIngresa a \"Citas\" en el Portal Ciudadano para gestionarlas."
    },

    # ── CENTRO DE VOTACIÓN ──
    {
        "intent": "centro_votacion",
        "keywords": [
            "centro votacion", "votar", "voto", "donde voto",
            "mesa", "junta", "votacion", "eleccion", "elecciones",
            "sufragio", "candidato", "candidatos", "partido",
            "partidos", "votación", "votación electoral",
        ],
        "answer": "El Tribunal Electoral gestiona los servicios electorales. Para consultar tu centro de votación:\n\n1. Ingresa al Portal Ciudadano.\n2. Selecciona \"Servicios Electorales\".\n3. Consulta tu centro de votación y residencia electoral.\n\nTambién puedes verificar tu centro de votación en la oficina del TE más cercana."
    },
    {
        "intent": "padron",
        "keywords": [
            "padron electoral", "padron", "inscripcion electoral",
            "habilitacion", "habilitado", "habilitada", "votar",
            "elector", "electora", "ciudadano activo",
        ],
        "answer": "El padrón electoral es el registro oficial de ciudadanos habilitados para votar. Para consultarlo o inscribirte:\n\n1. Ingresa al Portal Ciudadano.\n2. Selecciona \"Servicios Electorales\".\n3. Consulta el padrón electoral preliminar y definitivo.\n4. Verifica si estás habilitado para votar."
    },
    {
        "intent": "residencia",
        "keywords": [
            "cambio residencia", "residencia electoral", "cambiar residencia",
            "mudanza", "mudé", "mude", "nueva direccion", "nueva dirección",
            "cambiar direccion", "cambiar dirección",
        ],
        "answer": "Para cambiar tu residencia electoral:\n\n1. Ingresa al Portal Ciudadano.\n2. Selecciona \"Servicios Electorales\".\n3. Elige \"Cambio de residencia\".\n4. Completa el formulario con tu nueva dirección.\n5. Envía la solicitud y espera la validación del TE."
    },

    # ── OFICINAS ──
    {
        "intent": "oficinas",
        "keywords": [
            "oficina", "oficinas", "donde estan", "donde quedan",
            "ubicacion oficinas", "cuantas oficinas", "direccion",
            "sede", "sucursal", "locacion", "lugar", "punto atencion",
            "punto de atencion", "donde va", "donde voy", "donde ir",
        ],
        "answer": "El Tribunal Electoral cuenta con oficinas regionales a nivel nacional para atender tus trámites. Para conocer la ubicación de cada oficina, horarios y servicios, ingresa a este link:\n\nhttps://www.tribunal-electoral.gob.pa/contactenos/"
    },
    {
        "intent": "sede",
        "keywords": [
            "oficina central", "sede principal", "ancón", "ancon",
            "sede central", "direction general",
        ],
        "answer": "La sede principal del Tribunal Electoral se encuentra en Ancón, Ciudad de Panamá. Atiende de lunes a viernes de 7:00 a. m. a 3:00 p. m. en Registro Civil y Cedulación.\n\nPara más información: https://www.tribunal-electoral.gob.pa/contactenos/"
    },

    # ── QUIOSCOS ──
    {
        "intent": "quioscos",
        "keywords": [
            "quiosco", "quioscos", "kiosco", "kioskos", "multiservicio",
            "donde estan los quioscos", "cuantos quioscos", "autoservicio",
            "maquina", "maquinas", "punto rapido", "punto rápido",
        ],
        "answer": "El Tribunal Electoral cuenta con quioscos multiservicio a nivel nacional para trámites rápidos y seguros. Para conocer la cantidad, ubicación y horarios de cada quiosco, ingresa a este link:\n\nhttps://www.tribunal-electoral.gob.pa/quioscos-multiservicio-del-te-para-tramites-rapidos-y-seguros/"
    },

    # ── HORARIOS ──
    {
        "intent": "horarios",
        "keywords": [
            "horario", "horarios", "horas", "abierto", "cierre",
            "atencion", "atención", "lunes", "viernes", "sabado",
            "sábado", "a que hora", "de que hora", "cuando abren",
            "cuando cierran", "hora entrada", "hora salida",
            "horario de", "atienden",
        ],
        "answer": "Horario de atención al público:\n\n• Sede principal (Ancón) - Registro Civil y Cedulación: Lunes a viernes, 7:00 a. m. a 3:00 p. m.\n• Demás oficinas, incluyendo la Dirección Regional de Organización Electoral: Lunes a viernes, de 7:30 a. m. a 3:30 p. m.\n\nPara más información ingresa a:\n\nhttps://www.tribunal-electoral.gob.pa/contactenos/"
    },

    # ── SEGUIMIENTO ──
    {
        "intent": "seguimiento",
        "keywords": [
            "seguimiento", "rastrear", "codigo", "tracking", "te-",
            "estado solicitud", "donde esta mi tramite", "tramite",
            "tramites", "mis tramites", "solicitud", "solicitudes",
            "expediente", "avance", "progreso", "estatus",
        ],
        "answer": "En \"Mis Trámites\" puedes dar seguimiento a todas tus solicitudes activas:\n\n• Estado actual del trámite (Recibida, Validada, En impresión, Lista para retiro).\n• Línea de tiempo con cada paso completado.\n• Código único de seguimiento.\n• Funcionario asignado a tu caso.\n• Fechas clave de cada etapa.\n\nTambién puedes ver el historial de trámites completados anteriormente."
    },

    # ── PERFIL ──
    {
        "intent": "perfil",
        "keywords": [
            "perfil", "mi perfil", "datos personales", "correo",
            "telefono", "teléfono", "direccion", "dirección",
            "contraseña", "password", "seguridad", "clave",
            "cambiar contraseña", "actualizar datos", "mis datos",
        ],
        "answer": "En \"Mi Perfil\" del Portal Ciudadano puedes administrar tu cuenta:\n\n• Nombre completo y datos personales.\n• Correo electrónico y teléfono de contacto.\n• Dirección registrada.\n• Preferencias de notificación.\n• Cambio de contraseña.\n• Autenticación en dos pasos (recomendado para mayor seguridad).\n\nMantén tus datos actualizados para recibir notificaciones importantes."
    },

    # ── NOTIFICACIONES ──
    {
        "intent": "notificaciones",
        "keywords": [
            "notificacion", "notificaciones", "alerta", "alertas",
            "aviso", "aviso aprobado", "cita confirmada",
            "listo retirar", "mensaje", "correo", "email",
        ],
        "answer": "Las notificaciones te mantienen al día:\n\n• Documento aprobado: tu trámite ha sido aprobado.\n• Falta un requisito: debes completar información pendiente.\n• Cita confirmada: tu cita ha sido agendada exitosamente.\n• Documento listo para retirar: puedes pasar por tu oficina.\n\nRevisa la sección \"Notificaciones\" del Portal Ciudadano."
    },

    # ── PORTAL CIUDADANO ──
    {
        "intent": "portal",
        "keywords": [
            "portal ciudadano", "registrarse", "crear cuenta", "registrarme",
            "login", "iniciar sesion", "iniciar sesión", "cuenta",
            "acceder", "entrar", "usuario", "contraseña",
            "como entro", "como accedo",
        ],
        "answer": "El Portal Ciudadano de TE Digital Express 360 te permite:\n\n• Registrarte como ciudadano digital.\n• Iniciar sesión con tu correo y contraseña.\n• Acceder a todos los servicios: cédula, certificados, Registro Civil, servicios electorales, citas, seguimiento.\n• Gestionar tu perfil y notificaciones.\n\nIngresa a https://www.tribunal-electoral.gob.pa/ para acceder."
    },
    {
        "intent": "plataforma",
        "keywords": [
            "te digital", "te digital express", "360", "sistema",
            "plataforma", "app", "aplicacion", "aplicación", "movil",
            "móvil", "celular", "telefono", "teléfono",
        ],
        "answer": "TE Digital Express 360 es la plataforma digital del Tribunal Electoral de Panamá que te permite realizar trámites de forma rápida y segura desde cualquier lugar. Incluye:\n\n• Portal Ciudadano para trámites en línea.\n• Gestión de cédula, certificados y Registro Civil.\n• Servicios electorales.\n• Citas y seguimiento de solicitudes.\n• Notificaciones en tiempo real.\n\nDisponible las 24 horas del día, los 7 días de la semana."
    },

    # ── TRIBUNAL ELECTORAL ──
    {
        "intent": "tribunal",
        "keywords": [
            "tribunal electoral", "te", "que es", "quienes son",
            "funciones", "institucion", "institución", "panama",
            "gobierno", "entidad", "organismo",
        ],
        "answer": "El Tribunal Electoral (TE) es el organismo constitucional autónomo encargado de:\n\n• Organizar, dirigir y supervisar los procesos electorales en Panamá.\n• Administra el Registro Civil.\n• Gestiona la cédula de identidad y BioCed.\n• Maneja el padrón electoral.\n• Brinda servicios digitales a través de TE Digital Express 360.\n\nSu sede principal se encuentra en Ancón, Ciudad de Panamá."
    },

    # ── SOLICITUD ──
    {
        "intent": "solicitud",
        "keywords": [
            "solicitar", "iniciar tramite", "iniciar trámite", "empezar",
            "como hago", "que hago", "quiero", "necesito", "pedir",
            "necesito hacer", "quiero hacer", "como puedo",
        ],
        "answer": "Para iniciar un trámite:\n\n1. Ingresa al Portal Ciudadano.\n2. Selecciona \"Solicitudes\" o ve a \"Acceso Rápido\".\n3. Elige el tipo de servicio que necesitas.\n4. Revisa los requisitos antes de comenzar.\n5. Llena el formulario con tus datos.\n6. Envía la solicitud y recibe tu código de seguimiento.\n\n¿Qué trámite necesitas realizar?"
    },

    # ── REQUISITOS ──
    {
        "intent": "requisitos",
        "keywords": [
            "requisitos", "que necesito", "documentos necesarios",
            "que llevo", "que traigo", "que documento",
            "que documentos", "papeles", "que papeles",
        ],
        "answer": "Los requisitos varían según el trámite:\n\n• Cédula: documento anterior, datos personales, captura biométrica.\n• Certificados: datos personales del solicitante, cédula vigente.\n• Registro Civil: tipo de acta, datos mínimos requeridos.\n• Servicios electorales: validación de identidad, datos de residencia.\n\n¿Qué trámite específico necesitas? Indícame y te doy los requisitos detallados."
    },

    # ── PAGOS ──
    {
        "intent": "pagos",
        "keywords": [
            "pago", "pagos", "cuanto cuesta", "costo", "costos",
            "monto", "montos", "tarifa", "tarifas", "precio",
            "precios", "banco", "deposito", "depósito", "abono",
            "cuanto vale", "cuánto cuesta", "cuánto vale",
            "que banco", "en que banco",
        ],
        "answer": "Los pagos por trámites se realizan en:\n\n• Bancos autorizados (Banco General, Banistmo, etc.)\n• Cajas del Tribunal Electoral.\n\nLos montos varían según el trámite. Algunos servicios digitales no requieren pago. Consulta el costo específico en tu solicitud antes de proceder."
    },

    # ── CONTACTO ──
    {
        "intent": "contacto",
        "keywords": [
            "contacto", "telefono", "teléfono", "email", "correo electronico",
            "correo electrónico", "linea", "línea", "atencion al cliente",
            "atención al cliente", "llamar", "comunicar", "hablar",
            "llamo", "comuníco",
        ],
        "answer": "Para contactar al Tribunal Electoral:\n\n• Línea de atención: 183\n• Sitio web: https://www.tribunal-electoral.gob.pa/\n• Correo institucional: consulta@tep.gob.pa\n• Dirección: Ancón, Ciudad de Panamá\n\nTambién puedes acudir a cualquier oficina regional a nivel nacional."
    },
    {
        "intent": "linea_183",
        "keywords": [
            "linea", "183", "telefono te", "numero de telefono",
            "número de teléfono", "numero te",
        ],
        "answer": "La línea de atención del Tribunal Electoral es el 183. Disponible en horario laboral para consultas sobre trámites, requisitos y estado de solicitudes."
    },
]


def find_intent(text):
    best_intent = None
    best_score = 0

    for entry in INTENTS:
        score, matched = score_match(text, entry["keywords"])
        kw_len_bonus = max(len(k) for k in matched) if matched else 0
        total = score * 10 + kw_len_bonus
        if total > best_score:
            best_score = total
            best_intent = entry

    return best_intent


def answer_question(question):
    normalized = normalize(question)

    if not normalized:
        return finish(
            "Puedo orientarte sobre cédula, BioCed, Registro Civil, certificados, "
            "centro de votación, residencia electoral, oficinas, quioscos, turnos "
            "y seguimiento de solicitudes. ¿Qué necesitas?"
        )

    intent = find_intent(normalized)

    if intent and intent["answer"]:
        return finish(intent["answer"])

    words = normalized.split()
    for entry in INTENTS:
        for kw in entry["keywords"]:
            kw_words = kw.split()
            for w in words:
                if len(w) > 3 and any(kww.startswith(w[:4]) or w.startswith(kww[:4]) for kww in kw_words if len(kww) > 3):
                    return finish(entry["answer"])

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
