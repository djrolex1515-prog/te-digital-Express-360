import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse
import json
import mimetypes

from config import *
from database import *
from assistant_module import answer_question
from auth import (
    current_citizen,
    login_citizen,
    login_user,
    logout_citizen,
    logout_user,
    register_citizen,
    register_funcionario,
)
from email_utils import send_welcome_email


class Handler(BaseHTTPRequestHandler):
    server_version = f"TEDigital360/{APP_VERSION}"

    def log_message(self, format, *args):
        return

    def send_security_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        self.send_header("Cache-Control", "no-store")

    def send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")

        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_security_headers()
        self.end_headers()
        self.wfile.write(body)

    def send_static(self, requested_path):
        clean_path = unquote(requested_path).split("?", 1)[0].lstrip("/")

        if clean_path == "":
            clean_path = "principal.html"

        file_path = (FRONTEND / clean_path).resolve()

        try:
            file_path.relative_to(FRONTEND.resolve())
        except ValueError:
            self.send_error(403)
            return

        if not file_path.exists() or not file_path.is_file():
            self.send_error(404)
            return

        content_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
        body = file_path.read_bytes()

        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def read_json_body(self):
        length = int(self.headers.get("Content-Length", "0"))

        if length > MAX_BODY_BYTES:
            raise ValueError("El cuerpo de la solicitud es demasiado grande.")

        raw_body = self.rfile.read(length).decode("utf-8") if length else "{}"

        try:
            return json.loads(raw_body)
        except json.JSONDecodeError as exc:
            raise ValueError("Formato JSON invalido.") from exc

    def current_user(self, db):
        header = self.headers.get("Authorization", "")

        if not header.startswith("Bearer "):
            return None

        token = header.replace("Bearer ", "", 1).strip()

        if not token:
            return None

        row = db.execute(
            """
            SELECT users.*
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token_hash = ?
              AND sessions.expires_at > ?
              AND users.is_active = 1
            """,
            (token_digest(token), utc_now()),
        ).fetchone()

        return row_to_dict(row)

    def require_user(self, db, roles=None):
        user = self.current_user(db)

        if not user:
            self.send_json({"error": "Autenticacion requerida."}, status=401)
            return None

        if roles and user["role"] not in roles:
            self.send_json({"error": "Permisos insuficientes."}, status=403)
            return None

        return user

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", self.headers.get("Origin", "*"))
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)

        try:
            if parsed.path.startswith("/api/"):
                self.handle_get_api(parsed.path)
            else:
                self.send_static(parsed.path)

        except Exception as exc:
            self.send_json({"error": "Error interno.", "detail": str(exc)}, status=500)

    def handle_get_api(self, path):
        with db_connect() as db:
            if path == "/api/health":
                self.send_json(
                    {
                        "ok": True,
                        "project": APP_NAME,
                        "version": APP_VERSION,
                    }
                )
                return

            if path == "/api/services":
                rows = db.execute(
                    "SELECT * FROM services WHERE is_active = 1 ORDER BY category, title"
                ).fetchall()

                self.send_json(
                    {
                        "services": [service_payload(row) for row in rows]
                    }
                )
                return

            if path.startswith("/api/tracking/"):
                tracking_code = path.rsplit("/", 1)[-1].upper()

                row = db.execute(
                    "SELECT * FROM citizen_requests WHERE tracking_code = ?",
                    (tracking_code,),
                ).fetchone()

                if not row:
                    self.send_json({"error": "Solicitud no encontrada."}, status=404)
                    return

                service = get_service(db, row["service_id"])

                self.send_json(
                    request_payload(
                        row,
                        service=service,
                        include_private=False,
                    )
                )
                return

            if path == "/api/me":
                user = self.require_user(db)

                if not user:
                    return

                user.pop("password_salt", None)
                user.pop("password_hash", None)

                self.send_json({"user": user})
                return

            if path == "/api/citizens/me":
                citizen = current_citizen(
                    db,
                    self.headers.get("Authorization", ""),
                )

                if not citizen:
                    self.send_json({"error": "No autenticado."}, status=401)
                    return

                citizen.pop("password_salt", None)
                citizen.pop("password_hash", None)

                self.send_json(citizen)
                return

            if path == "/api/appointments":
                citizen = current_citizen(
                    db,
                    self.headers.get("Authorization", ""),
                )
                if not citizen:
                    self.send_json({"error": "No autenticado."}, status=401)
                    return
                rows = db.execute(
                    "SELECT * FROM appointments WHERE citizen_id = ? ORDER BY appointment_date DESC, appointment_time DESC LIMIT 20",
                    (citizen["id"],),
                ).fetchall()
                self.send_json({"appointments": [row_to_dict(r) for r in rows]})
                return

            if path == "/api/documents":
                citizen = current_citizen(
                    db,
                    self.headers.get("Authorization", ""),
                )
                if not citizen:
                    self.send_json({"error": "No autenticado."}, status=401)
                    return
                rows = db.execute(
                    "SELECT id, doc_type, filename, related_tracking_code, created_at FROM documents WHERE citizen_id = ? ORDER BY created_at DESC",
                    (citizen["id"],),
                ).fetchall()
                self.send_json({"documents": [row_to_dict(r) for r in rows]})
                return

            if path == "/api/my-requests":
                citizen = current_citizen(
                    db,
                    self.headers.get("Authorization", ""),
                )
                if not citizen:
                    self.send_json({"error": "No autenticado."}, status=401)
                    return
                rows = db.execute(
                    """SELECT citizen_requests.*, services.title AS service_title
                       FROM citizen_requests
                       LEFT JOIN services ON services.id = citizen_requests.service_id
                       WHERE citizen_requests.citizen_id = ?
                       ORDER BY citizen_requests.created_at DESC LIMIT 50""",
                    (citizen["id"],),
                ).fetchall()
                reqs = []
                for row in rows:
                    p = request_payload(row, include_private=False)
                    p["service_title"] = row["service_title"] or row["service_id"]
                    reqs.append(p)
                self.send_json({"requests": reqs})
                return

            if path.startswith("/api/documents/") and path.endswith("/download"):
                parts = path.split("/")
                doc_id = parts[-2]
                citizen = current_citizen(
                    db,
                    self.headers.get("Authorization", ""),
                )
                if not citizen:
                    self.send_json({"error": "No autenticado."}, status=401)
                    return
                row = db.execute(
                    "SELECT * FROM documents WHERE id = ? AND citizen_id = ?",
                    (doc_id, citizen["id"]),
                ).fetchone()
                if not row:
                    self.send_json({"error": "Documento no encontrado."}, status=404)
                    return
                self.send_response(200)
                self.send_header("Content-Type", "application/octet-stream")
                self.send_header("Content-Disposition", f'attachment; filename="{row["filename"]}"')
                self.send_header("Content-Length", str(len(row["file_data"])))
                self.send_security_headers()
                self.end_headers()
                self.wfile.write(row["file_data"])
                return

            if path == "/api/requests":
                user = self.require_user(
                    db,
                    roles={"superadmin", "director", "funcionario"},
                )

                if not user:
                    return

                rows = db.execute(
                    """
                    SELECT citizen_requests.*, services.title AS service_title
                    FROM citizen_requests
                    LEFT JOIN services ON services.id = citizen_requests.service_id
                    ORDER BY citizen_requests.updated_at DESC
                    LIMIT 100
                    """
                ).fetchall()

                requests = []

                for row in rows:
                    payload = request_payload(row, include_private=True)
                    payload["service_title"] = row["service_title"] or row["service_id"]
                    requests.append(payload)

                self.send_json({"requests": requests})
                return

            if path == "/api/dashboard":
                user = self.require_user(
                    db,
                    roles={"superadmin", "director", "funcionario"},
                )

                if not user:
                    return

                total = db.execute(
                    "SELECT COUNT(*) AS total FROM citizen_requests"
                ).fetchone()["total"]

                by_status = [
                    row_to_dict(row)
                    for row in db.execute(
                        "SELECT status, COUNT(*) AS total FROM citizen_requests GROUP BY status"
                    ).fetchall()
                ]

                by_service = [
                    row_to_dict(row)
                    for row in db.execute(
                        """
                        SELECT services.title, COUNT(citizen_requests.id) AS total
                        FROM services
                        LEFT JOIN citizen_requests ON citizen_requests.service_id = services.id
                        GROUP BY services.id
                        ORDER BY total DESC
                        """
                    ).fetchall()
                ]

                self.send_json(
                    {
                        "totalRequests": total,
                        "byStatus": by_status,
                        "byService": by_service,
                    }
                )
                return

            if path == "/api/certificados/pendientes":
                user = self.require_user(
                    db,
                    roles={"superadmin", "director", "funcionario"},
                )
                if not user:
                    return

                rows = db.execute(
                    """
                    SELECT citizen_requests.*, services.title AS service_title
                    FROM citizen_requests
                    JOIN services ON services.id = citizen_requests.service_id
                    WHERE citizen_requests.status = 'en_espera'
                      AND services.category = 'Certificados'
                    ORDER BY citizen_requests.created_at DESC
                    """
                ).fetchall()

                results = []
                for row in rows:
                    p = request_payload(row, include_private=True)
                    p["service_title"] = row["service_title"]
                    results.append(p)

                self.send_json({"certificados": results})
                return

            if path == "/api/admin/stats":
                user = self.require_user(db, roles={"superadmin", "director", "funcionario"})
                if not user:
                    return

                total_users = db.execute("SELECT COUNT(*) AS total FROM users").fetchone()["total"]
                total_active = db.execute("SELECT COUNT(*) AS total FROM users WHERE is_active = 1").fetchone()["total"]
                total_requests = db.execute("SELECT COUNT(*) AS total FROM citizen_requests").fetchone()["total"]
                total_citizens = db.execute("SELECT COUNT(*) AS total FROM citizens").fetchone()["total"]
                total_sessions = db.execute("SELECT COUNT(*) AS total FROM sessions WHERE expires_at > ?", (utc_now(),)).fetchone()["total"]
                total_citizen_sessions = db.execute("SELECT COUNT(*) AS total FROM citizen_sessions WHERE expires_at > ?", (utc_now(),)).fetchone()["total"]
                total_appointments = db.execute("SELECT COUNT(*) AS total FROM appointments").fetchone()["total"]
                total_documents = db.execute("SELECT COUNT(*) AS total FROM documents").fetchone()["total"]

                roles_count = db.execute("SELECT role, COUNT(*) AS total FROM users GROUP BY role").fetchall()

                self.send_json({
                    "totalUsers": total_users,
                    "totalActive": total_active,
                    "totalRequests": total_requests,
                    "totalCitizens": total_citizens,
                    "totalSessions": total_sessions,
                    "totalCitizenSessions": total_citizen_sessions,
                    "totalAppointments": total_appointments,
                    "totalDocuments": total_documents,
                    "requests": total_requests,
                    "citizens": total_citizens,
                    "appointments": total_appointments,
                    "documents": total_documents,
                    "roles": [row_to_dict(r) for r in roles_count],
                })
                return

            if path == "/api/admin/users":
                user = self.require_user(db, roles={"superadmin", "director"})
                if not user:
                    return

                rows = db.execute(
                    "SELECT id, email, full_name, username, cedula, role, is_active, created_at FROM users ORDER BY id"
                ).fetchall()

                self.send_json({"users": [row_to_dict(r) for r in rows]})
                return

            if path == "/api/admin/citizens":
                user = self.require_user(db, roles={"superadmin", "director"})
                if not user:
                    return

                rows = db.execute(
                    "SELECT id, email, full_name, cedula, is_active, created_at FROM citizens ORDER BY id"
                ).fetchall()

                self.send_json({"citizens": [row_to_dict(r) for r in rows]})
                return

            if path == "/api/admin/services":
                user = self.require_user(db, roles={"superadmin", "director"})
                if not user:
                    return

                rows = db.execute(
                    "SELECT id, title, category, summary, is_active, updated_at FROM services ORDER BY category, title"
                ).fetchall()

                self.send_json({"services": [row_to_dict(r) for r in rows]})
                return

            if path == "/api/admin/requests":
                user = self.require_user(
                    db,
                    roles={"superadmin", "director", "funcionario"},
                )
                if not user:
                    return

                rows = db.execute(
                    """
                    SELECT citizen_requests.*, services.title AS service_title
                    FROM citizen_requests
                    LEFT JOIN services ON services.id = citizen_requests.service_id
                    ORDER BY citizen_requests.created_at DESC
                    LIMIT 200
                    """
                ).fetchall()

                results = []
                for row in rows:
                    p = request_payload(row, include_private=True)
                    p["service_title"] = row["service_title"] or row["service_id"]
                    results.append(p)

                self.send_json({"requests": results})
                return

            if path == "/api/admin/appointments":
                user = self.require_user(db, roles={"superadmin", "director", "funcionario"})
                if not user:
                    return

                rows = db.execute(
                    """
                    SELECT appointments.*, citizens.full_name AS citizen_name, citizens.email AS citizen_email
                    FROM appointments
                    LEFT JOIN citizens ON citizens.id = appointments.citizen_id
                    ORDER BY appointments.appointment_date DESC, appointments.appointment_time DESC
                    LIMIT 200
                    """
                ).fetchall()

                self.send_json({"appointments": [row_to_dict(r) for r in rows]})
                return

            if path == "/api/admin/documents":
                user = self.require_user(db, roles={"superadmin", "director", "funcionario"})
                if not user:
                    return

                rows = db.execute(
                    """SELECT documents.id, documents.doc_type, documents.filename, documents.related_tracking_code, documents.created_at,
                              citizens.full_name AS citizen_name, citizens.email AS citizen_email
                       FROM documents
                       LEFT JOIN citizens ON citizens.id = documents.citizen_id
                       ORDER BY documents.created_at DESC
                       LIMIT 200"""
                ).fetchall()

                self.send_json({"documents": [row_to_dict(r) for r in rows]})
                return

            if path == "/api/portal-config":
                rows = db.execute(
                    "SELECT section_key, section_name, is_active, sort_order FROM portal_config ORDER BY sort_order ASC"
                ).fetchall()
                self.send_json({"sections": [row_to_dict(r) for r in rows]})
                return

            if path == "/api/admin/portal-config":
                user = self.require_user(db, roles={"superadmin", "director"})
                if not user:
                    return

                rows = db.execute(
                    "SELECT id, section_key, section_name, is_active, sort_order, updated_at FROM portal_config ORDER BY sort_order ASC"
                ).fetchall()
                self.send_json({"sections": [row_to_dict(r) for r in rows]})
                return

        self.send_json({"error": "Ruta no encontrada."}, status=404)

    def do_POST(self):
        parsed = urlparse(self.path)

        try:
            payload = self.read_json_body()

            if parsed.path.startswith("/api/"):
                self.handle_post_api(parsed.path, payload)
            else:
                self.send_error(404)

        except ValueError as exc:
            self.send_json({"error": str(exc)}, status=400)

        except Exception as exc:
            self.send_json({"error": "Error interno.", "detail": str(exc)}, status=500)

    def handle_post_api(self, path, payload):
        with db_connect() as db:
            if path == "/api/auth/login":
                result = login_user(
                    db,
                    payload.get("email"),
                    payload.get("password"),
                    ip_address=self.client_address[0],
                )

                if not result:
                    self.send_json({"error": "Credenciales invalidas."}, status=401)
                    return

                self.send_json(result)
                return

            if path == "/api/auth/register-funcionario":
                result, error = register_funcionario(
                    db,
                    payload.get("full_name"),
                    payload.get("cedula"),
                    payload.get("email"),
                    payload.get("password"),
                    ip_address=self.client_address[0],
                )

                if error:
                    self.send_json({"error": error}, status=400)
                    return

                self.send_json(result, status=201)
                return

            if path == "/api/auth/logout":
                result = logout_user(
                    db,
                    self.headers.get("Authorization", ""),
                )

                self.send_json(result)
                return

            if path == "/api/auth/update-profile":
                user = self.require_user(db)
                if not user:
                    return

                new_email = str(payload.get("email", "")).strip()
                new_password = str(payload.get("password", "")).strip()
                current_password = str(payload.get("current_password", "")).strip()

                if not current_password:
                    self.send_json({"error": "Contrasena actual requerida."}, status=400)
                    return

                if not verify_password(current_password, user["password_salt"], user["password_hash"]):
                    self.send_json({"error": "Contrasena actual incorrecta."}, status=400)
                    return

                now = utc_now()

                if new_email and new_email != user["email"]:
                    existing = db.execute("SELECT id FROM users WHERE email = ? AND id != ?", (new_email, user["id"])).fetchone()
                    if existing:
                        self.send_json({"error": "El correo ya esta en uso."}, status=400)
                        return
                    db.execute("UPDATE users SET email = ?, created_at = created_at WHERE id = ?", (new_email, user["id"]))

                if new_password:
                    if len(new_password) < 6:
                        self.send_json({"error": "La contrasena debe tener al menos 6 caracteres."}, status=400)
                        return
                    salt, digest = hash_password(new_password)
                    db.execute("UPDATE users SET password_salt = ?, password_hash = ? WHERE id = ?", (salt, digest, user["id"]))

                updated = db.execute("SELECT id, email, full_name, username, role FROM users WHERE id = ?", (user["id"],)).fetchone()
                self.send_json({"ok": True, "user": row_to_dict(updated)})
                return

            if path == "/api/citizens/register":
                result, error = register_citizen(
                    db,
                    payload.get("full_name"),
                    payload.get("email"),
                    payload.get("cedula"),
                    payload.get("password"),
                    ip_address=self.client_address[0],
                )

                if error:
                    status = 409 if error == "YA_EXISTE" else 400
                    msg = (
                        "Ya existe una cuenta con este correo electronico. "
                        "<a href='#' id='switchToLogin'>Inicia sesion aqui</a>."
                        if error == "YA_EXISTE"
                        else error
                    )
                    self.send_json({"error": msg}, status=status)
                    return

                send_welcome_email(
                    payload.get("email", ""),
                    payload.get("full_name", ""),
                    payload.get("cedula", ""),
                    payload.get("password", ""),
                )

                self.send_json(result, status=201)
                return

            if path == "/api/citizens/login":
                result = login_citizen(
                    db,
                    payload.get("email"),
                    payload.get("password"),
                    ip_address=self.client_address[0],
                )

                if not result:
                    self.send_json({"error": "Credenciales invalidas."}, status=401)
                    return

                self.send_json(result)
                return

            if path == "/api/citizens/logout":
                result = logout_citizen(
                    db,
                    self.headers.get("Authorization", ""),
                )

                self.send_json(result)
                return

            if path == "/api/requests":
                service_id = str(payload.get("service_id", "")).strip()
                citizen_name = str(payload.get("citizen_name", "")).strip()
                citizen_contact = str(payload.get("citizen_contact", "")).strip()
                request_type = str(payload.get("request_type", "")).strip()
                citizen = current_citizen(
                    db,
                    self.headers.get("Authorization", ""),
                )

                if citizen:
                    citizen_name = citizen_name or citizen.get("full_name", "")
                    citizen_contact = citizen_contact or citizen.get("email", "")

                if not service_id or not citizen_name or not citizen_contact:
                    self.send_json(
                        {
                            "error": "service_id, citizen_name y citizen_contact son requeridos."
                        },
                        status=400,
                    )
                    return

                service = get_service(db, service_id)

                if not service:
                    self.send_json({"error": "Servicio no encontrado."}, status=404)
                    return

                tracking_code = generate_tracking_code()
                now = utc_now()

                db.execute(
                    """
                    INSERT INTO citizen_requests (
                        tracking_code,
                        service_id,
                        citizen_id,
                        citizen_name,
                        citizen_contact,
                        request_type,
                        status,
                        office,
                        notes,
                        created_at,
                        updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, 'recibida', NULL, ?, ?, ?)
                    """,
                    (
                        tracking_code,
                        service_id,
                        citizen["id"] if citizen else None,
                        citizen_name,
                        citizen_contact,
                        request_type or None,
                        "Solicitud creada desde portal ciudadano.",
                        now,
                        now,
                    ),
                )

                create_audit(
                    db,
                    None,
                    "request.created",
                    "citizen_request",
                    tracking_code,
                    {"service_id": service_id},
                    self.client_address[0],
                )

                row = db.execute(
                    "SELECT * FROM citizen_requests WHERE tracking_code = ?",
                    (tracking_code,),
                ).fetchone()

                self.send_json(
                    request_payload(
                        row,
                        service=service,
                        include_private=False,
                    ),
                    status=201,
                )
                return

            if path == "/api/appointments":
                citizen = current_citizen(
                    db,
                    self.headers.get("Authorization", ""),
                )
                if not citizen:
                    self.send_json({"error": "No autenticado."}, status=401)
                    return

                service_type = str(payload.get("service_type", "")).strip()
                office = str(payload.get("office", "")).strip()
                appointment_date = str(payload.get("appointment_date", "")).strip()
                appointment_time = str(payload.get("appointment_time", "")).strip()
                contact_phone = str(payload.get("contact_phone", "")).strip()
                notes = str(payload.get("notes", "")).strip()

                if not service_type or not office or not appointment_date or not appointment_time:
                    self.send_json({"error": "service_type, office, appointment_date y appointment_time son requeridos."}, status=400)
                    return

                now = utc_now()
                cursor = db.execute(
                    """INSERT INTO appointments (citizen_id, service_type, office, appointment_date, appointment_time, contact_phone, notes, status, created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?)""",
                    (citizen["id"], service_type, office, appointment_date, appointment_time, contact_phone or None, notes or None, now, now),
                )
                appt_id = cursor.lastrowid

                create_audit(db, None, "appointment.created", "appointment", str(appt_id), {"service_type": service_type}, self.client_address[0])

                row = db.execute("SELECT * FROM appointments WHERE id = ?", (appt_id,)).fetchone()
                self.send_json(row_to_dict(row), status=201)
                return

            if path == "/api/documents/upload":
                citizen = current_citizen(
                    db,
                    self.headers.get("Authorization", ""),
                )
                if not citizen:
                    self.send_json({"error": "No autenticado."}, status=401)
                    return
                import base64
                doc_type = str(payload.get("doc_type", "")).strip()
                filename = str(payload.get("filename", "")).strip()
                file_b64 = payload.get("file_data", "")
                if doc_type not in ("comprobante", "recibo") or not filename or not file_b64:
                    self.send_json({"error": "doc_type, filename y file_data son requeridos."}, status=400)
                    return
                file_bytes = base64.b64decode(file_b64)
                now = utc_now()
                cursor = db.execute(
                    "INSERT INTO documents (citizen_id, doc_type, filename, file_data, created_at) VALUES (?, ?, ?, ?, ?)",
                    (citizen["id"], doc_type, filename, file_bytes, now),
                )
                row = db.execute("SELECT id, doc_type, filename, related_tracking_code, created_at FROM documents WHERE id = ?", (cursor.lastrowid,)).fetchone()
                self.send_json(row_to_dict(row), status=201)
                return

            if path == "/api/documents/generate-receipt":
                citizen = current_citizen(
                    db,
                    self.headers.get("Authorization", ""),
                )
                if not citizen:
                    self.send_json({"error": "No autenticado."}, status=401)
                    return
                tracking_code = str(payload.get("tracking_code", "")).strip()
                if not tracking_code:
                    self.send_json({"error": "tracking_code es requerido."}, status=400)
                    return
                req = db.execute(
                    "SELECT * FROM citizen_requests WHERE tracking_code = ?",
                    (tracking_code,),
                ).fetchone()
                if not req:
                    self.send_json({"error": "Solicitud no encontrada."}, status=404)
                    return
                receipt_text = (
                    f"=== RECIBO DE SOLICITUD ===\n"
                    f"Código: {req['tracking_code']}\n"
                    f"Servicio: {req['service_id']}\n"
                    f"Solicitante: {req['citizen_name']}\n"
                    f"Contacto: {req['citizen_contact']}\n"
                    f"Estado: {req['status']}\n"
                    f"Fecha: {req['created_at']}\n"
                    f"=============================="
                ).encode("utf-8")
                filename = f"recibo_{req['tracking_code']}.txt"
                now = utc_now()
                db.execute(
                    "INSERT INTO documents (citizen_id, doc_type, filename, file_data, related_tracking_code, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                    (citizen["id"], "recibo", filename, receipt_text, tracking_code, now),
                )
                self.send_json({"ok": True, "filename": filename})
                return

            if path == "/api/assistant":
                question = str(payload.get("question", "")).strip()

                if not question:
                    self.send_json({"error": "La pregunta es requerida."}, status=400)
                    return

                self.send_json(
                    {
                        "answer": answer_question(question),
                        "source": "knowledge-base",
                    }
                )
                return

            if path == "/api/certificados/solicitar":
                citizen = current_citizen(
                    db,
                    self.headers.get("Authorization", ""),
                )
                if not citizen:
                    self.send_json({"error": "No autenticado."}, status=401)
                    return

                tipo = str(payload.get("tipo", "")).strip()
                if not tipo:
                    self.send_json({"error": "tipo es requerido."}, status=400)
                    return

                service = get_service(db, tipo)
                if not service:
                    self.send_json({"error": "Tipo de certificado no valido."}, status=400)
                    return

                tracking_code = generate_tracking_code()
                now = utc_now()

                db.execute(
                    """
                    INSERT INTO citizen_requests (
                        tracking_code,
                        service_id,
                        citizen_id,
                        citizen_name,
                        citizen_contact,
                        status,
                        office,
                        notes,
                        created_at,
                        updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, 'en_espera', NULL, ?, ?, ?)
                    """,
                    (
                        tracking_code,
                        tipo,
                        citizen["id"],
                        citizen.get("full_name", ""),
                        citizen.get("email", ""),
                        "Solicitud de certificado desde Portal Ciudadano.",
                        now,
                        now,
                    ),
                )

                create_audit(
                    db,
                    None,
                    "certificado.solicitado",
                    "citizen_request",
                    tracking_code,
                    {"tipo": tipo},
                    self.client_address[0],
                )

                row = db.execute(
                    "SELECT * FROM citizen_requests WHERE tracking_code = ?",
                    (tracking_code,),
                ).fetchone()

                self.send_json(
                    request_payload(row, service=service, include_private=False),
                    status=201,
                )
                return

            if path.startswith("/api/certificados/") and path.endswith("/aprobar"):
                user = self.require_user(
                    db,
                    roles={"superadmin", "director", "funcionario"},
                )
                if not user:
                    return

                request_id = path.split("/")[-2]
                row = db.execute(
                    "SELECT * FROM citizen_requests WHERE id = ?",
                    (request_id,),
                ).fetchone()

                if not row:
                    self.send_json({"error": "Solicitud no encontrada."}, status=404)
                    return

                if row["status"] != "en_espera":
                    self.send_json({"error": "Esta solicitud no esta pendiente."}, status=400)
                    return

                now = utc_now()
                db.execute(
                    "UPDATE citizen_requests SET status = 'aprobada', updated_at = ? WHERE id = ?",
                    (now, request_id),
                )

                create_audit(
                    db,
                    user["id"],
                    "certificado.aprobado",
                    "citizen_request",
                    str(request_id),
                    {"tracking_code": row["tracking_code"]},
                    self.client_address[0],
                )

                updated = db.execute(
                    "SELECT * FROM citizen_requests WHERE id = ?",
                    (request_id,),
                ).fetchone()

                self.send_json(request_payload(updated, include_private=True))
                return

            if path == "/api/admin/users":
                admin_user = self.require_user(db, roles={"superadmin", "director"})
                if not admin_user:
                    return

                email = str(payload.get("email", "")).strip()
                full_name = str(payload.get("full_name", "")).strip()
                username = str(payload.get("username", "")).strip()
                cedula = str(payload.get("cedula", "")).strip()
                password = str(payload.get("password", "")).strip()
                role = str(payload.get("role", "admin")).strip()
                is_active = 1 if payload.get("is_active", True) else 0

                if not email or not full_name:
                    self.send_json({"error": "email y full_name son requeridos."}, status=400)
                    return

                if role not in ("superadmin", "director", "funcionario"):
                    self.send_json({"error": "Rol invalido."}, status=400)
                    return

                existing = db.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
                if existing:
                    self.send_json({"error": "Ya existe un usuario con ese correo."}, status=409)
                    return

                if password:
                    salt, digest = hash_password(password)
                else:
                    salt, digest = "", ""

                now = utc_now()
                cursor = db.execute(
                    """
                    INSERT INTO users (email, full_name, username, cedula, role, password_salt, password_hash, is_active, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (email, full_name, username, cedula or f"USR-{int(now.timestamp())}", role, salt, digest, is_active, now),
                )

                new_user = db.execute(
                    "SELECT id, email, full_name, username, cedula, role, is_active, created_at FROM users WHERE id = ?",
                    (cursor.lastrowid,),
                ).fetchone()

                self.send_json(row_to_dict(new_user), status=201)
                return

            if path == "/api/admin/services":
                admin_user = self.require_user(db, roles={"superadmin", "director"})
                if not admin_user:
                    return

                service_id = str(payload.get("id", "")).strip()
                title = str(payload.get("title", "")).strip()
                category = str(payload.get("category", "")).strip()
                summary = str(payload.get("summary", "")).strip()
                requirements = payload.get("requirements", [])
                steps = payload.get("steps", [])
                details = payload.get("details", [])

                if not service_id or not title or not category:
                    self.send_json({"error": "id, title y category son requeridos."}, status=400)
                    return

                existing = db.execute("SELECT id FROM services WHERE id = ?", (service_id,)).fetchone()
                if existing:
                    self.send_json({"error": "Ya existe un servicio con ese ID."}, status=409)
                    return

                now = utc_now()
                db.execute(
                    """INSERT INTO services (id, title, category, summary, requirements_json, steps_json, details_json, is_active, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)""",
                    (service_id, title, category, summary, json.dumps(requirements), json.dumps(steps), json.dumps(details), now),
                )

                row = db.execute("SELECT id, title, category, summary, is_active, updated_at FROM services WHERE id = ?", (service_id,)).fetchone()
                self.send_json(row_to_dict(row), status=201)
                return

            if path == "/api/admin/requests/status":
                admin_user = self.require_user(db, roles={"superadmin", "director", "funcionario"})
                if not admin_user:
                    return

                request_id = str(payload.get("request_id", "")).strip()
                new_status = str(payload.get("status", "")).strip()
                notes = payload.get("notes")

                if not request_id or not new_status:
                    self.send_json({"error": "request_id y status son requeridos."}, status=400)
                    return

                if new_status not in STATUS_LABELS:
                    self.send_json({"error": "Estado invalido."}, status=400)
                    return

                row = db.execute("SELECT * FROM citizen_requests WHERE id = ?", (request_id,)).fetchone()
                if not row:
                    self.send_json({"error": "Solicitud no encontrada."}, status=404)
                    return

                now = utc_now()
                db.execute(
                    "UPDATE citizen_requests SET status = ?, notes = COALESCE(?, notes), updated_at = ? WHERE id = ?",
                    (new_status, notes, now, request_id),
                )

                create_audit(
                    db, admin_user["id"], "request.status_updated", "citizen_request",
                    str(request_id), {"status": new_status}, self.client_address[0],
                )

                updated = db.execute("SELECT * FROM citizen_requests WHERE id = ?", (request_id,)).fetchone()
                self.send_json(request_payload(updated, include_private=True))
                return

            if path == "/api/admin/requests/create":
                admin_user = self.require_user(db, roles={"superadmin", "director", "funcionario"})
                if not admin_user:
                    return

                service_id = str(payload.get("service_id", "")).strip()
                request_type = str(payload.get("request_type", "")).strip()
                citizen_name = str(payload.get("citizen_name", "")).strip()
                citizen_contact = str(payload.get("citizen_contact", "")).strip()
                notes = str(payload.get("notes", "")).strip()

                if not service_id or not citizen_name or not citizen_contact:
                    self.send_json({"error": "service_id, citizen_name y citizen_contact son requeridos."}, status=400)
                    return

                service = get_service(db, service_id)
                if not service:
                    self.send_json({"error": "Servicio no encontrado."}, status=404)
                    return

                tracking_code = generate_tracking_code()
                now = utc_now()

                db.execute(
                    """INSERT INTO citizen_requests (tracking_code, service_id, citizen_name, citizen_contact, request_type, status, notes, created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?, 'recibida', ?, ?, ?)""",
                    (tracking_code, service_id, citizen_name, citizen_contact, request_type or None, notes or "Solicitud creada desde panel administrativo.", now, now),
                )

                create_audit(db, admin_user["id"], "request.created_admin", "citizen_request", tracking_code, {"service_id": service_id}, self.client_address[0])

                row = db.execute("SELECT * FROM citizen_requests WHERE tracking_code = ?", (tracking_code,)).fetchone()
                self.send_json(request_payload(row, service=service, include_private=False), status=201)
                return

            if path == "/api/admin/appointments/create":
                admin_user = self.require_user(db, roles={"superadmin", "director", "funcionario"})
                if not admin_user:
                    return

                citizen_id = payload.get("citizen_id")
                citizen_name = str(payload.get("citizen_name", "")).strip()
                cedula = str(payload.get("cedula", "")).strip()
                service_type = str(payload.get("service_type", "")).strip()
                office = str(payload.get("office", "")).strip()
                appointment_date = str(payload.get("appointment_date", "")).strip()
                appointment_time = str(payload.get("appointment_time", "")).strip()
                contact_phone = str(payload.get("contact_phone", "")).strip()
                notes = str(payload.get("notes", "")).strip()

                if not service_type or not office or not appointment_date or not appointment_time:
                    self.send_json({"error": "service_type, office, appointment_date y appointment_time son requeridos."}, status=400)
                    return

                now = utc_now()
                cursor = db.execute(
                    """INSERT INTO appointments (citizen_id, citizen_name, cedula, service_type, office, appointment_date, appointment_time, contact_phone, notes, status, created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?)""",
                    (citizen_id, citizen_name or None, cedula or None, service_type, office, appointment_date, appointment_time, contact_phone or None, notes or None, now, now),
                )

                create_audit(db, admin_user["id"], "appointment.created_admin", "appointment", str(cursor.lastrowid), {"service_type": service_type}, self.client_address[0])

                row = db.execute("SELECT * FROM appointments WHERE id = ?", (cursor.lastrowid,)).fetchone()
                self.send_json(row_to_dict(row), status=201)
                return

        self.send_json({"error": "Ruta no encontrada."}, status=404)

    def do_PATCH(self):
        parsed = urlparse(self.path)

        try:
            payload = self.read_json_body()

            if parsed.path.startswith("/api/requests/") and parsed.path.endswith("/status"):
                self.handle_patch_request_status(parsed.path, payload)
                return

            if parsed.path.startswith("/api/appointments/"):
                self.handle_patch_appointment(parsed.path, payload)
                return

            if parsed.path.startswith("/api/admin/users/"):
                self.handle_patch_admin_user(parsed.path, payload)
                return

            if parsed.path.startswith("/api/admin/citizens/"):
                self.handle_patch_admin_citizen(parsed.path, payload)
                return

            if parsed.path.startswith("/api/admin/services/"):
                self.handle_patch_admin_service(parsed.path, payload)
                return

            if parsed.path.startswith("/api/admin/appointments/"):
                self.handle_patch_admin_appointment(parsed.path, payload)
                return

            if parsed.path.startswith("/api/admin/requests/") and parsed.path.endswith("/status"):
                self.handle_patch_request_status(parsed.path, payload)
                return

            if parsed.path == "/api/admin/portal-config":
                self.handle_patch_portal_config(payload)
                return

            self.send_json({"error": "Ruta no encontrada."}, status=404)

        except ValueError as exc:
            self.send_json({"error": str(exc)}, status=400)

        except Exception as exc:
            self.send_json({"error": "Error interno.", "detail": str(exc)}, status=500)

    def do_DELETE(self):
        parsed = urlparse(self.path)

        try:
            if parsed.path.startswith("/api/admin/users/"):
                self.handle_delete_admin_user(parsed.path)
                return

            if parsed.path.startswith("/api/admin/citizens/"):
                self.handle_delete_admin_citizen(parsed.path)
                return

            if parsed.path.startswith("/api/admin/services/"):
                self.handle_delete_admin_service(parsed.path)
                return

            if parsed.path.startswith("/api/admin/appointments/"):
                self.handle_delete_admin_appointment(parsed.path)
                return

            self.send_json({"error": "Ruta no encontrada."}, status=404)

        except Exception as exc:
            self.send_json({"error": "Error interno.", "detail": str(exc)}, status=500)

    def handle_patch_request_status(self, path, payload):
        request_id = path.split("/")[-2]
        new_status = str(payload.get("status", "")).strip()
        office = payload.get("office")
        notes = payload.get("notes")

        if new_status not in STATUS_LABELS:
            self.send_json({"error": "Estado invalido."}, status=400)
            return

        with db_connect() as db:
            user = self.require_user(
                db,
                roles={"superadmin", "director", "funcionario"},
            )

            if not user:
                return

            row = db.execute(
                "SELECT * FROM citizen_requests WHERE id = ?",
                (request_id,),
            ).fetchone()

            if not row:
                self.send_json({"error": "Solicitud no encontrada."}, status=404)
                return

            db.execute(
                """
                UPDATE citizen_requests
                SET status = ?,
                    office = COALESCE(?, office),
                    notes = COALESCE(?, notes),
                    updated_at = ?
                WHERE id = ?
                """,
                (
                    new_status,
                    office,
                    notes,
                    utc_now(),
                    request_id,
                ),
            )

            create_audit(
                db,
                user["id"],
                "request.status_updated",
                "citizen_request",
                str(request_id),
                {"status": new_status},
                self.client_address[0],
            )

            updated = db.execute(
                "SELECT * FROM citizen_requests WHERE id = ?",
                (request_id,),
            ).fetchone()

            service = get_service(db, updated["service_id"])

            self.send_json(
                request_payload(
                    updated,
                    service=service,
                    include_private=True,
                )
            )

    def handle_patch_appointment(self, path, payload):
        appt_id = path.split("/")[-1]
        action = str(payload.get("action", "")).strip()
        with db_connect() as db:
            citizen = current_citizen(
                db,
                self.headers.get("Authorization", ""),
            )
            if not citizen:
                self.send_json({"error": "No autenticado."}, status=401)
                return
            row = db.execute(
                "SELECT * FROM appointments WHERE id = ? AND citizen_id = ?",
                (appt_id, citizen["id"]),
            ).fetchone()
            if not row:
                self.send_json({"error": "Cita no encontrada."}, status=404)
                return
            now = utc_now()
            if action == "reschedule":
                new_date = str(payload.get("appointment_date", "")).strip()
                new_time = str(payload.get("appointment_time", "")).strip()
                if not new_date or not new_time:
                    self.send_json({"error": "appointment_date y appointment_time son requeridos."}, status=400)
                    return
                db.execute(
                    "UPDATE appointments SET appointment_date = ?, appointment_time = ?, updated_at = ? WHERE id = ?",
                    (new_date, new_time, now, appt_id),
                )
                create_audit(db, None, "appointment.rescheduled", "appointment", str(appt_id), {"new_date": new_date, "new_time": new_time}, self.client_address[0])
            elif action == "cancel":
                db.execute(
                    "UPDATE appointments SET status = 'cancelada', updated_at = ? WHERE id = ?",
                    (now, appt_id),
                )
                create_audit(db, None, "appointment.cancelled", "appointment", str(appt_id), {}, self.client_address[0])
            else:
                self.send_json({"error": "Accion invalida. Use 'reschedule' o 'cancel'."}, status=400)
                return
            updated = db.execute("SELECT * FROM appointments WHERE id = ?", (appt_id,)).fetchone()
            self.send_json(row_to_dict(updated))

    def handle_patch_admin_user(self, path, payload):
        user_id = path.split("/")[-1]
        with db_connect() as db:
            admin_user = self.require_user(db, roles={"superadmin", "director"})
            if not admin_user:
                return

            row = db.execute(
                "SELECT id, email, full_name, username, cedula, role, is_active, created_at FROM users WHERE id = ?",
                (user_id,),
            ).fetchone()

            if not row:
                self.send_json({"error": "Usuario no encontrado."}, status=404)
                return

            if row["role"] == "superadmin":
                self.send_json({"error": "No se puede modificar al Superadmin."}, status=403)
                return

            email = str(payload.get("email", row["email"])).strip()
            full_name = str(payload.get("full_name", row["full_name"])).strip()
            username = str(payload.get("username", row["username"] or "")).strip()
            cedula = str(payload.get("cedula", row["cedula"])).strip()
            role = str(payload.get("role", row["role"])).strip()
            is_active = 1 if payload.get("is_active", bool(row["is_active"])) else 0
            password = str(payload.get("password", "")).strip()

            if role not in ("superadmin", "director", "funcionario"):
                self.send_json({"error": "Rol invalido."}, status=400)
                return

            existing = db.execute(
                "SELECT id FROM users WHERE email = ? AND id != ?",
                (email, user_id),
            ).fetchone()
            if existing:
                self.send_json({"error": "Ya existe otro usuario con ese correo."}, status=409)
                return

            if password:
                salt, digest = hash_password(password)
                db.execute(
                    "UPDATE users SET email=?, full_name=?, username=?, cedula=?, role=?, is_active=?, password_salt=?, password_hash=? WHERE id=?",
                    (email, full_name, username, cedula, role, is_active, salt, digest, user_id),
                )
            else:
                db.execute(
                    "UPDATE users SET email=?, full_name=?, username=?, cedula=?, role=?, is_active=? WHERE id=?",
                    (email, full_name, username, cedula, role, is_active, user_id),
                )

            updated = db.execute(
                "SELECT id, email, full_name, username, cedula, role, is_active, created_at FROM users WHERE id = ?",
                (user_id,),
            ).fetchone()

            self.send_json(row_to_dict(updated))

    def handle_delete_admin_user(self, path):
        user_id = path.split("/")[-1]
        with db_connect() as db:
            admin_user = self.require_user(db, roles={"superadmin", "director"})
            if not admin_user:
                return

            if str(admin_user["id"]) == str(user_id):
                self.send_json({"error": "No puedes eliminar tu propia cuenta."}, status=400)
                return

            row = db.execute("SELECT id, role FROM users WHERE id = ?", (user_id,)).fetchone()
            if not row:
                self.send_json({"error": "Usuario no encontrado."}, status=404)
                return

            if row["role"] == "superadmin":
                self.send_json({"error": "No se puede eliminar al Superadmin."}, status=403)
                return

            db.execute("DELETE FROM users WHERE id = ?", (user_id,))
            self.send_json({"ok": True, "message": "Usuario eliminado."})

    def handle_patch_admin_citizen(self, path, payload):
        citizen_id = path.split("/")[-1]
        with db_connect() as db:
            admin_user = self.require_user(db, roles={"superadmin", "director"})
            if not admin_user:
                return

            row = db.execute("SELECT id, email, full_name, cedula, is_active FROM citizens WHERE id = ?", (citizen_id,)).fetchone()
            if not row:
                self.send_json({"error": "Ciudadano no encontrado."}, status=404)
                return

            full_name = str(payload.get("full_name", row["full_name"])).strip()
            email = str(payload.get("email", row["email"])).strip()
            cedula = str(payload.get("cedula", row["cedula"] or "")).strip()
            is_active = 1 if payload.get("is_active", bool(row["is_active"])) else 0

            existing = db.execute("SELECT id FROM citizens WHERE email = ? AND id != ?", (email, citizen_id)).fetchone()
            if existing:
                self.send_json({"error": "Ya existe otro ciudadano con ese correo."}, status=409)
                return

            db.execute(
                "UPDATE citizens SET full_name=?, email=?, cedula=?, is_active=? WHERE id=?",
                (full_name, email, cedula, is_active, citizen_id),
            )

            updated = db.execute(
                "SELECT id, email, full_name, cedula, is_active, created_at FROM citizens WHERE id = ?",
                (citizen_id,),
            ).fetchone()
            self.send_json(row_to_dict(updated))

    def handle_delete_admin_citizen(self, path):
        citizen_id = path.split("/")[-1]
        with db_connect() as db:
            admin_user = self.require_user(db, roles={"superadmin", "director"})
            if not admin_user:
                return

            row = db.execute("SELECT id FROM citizens WHERE id = ?", (citizen_id,)).fetchone()
            if not row:
                self.send_json({"error": "Ciudadano no encontrado."}, status=404)
                return

            db.execute("DELETE FROM citizens WHERE id = ?", (citizen_id,))
            self.send_json({"ok": True, "message": "Ciudadano eliminado."})

    def handle_patch_admin_service(self, path, payload):
        service_id = path.split("/")[-1]
        with db_connect() as db:
            admin_user = self.require_user(db, roles={"superadmin", "director"})
            if not admin_user:
                return

            row = db.execute("SELECT id, title, category, summary, is_active FROM services WHERE id = ?", (service_id,)).fetchone()
            if not row:
                self.send_json({"error": "Servicio no encontrado."}, status=404)
                return

            title = str(payload.get("title", row["title"])).strip()
            category = str(payload.get("category", row["category"])).strip()
            summary = str(payload.get("summary", row["summary"])).strip()
            is_active = 1 if payload.get("is_active", bool(row["is_active"])) else 0

            now = utc_now()
            db.execute(
                "UPDATE services SET title=?, category=?, summary=?, is_active=?, updated_at=? WHERE id=?",
                (title, category, summary, is_active, now, service_id),
            )

            updated = db.execute(
                "SELECT id, title, category, summary, is_active, updated_at FROM services WHERE id = ?",
                (service_id,),
            ).fetchone()
            self.send_json(row_to_dict(updated))

    def handle_delete_admin_service(self, path):
        service_id = path.split("/")[-1]
        with db_connect() as db:
            admin_user = self.require_user(db, roles={"superadmin", "director"})
            if not admin_user:
                return

            row = db.execute("SELECT id FROM services WHERE id = ?", (service_id,)).fetchone()
            if not row:
                self.send_json({"error": "Servicio no encontrado."}, status=404)
                return

            db.execute("DELETE FROM services WHERE id = ?", (service_id,))
            self.send_json({"ok": True, "message": "Servicio eliminado."})

    def handle_patch_admin_appointment(self, path, payload):
        appt_id = path.split("/")[-1]
        with db_connect() as db:
            admin_user = self.require_user(db, roles={"superadmin", "director", "funcionario"})
            if not admin_user:
                return

            row = db.execute("SELECT id, status FROM appointments WHERE id = ?", (appt_id,)).fetchone()
            if not row:
                self.send_json({"error": "Cita no encontrada."}, status=404)
                return

            new_status = str(payload.get("status", row["status"])).strip()
            now = utc_now()

            db.execute(
                "UPDATE appointments SET status=?, updated_at=? WHERE id=?",
                (new_status, now, appt_id),
            )

            updated = db.execute("SELECT * FROM appointments WHERE id = ?", (appt_id,)).fetchone()
            self.send_json(row_to_dict(updated))

    def handle_patch_portal_config(self, payload):
        with db_connect() as db:
            user = self.require_user(db, roles={"superadmin", "director"})
            if not user:
                return

            sections = payload.get("sections", [])
            if not sections:
                self.send_json({"error": "No sections provided."}, status=400)
                return

            now = utc_now()
            for section in sections:
                key = section.get("section_key")
                is_active = section.get("is_active")
                sort_order = section.get("sort_order")

                if not key:
                    continue

                if is_active is not None and sort_order is not None:
                    db.execute(
                        "UPDATE portal_config SET is_active=?, sort_order=?, updated_at=? WHERE section_key=?",
                        (1 if is_active else 0, sort_order, now, key),
                    )
                elif is_active is not None:
                    db.execute(
                        "UPDATE portal_config SET is_active=?, updated_at=? WHERE section_key=?",
                        (1 if is_active else 0, now, key),
                    )
                elif sort_order is not None:
                    db.execute(
                        "UPDATE portal_config SET sort_order=?, updated_at=? WHERE section_key=?",
                        (sort_order, now, key),
                    )

            rows = db.execute(
                "SELECT id, section_key, section_name, is_active, sort_order, updated_at FROM portal_config ORDER BY sort_order ASC"
            ).fetchall()
            self.send_json({"sections": [row_to_dict(r) for r in rows]})

    def handle_delete_admin_appointment(self, path):
        appt_id = path.split("/")[-1]
        with db_connect() as db:
            admin_user = self.require_user(db, roles={"superadmin", "director", "funcionario"})
            if not admin_user:
                return

            row = db.execute("SELECT id FROM appointments WHERE id = ?", (appt_id,)).fetchone()
            if not row:
                self.send_json({"error": "Cita no encontrada."}, status=404)
                return

            db.execute("DELETE FROM appointments WHERE id = ?", (appt_id,))
            self.send_json({"ok": True, "message": "Cita eliminada."})


def main():
    init_database()

    server = ThreadingHTTPServer((HOST, PORT), Handler)

    print(f"{APP_NAME} {APP_VERSION} disponible en http://{HOST}:{PORT}")
    print("Usuario inicial: admin@te.gob.pa")
    print("Clave inicial: configure TE_DIGITAL_360_ADMIN_PASSWORD o use Cambiar123! y cambiela.")

    server.serve_forever()


if __name__ == "__main__":
    main()
