import base64
import datetime as dt
import hashlib
import hmac
import json
import os
import secrets
import sqlite3

from config import (
    DATABASE,
    DB_ENGINE,
    MYSQL_DATABASE,
    MYSQL_HOST,
    MYSQL_PASSWORD,
    MYSQL_PORT,
    MYSQL_USER,
    TOKEN_TTL_HOURS,
)


STATUS_LABELS = {
    "recibida": "Solicitud recibida",
    "validada": "Datos validados",
    "en_impresion": "Documento en impresion",
    "lista_retiro": "Listo para retiro",
    "requiere_revision": "Requiere revision",
    "en_espera": "En espera de aprobacion",
    "aprobada": "Aprobada",
    "cerrada": "Cerrada",
}

STATUS_PROGRESS = {
    "recibida": 25,
    "validada": 50,
    "en_impresion": 75,
    "lista_retiro": 100,
    "requiere_revision": 40,
    "en_espera": 10,
    "aprobada": 100,
    "cerrada": 100,
}

DEFAULT_PORTAL_SECTIONS = [
    ("inicio", "Inicio", 1, 1),
    ("mi-identidad", "Mi Identidad", 1, 2),
    ("registro-civil", "Registro Civil", 1, 3),
    ("certificados", "Certificados", 1, 4),
    ("servicios-electorales", "Servicios Electorales", 1, 5),
    ("citas", "Citas", 1, 6),
    ("solicitar", "Solicitudes", 1, 7),
    ("mis-tramites", "Mis Trámites", 1, 8),
    ("mis-documentos", "Mis Documentos", 1, 9),
    ("pagos", "Pagos", 1, 10),
    ("centro-ayuda", "Centro de Ayuda", 1, 11),
    ("notificaciones", "Notificaciones", 1, 12),
    ("mi-perfil", "Mi Perfil", 1, 13),
]

OFFICE_LOCATIONS = [
    {
        "province": "Panama",
        "district": "Panama",
        "place": "Sede central / Ancon",
        "address": "Area institucional de Ancon, Panama.",
        "schedule": "Lunes a viernes, horario de oficina.",
        "capacity": "Alta",
        "turns": "Turno presencial y orientacion digital previa.",
    },
    {
        "province": "Panama",
        "district": "San Miguelito",
        "place": "Oficina distrital de San Miguelito",
        "address": "Atención para corregimientos urbanos de alta demanda.",
        "schedule": "Lunes a viernes, horario de oficina.",
        "capacity": "Alta",
        "turns": "Turnos por servicio, prioridad a cedula y certificados.",
    },
    {
        "province": "Panama",
        "district": "Chepo",
        "place": "Oficina regional / distrital de Chepo",
        "address": "Cobertura para Panama Este y comunidades cercanas.",
        "schedule": "Lunes a viernes, horario de oficina.",
        "capacity": "Media",
        "turns": "Turnos programados por disponibilidad.",
    },
    {
        "province": "Panama Oeste",
        "district": "La Chorrera",
        "place": "Oficina regional de Panama Oeste",
        "address": "Atención regional para trámites ciudadanos.",
        "schedule": "Lunes a viernes, horario de oficina.",
        "capacity": "Alta",
        "turns": "Turnos por demanda diaria.",
    },
    {
        "province": "Panama Oeste",
        "district": "Arraijan",
        "place": "Oficina distrital de Arraijan",
        "address": "Atención a Arraiján y corregimientos cercanos.",
        "schedule": "Lunes a viernes, horario de oficina.",
        "capacity": "Alta",
        "turns": "Reservas sugeridas por alta demanda.",
    },
    {
        "province": "Cocle",
        "district": "Penonome",
        "place": "Oficina regional de Cocle",
        "address": "Cabecera provincial, atencion de cedula y registro.",
        "schedule": "Lunes a viernes, horario de oficina.",
        "capacity": "Media",
        "turns": "Turnos presenciales y consulta digital previa.",
    },
    {
        "province": "Colon",
        "district": "Colon",
        "place": "Oficina regional de Colon",
        "address": "Cabecera provincial, servicios electorales y registro civil.",
        "schedule": "Lunes a viernes, horario de oficina.",
        "capacity": "Media",
        "turns": "Turno presencial por orden de llegada.",
    },
    {
        "province": "Chiriqui",
        "district": "David",
        "place": "Oficina regional de Chiriqui",
        "address": "Cabecera provincial, atencion regional.",
        "schedule": "Lunes a viernes, horario de oficina.",
        "capacity": "Alta",
        "turns": "Turnos diarios por ventanilla.",
    },
    {
        "province": "Herrera",
        "district": "Chitre",
        "place": "Oficina regional de Herrera",
        "address": "Atención regional de Registro Civil y cedulación.",
        "schedule": "Lunes a viernes, horario de oficina.",
        "capacity": "Media",
        "turns": "Turnos por servicio solicitado.",
    },
    {
        "province": "Los Santos",
        "district": "Las Tablas",
        "place": "Oficina regional de Los Santos",
        "address": "Cabecera provincial, atencion ciudadana.",
        "schedule": "Lunes a viernes, horario de oficina.",
        "capacity": "Media",
        "turns": "Turno presencial y retiro programado.",
    },
    {
        "province": "Veraguas",
        "district": "Santiago",
        "place": "Oficina regional de Veraguas",
        "address": "Cabecera provincial, cobertura regional.",
        "schedule": "Lunes a viernes, horario de oficina.",
        "capacity": "Media",
        "turns": "Turnos por demanda diaria.",
    },
    {
        "province": "Bocas del Toro",
        "district": "Changuinola",
        "place": "Oficina regional de Bocas del Toro",
        "address": "Atención regional y apoyo a comunidades cercanas.",
        "schedule": "Lunes a viernes, horario de oficina.",
        "capacity": "Media",
        "turns": "Turnos presenciales.",
    },
    {
        "province": "Darien",
        "district": "La Palma",
        "place": "Oficina regional de Darien",
        "address": "Atención regional para comunidades de difícil acceso.",
        "schedule": "Lunes a viernes, horario de oficina.",
        "capacity": "Media",
        "turns": "Turnos coordinados por disponibilidad.",
    },
    {
        "province": "Comarca Guna Yala",
        "district": "Nargana / Ailigandi",
        "place": "Punto de atencion comarcal",
        "address": "Atención coordinada para comunidades comarcales.",
        "schedule": "Segun disponibilidad regional.",
        "capacity": "Baja a media",
        "turns": "Turnos coordinados y jornadas especiales.",
    },
    {
        "province": "Comarca Ngabe-Bugle",
        "district": "Besiko / Nole Duima / Muna",
        "place": "Puntos de atencion comarcal",
        "address": "Cobertura para comunidades comarcales.",
        "schedule": "Segun disponibilidad regional.",
        "capacity": "Baja a media",
        "turns": "Jornadas y turnos coordinados.",
    },
]

