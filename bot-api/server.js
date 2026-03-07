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

// ── Start Server ──────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`\n🤖 ELSPEC Bot API v2 (Admin SDK) en http://localhost:${PORT}`);
    console.log(`   Health:  http://localhost:${PORT}/health`);
    console.log(`   Tickets: POST/GET http://localhost:${PORT}/api/tickets`);
    console.log(`   Visitas: POST http://localhost:${PORT}/api/visits\n`);
});
