import datetime as dt
import re
import secrets

from config import TOKEN_TTL_HOURS
from database import (
    create_audit,
    hash_password,
    row_to_dict,
    token_digest,
    utc_now,
    verify_password,
)


EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
CEDULA_PATTERN = re.compile(r"^[A-Za-z0-9-]{4,30}$")
FUNCIONARIO_ALLOWED_DOMAINS = {
    "outlook.com",
    "hotmail.com",
    "live.com",
    "tribunal-electoral.gob.pa",
    "te.gob.pa",
}


def user_payload(user):
    keys = user.keys() if hasattr(user, "keys") else user

    return {
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "cedula": user["cedula"] if "cedula" in keys else None,
        "role": user["role"],
    }


def login_user(db, email, password, ip_address=None):
    email = str(email or "").strip().lower()
    password = str(password or "")

    user = db.execute(
        "SELECT * FROM users WHERE email = ? AND is_active = 1",
        (email,),
    ).fetchone()

    if not user or not verify_password(
        password,
        user["password_salt"],
        user["password_hash"],
    ):
        create_audit(
            db,
            None,
            "auth.login_failed",
            "user",
            email,
            ip_address=ip_address,
        )
        return None

    token = secrets.token_urlsafe(32)

    expires_at = (
        dt.datetime.now(dt.UTC) + dt.timedelta(hours=TOKEN_TTL_HOURS)
    ).replace(microsecond=0).isoformat()

    db.execute(
        """
        INSERT INTO sessions (
            token_hash,
            user_id,
            expires_at,
            created_at
        )
        VALUES (?, ?, ?, ?)
        """,
        (
            token_digest(token),
            user["id"],
            expires_at,
            utc_now(),
        ),
    )

    create_audit(
        db,
        user["id"],
        "auth.login",
        "user",
        str(user["id"]),
        ip_address=ip_address,
    )

    return {
        "token": token,
        "expiresAt": expires_at,
        "user": user_payload(user),
    }


def register_funcionario(db, full_name, cedula, email, password, ip_address=None):
    full_name = str(full_name or "").strip()
    cedula = str(cedula or "").strip().upper()
    email = str(email or "").strip().lower()
    password = str(password or "")

    if len(full_name) < 3:
        return None, "El nombre debe tener al menos 3 caracteres."

    if not CEDULA_PATTERN.match(cedula):
        return None, "La cédula debe tener entre 4 y 30 caracteres, usando letras, números o guiones."

    if not EMAIL_PATTERN.match(email):
        return None, "Ingrese un correo válido."

    domain = email.rsplit("@", 1)[-1]

    if domain not in FUNCIONARIO_ALLOWED_DOMAINS:
        return None, (
            "El registro funcionario solo acepta correos Outlook, Hotmail, Live "
            "o dominios oficiales del Tribunal Electoral."
        )

    if len(password) < 8:
        return None, "La contraseña debe tener al menos 8 caracteres."

    existing = db.execute(
        """
        SELECT email, cedula
        FROM users
        WHERE email = ? OR cedula = ?
        """,
        (email, cedula),
    ).fetchone()

    if existing:
        if existing["email"] == email:
            return None, "Ya existe un funcionario registrado con ese correo."

        return None, "Ya existe un funcionario registrado con esa cédula."

    salt, digest = hash_password(password)
    now = utc_now()

    db.execute(
        """
        INSERT INTO users (
            email,
            full_name,
            cedula,
            role,
            password_salt,
            password_hash,
            is_active,
            created_at
        )
        VALUES (?, ?, ?, 'funcionario', ?, ?, 1, ?)
        """,
        (
            email,
            full_name,
            cedula,
            salt,
            digest,
            now,
        ),
    )

    user = db.execute(
        "SELECT * FROM users WHERE email = ?",
        (email,),
    ).fetchone()

    create_audit(
        db,
        user["id"],
        "auth.funcionario_registered",
        "user",
        str(user["id"]),
        {"email": email, "cedula": cedula},
        ip_address=ip_address,
    )

    return {"user": user_payload(user)}, None


def logout_user(db, authorization_header):
    header = authorization_header or ""

    if header.startswith("Bearer "):
        token = header.replace("Bearer ", "", 1).strip()

        if token:
            db.execute(
                "DELETE FROM sessions WHERE token_hash = ?",
                (token_digest(token),),
            )

    return {"ok": True}


CITIZEN_PASSWORD_PATTERN = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+={}\[\]|:;\"'<>,.?/~`]).{8,12}$"
)


CITIZEN_CEDULA_PATTERN = re.compile(r"^[0-9]{1,2}-[0-9]{1,6}-[0-9]{1,5}$")


