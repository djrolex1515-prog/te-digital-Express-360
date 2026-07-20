from pathlib import Path
import os

APP_NAME = "TE Digital Express 360"
APP_VERSION = "0.2.0"

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"
DATA = Path(__file__).resolve().parent / "data"
ENV_FILE = ROOT / ".env"


def load_env_file():
    if not ENV_FILE.exists():
        return

    for raw_line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")

        os.environ.setdefault(key, value)


load_env_file()

database_value = Path(os.environ.get("TE_DIGITAL_360_DB", DATA / "te_digital_360.db"))
DATABASE = database_value if database_value.is_absolute() else ROOT / database_value
DB_ENGINE = os.environ.get("TE_DIGITAL_360_DB_ENGINE", "sqlite").strip().lower()

MYSQL_HOST = os.environ.get("TE_DIGITAL_360_MYSQL_HOST", "127.0.0.1")
MYSQL_PORT = int(os.environ.get("TE_DIGITAL_360_MYSQL_PORT", "3306"))
MYSQL_DATABASE = os.environ.get("TE_DIGITAL_360_MYSQL_DATABASE", "te_digital_360")
MYSQL_USER = os.environ.get("TE_DIGITAL_360_MYSQL_USER", "root")
MYSQL_PASSWORD = os.environ.get("TE_DIGITAL_360_MYSQL_PASSWORD", "")

HOST = os.environ.get("TE_DIGITAL_360_HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT") or os.environ.get("TE_DIGITAL_360_PORT", "3600"))

TOKEN_TTL_HOURS = int(os.environ.get("TE_DIGITAL_360_TOKEN_HOURS", "8"))
MAX_BODY_BYTES = 5 * 1024 * 1024

SMTP_HOST = os.environ.get("TE_DIGITAL_360_SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("TE_DIGITAL_360_SMTP_PORT", "587"))
SMTP_USER = os.environ.get("TE_DIGITAL_360_SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("TE_DIGITAL_360_SMTP_PASSWORD", "")
SMTP_FROM = os.environ.get("TE_DIGITAL_360_SMTP_FROM", "")
