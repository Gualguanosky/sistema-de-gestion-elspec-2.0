// ═══════════════════════════════════════════════════════════════════════════
// ELSPEC WhatsApp Bot v2 — Motor de Conversación Unificado
// Flujos: Tickets | Visitas | Estado | Reportes
// ═══════════════════════════════════════════════════════════════════════════

const phone = $json.phone;
const message = $json.message;       // lowercase
const messageRaw = $json.messageRaw; // original case
const profileName = $json.profileName;

// ── Session Storage ──────────────────────────────────────────────────────────
const staticData = $getWorkflowStaticData('global');
if (!staticData.s) staticData.s = {};

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 min
const now = Date.now();

if (!staticData.s[phone] || (now - staticData.s[phone].ts > SESSION_TIMEOUT_MS)) {
    staticData.s[phone] = { state: 'NUEVO', d: {}, ts: now };
}
const sess = staticData.s[phone];
sess.ts = now;

// ── Global Reset Keywords ────────────────────────────────────────────────────
const RESET = ['hola', 'hi', 'hello', 'menu', 'menú', 'inicio', 'start', 'reiniciar', 'salir'];
if (RESET.includes(message)) { sess.state = 'NUEVO'; sess.d = {}; }

// ── Helpers ──────────────────────────────────────────────────────────────────
const TIPO = {
    '1': 'Laptop', 'laptop': 'Laptop', '2': 'Desktop', 'desktop': 'Desktop', 'pc': 'Desktop',
    '3': 'Impresora', 'impresora': 'Impresora', '4': 'Red', 'red': 'Red', 'router': 'Red', 'switch': 'Red',
    '5': 'Otro', 'otro': 'Otro'
};
const PRIO = {
    '1': 'low', 'baja': 'low', 'bajo': 'low', '2': 'medium', 'media': 'medium',
    '3': 'high', 'alta': 'high', 'alto': 'high', 'urgente': 'high'
};

function menuIntent(m) {
    if (['1', 'ticket', 'soporte', 'equipo', 'falla', 'daño', 'daño', 'problema', 'avería', 'roto'].some(w => m.includes(w))) return 'TICKET';
    if (['2', 'visita', 'programar', 'agendar', 'cita', 'visitar'].some(w => m.includes(w))) return 'VISITA';
    if (['4', 'estado', 'seguimiento', 'mis ticket', 'status', 'consultar'].some(w => m.includes(w))) return 'ESTADO';
    if (['3', 'reporte', 'informe', 'resumen', 'estadística'].some(w => m.includes(w))) return 'REPORTE';
    return null;
}

const MENU = `🏢 *ELSPEC ANDINA — Soporte Digital*\n\n` +
    `¡Hola *${profileName}*! ¿En qué puedo ayudarte?\n\n` +
    `🔧 *1 · Soporte Técnico*\n   _Reportar falla o daño en equipo_\n\n` +
    `📅 *2 · Programar Visita*\n   _Agendar visita técnica en campo_\n\n` +
    `🔍 *3 · Mis Tickets*\n   _Consultar estado de mis solicitudes_\n\n` +
    `📊 *4 · Reporte (Admin)*\n   _Resumen de actividad del sistema_\n\n` +
    `_Responde con el número o describe tu necesidad._`;

const CONFIRM_WORDS = ['1', 'si', 'sí', 'yes', 'ok', 'confirmar', 'confirmo'];
const CANCEL_WORDS = ['2', 'no', 'cancelar', 'cancel'];

// ── Output vars ──────────────────────────────────────────────────────────────
let action = 'SEND_MESSAGE';
let responseMessage = '';
let payload = null;