SERVICE_DETAILS = {
    "cedula": [
        {
            "title": "Trámites cubiertos",
            "items": [
                "Primera vez, renovacion, duplicado, reemplazo por deterioro y retiro de documento.",
                "BioCed como ruta de identidad con foto, firma y biometria en punto autorizado.",
                "Validacion de datos personales antes de finalizar la solicitud.",
            ],
        },

    ],
    "registro": [
        {
            "title": "Certificados y actas",
            "items": [
                "Nacimiento, matrimonio, defuncion, solteria y otros certificados del Registro Civil.",
                "Solicitud de copias, validacion de certificados y orientacion por tipo de acta.",
                "Correcciones o inscripciones que requieren revision documental.",
            ],
        },
        {
            "title": "Datos requeridos",
            "items": [
                "Nombre completo, numero de cedula o datos de inscripcion cuando aplique.",
                "Tipo de certificado, finalidad y metodo de entrega o retiro.",
                "Datos de contacto para notificaciones del tramite.",
            ],
        },
        {
            "title": "Casos especiales",
            "items": [
                "Correccion de datos registrales.",
                "Inscripciones tardias o solicitudes sujetas a revision.",
                "Validacion de certificados emitidos digitalmente.",
            ],
        },
    ],
    "electoral": [
        {
            "title": "Consultas electorales",
            "items": [
                "Centro de votacion, residencia electoral y orientacion para actualizar datos.",
                "Información sobre partidos políticos y consultas ciudadanas.",
                "Seguimiento de solicitudes electorales registradas.",
            ],
        },
        {
            "title": "Residencia electoral",
            "items": [
                "Registro de direccion declarada por el ciudadano.",
                "Validacion de identidad y datos de contacto.",
                "Estado de solicitud: recibida, validada, requiere revision o cerrada.",
            ],
        },
        {
            "title": "Panel funcionario",
            "items": [
                "Revision de solicitudes por estado.",
                "Metricas por servicio y provincia.",
                "Registro de movimientos para auditoria interna.",
            ],
        },
    ],
    "quioscos": [
        {
            "title": "Ubicaciones nacionales",
            "intro": "Listado base para mostrar cobertura por provincia, distrito o comarca. La capacidad es referencial para planificacion del prototipo.",
            "type": "locations",
            "items": OFFICE_LOCATIONS,
        },
        {
            "title": "Horarios",
            "items": [
                "Horario base: lunes a viernes en horario de oficina.",
                "Quioscos o puntos especiales pueden operar segun disponibilidad del centro.",
                "Jornadas regionales o comarcales pueden programarse por demanda.",
            ],
        },
        {
            "title": "Capacidad y turnos",
            "items": [
                "Capacidad alta: sedes de mayor demanda urbana o regional.",
                "Capacidad media: oficinas provinciales o distritales.",
                "Capacidad baja a media: puntos comarcales o jornadas especiales.",
                "Turnos: presencial, programado, retiro de documento o jornada especial.",
            ],
        },
        {
            "title": "Información operativa",
            "items": [
                "Provincia, distrito, corregimiento o comunidad atendida.",
                "Servicios disponibles por punto de atencion.",
                "Disponibilidad estimada, cupos y observaciones del funcionario.",
            ],
        },
    ],
}

