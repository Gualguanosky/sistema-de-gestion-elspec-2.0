// ═══════════════════════════════════════════════════════════════
// ELSPEC WhatsApp Bot — API Middleware v2
// Usa Firebase Admin SDK con Service Account (sin email/password)
// ═══════════════════════════════════════════════════════════════
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

// ── Firebase Admin Init ───────────────────────────────────────
const SA_PATH = path.join(__dirname, 'firebase-service-account.json');

if (!admin.apps.length) {
    if (fs.existsSync(SA_PATH)) {
        const serviceAccount = require(SA_PATH);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('🔑 Firebase Admin: usando service account local');
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault()
        });
        console.log('🔑 Firebase Admin: usando GOOGLE_APPLICATION_CREDENTIALS');
    } else {
        // Fallback: usar variables de entorno con el JSON de la SA
        try {
            const saJson = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
            admin.initializeApp({
                credential: admin.credential.cert(saJson)
            });
            console.log('🔑 Firebase Admin: usando env FIREBASE_SERVICE_ACCOUNT_JSON');
        } catch (e) {
            console.error('❌ No se encontró service account. Pon firebase-service-account.json en bot-api/');
            process.exit(1);
        }
    }
}

const db = admin.firestore();

// ── Express Setup ─────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

const API_SECRET = process.env.API_SECRET || 'elspec-bot-secret-2025';

function requireApiKey(req, res, next) {
    const key = req.headers['x-api-key'] || req.query.apiKey;
    if (key !== API_SECRET) {
        return res.status(401).json({ error: 'Unauthorized: invalid API key' });
    }
    next();
}

// ── Health Check ──────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'ELSPEC WhatsApp Bot API v2 (Admin SDK)', time: new Date().toISOString() });
});

