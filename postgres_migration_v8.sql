-- ==========================================
-- ELSPEC SISTEMA DE GESTION - MIGRACION v8.0
-- DE FIREBASE (NoSQL) A POSTGRESQL (RELACIONAL)
-- ==========================================

-- Asegurar que el esquema elspec existe
CREATE SCHEMA IF NOT EXISTS elspec;

-- 1. USUARIOS Y ACCESO
CREATE TABLE IF NOT EXISTS elspec.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_id VARCHAR(100) UNIQUE, -- ID original de Firestore
    username VARCHAR(50) UNIQUE,
    email VARCHAR(100) UNIQUE,
    full_name VARCHAR(100),
    password VARCHAR(255), -- Para login legacy
    role VARCHAR(20) DEFAULT 'user', -- admin, engineer, user
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. CLIENTES Y CATALOGOS
CREATE TABLE IF NOT EXISTS elspec.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_id VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(50), -- NIT
    email VARCHAR(100),
    phone VARCHAR(50),
    address TEXT,
    contact_person VARCHAR(100),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS elspec.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_id VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    description TEXT,
    category VARCHAR(100),
    price DECIMAL(15,2) DEFAULT 0,
    cost DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. GESTION SGI (SISTEMA DE GESTIÓN INTEGRADO)
CREATE TABLE IF NOT EXISTS elspec.sgi_processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_id VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS elspec.sgi_process_leaders (
    process_id UUID REFERENCES elspec.sgi_processes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES elspec.users(id) ON DELETE CASCADE,
    PRIMARY KEY (process_id, user_id)
);

CREATE TABLE IF NOT EXISTS elspec.sgi_indicator_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_id VARCHAR(100) UNIQUE,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS elspec.sgi_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_id VARCHAR(100) UNIQUE, -- ID del objeto dentro del array en Firebase
    process_id UUID REFERENCES elspec.sgi_processes(id) ON DELETE CASCADE,
    type_id UUID REFERENCES elspec.sgi_indicator_types(id),
    name VARCHAR(255) NOT NULL,
    target DECIMAL(15,2),
    unit VARCHAR(50),
    direction VARCHAR(20) DEFAULT 'maximize', -- maximize, minimize
    requires_photo BOOLEAN DEFAULT FALSE,
    requires_file BOOLEAN DEFAULT FALSE,
    requires_comment BOOLEAN DEFAULT FALSE,
    folder VARCHAR(100) DEFAULT 'General',
    frequency VARCHAR(50) DEFAULT 'Mensual',
    data_source VARCHAR(50) DEFAULT 'manual', -- manual, auto
    auto_driver VARCHAR(100), -- pqr_compliance, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS elspec.sgi_indicator_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    indicator_id UUID REFERENCES elspec.sgi_indicators(id) ON DELETE CASCADE,
    month CHAR(7) NOT NULL, -- Format: YYYY-MM
    value DECIMAL(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(indicator_id, month)
);

CREATE TABLE IF NOT EXISTS elspec.sgi_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_id VARCHAR(100) UNIQUE,
    process_id UUID REFERENCES elspec.sgi_processes(id),
    indicator_id UUID REFERENCES elspec.sgi_indicators(id),
    month CHAR(7),
    file_url TEXT,
    comment TEXT,
    author_id UUID REFERENCES elspec.users(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. SOPORTE TÉCNICO Y TICKETS
CREATE TABLE IF NOT EXISTS elspec.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_id VARCHAR(100) UNIQUE,
    user_id UUID REFERENCES elspec.users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50), -- soporte, etc.
    status VARCHAR(50) DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'normal',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS elspec.computers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_id VARCHAR(100) UNIQUE,
    serial_number VARCHAR(100) UNIQUE,
    brand VARCHAR(100),
    model VARCHAR(100),
    assigned_user_id UUID REFERENCES elspec.users(id),
    status VARCHAR(50) DEFAULT 'active',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS elspec.computer_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    computer_id UUID REFERENCES elspec.computers(id),
    date DATE NOT NULL,
    technician_id UUID REFERENCES elspec.users(id),
    description TEXT,
    findings TEXT,
    actions_taken TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. ERP: VENTAS, PROYECTOS Y LOGISTICA
CREATE TABLE IF NOT EXISTS elspec.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_id VARCHAR(100) UNIQUE,
    customer_id UUID REFERENCES elspec.customers(id),
    created_by UUID REFERENCES elspec.users(id),
    total_amount DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'COP',
    status VARCHAR(50) DEFAULT 'draft', -- draft, completed, cancelled
    quotation_ref VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS elspec.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES elspec.sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES elspec.products(id),
    description TEXT NOT NULL,
    quantity DECIMAL(15,2) DEFAULT 1,
    unit_price DECIMAL(15,2) DEFAULT 0,
    tax_percentage DECIMAL(5,2) DEFAULT 19,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS elspec.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_id VARCHAR(100) UNIQUE,
    sale_id UUID REFERENCES elspec.sales(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'planeacion',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS elspec.logistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_id VARCHAR(100) UNIQUE,
    project_id UUID REFERENCES elspec.projects(id),
    sale_id UUID REFERENCES elspec.sales(id),
    status VARCHAR(50) DEFAULT 'EN PLANIFICACION',
    description TEXT, -- Descripcion del equipo/servicio
    order_no VARCHAR(100),
    requisition VARCHAR(100),
    date_po DATE,
    estimated_delivery DATE,
    actual_delivery DATE,
    remarks TEXT,
    author_id UUID REFERENCES elspec.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. CONFIGURACION Y OTROS
CREATE TABLE IF NOT EXISTS elspec.global_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS elspec.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_id VARCHAR(100) UNIQUE,
    title VARCHAR(255),
    message TEXT,
    type VARCHAR(50),
    target_role VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. AUDITORIA / LOGS (OPCIONAL PERO RECOMENDADO)
CREATE TABLE IF NOT EXISTS elspec.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES elspec.users(id),
    action VARCHAR(100),
    table_name VARCHAR(100),
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- COMENTARIOS DE TABLAS PARA AYUDA
COMMENT ON TABLE elspec.users IS 'Tabla maestra de usuarios migrados de Firebase Auth y Firestore';
COMMENT ON TABLE elspec.sgi_indicator_data IS 'Almacena los valores mensuales de los indicadores SGI';
COMMENT ON TABLE elspec.logistics IS 'Control de seguimiento de equipos y servicios por proyecto/venta';