SEED_SERVICES = [
    {
        "id": "cedula",
        "title": "Cedula / BioCed",
        "category": "Identidad",
        "summary": "Renovacion, duplicado, validacion de identidad, foto, firma y biometria.",
        "requirements": [
            "Documento de identidad anterior cuando aplique.",
            "Validacion de datos personales por fuente autorizada.",
            "Captura de foto, firma y biometria en punto autorizado.",
        ],
        "steps": [
            "Seleccionar tipo de tramite.",
            "Validar requisitos y oficina disponible.",
            "Registrar datos biometricos autorizados.",
            "Consultar estado hasta retiro.",
        ],
        "details": SERVICE_DETAILS["cedula"],
    },
    {
        "id": "registro",
        "title": "Registro Civil",
        "category": "Registro",
        "summary": "Certificados, actas, inscripciones y correcciones.",
        "requirements": [
            "Tipo de acta o certificado solicitado.",
            "Datos minimos requeridos por la institucion.",
            "Metodo de entrega o retiro.",
        ],
        "steps": [
            "Elegir tipo de certificado o acta.",
            "Revisar requisitos.",
            "Enviar solicitud o reservar atencion.",
            "Recibir confirmacion de avance.",
        ],
        "details": SERVICE_DETAILS["registro"],
    },
    {
        "id": "electoral",
        "title": "Servicios electorales",
        "category": "Electoral",
        "summary": "Centro de votacion, residencia electoral, partidos y consultas.",
        "requirements": [
            "Validacion de identidad segun tramite.",
            "Datos de residencia cuando aplique.",
            "Aceptacion de terminos del tramite correspondiente.",
        ],
        "steps": [
            "Consultar informacion electoral.",
            "Verificar requisitos.",
            "Enviar solicitud si aplica.",
            "Recibir actualizaciones oficiales.",
        ],
        "details": SERVICE_DETAILS["electoral"],
    },
    {
        "id": "quioscos",
        "title": "Oficinas y Quioscos",
        "category": "Atención",
        "summary": "Ubicaciones, horarios, capacidad y turnos.",
        "requirements": [
            "Provincia o ubicacion de referencia.",
            "Servicio requerido.",
            "Disponibilidad de turno.",
        ],
        "steps": [
            "Seleccionar provincia o ubicacion.",
            "Ver oficinas disponibles.",
            "Reservar turno.",
            "Recibir recordatorio.",
        ],
        "details": SERVICE_DETAILS["quioscos"],
    },
    {
        "id": "certificado_nacimiento",
        "title": "Certificado de nacimiento",
        "category": "Certificados",
        "summary": "Solicitud de certificado oficial de nacimiento con codigo QR.",
        "requirements": [
            "Datos personales del solicitante.",
            "Cedula de identidad vigente.",
        ],
        "steps": [
            "Enviar solicitud en linea.",
            "Esperar aprobacion del funcionario.",
            "Descargar certificado digital con QR.",
        ],
        "details": [],
    },
    {
        "id": "certificado_matrimonio",
        "title": "Certificado de matrimonio",
        "category": "Certificados",
        "summary": "Solicitud de certificado oficial de matrimonio con codigo QR.",
        "requirements": [
            "Datos personales del solicitante.",
            "Cedula de identidad vigente.",
        ],
        "steps": [
            "Enviar solicitud en linea.",
            "Esperar aprobacion del funcionario.",
            "Descargar certificado digital con QR.",
        ],
        "details": [],
    },
    {
        "id": "certificado_defuncion",
        "title": "Certificado de defuncion",
        "category": "Certificados",
        "summary": "Solicitud de certificado oficial de defuncion con codigo QR.",
        "requirements": [
            "Datos del fallecido.",
            "Solicitud autorizada.",
        ],
        "steps": [
            "Enviar solicitud en linea.",
            "Esperar aprobacion del funcionario.",
            "Descargar certificado digital con QR.",
        ],
        "details": [],
    },
    {
        "id": "certificado",
        "title": "Certificacion del Registro Civil",
        "category": "Certificados",
        "summary": "Otras certificaciones y constancias registrales.",
        "requirements": [
            "Tipo de certificacion requerida.",
            "Datos relevantes segun certificacion.",
        ],
        "steps": [
            "Enviar solicitud en linea.",
            "Esperar aprobacion del funcionario.",
            "Descargar certificacion digital con QR.",
        ],
        "details": [],
    },
]

