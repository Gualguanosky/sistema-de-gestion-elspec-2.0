import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import { createProxyMiddleware } from 'http-proxy-middleware';
import db from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('dev'));

// Healthcheck Route con validación de DB
app.get('/api/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ 
            status: 'ok', 
            service: 'API Gateway', 
            database: 'connected',
            timestamp: new Date() 
        });
    } catch (err) {
        res.status(500).json({ 
            status: 'error', 
            service: 'API Gateway', 
            database: 'disconnected',
            error: err.message 
        });
    }
});

// ==========================================
// AUTH ENDPOINTS
// ==========================================

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query(
            'SELECT * FROM users WHERE (username = ? OR email = ?) AND password = ?', 
            [username, username, password]
        );
        
        if (rows.length > 0) {
            const user = rows[0];
            delete user.password; // No enviar password al frontend
            res.json(user);
        } else {
            res.status(401).json({ error: 'Credenciales inválidas' });
        }
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ==========================================
// REGISTRO DE RUTAS (PROXIES A MICROSERVICIOS)
// ==========================================

// Proxy N8N Central Webhook (Lógica de Marketing heredada temporal)
const N8N_MASTER_WEBHOOK = process.env.N8N_URL || 'http://187.124.152.139:5678';

app.use('/api/n8n', createProxyMiddleware({
    target: N8N_MASTER_WEBHOOK,
    changeOrigin: true,
    pathRewrite: {
        '^/api/n8n': '/webhook', // /api/n8n/elspec-ai-agent-v1 -> /webhook/elspec-ai-agent-v1
    },
    on: {
        proxyReq: (proxyReq, req, res) => {
            console.log(`[Proxy] Routing -> ${N8N_MASTER_WEBHOOK}${proxyReq.path}`);
        }
    }
}));

// ==========================================
// DB API ENDPOINTS (MARIADB)
// ==========================================

// Middleware para parsear JSON
app.use(express.json());

// Obtener registros de una tabla
app.get('/api/db/:table', async (req, res) => {
    const { table } = req.params;
    try {
        let rows;
        try {
            // Intenta traer solo los no borrados (para tablas con soft delete)
            [rows] = await db.query(`SELECT * FROM ${table} WHERE deleted = 0 OR deleted IS NULL`);
        } catch (colErr) {
            if (colErr.code === 'ER_BAD_FIELD_ERROR') {
                // Si la tabla no tiene columna 'deleted' (ej: users), trae todo
                [rows] = await db.query(`SELECT * FROM ${table}`);
            } else {
                throw colErr;
            }
        }
        res.json(rows);
    } catch (error) {
        console.error(`Error fetching ${table}:`, error);
        res.status(500).json({ error: error.message });
    }
});

// Insertar registro
app.post('/api/db/:table', async (req, res) => {
    const { table } = req.params;
    const data = req.body;
    try {
        const [result] = await db.query(`INSERT INTO ${table} SET ?`, data);
        res.status(201).json({ id: result.insertId, ...data });
    } catch (error) {
        console.error(`Error creating in ${table}:`, error);
        res.status(500).json({ error: error.message });
    }
});

// Actualizar registro
app.put('/api/db/:table/:id', async (req, res) => {
    const { table, id } = req.params;
    const data = req.body;
    try {
        await db.query(`UPDATE ${table} SET ? WHERE id = ?`, [data, id]);
        res.json({ id, ...data });
    } catch (error) {
        console.error(`Error updating in ${table}:`, error);
        res.status(500).json({ error: error.message });
    }
});

// Borrado lÃ³gico
app.delete('/api/db/:table/:id', async (req, res) => {
    const { table, id } = req.params;
    try {
        await db.query(`UPDATE ${table} SET deleted = 1 WHERE id = ?`, [id]);
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error(`Error deleting in ${table}:`, error);
        res.status(500).json({ error: error.message });
    }
});


// Cuando se construyan los microservicios locales (Fase 3 y 4), se agregan aquí:
/*
app.use('/api/prospects', createProxyMiddleware({
    target: process.env.PROSPECTS_SERVICE_URL || 'http://prospects-service:3001',
    changeOrigin: true
}));

app.use('/api/campaigns', createProxyMiddleware({
    target: process.env.CAMPAIGNS_SERVICE_URL || 'http://campaigns-service:3002',
    changeOrigin: true
}));
*/

app.listen(PORT, () => {
    console.log(`🚀 API Gateway corriendo en http://localhost:${PORT}`);
    console.log(`📡 Rutas activas:`);
    console.log(`  - GET  /health`);
    console.log(`  - ALL  /api/n8n -> Proxy a N8N`);
});
