# TE Digital Express 360 - Guia de Despliegue

## Opcion 1: Railway (Mas Facil - Recomendado)

### Pasos:
1. Crear cuenta en https://railway.app
2. Crear un proyecto nuevo
3. Conectar tu repositorio GitHub/GitLab
4. Railway detectara automaticamente los archivos:
   - `requirements.txt`
   - `Procfile`
   - `railway.json`

### Configurar MySQL en Railway:
1. En tu proyecto, ir a "New" > "Database" > "MySQL"
2. Railway te dara las credenciales automaticamente
3. Copiar las variables de entorno al proyecto:
   - `TE_DIGITAL_360_DB_ENGINE=mysql`
   - `TE_DIGITAL_360_MYSQL_HOST` (del MySQL)
   - `TE_DIGITAL_360_MYSQL_PORT=3306`
   - `TE_DIGITAL_360_MYSQL_DATABASE=te_digital_360`
   - `TE_DIGITAL_360_MYSQL_USER` (del MySQL)
   - `TE_DIGITAL_360_MYSQL_PASSWORD` (del MySQL)
   - `TE_DIGITAL_360_HOST=0.0.0.0`
   - `TE_DIGITAL_360_PORT=$PORT` (Railway asigna el puerto)

5. Railway te asignara un link como: `https://tu-proyecto.up.railway.app`

### Acceder:
- Abre el link en cualquier navegador
- Login: admin@te.gob.pa / Cambiar123!

---

## Opcion 2: DigitalOcean (Mas Control)

### Requisitos:
- VPS con Ubuntu 22.04+ ($5/mes)
- Python 3.10+
- MySQL 8.0

### Pasos SSH:
```bash
# Conectar al servidor
ssh root@TU_IP_PUBLICA

# Instalar Python
apt update
apt install python3 python3-pip python3-venv -y

# Crear usuario
adduser tedigital
usermod -aG sudo tedigital
su - tedigital

# Clonar proyecto
git clone TU_REPOSITORIO.git
cd "TE Digital 360 Modular"

# Configurar entorno
cp .env.production .env
nano .env  # Editar con tus credenciales MySQL

# Instalar dependencias
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configurar MySQL
sudo mysql -u root
```

### SQL en MySQL:
```sql
CREATE DATABASE te_digital_360 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'te_admin'@'%' IDENTIFIED BY 'TU_CLAVE_SEGURA';
GRANT ALL PRIVILEGES ON te_digital_360.* TO 'te_admin'@'%';
FLUSH PRIVILEGES;
```

### Iniciar servidor:
```bash
python backend/server.py
```

### Configurar como servicio:
```bash
sudo nano /etc/systemd/system/tedigital.service
```

Contenido:
```ini
[Unit]
Description=TE Digital Express 360
After=network.target

[Service]
User=tedigital
WorkingDirectory=/home/tedigital/TE Digital 360 Modular
ExecStart=/home/tedigital/TE Digital 360 Modular/venv/bin/python backend/server.py
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable tedigital
sudo systemctl start tedigital
```

### Configurar Nginx (HTTPS):
```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/tedigital
```

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://127.0.0.1:3600;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/tedigital /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### HTTPS con Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d tu-dominio.com
```

---

## Opcion 3: Heroku (Alternativa)

1. Crear cuenta en https://heroku.com
2. Instalar Heroku CLI
3. Ejecutar:
```bash
heroku create tu-app-tedigital
heroku addons:create heroku-sql-dev.mysql
git push heroku main
```

---

## Credenciales por Defecto

| Rol | Email | Clave |
|-----|-------|-------|
| Superadmin | admin@te.gob.pa | Cambiar123! |
| Director | director@te.gob.pa | Director123! |
| Funcionario | func@te.gob.pa | Func1234! |

**IMPORTANTE:** Cambiar la clave del superadmin despues del primer login.

---

## Estructura del Proyecto

```
TE Digital 360 Modular/
├── backend/
│   ├── server.py          # Servidor principal
│   ├── config.py          # Configuracion
│   ├── database.py        # Base de datos
│   ├── auth.py            # Autenticacion
│   └── email_utils.py     # Correo
├── frontend/
│   ├── principal.html     # Portal ciudadano
│   ├── ciudadano.html     # Panel ciudadano
│   ├── admin/             # Panel admin
│   └── funcionario/       # Panel funcionario
├── .env                   # Variables de entorno
├── requirements.txt       # Dependencias Python
├── Procfile               # Para Heroku/Railway
└── railway.json           # Config Railway
```