SQLITE_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    username TEXT NOT NULL DEFAULT '',
    cedula TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK(role IN ('superadmin', 'director', 'funcionario', 'soporte')),
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    summary TEXT NOT NULL,
    requirements_json TEXT NOT NULL,
    steps_json TEXT NOT NULL,
    details_json TEXT NOT NULL DEFAULT '[]',
    is_active INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS citizen_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tracking_code TEXT NOT NULL UNIQUE,
    service_id TEXT NOT NULL REFERENCES services(id),
    citizen_id INTEGER REFERENCES citizens(id) ON DELETE CASCADE,
    citizen_name TEXT NOT NULL,
    citizen_contact TEXT NOT NULL,
    request_type TEXT,
    status TEXT NOT NULL,
    office TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS citizens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    cedula TEXT NOT NULL DEFAULT '',
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS citizen_sessions (
    token_hash TEXT PRIMARY KEY,
    citizen_id INTEGER NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    metadata_json TEXT NOT NULL,
    ip_address TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    citizen_id INTEGER REFERENCES citizens(id) ON DELETE CASCADE,
    citizen_name TEXT,
    cedula TEXT,
    service_type TEXT NOT NULL,
    office TEXT NOT NULL,
    appointment_date TEXT NOT NULL,
    appointment_time TEXT NOT NULL,
    contact_phone TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pendiente',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    citizen_id INTEGER NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_data BLOB,
    related_tracking_code TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS portal_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_key TEXT NOT NULL UNIQUE,
    section_name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
);
"""

MYSQL_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL DEFAULT '',
    cedula VARCHAR(50) NOT NULL UNIQUE,
    role ENUM('superadmin', 'director', 'funcionario', 'soporte') NOT NULL,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
    token_hash CHAR(64) PRIMARY KEY,
    user_id INT NOT NULL,
    expires_at VARCHAR(32) NOT NULL,
    created_at VARCHAR(32) NOT NULL,
    CONSTRAINT fk_sessions_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(120) NOT NULL,
    summary TEXT NOT NULL,
    requirements_json LONGTEXT NOT NULL,
    steps_json LONGTEXT NOT NULL,
    details_json LONGTEXT NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    updated_at VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS citizens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    cedula VARCHAR(50) NOT NULL DEFAULT '',
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS citizen_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tracking_code VARCHAR(32) NOT NULL UNIQUE,
    service_id VARCHAR(64) NOT NULL,
    citizen_id INT NULL,
    citizen_name VARCHAR(255) NOT NULL,
    citizen_contact VARCHAR(255) NOT NULL,
    request_type VARCHAR(100) NULL,
    status VARCHAR(40) NOT NULL,
    office VARCHAR(255) NULL,
    notes TEXT NULL,
    created_at VARCHAR(32) NOT NULL,
    updated_at VARCHAR(32) NOT NULL,
    CONSTRAINT fk_requests_service
        FOREIGN KEY (service_id) REFERENCES services(id),
    CONSTRAINT fk_requests_citizen
        FOREIGN KEY (citizen_id) REFERENCES citizens(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS citizen_sessions (
    token_hash CHAR(64) PRIMARY KEY,
    citizen_id INT NOT NULL,
    expires_at VARCHAR(32) NOT NULL,
    created_at VARCHAR(32) NOT NULL,
    CONSTRAINT fk_citizen_sessions_citizen
        FOREIGN KEY (citizen_id) REFERENCES citizens(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    actor_user_id INT NULL,
    action VARCHAR(128) NOT NULL,
    target_type VARCHAR(128) NULL,
    target_id VARCHAR(128) NULL,
    metadata_json LONGTEXT NOT NULL,
    ip_address VARCHAR(64) NULL,
    created_at VARCHAR(32) NOT NULL,
    CONSTRAINT fk_audit_user
        FOREIGN KEY (actor_user_id) REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    citizen_id INT NULL,
    citizen_name VARCHAR(200),
    cedula VARCHAR(50),
    service_type VARCHAR(100) NOT NULL,
    office VARCHAR(200) NOT NULL,
    appointment_date VARCHAR(16) NOT NULL,
    appointment_time VARCHAR(10) NOT NULL,
    contact_phone VARCHAR(50),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    created_at VARCHAR(32) NOT NULL,
    updated_at VARCHAR(32) NOT NULL,
    CONSTRAINT fk_appt_citizen
        FOREIGN KEY (citizen_id) REFERENCES citizens(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    citizen_id INT NOT NULL,
    doc_type VARCHAR(30) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_data LONGBLOB,
    related_tracking_code VARCHAR(50),
    created_at VARCHAR(32) NOT NULL,
    CONSTRAINT fk_doc_citizen
        FOREIGN KEY (citizen_id) REFERENCES citizens(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portal_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    section_key VARCHAR(100) NOT NULL UNIQUE,
    section_name VARCHAR(200) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    updated_at VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"""


