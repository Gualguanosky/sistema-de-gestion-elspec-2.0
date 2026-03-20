-- ============================================================
-- Script: mariadb_local_setup.sql
-- Propósito: Configurar usuario y base de datos en MariaDB LOCAL
-- EJECUTAR como root en phpMyAdmin local (http://localhost/phpmyadmin)
-- ============================================================

-- 1. Crear la base de datos
CREATE DATABASE IF NOT EXISTS elspec_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Crear el usuario que usa el api-gateway
CREATE USER IF NOT EXISTS 'n8n_user'@'localhost' IDENTIFIED BY 'n8n_password_elspec';

-- 3. Dar permisos completos sobre elspec_db
GRANT ALL PRIVILEGES ON elspec_db.* TO 'n8n_user'@'localhost';
FLUSH PRIVILEGES;

-- 4. Verificar
SHOW DATABASES;
SELECT User, Host FROM mysql.user WHERE User = 'n8n_user';
