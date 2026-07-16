# TE Digital Express 360 Modular

Prototipo web de plataforma institucional para servicios ciudadanos, registro de solicitudes, seguimiento de tramites, asistente ciudadano flotante y panel funcionario.

## Modo local: SQLite

El proyecto puede funcionar de inmediato con SQLite. La base local esta en:

```text
backend/data/te_digital_360.db
```

Para iniciar:

```bat
scripts\iniciar_servidor.bat
```

Luego abrir:

```text
http://127.0.0.1:3600/
```

Acceso de demo:

```text
admin@te360.local
Cambiar123!
```

## Modo servidor: MySQL

Este modo queda preparado para phpMyAdmin o MySQL. Si `.env` tiene `TE_DIGITAL_360_DB_ENGINE=mysql`, el servidor usara MySQL.

1. Crear una base de datos llamada `te_digital_360`.
2. Importar `database/schema.sql`.
3. Importar `database/seed.sql`.
4. Copiar `.env.example` como `.env`.
5. Cambiar en `.env`:

```env
TE_DIGITAL_360_DB_ENGINE=mysql
TE_DIGITAL_360_MYSQL_HOST=127.0.0.1
TE_DIGITAL_360_MYSQL_PORT=3306
TE_DIGITAL_360_MYSQL_DATABASE=te_digital_360
TE_DIGITAL_360_MYSQL_USER=root
TE_DIGITAL_360_MYSQL_PASSWORD=tu_clave
```

6. Instalar dependencias:

```bat
scripts\instalar_dependencias.bat
```

7. Iniciar el servidor:

```bat
scripts\iniciar_servidor.bat
```

## Flujo principal

- `servicios.html`: catalogo, requisitos, pasos y detalle por servicio.
- `solicitud.html`: registro inicial y generacion del codigo TD360.
- `seguimiento.html`: consulta del avance con el codigo TD360.
- El asistente queda como boton flotante de ayuda en todas las paginas.

## Importante

SQLite queda como demo local. MySQL queda listo para servidor real y se activa al cambiar `TE_DIGITAL_360_DB_ENGINE=mysql`.