class DatabaseConnection:
    def __init__(self, connection, engine):
        self.connection = connection
        self.engine = engine

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        try:
            if exc_type:
                self.connection.rollback()
            else:
                self.connection.commit()
        finally:
            self.connection.close()

    def execute(self, sql, params=()):
        if self.engine == "sqlite":
            return self.connection.execute(sql, params)

        cursor = self.connection.cursor(dictionary=True, buffered=True)
        cursor.execute(sql.replace("?", "%s"), params)
        return cursor

    def executescript(self, script):
        if self.engine == "sqlite":
            return self.connection.executescript(script)

        for statement in split_sql_script(script):
            self.execute(statement)


def split_sql_script(script):
    return [
        statement.strip()
        for statement in script.split(";")
        if statement.strip()
    ]


def utc_now():
    return dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat()


def db_connect():
    if DB_ENGINE == "sqlite":
        DATABASE.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(DATABASE)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return DatabaseConnection(connection, "sqlite")

    if DB_ENGINE == "mysql":
        try:
            import mysql.connector
        except ImportError as exc:
            raise RuntimeError(
                "Falta instalar mysql-connector-python para usar MySQL."
            ) from exc

        connection = mysql.connector.connect(
            host=MYSQL_HOST,
            port=MYSQL_PORT,
            database=MYSQL_DATABASE,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            charset="utf8mb4",
            use_unicode=True,
            autocommit=False,
        )
        return DatabaseConnection(connection, "mysql")

    raise RuntimeError("TE_DIGITAL_360_DB_ENGINE debe ser sqlite o mysql.")


def row_to_dict(row):
    return dict(row) if row is not None else None


def encode_json(value):
    return json.dumps(value, ensure_ascii=False)


def decode_json(value, fallback):
    if not value:
        return fallback

    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return fallback


def hash_password(password, salt=None):
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        260_000,
    )

    return (
        base64.b64encode(salt).decode("ascii"),
        base64.b64encode(digest).decode("ascii"),
    )


def verify_password(password, salt_b64, digest_b64):
    salt = base64.b64decode(salt_b64)
    expected = base64.b64decode(digest_b64)

    actual = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        260_000,
    )

    return hmac.compare_digest(actual, expected)


def token_digest(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_tracking_code():
    return "TD360-" + secrets.token_hex(3).upper()


def init_database():
    with db_connect() as db:
        db.executescript(MYSQL_SCHEMA if DB_ENGINE == "mysql" else SQLITE_SCHEMA)
        ensure_schema_updates(db)
        seed_services(db)
        migrate_quioscos_service(db)
        seed_admin_user(db)
        seed_soporte_user(db)
        seed_demo_users(db)
        seed_demo_request(db)
        seed_portal_config(db)


def table_exists(db, table_name):
    if DB_ENGINE == "mysql":
        row = db.execute(
            "SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
            (table_name,),
        ).fetchone()
        return row["total"] > 0

    rows = db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,)).fetchall()
    return len(rows) > 0


def column_exists(db, table_name, column_name):
    if DB_ENGINE == "mysql":
        row = db.execute(
            """
            SELECT COUNT(*) AS total
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
              AND table_name = ?
              AND column_name = ?
            """,
            (table_name, column_name),
        ).fetchone()
        return row["total"] > 0

    rows = db.execute(f"PRAGMA table_info({table_name})").fetchall()
    return any(row["name"] == column_name for row in rows)


