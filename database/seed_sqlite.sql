-- TE Digital Express 360 - SQLite seed data.
-- Demo access: admin@te360.local / Cambiar123!

INSERT INTO services (
    id,
    title,
    category,
    summary,
    requirements_json,
    steps_json,
    details_json,
    is_active,
    updated_at
) VALUES
(
    'cedula',
    'Cedula / BioCed',
    'Identidad',
    'Renovacion, duplicado, validacion de identidad, foto, firma y biometria.',
    '["Documento de identidad anterior cuando aplique.","Validacion de datos personales por fuente autorizada.","Captura de foto, firma y biometria en punto autorizado."]',
    '["Seleccionar tipo de tramite.","Validar requisitos y oficina disponible.","Registrar datos biometricos autorizados.","Consultar estado hasta retiro."]',
    '[{"title":"Tramites cubiertos","items":["Primera vez, renovacion, duplicado y retiro de documento.","Validacion de datos, foto, firma y biometria.","Seguimiento por codigo TD360."]}]',
    1,
    '2026-07-01T00:00:00+00:00'
),
(
    'registro',
    'Registro Civil',
    'Registro',
    'Certificados, actas, inscripciones y correcciones.',
    '["Tipo de acta o certificado solicitado.","Datos minimos requeridos por la institucion.","Metodo de entrega o retiro."]',
    '["Elegir tipo de certificado o acta.","Revisar requisitos.","Enviar solicitud o reservar atencion.","Recibir confirmacion de avance."]',
    '[{"title":"Certificados y actas","items":["Nacimiento, matrimonio, defuncion y solteria.","Validacion de certificados digitales.","Correcciones e inscripciones sujetas a revision."]}]',
    1,
    '2026-07-01T00:00:00+00:00'
),
(
    'electoral',
    'Servicios electorales',
    'Electoral',
    'Centro de votacion, residencia electoral, partidos y consultas.',
    '["Validacion de identidad segun tramite.","Datos de residencia cuando aplique.","Aceptacion de terminos del tramite correspondiente."]',
    '["Consultar informacion electoral.","Verificar requisitos.","Enviar solicitud si aplica.","Recibir actualizaciones oficiales."]',
    '[{"title":"Consultas electorales","items":["Centro de votacion y residencia electoral.","Informacion sobre partidos politicos.","Seguimiento de solicitudes electorales."]}]',
    1,
    '2026-07-01T00:00:00+00:00'
),
(
    'quioscos',
    'Oficinas y Quioscos',
    'Atencion',
    'Ubicaciones, horarios, capacidad y turnos.',
    '["Provincia o ubicacion de referencia.","Servicio requerido.","Disponibilidad de turno."]',
    '["Seleccionar provincia o ubicacion.","Ver oficinas disponibles.","Reservar turno.","Recibir recordatorio."]',
    '[{"title":"Ubicaciones nacionales","items":["Panama, Panama Oeste, Cocle, Colon, Chiriqui, Herrera, Los Santos, Veraguas, Bocas del Toro, Darien y comarcas.","Horarios por oficina y turnos segun disponibilidad.","Capacidad referencial: alta, media o baja segun punto de atencion."]}]',
    1,
    '2026-07-01T00:00:00+00:00'
)
ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    category = excluded.category,
    summary = excluded.summary,
    requirements_json = excluded.requirements_json,
    steps_json = excluded.steps_json,
    details_json = excluded.details_json,
    is_active = excluded.is_active,
    updated_at = excluded.updated_at;

INSERT INTO users (
    email,
    full_name,
    cedula,
    role,
    password_salt,
    password_hash,
    is_active,
    created_at
) VALUES (
    'admin@te360.local',
    'Administrador TE Digital Express 360',
    'ADMIN-0001',
    'admin',
    'dGQzNjAtZGVtby1zYWx0IQ==',
    'eS9lrRWzSTV5K28996QDhf9WrHWdVBWt1kN0maukDv0=',
    1,
    '2026-07-01T00:00:00+00:00'
)
ON CONFLICT(email) DO UPDATE SET
    full_name = excluded.full_name,
    cedula = excluded.cedula,
    role = excluded.role,
    is_active = excluded.is_active;

INSERT INTO citizen_requests (
    tracking_code,
    service_id,
    citizen_name,
    citizen_contact,
    status,
    office,
    notes,
    created_at,
    updated_at
) VALUES (
    'TD360-0429',
    'cedula',
    'Ciudadano de ejemplo',
    'ciudadano@example.local',
    'en_impresion',
    'Oficina regional sugerida',
    'Registro inicial para validar el flujo de seguimiento.',
    '2026-07-01T00:00:00+00:00',
    '2026-07-01T00:00:00+00:00'
)
ON CONFLICT(tracking_code) DO UPDATE SET
    service_id = excluded.service_id,
    status = excluded.status,
    office = excluded.office,
    notes = excluded.notes,
    updated_at = excluded.updated_at;