// ═══════════════════════════════ STATE MACHINE ═══════════════════════════════
switch (sess.state) {

    // ─── MAIN MENU ─────────────────────────────────────────────────────────────
    case 'NUEVO':
        sess.state = 'WAIT_MENU';
        responseMessage = MENU;
        break;

    case 'WAIT_MENU': {
        const intent = menuIntent(message);
        if (!intent) {
            responseMessage = `❓ No entendí. Escribe *1* Soporte, *2* Visita, *3* Mis Tickets, o *4* Reporte.`;
            break;
        }
        if (intent === 'TICKET') {
            sess.state = 'TICKET_TIPO';
            responseMessage = `🔧 *Reporte de Soporte Técnico*\n\n¿Qué tipo de equipo tiene el problema?\n\n` +
                `1️⃣ Laptop  2️⃣ Desktop/PC\n3️⃣ Impresora  4️⃣ Red\n5️⃣ Otro`;
        } else if (intent === 'VISITA') {
            sess.state = 'VISITA_FECHA';
            responseMessage = `📅 *Programar Visita Técnica*\n\n¿Para qué fecha necesitas la visita?\n_(Formato: DD/MM/AAAA)_`;
        } else if (intent === 'ESTADO') {
            action = 'QUERY_STATUS';
            payload = { phone };
            sess.state = 'WAIT_MENU';
        } else if (intent === 'REPORTE') {
            action = 'QUERY_REPORT';
            payload = { phone };
            sess.state = 'WAIT_MENU';
        }
        break;
    }

    // ─── TICKET FLOW ───────────────────────────────────────────────────────────
    case 'TICKET_TIPO': {
        const tipo = TIPO[message];
        if (!tipo) { responseMessage = `❓ Opción inválida. Escribe 1·Laptop  2·Desktop  3·Impresora  4·Red  5·Otro`; break; }
        sess.d.tipo = tipo;
        sess.state = 'TICKET_SERIAL';
        responseMessage = `🖥️ *${tipo}* seleccionado.\n\n🔢 ¿Cuál es el *serial* del equipo?\n_(Si no lo sabes escribe *no sé*)_`;
        break;
    }

    case 'TICKET_SERIAL':
        sess.d.serial = ['no sé', 'no se', 'ns', 'no lo se'].includes(message) ? 'No especificado' : messageRaw;
        sess.state = 'TICKET_DESC';
        responseMessage = `📝 *Describe el problema* del equipo:\n\n_Sé específico: No enciende, pantalla negra, sonido extraño..._`;
        break;

    case 'TICKET_DESC':
        if (messageRaw.length < 5) { responseMessage = `⚠️ Descripción muy corta. Por favor detalla más el problema.`; break; }
        sess.d.desc = messageRaw;
        sess.state = 'TICKET_PRIO';
        responseMessage = `🚦 ¿Qué tan urgente es?\n\n1️⃣ *Baja* — Puede esperar\n2️⃣ *Media* — Afecta pero hay alternativa\n3️⃣ *Alta* — Bloquea el trabajo`;
        break;

    case 'TICKET_PRIO': {
        const prio = PRIO[message];
        if (!prio) { responseMessage = `❓ Responde *1* Baja, *2* Media o *3* Alta.`; break; }
        sess.d.prio = prio;
        sess.state = 'TICKET_CONFIRM';
        const pl = { low: '🟡 Baja', medium: '🟠 Media', high: '🔴 Alta' };
        responseMessage = `📋 *Resumen del reporte:*\n\n` +
            `🖥️ Equipo: *${sess.d.tipo}*\n🔢 Serial: *${sess.d.serial}*\n` +
            `📝 Problema: _${sess.d.desc}_\n🚦 Prioridad: *${pl[prio]}*\n\n` +
            `*1* ✅ Confirmar  |  *2* ❌ Cancelar`;
        break;
    }

    case 'TICKET_CONFIRM':
        if (CONFIRM_WORDS.includes(message)) {
            action = 'CREATE_TICKET';
            payload = {
                title: `[WhatsApp] ${sess.d.tipo} — ${sess.d.serial}`,
                description: `📱 Reporte vía WhatsApp\n👤 ${profileName} (${phone})\n\n${sess.d.desc}`,
                type: 'soporte', priority: sess.d.prio, status: 'open', deleted: false,
                author: 'WhatsApp Bot', assignedTo: [], assetId: null,
                whatsappPhone: phone, whatsappName: profileName,
                equipoTipo: sess.d.tipo, equipoSerial: sess.d.serial,
                createdAt: new Date().toISOString()
            };
            delete staticData.s[phone];
        } else if (CANCEL_WORDS.includes(message)) {
            delete staticData.s[phone];
            responseMessage = `❌ Reporte cancelado. Escribe *hola* para volver al menú.`;
        } else {
            responseMessage = `Por favor responde *1* para confirmar o *2* para cancelar.`;
        }
        break;

    // ─── VISIT FLOW ────────────────────────────────────────────────────────────
    case 'VISITA_FECHA': {
        const m = messageRaw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
        if (!m) { responseMessage = `❓ Formato incorrecto. Usa *DD/MM/AAAA* — Ej: *15/03/2026*`; break; }
        let [, d, mo, y] = m;
        y = y.length === 2 ? '20' + y : y;
        sess.d.fecha = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
        sess.d.fechaDisplay = `${d.padStart(2, '0')}/${mo.padStart(2, '0')}/${y}`;
        sess.state = 'VISITA_DIR';
        responseMessage = `📅 Fecha: *${sess.d.fechaDisplay}*\n\n📍 ¿Cuál es la *dirección* donde se realizará la visita?`;
        break;
    }

    case 'VISITA_DIR':
        if (messageRaw.length < 5) { responseMessage = `⚠️ Ingresa una dirección más completa.`; break; }
        sess.d.dir = messageRaw;
        sess.state = 'VISITA_CLIENTE';
        responseMessage = `🏢 ¿Cuál es el *nombre del cliente o empresa*?`;
        break;

    case 'VISITA_CLIENTE':
        sess.d.cliente = messageRaw;
        sess.state = 'VISITA_MOTIVO';
        responseMessage = `📋 ¿Cuál es el *motivo* de la visita?\n\n_Ej: Mantenimiento preventivo, instalación de red, revisión de equipos..._`;
        break;

    case 'VISITA_MOTIVO':
        if (messageRaw.length < 5) { responseMessage = `⚠️ Describe mejor el motivo de la visita.`; break; }
        sess.d.motivo = messageRaw;
        sess.state = 'VISITA_CONFIRM';
        responseMessage = `📋 *Resumen de la visita:*\n\n` +
            `📅 Fecha: *${sess.d.fechaDisplay}*\n📍 Lugar: *${sess.d.dir}*\n` +
            `🏢 Cliente: *${sess.d.cliente}*\n📝 Motivo: _${sess.d.motivo}_\n\n` +
            `*1* ✅ Confirmar  |  *2* ❌ Cancelar`;
        break;

    case 'VISITA_CONFIRM':
        if (CONFIRM_WORDS.includes(message)) {
            action = 'CREATE_VISIT';
            payload = {
                date: sess.d.fecha, location: sess.d.dir, client: sess.d.cliente,
                description: sess.d.motivo, status: 'scheduled',
                personnel: [profileName],
                createdBy: `WhatsApp: ${profileName} (${phone})`,
                whatsappPhone: phone, createdAt: new Date().toISOString()
            };
            delete staticData.s[phone];
        } else if (CANCEL_WORDS.includes(message)) {
            delete staticData.s[phone];
            responseMessage = `❌ Visita cancelada. Escribe *hola* para volver al menú.`;
        } else {
            responseMessage = `Por favor responde *1* para confirmar o *2* para cancelar.`;
        }
        break;

    default:
        sess.state = 'NUEVO';
        responseMessage = `Escribe *hola* para iniciar. 👋`;
        break;
}

return [{ json: { phone, profileName, action, responseMessage: responseMessage || '', payload: payload || null } }];