def ensure_schema_updates(db):
    if not column_exists(db, "services", "details_json"):
        if DB_ENGINE == "mysql":
            db.execute("ALTER TABLE services ADD COLUMN details_json LONGTEXT NOT NULL")
        else:
            db.execute("ALTER TABLE services ADD COLUMN details_json TEXT NOT NULL DEFAULT '[]'")

    if not column_exists(db, "users", "cedula"):
        if DB_ENGINE == "mysql":
            db.execute("ALTER TABLE users ADD COLUMN cedula VARCHAR(50) NULL AFTER full_name")
            db.execute(
                """
                UPDATE users
                SET cedula = CONCAT('FUNC-', id)
                WHERE cedula IS NULL OR cedula = ''
                """
            )
        else:
            db.execute("ALTER TABLE users ADD COLUMN cedula TEXT")
            db.execute(
                """
                UPDATE users
                SET cedula = 'FUNC-' || id
                WHERE cedula IS NULL OR cedula = ''
                """
)
        if not index_exists(db, "idx_users_cedula"):
            db.execute("CREATE UNIQUE INDEX idx_users_cedula ON users (cedula)")

        if not column_exists(db, "citizens", "cedula"):
            if DB_ENGINE == "mysql":
                db.execute(
                    "ALTER TABLE citizens ADD COLUMN cedula VARCHAR(50) NOT NULL DEFAULT '' AFTER full_name"
                )
            else:
                db.execute(
                    "ALTER TABLE citizens ADD COLUMN cedula TEXT NOT NULL DEFAULT ''"
                )

    if not column_exists(db, "users", "username"):
        if DB_ENGINE == "mysql":
            db.execute("ALTER TABLE users ADD COLUMN username VARCHAR(100) NOT NULL DEFAULT '' AFTER full_name")
        else:
            db.execute("ALTER TABLE users ADD COLUMN username TEXT NOT NULL DEFAULT ''")

    if not table_exists(db, "portal_config"):
        if DB_ENGINE == "mysql":
            db.execute(
                """CREATE TABLE IF NOT EXISTS portal_config (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    section_key VARCHAR(100) NOT NULL UNIQUE,
                    section_name VARCHAR(200) NOT NULL,
                    is_active TINYINT(1) NOT NULL DEFAULT 1,
                    sort_order INT NOT NULL DEFAULT 0,
                    updated_at VARCHAR(32) NOT NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"""
            )
        else:
            db.execute(
                """CREATE TABLE IF NOT EXISTS portal_config (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    section_key TEXT NOT NULL UNIQUE,
                    section_name TEXT NOT NULL,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    sort_order INTEGER NOT NULL DEFAULT 0,
                    updated_at TEXT NOT NULL
                )"""
            )

    if table_exists(db, "appointments"):
        if DB_ENGINE == "mysql":
            cursor = db.execute("SHOW COLUMNS FROM appointments")
            cols = [row["Field"] for row in cursor.fetchall()]
        else:
            cursor = db.execute("PRAGMA table_info(appointments)")
            cols = [row[1] for row in cursor.fetchall()]
        if "citizen_name" not in cols:
            if DB_ENGINE == "mysql":
                db.execute("ALTER TABLE appointments ADD COLUMN citizen_name VARCHAR(200) NULL")
            else:
                db.execute("ALTER TABLE appointments ADD COLUMN citizen_name TEXT")
        if "cedula" not in cols:
            if DB_ENGINE == "mysql":
                db.execute("ALTER TABLE appointments ADD COLUMN cedula VARCHAR(50) NULL")
            else:
                db.execute("ALTER TABLE appointments ADD COLUMN cedula TEXT")

    if table_exists(db, "citizen_requests"):
        if DB_ENGINE == "mysql":
            cursor = db.execute("SHOW COLUMNS FROM citizen_requests")
            cols = [row["Field"] for row in cursor.fetchall()]
        else:
            cursor = db.execute("PRAGMA table_info(citizen_requests)")
            cols = [row[1] for row in cursor.fetchall()]
        if "request_type" not in cols:
            if DB_ENGINE == "mysql":
                db.execute("ALTER TABLE citizen_requests ADD COLUMN request_type VARCHAR(100) NULL")
            else:
                db.execute("ALTER TABLE citizen_requests ADD COLUMN request_type TEXT")
        db.execute(
            """UPDATE citizen_requests SET request_type = TRIM(SUBSTR(notes, 10))
               WHERE request_type IS NULL OR request_type = ''
               AND notes LIKE 'Tramite: %'"""
        )
        db.execute(
            """UPDATE citizen_requests SET request_type = TRIM(SUBSTR(notes, 10))
               WHERE request_type IS NULL OR request_type = ''
               AND notes LIKE 'Trámite: %'"""
        )

    if DB_ENGINE == "mysql":
        try:
            db.execute(
                "ALTER TABLE users MODIFY COLUMN role ENUM('superadmin','director','funcionario','soporte') NOT NULL"
            )
        except Exception:
            pass

    if DB_ENGINE == "mysql":
        try:
            db.execute("ALTER TABLE citizens ADD COLUMN photo LONGBLOB NULL")
        except Exception:
            pass
    else:
        try:
            db.execute("ALTER TABLE citizens ADD COLUMN photo TEXT")
        except Exception:
            pass


