import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import { createProxyMiddleware } from 'http-proxy-middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('dev'));

// Healthcheck Route
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'API Gateway', timestamp: new Date() });
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