// ── POST /api/tickets ─────────────────────────────────────────
app.post('/api/tickets', requireApiKey, async (req, res) => {
    try {
        const {
            title, description, type = 'soporte', priority = 'medium',
            status = 'open', author = 'WhatsApp Bot', assignedTo = [],
            assetId = null, whatsappPhone, whatsappName,
            equipoTipo, equipoSerial
        } = req.body;

        if (!title || !description) {
            return res.status(400).json({ error: 'title y description son requeridos' });
        }

        const docRef = await db.collection('tickets').add({
            title, description, type, priority, status,
            author, assignedTo, assetId,
            whatsappPhone, whatsappName,
            equipoTipo, equipoSerial,
            deleted: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            imageUrl: null
        });

        console.log(`🎫 Ticket creado: ${docRef.id} — ${title}`);
        res.status(201).json({ success: true, ticketId: docRef.id, message: 'Ticket creado exitosamente' });

    } catch (err) {
        console.error('❌ Error creando ticket:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/visits ──────────────────────────────────────────
app.post('/api/visits', requireApiKey, async (req, res) => {
    try {
        const {
            date, location, client, description,
            status = 'scheduled', personnel = [],
            createdBy, whatsappPhone
        } = req.body;

        if (!date || !location || !client) {
            return res.status(400).json({ error: 'date, location y client son requeridos' });
        }

        const docRef = await db.collection('visits').add({
            date, location, client, description,
            status, personnel, createdBy, whatsappPhone,
            deleted: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`📅 Visita creada: ${docRef.id} — ${client} (${date})`);
        res.status(201).json({ success: true, visitId: docRef.id, message: 'Visita programada exitosamente' });

    } catch (err) {
        console.error('❌ Error creando visita:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/tickets?phone=+57... ─────────────────────────────
app.get('/api/tickets', requireApiKey, async (req, res) => {
    try {
        const { phone, max = 5 } = req.query;
        if (!phone) return res.status(400).json({ error: 'Parámetro phone es requerido' });

        const snapshot = await db.collection('tickets')
            .where('whatsappPhone', '==', phone)
            .where('deleted', '==', false)
            .orderBy('createdAt', 'desc')
            .limit(Number(max))
            .get();

        const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({ success: true, tickets, count: tickets.length });

    } catch (err) {
        console.error('❌ Error consultando tickets:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/report ───────────────────────────────────────────
app.get('/api/report', requireApiKey, async (req, res) => {
    try {
        const snapshot = await db.collection('tickets')
            .where('deleted', '==', false)
            .limit(500)
            .get();

        const tickets = snapshot.docs.map(d => d.data());
        const today = new Date().toISOString().split('T')[0];

        res.json({
            success: true,
            total: tickets.length,
            open: tickets.filter(t => t.status === 'open').length,
            in_progress: tickets.filter(t => t.status === 'in_progress').length,
            closed: tickets.filter(t => t.status === 'closed').length,
            high_priority: tickets.filter(t => t.priority === 'high').length,
            today: tickets.filter(t => (t.createdAt?.toDate?.()?.toISOString() || '').startsWith(today)).length
        });

    } catch (err) {
        console.error('❌ Error generando reporte:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── Helper: HTTP GET con promesa ──────────────────────────────
function httpGet(url) {
    return new Promise((resolve, reject) => {
        const mod = url.startsWith('https') ? https : http;
        mod.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error('JSON parse error: ' + data.substring(0, 200))); }
            });
        }).on('error', reject);
    });
}

// ── Helper: HTTP POST con promesa ─────────────────────────────
function httpPost(url, body) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const payload = JSON.stringify(body);
        const options = {
            hostname: parsed.hostname,
            path: parsed.pathname,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error('JSON parse error: ' + data.substring(0, 200))); }
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

// ── POST /api/prospects — Buscador IA (CSE + Gemini + Hunter) ─
app.post('/api/prospects', async (req, res) => {
    try {
        const { companyName, roles } = req.body;
        if (!companyName) return res.status(400).json({ error: 'companyName requerido' });

        const GOOGLE_KEY = process.env.GOOGLE_SEARCH_API_KEY;
        const GOOGLE_CX  = process.env.GOOGLE_SEARCH_CX;
        const GEMINI_KEY = process.env.GEMINI_API_KEY;
        const HUNTER_KEY = process.env.HUNTER_API_KEY;

        if (!GOOGLE_KEY || !GEMINI_KEY) {
            return res.status(500).json({ error: 'Faltan variables de entorno GOOGLE_SEARCH_API_KEY o GEMINI_API_KEY en bot-api/.env' });
        }

        // ─── PASO 1: Google Custom Search ───────────────────────
        const searchRole = Array.isArray(roles) && roles.length > 0 ? roles[0] : 'Gerente OR Director OR Compras';
        const query = `site:linkedin.com/in "${searchRole}" "${companyName}"`;
        const cseUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}&num=10`;

        console.log(`[Prospects] 🔍 Google CSE: ${query}`);
        const cseData = await httpGet(cseUrl);
        const items = cseData.items || [];

        if (items.length === 0) {
            return res.json({ prospects: [], message: 'No se encontraron resultados en Google para esa empresa.' });
        }

        // ─── PASO 2: Gemini — Extraer perfiles ──────────────────
        const textToAnalyze = items.map((item, i) =>
            `Resultado ${i + 1}:\nTítulo: ${item.title}\nDescripción: ${item.snippet}\nLink: ${item.link}`
        ).join('\n\n');

        const geminiPrompt = `Analiza estos resultados de LinkedIn sobre "${companyName}". Extrae SOLO personas humanas (no páginas de empresa). Devuelve UNICAMENTE un JSON array:
[{"name":"Nombre Completo","role":"Cargo","linkedin":"URL LinkedIn","companyDomain":"dominio.com"}]
Si no puedes extraer un campo usa null. Sin texto extra.\n\n${textToAnalyze}`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
        console.log(`[Prospects] 🤖 Consultando Gemini...`);
        const geminiRes = await httpPost(geminiUrl, {
            contents: [{ parts: [{ text: geminiPrompt }] }]
        });

        let rawText = geminiRes?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        rawText = rawText.trim().replace(/```json/g, '').replace(/```/g, '').trim();

        let extracted = [];
        try { extracted = JSON.parse(rawText); if (!Array.isArray(extracted)) extracted = []; }
        catch (e) { console.warn('[Prospects] Gemini parse error:', rawText.substring(0, 200)); }

        if (extracted.length === 0) {
            return res.json({ prospects: [], message: 'Gemini no pudo extraer prospectos.' });
        }

        // ─── PASO 3: Hunter.io — Enriquecer emails ──────────────
        let hunterByDomain = {};
        if (HUNTER_KEY) {
            const uniqueDomains = [...new Set(extracted.map(p => p.companyDomain).filter(d => d && d.includes('.')))];
            console.log(`[Prospects] 📧 Hunter.io para dominios: ${uniqueDomains.join(', ')}`);
            for (const domain of uniqueDomains) {
                try {
                    const hunterUrl = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${HUNTER_KEY}&limit=20`;
                    const hunterData = await httpGet(hunterUrl);
                    hunterByDomain[domain] = hunterData?.data?.emails || [];
                    console.log(`[Prospects] Hunter.io [${domain}]: ${hunterByDomain[domain].length} emails`);
                } catch (e) {
                    console.warn(`[Prospects] Hunter.io error para ${domain}:`, e.message);
                }
            }
        }

        // ─── PASO 4: Merge ──────────────────────────────────────
        const prospects = extracted.map((p, idx) => {
            let email = null, emailSource = 'not_found';
            const domain = p.companyDomain;
            if (domain && hunterByDomain[domain]) {
                const fn = (p.name || '').split(' ')[0]?.toLowerCase();
                const ln = (p.name || '').split(' ')[1]?.toLowerCase();
                const match = hunterByDomain[domain].find(e =>
                    (fn && (e.first_name || '').toLowerCase().includes(fn)) ||
                    (ln && (e.last_name  || '').toLowerCase().includes(ln))
                );
                if (match) { email = match.value; emailSource = 'hunter_io'; }
            }
            return {
                id: `p_${Date.now()}_${idx}`,
                name: p.name || 'Desconocido',
                role: p.role || 'Sin cargo',
                linkedin: p.linkedin || null,
                email, emailSource,
                company: companyName,
                companyDomain: domain || null
            };
        });

        const withEmail = prospects.filter(p => p.email).length;
        console.log(`[Prospects] ✅ ${prospects.length} prospectos, ${withEmail} con email.`);

        return res.json({
            prospects,
            stats: {
                total: prospects.length,
                withEmail,
                emailSources: {
                    hunter_io: prospects.filter(p => p.emailSource === 'hunter_io').length,
                    not_found:  prospects.filter(p => p.emailSource === 'not_found').length
                }
            }
        });

    } catch (err) {
        console.error('[Prospects] ❌ Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── Start Server ──────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`\n🤖 ELSPEC Bot API v2 (Admin SDK) en http://localhost:${PORT}`);
    console.log(`   Health:  http://localhost:${PORT}/health`);
    console.log(`   Tickets: POST/GET http://localhost:${PORT}/api/tickets`);
    console.log(`   Visitas: POST http://localhost:${PORT}/api/visits\n`);
});