def exact_equals(column):
    return f"BINARY {column} = ?" if DB_ENGINE == "mysql" else f"{column} = ?"


def service_id_exists_exact(db, service_id):
    row = db.execute(
        f"SELECT COUNT(*) AS total FROM services WHERE {exact_equals('id')}",
        (service_id,),
    ).fetchone()
    return row["total"] > 0


def migrate_quioscos_service(db):
    legacy_ids = ("k" + "ioscos", "K" + "ioscos", "Quioscos")

    if service_id_exists_exact(db, "Quioscos") and not service_id_exists_exact(db, "quioscos"):
        db.execute(
            f"UPDATE citizen_requests SET service_id = ? WHERE {exact_equals('service_id')}",
            ("quioscos", "Quioscos"),
        )
        db.execute(
            f"UPDATE services SET id = ? WHERE {exact_equals('id')}",
            ("quioscos", "Quioscos"),
        )

    for legacy_id in legacy_ids:
        if legacy_id == "Quioscos" and service_id_exists_exact(db, "quioscos"):
            db.execute(
                f"UPDATE citizen_requests SET service_id = ? WHERE {exact_equals('service_id')}",
                ("quioscos", legacy_id),
            )
            db.execute(
                f"DELETE FROM services WHERE {exact_equals('id')}",
                (legacy_id,),
            )
            continue

        if legacy_id != "Quioscos":
            db.execute(
                f"UPDATE citizen_requests SET service_id = ? WHERE {exact_equals('service_id')}",
                ("quioscos", legacy_id),
            )
            db.execute(
                f"DELETE FROM services WHERE {exact_equals('id')}",
                (legacy_id,),
            )


def index_exists(db, index_name):
    if DB_ENGINE == "mysql":
        row = db.execute(
            """
            SELECT COUNT(*) AS total
            FROM information_schema.statistics
            WHERE table_schema = DATABASE()
              AND index_name = ?
            """,
            (index_name,),
        ).fetchone()
        return row["total"] > 0

    rows = db.execute("PRAGMA index_list(users)").fetchall()
    return any(row["name"] == index_name for row in rows)


def seed_services(db):
    for service in SEED_SERVICES:
        params = (
            service["id"],
            service["title"],
            service["category"],
            service["summary"],
            encode_json(service["requirements"]),
            encode_json(service["steps"]),
            encode_json(service.get("details", [])),
            utc_now(),
        )

        if DB_ENGINE == "mysql":
            db.execute(
                """
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
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
                ON DUPLICATE KEY UPDATE
                    title = VALUES(title),
                    category = VALUES(category),
                    summary = VALUES(summary),
                    requirements_json = VALUES(requirements_json),
                    steps_json = VALUES(steps_json),
                    details_json = VALUES(details_json),
                    is_active = VALUES(is_active),
                    updated_at = VALUES(updated_at)
                """,
                params,
            )
        else:
            db.execute(
                """
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
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
                ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    category = excluded.category,
                    summary = excluded.summary,
                    requirements_json = excluded.requirements_json,
                    steps_json = excluded.steps_json,
                    details_json = excluded.details_json,
                    updated_at = excluded.updated_at
                """,
                params,
            )


def seed_admin_user(db):
    user_count = db.execute(
        "SELECT COUNT(*) AS total FROM users"
    ).fetchone()["total"]

    if user_count > 0:
        return

    password = os.environ.get("TE_DIGITAL_360_ADMIN_PASSWORD", "Cambiar123!")
    salt, digest = hash_password(password)

    db.execute(
        """
        INSERT INTO users (
            email,
            full_name,
            username,
            cedula,
            role,
            password_salt,
            password_hash,
            is_active,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
        """,
        (
            "admin@te.gob.pa",
            "Superadmin TE Digital Express 360",
            "admin",
            "ADMIN-0001",
            "superadmin",
            salt,
            digest,
            utc_now(),
        ),
    )


def seed_soporte_user(db):
    existing = db.execute(
        "SELECT id FROM users WHERE email = ?",
        ("soporte@te.gob.pa",),
    ).fetchone()

    if existing:
        return

    password = os.environ.get("TE_DIGITAL_360_SOPORTE_PASSWORD", "Soporte123!")
    salt, digest = hash_password(password)

    db.execute(
        """
        INSERT INTO users (
            email,
            full_name,
            username,
            cedula,
            role,
            password_salt,
            password_hash,
            is_active,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
        """,
        (
            "soporte@te.gob.pa",
            "Soporte TE Digital Express 360",
            "soporte",
            "SOPORTE-0001",
            "soporte",
            salt,
            digest,
            utc_now(),
        ),
    )


