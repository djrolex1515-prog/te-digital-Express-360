import smtplib
import logging
from email.mime.text import MIMEText
from config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM


logger = logging.getLogger(__name__)


def send_email(to_email, subject, body):
    if not SMTP_HOST:
        logger.info(f"[EMAIL SIMULATED] To: {to_email} | Subject: {subject}\n{body}")
        return True

    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM or SMTP_USER
    msg["To"] = to_email

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.starttls()
            if SMTP_USER:
                server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as exc:
        logger.error(f"Error enviando email a {to_email}: {exc}")
        return False


def send_welcome_email(to_email, full_name, cedula, password):
    subject = "Bienvenido a TE Digital Express 360"
    body = f"""
Hola {full_name},

Tu cuenta en TE Digital Express 360 ha sido creada exitosamente.

Tus credenciales de acceso:
  Usuario: {to_email}
  Cédula: {cedula}
  Contraseña: {password}

Recomendamos cambiar tu contraseña después de iniciar sesión por primera vez.

Para acceder al Portal Ciudadano, visita:
http://127.0.0.1:3600/ciudadano.html

Atentamente,
Tribunal Electoral de Panamá
"""
    return send_email(to_email, subject, body)