def citizen_payload(citizen):
    return {
        "id": citizen["id"],
        "email": citizen["email"],
        "full_name": citizen["full_name"],
        "cedula": citizen["cedula"] if "cedula" in citizen.keys() else "",
    }


def register_citizen(db, full_name, email, cedula, password, ip_address=None):
    full_name = str(full_name or "").strip()
    email = str(email or "").strip().lower()
    cedula = str(cedula or "").strip().upper()
    password = str(password or "")

    if len(full_name) < 3:
        return None, "El nombre debe tener al menos 3 caracteres."

    if not EMAIL_PATTERN.match(email):
        return None, "Ingrese un correo valido."

    if not CITIZEN_CEDULA_PATTERN.match(cedula):
        return None, "Ingrese una cedula valida (ej: 8-123-456)."

    if not CITIZEN_PASSWORD_PATTERN.match(password):
        return None, (
            "La contrasena debe tener entre 8 y 12 caracteres, "
            "incluyendo mayusculas, minusculas, numeros y al menos un caracter especial."
        )

    existing = db.execute(
        "SELECT id, email, cedula FROM citizens WHERE email = ? OR cedula = ?",
        (email, cedula),
    ).fetchone()

    if existing:
        if existing["email"] == email:
            return None, "YA_EXISTE"
        return None, "Ya existe una cuenta con esa cedula."

    salt, digest = hash_password(password)
    now = utc_now()

    db.execute(
        """
        INSERT INTO citizens (
            email,
            full_name,
            cedula,
            password_salt,
            password_hash,
            is_active,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, 1, ?)
        """,
        (email, full_name, cedula, salt, digest, now),
    )

    citizen = db.execute(
        "SELECT * FROM citizens WHERE email = ?",
        (email,),
    ).fetchone()

    create_audit(
        db,
        None,
        "citizen.registered",
        "citizen",
        str(citizen["id"]),
        {"email": email},
        ip_address=ip_address,
    )

    token = secrets.token_urlsafe(32)
    expires_at = (
        dt.datetime.now(dt.UTC) + dt.timedelta(hours=TOKEN_TTL_HOURS)
    ).replace(microsecond=0).isoformat()

    db.execute(
        """
        INSERT INTO citizen_sessions (
            token_hash,
            citizen_id,
            expires_at,
            created_at
        )
        VALUES (?, ?, ?, ?)
        """,
        (token_digest(token), citizen["id"], expires_at, utc_now()),
    )

    return {
        "token": token,
        "expiresAt": expires_at,
        "citizen": citizen_payload(citizen),
    }, None


def login_citizen(db, email, password, ip_address=None):
    email = str(email or "").strip().lower()
    password = str(password or "")

    citizen = db.execute(
        "SELECT * FROM citizens WHERE email = ? AND is_active = 1",
        (email,),
    ).fetchone()

    if not citizen or not verify_password(
        password,
        citizen["password_salt"],
        citizen["password_hash"],
    ):
        create_audit(
            db,
            None,
            "citizen.login_failed",
            "citizen",
            email,
            ip_address=ip_address,
        )
        return None

    token = secrets.token_urlsafe(32)
    expires_at = (
        dt.datetime.now(dt.UTC) + dt.timedelta(hours=TOKEN_TTL_HOURS)
    ).replace(microsecond=0).isoformat()

    db.execute(
        """
        INSERT INTO citizen_sessions (
            token_hash,
            citizen_id,
            expires_at,
            created_at
        )
        VALUES (?, ?, ?, ?)
        """,
        (token_digest(token), citizen["id"], expires_at, utc_now()),
    )

    create_audit(
        db,
        None,
        "citizen.login",
        "citizen",
        str(citizen["id"]),
        ip_address=ip_address,
    )

    return {
        "token": token,
        "expiresAt": expires_at,
        "citizen": citizen_payload(citizen),
    }


def current_citizen(db, authorization_header):
    header = authorization_header or ""

    if not header.startswith("Bearer "):
        return None

    token = header.replace("Bearer ", "", 1).strip()

    if not token:
        return None

    row = db.execute(
        """
        SELECT citizens.*
        FROM citizen_sessions
        JOIN citizens ON citizens.id = citizen_sessions.citizen_id
        WHERE citizen_sessions.token_hash = ?
          AND citizen_sessions.expires_at > ?
          AND citizens.is_active = 1
        """,
        (token_digest(token), utc_now()),
    ).fetchone()

    return row_to_dict(row)


def logout_citizen(db, authorization_header):
    header = authorization_header or ""

    if header.startswith("Bearer "):
        token = header.replace("Bearer ", "", 1).strip()

        if token:
            db.execute(
                "DELETE FROM citizen_sessions WHERE token_hash = ?",
                (token_digest(token),),
            )

    return {"ok": True}