def seed_demo_users(db):
    users_to_seed = [
        ("director@te.gob.pa", "Director TE Digital Express 360", "director", "DIR-0001", "director", "Director123!"),
        ("func@te.gob.pa", "Funcionario TE Digital Express 360", "funcionario", "FUNC-0001", "funcionario", "Func1234!"),
    ]

    for email, full_name, username, cedula, role, default_pw in users_to_seed:
        existing = db.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            continue

        password = default_pw
        salt, digest = hash_password(password)

        db.execute(
            """
            INSERT INTO users (
                email, full_name, username, cedula, role,
                password_salt, password_hash, is_active, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
            """,
            (email, full_name, username, cedula, role, salt, digest, utc_now()),
        )


def seed_portal_config(db):
    now = utc_now()

    for key, name, active, order in DEFAULT_PORTAL_SECTIONS:
        existing = db.execute(
            "SELECT id FROM portal_config WHERE section_key = ?",
            (key,),
        ).fetchone()

        if existing:
            db.execute(
                """
                UPDATE portal_config
                SET section_name = ?,
                    updated_at = ?
                WHERE section_key = ?
                """,
                (name, now, key),
            )
            continue

        db.execute(
            """
            INSERT INTO portal_config (
                section_key,
                section_name,
                is_active,
                sort_order,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (key, name, active, order, now),
        )


def seed_demo_request(db):
    request_count = db.execute(
        "SELECT COUNT(*) AS total FROM citizen_requests"
    ).fetchone()["total"]

    if request_count > 0:
        return

    now = utc_now()

    db.execute(
        """
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
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "TD360-0429",
            "cedula",
            "Ciudadano de ejemplo",
            "ciudadano@example.local",
            "en_impresion",
            "Oficina regional sugerida",
            "Registro inicial para validar el flujo de seguimiento.",
            now,
            now,
        ),
    )


def get_service(db, service_id):
    row = db.execute(
        "SELECT * FROM services WHERE id = ? AND is_active = 1",
        (service_id,),
    ).fetchone()

    return service_payload(row) if row else None


def service_payload(row):
    data = row_to_dict(row)

    data["requirements"] = decode_json(data.pop("requirements_json"), [])
    data["steps"] = decode_json(data.pop("steps_json"), [])
    data["details"] = decode_json(data.pop("details_json", "[]"), [])
    data["is_active"] = bool(data["is_active"])

    return data


def request_payload(row, service=None, include_private=False):
    data = row_to_dict(row)

    data["progress"] = STATUS_PROGRESS.get(data["status"], 25)
    data["statusLabel"] = STATUS_LABELS.get(data["status"], data["status"])

    data["timeline"] = [
        {
            "key": "recibida",
            "label": STATUS_LABELS["recibida"],
            "done": data["progress"] >= 25,
        },
        {
            "key": "validada",
            "label": STATUS_LABELS["validada"],
            "done": data["progress"] >= 50,
        },
        {
            "key": "en_impresion",
            "label": STATUS_LABELS["en_impresion"],
            "done": data["progress"] >= 75,
        },
        {
            "key": "lista_retiro",
            "label": STATUS_LABELS["lista_retiro"],
            "done": data["progress"] >= 100,
        },
    ]

    data["nextStep"] = next_step_for_status(data["status"])

    if service:
        data["service"] = service

    if not include_private:
        data.pop("citizen_name", None)
        data.pop("citizen_contact", None)
        data.pop("notes", None)

    return data


def next_step_for_status(status):
    if status == "recibida":
        return "La solicitud fue recibida y esta pendiente de validacion."

    if status == "validada":
        return "Los datos fueron validados y el tramite pasa a procesamiento."

    if status == "en_impresion":
        return "Cuando pase a retiro, el sistema mostrara la oficina sugerida y horarios disponibles."

    if status == "lista_retiro":
        return "El documento o respuesta esta lista para retiro o entrega segun el canal indicado."

    if status == "requiere_revision":
        return "El funcionario debe revisar la solicitud y contactar al ciudadano si aplica."

    return "El tramite se encuentra cerrado."


def create_audit(
    db,
    user_id,
    action,
    target_type=None,
    target_id=None,
    metadata=None,
    ip_address=None,
):
    db.execute(
        """
        INSERT INTO audit_logs (
            actor_user_id,
            action,
            target_type,
            target_id,
            metadata_json,
            ip_address,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user_id,
            action,
            target_type,
            target_id,
            encode_json(metadata or {}),
            ip_address,
            utc_now(),
        ),
    )

