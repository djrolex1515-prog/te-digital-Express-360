-- TE Digital Express 360 - MySQL schema.
-- Import this file in phpMyAdmin after creating/selecting the database.

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    cedula VARCHAR(50) NOT NULL UNIQUE,
    role ENUM('admin', 'supervisor', 'funcionario') NOT NULL,
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

CREATE TABLE IF NOT EXISTS citizen_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tracking_code VARCHAR(32) NOT NULL UNIQUE,
    service_id VARCHAR(64) NOT NULL,
    citizen_name VARCHAR(255) NOT NULL,
    citizen_contact VARCHAR(255) NOT NULL,
    status VARCHAR(40) NOT NULL,
    office VARCHAR(255) NULL,
    notes TEXT NULL,
    created_at VARCHAR(32) NOT NULL,
    updated_at VARCHAR(32) NOT NULL,
    CONSTRAINT fk_requests_service
        FOREIGN KEY (service_id) REFERENCES services(id)
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

