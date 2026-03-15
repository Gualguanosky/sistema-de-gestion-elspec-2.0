-- Crear esquema dedicado para Elspec (Aislamiento)
CREATE SCHEMA IF NOT EXISTS elspec;

-- TABLA DE BÚSQUEDAS
CREATE TABLE IF NOT EXISTS elspec.search_logs (
    id SERIAL PRIMARY KEY,
    company_name TEXT NOT NULL,
    roles TEXT,
    result_count INTEGER DEFAULT 0,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA DE LEADS
CREATE TABLE IF NOT EXISTS elspec.leads (
    id SERIAL PRIMARY KEY,
    name TEXT,
    role TEXT,
    email TEXT UNIQUE,
    linkedin_url TEXT,
    company_name TEXT,
    industry TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA DE CAMPAÑAS
CREATE TABLE IF NOT EXISTS elspec.campaigns (
    id SERIAL PRIMARY KEY,
    name TEXT,
    sender_email TEXT,
    subject TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA DE ESTADÍSTICAS (Tracking Pro)
CREATE TABLE IF NOT EXISTS elspec.campaign_stats (
    id SERIAL PRIMARY KEY,
    campaign_id TEXT,
    email TEXT,
    event_type TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Nota: Para nuevos proyectos, simplemente crea un nuevo SCHEMA:
-- CREATE SCHEMA nuevo_proyecto;
