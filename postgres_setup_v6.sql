-- Tabla para persistencia de búsquedas y prospectos hallados
CREATE TABLE IF NOT EXISTS search_logs (
    id SERIAL PRIMARY KEY,
    company_name TEXT NOT NULL,
    result_count INTEGER DEFAULT 0,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para el seguimiento de aperturas (Tracking Pixel)
CREATE TABLE IF NOT EXISTS tracking_logs (
    id SERIAL PRIMARY KEY,
    campaign_id TEXT,
    email TEXT,
    opened_at TIMESTAMPTZ DEFAULT NOW()
);
